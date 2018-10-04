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
import { Gateway, InMemoryWallet, X509WalletMixin, Network, Contract } from 'fabric-network';
import { IFabricConnection } from './IFabricConnection';
import { PackageRegistryEntry } from '../packages/PackageRegistryEntry';
import * as path from 'path';

import * as uuid from 'uuid/v4';

export abstract class FabricConnection implements IFabricConnection {

    private wallet: InMemoryWallet = new InMemoryWallet();
    private identityName: string = uuid();
    private gateway: Gateway = new Gateway();

    constructor() {
        this.wallet = new InMemoryWallet();
        this.identityName = uuid();
        this.gateway = new Gateway();
    }

    public abstract async connect(): Promise<void>;

    public getAllPeerNames(): Array<string> {
        console.log('getAllPeerNames');
        const allPeers: Array<Client.Peer> = this.getAllPeers();

        const peerNames: Array<string> = [];

        allPeers.forEach((peer) => {
            peerNames.push(peer.getName());
        });

        return peerNames;
    }

    public getPeer(name: string): Client.Peer {
        console.log('getPeer', name);
        const allPeers: Array<Client.Peer> = this.getAllPeers();

        return allPeers.find((peer) => {
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
        channelResponse.channels.forEach((channel) => {
            channelNames.push(channel.channel_id);
        });

        return channelNames.sort();
    }

    public async getInstalledChaincode(peerName: string): Promise<Map<string, Array<string>>> {
        console.log('getInstalledChaincode', peerName);
        const installedChainCodes: Map<string, Array<string>> = new Map<string, Array<string>>();
        const peer: Client.Peer = this.getPeer(peerName);
        const chaincodeResponse: Client.ChaincodeQueryResponse = await this.gateway.getClient().queryInstalledChaincodes(peer);
        chaincodeResponse.chaincodes.forEach((chaincode) => {
            if (installedChainCodes.has(chaincode.name)) {
                installedChainCodes.get(chaincode.name).push(chaincode.version);
            } else {
                installedChainCodes.set(chaincode.name, [chaincode.version]);
            }
        });

        return installedChainCodes;
    }

    public async getInstantiatedChaincode(channelName: string): Promise<Array<any>> {
        console.log('getInstantiatedChaincode');
        const instantiatedChaincodes: Array<any> = [];
        const channel: Client.Channel = this.getChannel(channelName);
        const chainCodeResponse: Client.ChaincodeQueryResponse = await channel.queryInstantiatedChaincodes(null);
        chainCodeResponse.chaincodes.forEach((chainCode) => {
            instantiatedChaincodes.push({name: chainCode.name, version: chainCode.version});
        });

        return instantiatedChaincodes;
    }

    public async installChaincode(packageRegistryEntry: PackageRegistryEntry, peerName: string): Promise<void> {
        const peer: Client.Peer = this.getPeer(peerName);

        let language: Client.ChaincodeType;
        let chaincodePath: string = packageRegistryEntry.path;
        if (packageRegistryEntry.chaincodeLanguage === 'typescript' || packageRegistryEntry.chaincodeLanguage === 'javascript') {
            language = 'node';
        } else if (packageRegistryEntry.chaincodeLanguage === 'go') {
            process.env.GOPATH = path.dirname(packageRegistryEntry.path);
            chaincodePath = packageRegistryEntry.path.split(path.sep).pop();
            // TODO: make actual language be golang
            language = 'golang';
        } else {
            throw new Error(`Smart contract language not supported ${packageRegistryEntry.chaincodeLanguage}`);
        }

        const installRequest: Client.ChaincodeInstallRequest = {
            targets: [peer],
            chaincodePath: chaincodePath,
            chaincodeId: packageRegistryEntry.name,
            chaincodeVersion: packageRegistryEntry.version,
            chaincodeType: language,
            txId: this.gateway.getClient().newTransactionID()
        };
        await this.gateway.getClient().installChaincode(installRequest);
    }

    public async instantiateChaincode(name: string, version: string, channelName: string, fcn: string, args: Array<string>) {

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
        if (foundChaincode) {
            proposalResponseObject = await channel.sendUpgradeProposal(instantiateRequest);
        } else {
            proposalResponseObject = await channel.sendInstantiateProposal(instantiateRequest);
        }

        const contract: Contract = network.getContract(name);

        const responses: any = contract['_validatePeerResponses'](proposalResponseObject[0]);

        const eventHandler: any = contract['eventHandlerFactory'].createTxEventHandler(transactionId.getTransactionID());

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
            const msg = `Failed to send peer responses for transaction ${transactionId.getTransactionID()} to orderer. Response status: ${response.status}`;
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

    public disconnect() {
        this.gateway.disconnect();
    }

    protected async connectInner(connectionProfile: object, certificate: string, privateKey: string): Promise<void> {

        const client: Client = await Client.loadFromConfig(connectionProfile);

        const mspid: string = client.getMspid();

        await this.wallet.import(this.identityName, X509WalletMixin.createIdentity(mspid, certificate, privateKey));

        await this.gateway.connect(client, {
            wallet: this.wallet,
            identity: this.identityName
        });
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
