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
import { Gateway, Network, Contract, GatewayOptions, FileSystemWallet, IdentityInfo } from 'fabric-network';
import { IFabricConnection } from './IFabricConnection';
import { PackageRegistryEntry } from '../packages/PackageRegistryEntry';
import * as fs from 'fs-extra';
import { LogType, OutputAdapter } from '../logging/OutputAdapter';
import { ConsoleOutputAdapter } from '../logging/ConsoleOutputAdapter';
import { FabricWallet } from './FabricWallet';
import { URL } from 'url';

export abstract class FabricConnection implements IFabricConnection {

    public identityName: string;

    private mspid: string;
    private gateway: Gateway = new Gateway();
    private networkIdProperty: boolean;
    private outputAdapter: OutputAdapter;
    private discoveryAsLocalhost: boolean;
    private discoveryEnabled: boolean;

    constructor(outputAdapter?: OutputAdapter) {
        this.gateway = new Gateway();
        if (!outputAdapter) {
            this.outputAdapter = ConsoleOutputAdapter.instance();
        } else {
            this.outputAdapter = outputAdapter;
        }
    }

    public isIBPConnection(): boolean {
        return this.networkIdProperty;
    }

    public abstract async connect(wallet: FabricWallet, identityName: string): Promise<void>;

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

    public async getInstantiatedChaincode(channelName: string): Promise<Array<{ name: string, version: string }>> {
        console.log('getInstantiatedChaincode');
        const instantiatedChaincodes: Array<any> = [];
        const channel: Client.Channel = await this.getChannel(channelName);
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

    public disconnect(): void {
        this.gateway.disconnect();
    }

    public async getMetadata(instantiatedChaincodeName: string, channel: string): Promise<any> {
        const network: Network = await this.gateway.getNetwork(channel);
        const smartContract: Contract = network.getContract(instantiatedChaincodeName);

        const metadataBuffer: Buffer = await smartContract.evaluateTransaction('org.hyperledger.fabric:GetMetadata');
        const metadataString: string = metadataBuffer.toString();
        let metadataObject: any = {
            contracts: {
                '' : {
                    name: '',
                    transactions: [],
                }
            }
        };

        if (metadataString !== '') {
            metadataObject = JSON.parse(metadataBuffer.toString());
        }

        console.log('Metadata object is:', metadataObject);
        return metadataObject;
    }

    public async submitTransaction(chaincodeName: string, transactionName: string, channel: string, args: Array<string>, namespace: string): Promise<void> {
        const network: Network = await this.gateway.getNetwork(channel);
        const smartContract: Contract = network.getContract(chaincodeName, namespace);

        await smartContract.submitTransaction(transactionName, ...args);

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

    protected async connectInner(connectionProfile: object, wallet: FileSystemWallet, identityName: string): Promise<void> {

        this.networkIdProperty = (connectionProfile['x-networkId'] ? true : false);

        this.discoveryAsLocalhost = this.hasLocalhostURLs(connectionProfile);
        this.discoveryEnabled = !this.discoveryAsLocalhost;

        const options: GatewayOptions = {
            wallet: wallet,
            identity: identityName,
            discovery: {
                asLocalhost: this.discoveryAsLocalhost,
                enabled: this.discoveryEnabled
            }
        };

        await this.gateway.connect(connectionProfile, options);

        const identities: IdentityInfo[] = await wallet.list();
        const identity: IdentityInfo = identities.find( (identityToSearch: IdentityInfo) => {
            return identityToSearch.label === identityName;
        });

        this.mspid = identity.mspId;
        this.identityName = identity.label;
    }

    private isLocalhostURL(url: string): boolean {
        const parsedURL: URL = new URL(url);
        const localhosts: string[] = [
            'localhost',
            '127.0.0.1'
        ];
        return localhosts.indexOf(parsedURL.hostname) !== -1;
    }

    private hasLocalhostURLs(connectionProfile: any): boolean {
        const urls: string[] = [];
        for (const nodeType of ['orderers', 'peers', 'certificateAuthorities']) {
            if (!connectionProfile[nodeType]) {
                continue;
            }
            const nodes: any = connectionProfile[nodeType];
            for (const nodeName in nodes) {
                if (!nodes[nodeName].url) {
                    continue;
                }
                urls.push(nodes[nodeName].url);
            }
        }
        return urls.some((url: string) => this.isLocalhostURL(url));
    }

    private async getChannel(channelName: string): Promise<Client.Channel> {
        console.log('getChannel', channelName);
        const client: Client = this.gateway.getClient();
        let channel: Client.Channel = client.getChannel(channelName, false);
        if (channel) {
            return channel;
        }
        channel = client.newChannel(channelName);
        const peers: Client.Peer[] = this.getAllPeers();
        let lastError: Error = new Error(`Could not discover information for channel ${channelName} from known peers`);
        for (const target of peers) {
            try {
                await channel.initialize({ asLocalhost: this.discoveryAsLocalhost, discover: this.discoveryEnabled, target });
                return channel;
            } catch (error) {
                lastError = error;
            }
        }
        throw lastError;
    }

    private getAllPeers(): Array<Client.Peer> {
        console.log('getAllPeers');

        return this.gateway.getClient().getPeersForOrg(this.mspid);
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
