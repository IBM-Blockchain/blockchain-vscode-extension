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
import { Gateway, GatewayOptions, FileSystemWallet, IdentityInfo } from 'fabric-network';
import { OutputAdapter } from '../logging/OutputAdapter';
import { ConsoleOutputAdapter } from '../logging/ConsoleOutputAdapter';
import { FabricWallet } from './FabricWallet';
import { URL } from 'url';
import { FabricWalletRegistryEntry } from './FabricWalletRegistryEntry';

export abstract class FabricConnection {

    public identityName: string;
    public wallet: FabricWalletRegistryEntry;
    protected outputAdapter: OutputAdapter;
    protected gateway: Gateway = new Gateway();

    private mspid: string;
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

    public disconnect(): void {
        this.gateway.disconnect();
    }

    public async createChannelMap(): Promise<Map<string, Array<string>>> {
        console.log('createChannelMap');
        try {
            const allPeerNames: Array<string> = this.getAllPeerNames();

            const channelMap: Map<string, Array<string>> = new Map<string, Array<string>>();

            for (const peer of allPeerNames) {
                const channels: Array<string> = await this.getAllChannelsForPeer(peer);
                channels.forEach((channelName: string) => {
                    let peers: Array<string> = channelMap.get(channelName);
                    if (peers) {
                        peers.push(peer);
                        channelMap.set(channelName, peers);
                    } else {
                        peers = [peer];
                        channelMap.set(channelName, peers);
                    }
                });
            }

            return channelMap;

        } catch (error) {
            if (error.message && error.message.includes('Received http2 header with status: 503')) { // If gRPC can't connect to Fabric
                throw new Error(`Cannot connect to Fabric: ${error.message}`);
            } else {
                throw new Error(`Error creating channel map: ${error.message}`);
            }
        }
    }

    protected async connectInner(connectionProfile: object, wallet: FileSystemWallet, identityName: string): Promise<void> {

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
        const identity: IdentityInfo = identities.find((identityToSearch: IdentityInfo) => {
            return identityToSearch.label === identityName;
        });

        // TODO: remove this?
        this.mspid = identity.mspId;
    }

    protected getPeer(name: string): Client.Peer {
        console.log('getPeer', name);
        const allPeers: Array<Client.Peer> = this.getAllPeers();

        return allPeers.find((peer: Client.Peer) => {
            return peer.getName() === name;
        });
    }

    protected async getChannel(channelName: string): Promise<Client.Channel> {
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

    private getAllPeers(): Array<Client.Peer> {
        console.log('getAllPeers');

        return this.gateway.getClient().getPeersForOrg(this.mspid);
    }
}
