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
import {
    loadFromConfig, ChannelQueryResponse, ChaincodeQueryResponse,
    Peer, Channel, ChaincodeType
} from 'fabric-client';
import * as Client from 'fabric-client';
import { Gateway, InMemoryWallet, X509WalletMixin } from 'fabric-network';
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
        const allPeers: Array<Peer> = this.getAllPeers();

        const peerNames: Array<string> = [];

        allPeers.forEach((peer) => {
            peerNames.push(peer.getName());
        });

        return peerNames;
    }

    public getPeer(name: string): Peer {
        console.log('getPeer', name);
        const allPeers: Array<Peer> = this.getAllPeers();

        return allPeers.find((peer) => {
            return peer.getName() === name;
        });
    }

    public async getAllChannelsForPeer(peerName: string): Promise<Array<string>> {
        console.log('getAllChannelsForPeer', peerName);
        // TODO: update this when not just using admin
        const peer: Peer = this.getPeer(peerName);
        const channelResponse: ChannelQueryResponse = await this.gateway.getClient().queryChannels(peer);

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
        const peer: Peer = this.getPeer(peerName);
        const chaincodeResponse: ChaincodeQueryResponse = await this.gateway.getClient().queryInstalledChaincodes(peer);
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
        const channel: Channel = this.getChannel(channelName);
        // TODO: this needs updating when not using admin
        const chainCodeResponse: ChaincodeQueryResponse = await channel.queryInstantiatedChaincodes(null, true);
        chainCodeResponse.chaincodes.forEach((chainCode) => {
            instantiatedChaincodes.push({name: chainCode.name, version: chainCode.version});
        });

        return instantiatedChaincodes;
    }

    public async installChaincode(packageRegistryEntry: PackageRegistryEntry, peerName: string): Promise<void> {
        const peer: Peer = this.getPeer(peerName);

        let language: ChaincodeType;
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
            txId: this.gateway.getClient().newTransactionID(true)
        };
        await this.gateway.getClient().installChaincode(installRequest);
    }

    public disconnect() {
        this.gateway.disconnect();
    }

    protected async connectInner(connectionProfile: object, certificate: string, privateKey: string): Promise<void> {
        const client: Client = await loadFromConfig(connectionProfile);

        const mspid: string = client.getMspid();

        await this.wallet.import(this.identityName, X509WalletMixin.createIdentity(mspid, certificate, privateKey));

        await this.gateway.connect(client, {
            wallet: this.wallet,
            identity: this.identityName
        });
    }

    private getChannel(channelName: string): Channel {
        console.log('getChannel', channelName);
        return this.gateway.getClient().getChannel(channelName);
    }

    private getAllPeers(): Array<Peer> {
        console.log('getAllPeers');
        return this.gateway.getClient().getPeersForOrg(null);
    }

}
