/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
*/

'use strict';
import { FabricConnection } from './FabricConnection';
import { FabricRuntime } from './FabricRuntime';
import { OutputAdapter, LogType } from '../logging/OutputAdapter';
import { FabricWallet } from '../fabric/FabricWallet';
import { IFabricRuntimeConnection } from './IFabricRuntimeConnection';
import { Network, Contract } from 'fabric-network';
import * as Client from 'fabric-client';
import * as FabricCAServices from 'fabric-ca-client';
import { PackageRegistryEntry } from '../packages/PackageRegistryEntry';
import * as fs from 'fs-extra';
import { FabricNode, FabricNodeType } from './FabricNode';
import { IFabricWalletGenerator } from './IFabricWalletGenerator';
import { IFabricWallet } from './IFabricWallet';
import { FabricWalletGeneratorFactory } from './FabricWalletGeneratorFactory';

export class FabricRuntimeConnection extends FabricConnection implements IFabricRuntimeConnection {

    private runtime: FabricRuntime;
    private nodes: Map<string, FabricNode> = new Map<string, FabricNode>();
    private client: Client;
    private peers: Map<string, Client.Peer> = new Map<string, Client.Peer>();
    private orderers: Map<string, Client.Orderer> = new Map<string, Client.Orderer>();
    private certificateAuthorities: Map<string, FabricCAServices> = new Map<string, FabricCAServices>();

    constructor(runtime: FabricRuntime, outputAdapter?: OutputAdapter) {
        super(outputAdapter);
        this.runtime = runtime;
    }

    public async connect(wallet: FabricWallet, identityName: string): Promise<void> {
        console.log('FabricRuntimeConnection: connect');

        // This is old "gateway" code and will be removed.
        const connectionProfile: object = await this.runtime.getConnectionProfile();
        await this.connectInner(connectionProfile, wallet, identityName);

        const nodes: FabricNode[] = await this.runtime.getNodes();
        this.client = new Client();
        this.client.setCryptoSuite(Client.newCryptoSuite());
        for (const node of nodes) {
            switch (node.type) {
            case FabricNodeType.PEER:
                const peer: Client.Peer = this.client.newPeer(node.url);
                this.peers.set(node.name, peer);
                break;
            case FabricNodeType.ORDERER:
                const orderer: Client.Orderer = this.client.newOrderer(node.url);
                this.orderers.set(node.name, orderer);
                break;
            case FabricNodeType.CERTIFICATE_AUTHORITY:
                const certificateAuthority: FabricCAServices = new FabricCAServices(node.url, null, node.name, this.client.getCryptoSuite());
                this.certificateAuthorities.set(node.name, certificateAuthority);
                break;
            }
            this.nodes.set(node.name, node);
        }

    }

    public disconnect(): void {
        super.disconnect();
        this.nodes.clear();
        this.client = null;
        this.peers.clear();
        this.orderers.clear();
        this.certificateAuthorities.clear();
    }

    public getAllPeerNames(): Array<string> {
        return Array.from(this.peers.keys()).sort();
    }

    public async getAllInstantiatedChaincodes(): Promise<Array<{name: string, version: string}>> {

        try {
            const channelMap: Map<string, Array<string>> = await this.createChannelMap();
            const channels: Array<string> = Array.from(channelMap.keys());

            const chaincodes: Array<{name: string, version: string}> = []; // We can change the array type if we need more detailed chaincodes in future

            for (const channel of channels) {
                const channelChaincodes: Array<{name: string, version: string}> = await this.getInstantiatedChaincode(channel); // Returns channel chaincodes
                for (const chaincode of channelChaincodes) { // For each channel chaincodes, push it to the 'chaincodes' array if it doesn't exist

                    const alreadyExists: boolean = chaincodes.some((_chaincode: {name: string, version: string}) => {
                        return _chaincode.name === chaincode.name && _chaincode.version === chaincode.version;
                    });
                    if (!alreadyExists) {
                        chaincodes.push(chaincode);
                    }
                }
            }

            return chaincodes;
        } catch (error) {
            throw new Error(`Could not get all instantiated chaincodes: ${error}`);
        }

    }

    public async getOrganizations(channelName: string): Promise<any[]> {
        console.log('getOrganizations', channelName);
        const network: Network = await this.gateway.getNetwork(channelName);
        const channel: Client.Channel = network.getChannel();
        const orgs: any[] = channel.getOrganizations();
        return orgs;
    }

    public getAllCertificateAuthorityNames(): Array<string> {
        return Array.from(this.certificateAuthorities.keys()).sort();
    }

    public async getInstalledChaincode(peerName: string): Promise<Map<string, Array<string>>> {
        console.log('getInstalledChaincode', peerName);
        const installedChainCodes: Map<string, Array<string>> = new Map<string, Array<string>>();
        const peer: Client.Peer = this.getPeer(peerName);
        let chaincodeResponse: Client.ChaincodeQueryResponse;
        try {
            chaincodeResponse = await this.gateway.getClient().queryInstalledChaincodes(peer);
        } catch (error) {
            if (error.message && error.message.match(/access denied/)) {
                // Not allowed to do this as we're probably not an administrator.
                // This is probably not the end of the world, so return the empty map.
                return installedChainCodes;
            }
            throw error;
        }
        chaincodeResponse.chaincodes.forEach((chaincode: Client.ChaincodeInfo) => {
            if (installedChainCodes.has(chaincode.name)) {
                installedChainCodes.get(chaincode.name).push(chaincode.version);
            } else {
                installedChainCodes.set(chaincode.name, [chaincode.version]);
            }
        });

        return installedChainCodes;
    }

    public getAllOrdererNames(): Array<string> {
        return Array.from(this.orderers.keys()).sort();
    }

    public async installChaincode(packageRegistryEntry: PackageRegistryEntry, peerName: string): Promise<void> {
        const peer: Client.Peer = this.getPeer(peerName);
        const pkgBuffer: Buffer = await fs.readFile(packageRegistryEntry.path);
        const installRequest: Client.ChaincodePackageInstallRequest = {
            targets: [peer],
            chaincodePackage: pkgBuffer,
            txId: this.gateway.getClient().newTransactionID()
        };
        const response: Client.ProposalResponseObject = await this.gateway.getClient().installChaincode(installRequest);
        const proposalResponse: Client.ProposalResponse | Error = response[0][0];
        if (proposalResponse instanceof Error) {
            throw proposalResponse;
        } else if (proposalResponse.response.status !== 200) {
            throw new Error(proposalResponse.response.message);
        }
    }

    public async instantiateChaincode(name: string, version: string, channelName: string, fcn: string, args: Array<string>): Promise<any> {

        const transactionId: Client.TransactionId = this.gateway.getClient().newTransactionID();
        const instantiateRequest: Client.ChaincodeInstantiateUpgradeRequest = {
            chaincodeId: name,
            chaincodeVersion: version,
            txId: transactionId,
            fcn: fcn,
            args: args
        };

        const network: Network = await this.gateway.getNetwork(channelName);
        const channel: Client.Channel = network.getChannel();

        const instantiatedChaincode: Array<any> = await this.getInstantiatedChaincode(channelName);

        const foundChaincode: any = this.getChaincode(name, instantiatedChaincode);

        let proposalResponseObject: Client.ProposalResponseObject;

        let message: string;

        if (foundChaincode) {
            throw new Error('The name of the contract you tried to instantiate is already instantiated');
        } else {
            message = `Instantiating with function: '${fcn}' and arguments: '${args}'`;
            this.outputAdapter.log(LogType.INFO, undefined, message);
            proposalResponseObject = await channel.sendInstantiateProposal(instantiateRequest);
        }

        const contract: Contract = network.getContract(name);
        const transaction: any = (contract as any).createTransaction('dummy');

        const responses: any = transaction['_validatePeerResponses'](proposalResponseObject[0]);

        const txId: any = transactionId.getTransactionID();
        const eventHandlerOptions: any = (contract as any).getEventHandlerOptions();
        const eventHandler: any = transaction['_createTxEventHandler'](txId, network, eventHandlerOptions);

        if (!eventHandler) {
            throw new Error('Failed to create an event handler');
        }

        await eventHandler.startListening();

        const transactionRequest: Client.TransactionRequest = {
            proposalResponses: proposalResponseObject[0] as Client.ProposalResponse[],
            proposal: proposalResponseObject[1],
            txId: transactionId
        };

        // Submit the endorsed transaction to the primary orderers.
        const response: Client.BroadcastResponse = await network.getChannel().sendTransaction(transactionRequest);

        if (response.status !== 'SUCCESS') {
            const msg: string = `Failed to send peer responses for transaction ${transactionId.getTransactionID()} to orderer. Response status: ${response.status}`;
            eventHandler.cancelListening();
            throw new Error(msg);
        }

        await eventHandler.waitForEvents();
        // return the payload from the invoked chaincode
        let result: any = null;
        if (responses && responses.validResponses[0].response.payload.length > 0) {
            result = responses.validResponses[0].response.payload;
        }

        eventHandler.cancelListening();

        return result;
    }

    public async upgradeChaincode(name: string, version: string, channelName: string, fcn: string, args: Array<string>): Promise<any> {

        const transactionId: Client.TransactionId = this.gateway.getClient().newTransactionID();
        const upgradeRequest: Client.ChaincodeInstantiateUpgradeRequest = {
            chaincodeId: name,
            chaincodeVersion: version,
            txId: transactionId,
            fcn: fcn,
            args: args
        };

        const network: Network = await this.gateway.getNetwork(channelName);
        const channel: Client.Channel = network.getChannel();

        const instantiatedChaincode: Array<any> = await this.getInstantiatedChaincode(channelName);

        const foundChaincode: any = this.getChaincode(name, instantiatedChaincode);

        let proposalResponseObject: Client.ProposalResponseObject;

        let message: string;

        if (foundChaincode) {
            message = `Upgrading with function: '${fcn}' and arguments: '${args}'`;
            this.outputAdapter.log(LogType.INFO, undefined, message);
            proposalResponseObject = await channel.sendUpgradeProposal(upgradeRequest);
        } else {
            //
            throw new Error('The contract you tried to upgrade with has no previous versions instantiated');
        }

        const contract: Contract = network.getContract(name);
        const transaction: any = (contract as any).createTransaction('dummy');

        const responses: any = transaction['_validatePeerResponses'](proposalResponseObject[0]);

        const txId: any = transactionId.getTransactionID();
        const eventHandlerOptions: any = (contract as any).getEventHandlerOptions();
        const eventHandler: any = transaction['_createTxEventHandler'](txId, network, eventHandlerOptions);

        if (!eventHandler) {
            throw new Error('Failed to create an event handler');
        }

        await eventHandler.startListening();

        const transactionRequest: Client.TransactionRequest = {
            proposalResponses: proposalResponseObject[0] as Client.ProposalResponse[],
            proposal: proposalResponseObject[1],
            txId: transactionId
        };

        // Submit the endorsed transaction to the primary orderers.
        const response: Client.BroadcastResponse = await network.getChannel().sendTransaction(transactionRequest);

        if (response.status !== 'SUCCESS') {
            const msg: string = `Failed to send peer responses for transaction ${transactionId.getTransactionID()} to orderer. Response status: ${response.status}`;
            eventHandler.cancelListening();
            throw new Error(msg);
        }

        await eventHandler.waitForEvents();
        // return the payload from the invoked chaincode
        let result: any = null;
        if (responses && responses.validResponses[0].response.payload.length > 0) {
            result = responses.validResponses[0].response.payload;
        }

        eventHandler.cancelListening();

        return result;
    }

    public async enroll(certificateAuthorityName: string, enrollmentID: string, enrollmentSecret: string): Promise<{certificate: string, privateKey: string}> {
        const certificateAuthority: FabricCAServices = this.getCertificateAuthority(certificateAuthorityName);
        const enrollment: FabricCAServices.IEnrollResponse = await certificateAuthority.enroll({ enrollmentID, enrollmentSecret });
        return { certificate: enrollment.certificate, privateKey: enrollment.key.toBytes() };
    }

    public async register(certificateAuthorityName: string, enrollmentID: string, affiliation: string): Promise<string> {
        const certificateAuthority: FabricCAServices = this.getCertificateAuthority(certificateAuthorityName);
        const request: FabricCAServices.IRegisterRequest = {
            enrollmentID: enrollmentID,
            affiliation: affiliation,
            role: 'client'
        };
        await this.setNodeContext(certificateAuthorityName);
        const registrar: Client.User = await this.client.getUserContext('', false);
        const secret: string = await certificateAuthority.register(request, registrar);
        return secret;
    }

    public getNode(nodeName: string): FabricNode {
        if (!this.nodes.has(nodeName)) {
            throw new Error(`The Fabric node ${nodeName} does not exist`);
        }
        return this.nodes.get(nodeName);
    }

    public async getWallet(nodeName: string): Promise<IFabricWallet> {
        const node: FabricNode = this.getNode(nodeName);
        const walletName: string = node.wallet;
        const fabricWalletGenerator: IFabricWalletGenerator = FabricWalletGeneratorFactory.createFabricWalletGenerator();
        return fabricWalletGenerator.createLocalWallet(walletName);
    }

    private async setNodeContext(nodeName: string): Promise<void> {
        const node: FabricNode = this.getNode(nodeName);
        const walletName: string = node.wallet;
        const identityName: string = node.identity;
        const fabricWalletGenerator: IFabricWalletGenerator = FabricWalletGeneratorFactory.createFabricWalletGenerator();
        const fabricWallet: IFabricWallet = await fabricWalletGenerator.createLocalWallet(walletName);
        await fabricWallet['setUserContext'](this.client, identityName);
    }

    private getCertificateAuthority(certificateAuthorityName: string): FabricCAServices {
        if (!this.certificateAuthorities.has(certificateAuthorityName)) {
            throw new Error(`The Fabric certificate authority ${certificateAuthorityName} does not exist`);
        }
        return this.certificateAuthorities.get(certificateAuthorityName);
    }

    /**
     * Get a chaincode from a list of list of chaincode
     * @param name {String} The name of the chaincode to find
     * @param chaincodeArray {Array<any>} An array of chaincode to search
     * @returns {any} Returns a chaincode from the given array where the name matches the users input
     */
    private getChaincode(name: string, chaincodeArray: Array<any>): any {
        return chaincodeArray.find((chaincode: any) => {
            return chaincode.name === name;
        });
    }

}
