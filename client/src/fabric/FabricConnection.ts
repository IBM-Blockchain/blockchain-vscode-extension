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
    Peer, Channel
} from 'fabric-client';
import * as Client from 'fabric-client';
import { IFabricConnection } from './IFabricConnection';

export abstract class FabricConnection implements IFabricConnection {

    protected client: Client;

    abstract async connect(): Promise<void>;

    getAllPeerNames(): Array<string> {
        console.log('getAllPeerNames');
        const allPeers: Array<Peer> = this.getAllPeers();

        const peerNames: Array<string> = [];

        allPeers.forEach((peer) => {
            peerNames.push(peer.getName());
        });

        return peerNames;
    }

    getPeer(name: string): Peer {
        console.log('getPeer', name);
        const allPeers: Array<Peer> = this.getAllPeers();

        return allPeers.find((peer) => {
            return peer.getName() === name;
        });
    }

    async getAllChannelsForPeer(peerName: string): Promise<Array<string>> {
        console.log('getAllChannelsForPeer', peerName);
        // TODO: update this when not just using admin
        const peer: Peer = this.getPeer(peerName);
        const channelResponse: ChannelQueryResponse = await this.client.queryChannels(peer, true);

        const channelNames: Array<string> = [];
        console.log(channelResponse);
        channelResponse.channels.forEach((channel) => {
            channelNames.push(channel.channel_id);
        });

        return channelNames.sort();
    }

    async getInstalledChaincode(peerName: string): Promise<Map<string, Array<string>>> {
        console.log('getInstalledChaincode', peerName);
        const installedChainCodes: Map<string, Array<string>> = new Map<string, Array<string>>();
        const peer: Peer = this.getPeer(peerName);
        const chaincodeResponse: ChaincodeQueryResponse = await this.client.queryInstalledChaincodes(peer, true);
        chaincodeResponse.chaincodes.forEach((chaincode) => {
            if (installedChainCodes.has(chaincode.name)) {
                installedChainCodes.get(chaincode.name).push(chaincode.version);
            } else {
                installedChainCodes.set(chaincode.name, [chaincode.version]);
            }
        });

        return installedChainCodes;
    }

    async getInstantiatedChaincode(channelName: string): Promise<Array<any>> {
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

    protected async connectInner(connectionProfile: object, certificate: string, privateKey: string): Promise<void> {
        this.client = await loadFromConfig(connectionProfile);
        const mspid: string = this.client.getMspid();
        this.client.setAdminSigningIdentity(privateKey, certificate, mspid);
    }

    private getChannel(channelName: string): Channel {
        console.log('getChannel', channelName);
        return this.client.getChannel(channelName);
    }

    private getAllPeers(): Array<Peer> {
        console.log('getAllPeers');
        return this.client.getPeersForOrg(null);
    }

}
