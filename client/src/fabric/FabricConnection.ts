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

import * as Client from 'fabric-client';
import { Gateway, InMemoryWallet, X509WalletMixin, Network, Contract, InitOptions } from 'fabric-network';
import { IFabricConnection } from './IFabricConnection';
import { PackageRegistryEntry } from '../packages/PackageRegistryEntry';
import * as fs from 'fs-extra';

import * as uuid from 'uuid/v4';
import { VSCodeOutputAdapter } from '../logging/VSCodeOutputAdapter';

export abstract class FabricConnection implements IFabricConnection {

    private wallet: InMemoryWallet = new InMemoryWallet();
    private identityName: string = uuid();
    private gateway: Gateway = new Gateway();
    private networkIdProperty: boolean;

    constructor() {
        this.wallet = new InMemoryWallet();
        this.identityName = uuid();
        this.gateway = new Gateway();
    }

    public isIBPConnection(): boolean {
        return this.networkIdProperty;
    }

    public abstract async connect(): Promise<void>;

    public abstract async getConnectionDetails(): Promise<{ connectionProfile: object, certificatePath: string, privateKeyPath: string } | { connectionProfilePath: string, certificatePath: string, privateKeyPath: string }>;

    public getAllPeerNames(): Array<string> {
        console.log('getAllPeerNames');
        const allPeers: Array<Client.Peer> = this.getAllPeers();

        const peerNames: Array<string> = [];

        allPeers.forEach((peer: Client.Peer) => {
            peerNames.push(peer.getName());
        });

        return peerNames;
    }

    public getPeer(name: string): Client.Peer {
        console.log('getPeer', name);
        const allPeers: Array<Client.Peer> = this.getAllPeers();

        return allPeers.find((peer: Client.Peer) => {
            return peer.getName() === name;
        });
    }

    public async getAllChannelsForPeer(peerName: string): Promise<Array<string>> {
        console.log('getAllChannelsForPeer', peerName);
        // TODO: update this when not just using admin
        const peer: Client.Peer = this.getPeer(peerName);
        const channelResponse: Client.ChannelQueryResponse = await this.gateway.getClient().queryChannels(peer);

        const channelNames: Array<string> = [];
        console.log(channelResponse);
        channelResponse.channels.forEach((channel: Client.ChannelInfo) => {
            channelNames.push(channel.channel_id);
        });

        return channelNames.sort();
    }

    public async getInstalledChaincode(peerName: string): Promise<Map<string, Array<string>>> {
        console.log('getInstalledChaincode', peerName);
        const installedChainCodes: Map<string, Array<string>> = new Map<string, Array<string>>();
        const peer: Client.Peer = this.getPeer(peerName);
        const chaincodeResponse: Client.ChaincodeQueryResponse = await this.gateway.getClient().queryInstalledChaincodes(peer);
        chaincodeResponse.chaincodes.forEach((chaincode: Client.ChaincodeInfo) => {
            if (installedChainCodes.has(chaincode.name)) {
                installedChainCodes.get(chaincode.name).push(chaincode.version);
            } else {
                installedChainCodes.set(chaincode.name, [chaincode.version]);
            }
        });

        return installedChainCodes;
    }

    public async getInstantiatedChaincode(channelName: string): Promise<Array<{ name: string, version: string }>> {
        console.log('getInstantiatedChaincode');
        const instantiatedChaincodes: Array<any> = [];
        const channel: Client.Channel = this.getChannel(channelName);
        const chainCodeResponse: Client.ChaincodeQueryResponse = await channel.queryInstantiatedChaincodes(null);
        chainCodeResponse.chaincodes.forEach((chainCode: Client.ChaincodeInfo) => {
            instantiatedChaincodes.push({ name: chainCode.name, version: chainCode.version });
        });

        return instantiatedChaincodes;
    }

    public async installChaincode(packageRegistryEntry: PackageRegistryEntry, peerName: string): Promise<void> {
        const peer: Client.Peer = this.getPeer(peerName);
        const pkgBuffer: Buffer = await fs.readFile(packageRegistryEntry.path);
        const installRequest: Client.ChaincodePackageInstallRequest = {
            targets: [peer],
            chaincodePackage: pkgBuffer,
            txId: this.gateway.getClient().newTransactionID()
        };
        const response: [Client.ProposalResponse[], Client.Proposal] = await this.gateway.getClient().installChaincode(installRequest);
        const proposalResponse: Client.ProposalResponse = response[0][0];
        // Horrible hack to get around fabric problem
        const status: number = proposalResponse['status'];
        if (status && status !== 200) {
            // Horrible hack to get around fabric problem
            throw new Error(proposalResponse['message']);
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

        const foundChaincode: any = instantiatedChaincode.find((chaincode: any) => {
            return chaincode.name === name;
        });

        let proposalResponseObject: Client.ProposalResponseObject;

        const outputAdapter: VSCodeOutputAdapter = VSCodeOutputAdapter.instance();
        let message: string;

        if (foundChaincode) {
            message = `Upgrading with function: '${fcn}' and arguments: '${args}'`;
            outputAdapter.log(message);
            proposalResponseObject = await channel.sendUpgradeProposal(instantiateRequest);
        } else {
            message = `Instantiating with function: '${fcn}' and arguments: '${args}'`;
            outputAdapter.log(message);
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
            proposalResponses: proposalResponseObject[0],
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

    public disconnect(): void {
        this.gateway.disconnect();
    }

    public async getMetadata(instantiatedChaincodeName: string, channel: string): Promise<any> {
        const network: Network = await this.gateway.getNetwork(channel);
        const smartContract: Contract = network.getContract(instantiatedChaincodeName);

        const metadataBuffer: Buffer = await smartContract.evaluateTransaction('org.hyperledger.fabric:getMetaData');
        const metadataObject: any = JSON.parse(metadataBuffer.toString());

        console.log('Metadata object is:', metadataObject);
        return metadataObject;
    }

    public async submitTransaction(chaincodeName: string, transactionName: string, channel: string, args: Array<string>): Promise<void> {
        const network: Network = await this.gateway.getNetwork(channel);
        const smartContract: Contract = network.getContract(chaincodeName);

        await smartContract.submitTransaction(transactionName, ...args);

    }

    protected async connectInner(connectionProfile: object, certificate: string, privateKey: string): Promise<void> {

        const client: Client = await Client.loadFromConfig(connectionProfile);

        this.networkIdProperty = (connectionProfile['x-networkId'] ? true : false);

        const mspid: string = client.getMspid();

        await this.wallet.import(this.identityName, X509WalletMixin.createIdentity(mspid, certificate, privateKey));

        const options: InitOptions = {
            wallet: this.wallet,
            identity: this.identityName
        };

        options['discovery'] = {
            asLocalhost: true
        };

        await this.gateway.connect(client, options);
    }

    private getChannel(channelName: string): Client.Channel {
        console.log('getChannel', channelName);
        return this.gateway.getClient().getChannel(channelName);
    }

    private getAllPeers(): Array<Client.Peer> {
        console.log('getAllPeers');
        return this.gateway.getClient().getPeersForOrg(null);
    }

}
