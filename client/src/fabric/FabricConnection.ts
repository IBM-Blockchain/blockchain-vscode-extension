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
import { Gateway, GatewayOptions, FileSystemWallet } from 'fabric-network';
import { OutputAdapter } from '../logging/OutputAdapter';
import { ConsoleOutputAdapter } from '../logging/ConsoleOutputAdapter';
import { FabricWallet } from './FabricWallet';
import { URL } from 'url';
import { FabricWalletRegistryEntry } from './FabricWalletRegistryEntry';

export abstract class FabricConnection {

    public identityName: string;
    public wallet: FabricWalletRegistryEntry;
    protected connectionProfilePath: string;
    protected outputAdapter: OutputAdapter;
    protected gateway: Gateway = new Gateway();

    private discoveryAsLocalhost: boolean;
    private discoveryEnabled: boolean;
    private knownChannels: any;

    constructor(connectionProfilePath: string, outputAdapter?: OutputAdapter) {
        this.gateway = new Gateway();
        this.connectionProfilePath = connectionProfilePath;
        if (!outputAdapter) {
            this.outputAdapter = ConsoleOutputAdapter.instance();
        } else {
            this.outputAdapter = outputAdapter;
        }
    }

    public abstract async connect(wallet: FabricWallet, identityName: string, timeout: number): Promise<void>;

    public getAllPeerNames(): Array<string> {
        const allPeers: Array<Client.Peer> = this.getAllPeers();

        const peerNames: Array<string> = [];

        allPeers.forEach((peer: Client.Peer) => {
            peerNames.push(peer.getName());
        });

        return peerNames;
    }

    public async getAllChannelsForPeer(peerName: string): Promise<Array<string>> {
        // TODO: update this when not just using admin
        const peer: Client.Peer = this.gateway.getClient().getPeer(peerName);
        try {
            const channelResponse: Client.ChannelQueryResponse = await this.gateway.getClient().queryChannels(peer);
            const channelNames: Array<string> = channelResponse.channels.map((channel: Client.ChannelInfo) => channel.channel_id);
            return channelNames.sort();
        } catch (error) {
            if (error.message && error.message.match(/access denied/)) {
                // Not allowed to do this as we're probably not an administrator.
                const channelNames: Array<string> = [];
                for (const channelName in this.knownChannels) {
                    const channel: any = this.knownChannels[channelName];
                    const peers: any = channel.peers || {};
                    const peerNames: string[] = Object.keys(peers);
                    if (peerNames.indexOf(peerName) > -1) {
                        channelNames.push(channelName);
                    }
                }
                // If we found any channels, great - if not, then we should rethrow the error.
                if (channelNames.length > 0) {
                    return channelNames;
                }
            }
            throw error;
        }
    }

    public async getInstantiatedChaincode(channelName: string): Promise<Array<{ name: string, version: string }>> {
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
        try {
            const allPeerNames: Array<string> = this.getAllPeerNames();

            if (allPeerNames.length === 0) {
                throw new Error('Could not find any peers to query the list of channels from');
            }

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
                throw new Error(`Error querying channel list: ${error.message}`);
            }
        }
    }

    protected async connectInner(connectionProfile: object, wallet: FileSystemWallet, identityName: string, timeout: number): Promise<void> {

        this.discoveryAsLocalhost = this.hasLocalhostURLs(connectionProfile);
        this.discoveryEnabled = true;
        this.knownChannels = connectionProfile['channels'] || {};

        const options: GatewayOptions = {
            wallet: wallet,
            identity: identityName,
            discovery: {
                asLocalhost: this.discoveryAsLocalhost,
                enabled: this.discoveryEnabled
            },
            eventHandlerOptions: { commitTimeout: timeout }
        };

        await this.gateway.connect(this.connectionProfilePath, options);
    }

    protected async getChannel(channelName: string): Promise<Client.Channel> {
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
        return this.gateway.getClient().getPeersForOrg();
    }
}
