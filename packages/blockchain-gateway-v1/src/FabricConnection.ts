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

import { Gateway, GatewayOptions, Network, Wallet } from 'fabric-network';
import { URL } from 'url';
import { ConsoleOutputAdapter, FabricSmartContractDefinition, OutputAdapter } from 'ibm-blockchain-platform-common';
import { FabricWallet } from 'ibm-blockchain-platform-wallet';
import { Lifecycle, LifecyclePeer, LifecycleChannel, DefinedSmartContract } from 'ibm-blockchain-platform-fabric-admin';
import { Endorser, Channel } from 'fabric-common';

export abstract class FabricConnection {

    public identityName: string;
    protected connectionProfilePath: string;
    protected outputAdapter: OutputAdapter;
    protected gateway: Gateway = new Gateway();

    protected lifecycle: Lifecycle = new Lifecycle();

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
        const allPeers: Array<Endorser> = this.getAllPeers();

        const peerNames: Array<string> = [];

        allPeers.forEach((peer: Endorser) => {
            peerNames.push(peer.name);
        });

        return peerNames;
    }

    public async getAllChannelsForPeer(peerName: string): Promise<Array<string>> {
        const peer: LifecyclePeer = this.lifecycle.getPeer(peerName, this.gateway.getOptions().wallet, this.gateway.getOptions().identity as any);
        try {
            const channelNames: string[] = await peer.getAllChannelNames();
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

    // TODO: this needs to be changed to getAllCommitttedSmartContracts
    public async getInstantiatedChaincode(channelName: string): Promise<Array<FabricSmartContractDefinition>> {
        const lifecycleChannel: LifecycleChannel = this.lifecycle.getChannel(channelName, this.gateway.getOptions().wallet, this.gateway.getOptions().identity as any);

        const channelMap: Map<string, string[]> = await this.createChannelMap();

        const peerNames: string[] = channelMap.get(channelName);
        const smartContracts: DefinedSmartContract[] = await lifecycleChannel.getAllCommittedSmartContracts(peerNames[0]);

        return smartContracts.map((smartContract: DefinedSmartContract) => {
            return { name: smartContract.smartContractName, version: smartContract.smartContractVersion, sequence: smartContract.sequence };
        });
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

    public async getChannelPeersInfo(channelName: string): Promise<{ name: string, mspID: string }[]> {
        try {
            const network: Network = await this.gateway.getNetwork(channelName);
            const channel: Channel = network.getChannel();
            const channelPeers: Endorser[] = channel.getEndorsers();

            const peerInfo: { name: string, mspID: string }[] = [];

            for (const peer of channelPeers) {
                const name: string = peer.name;
                const mspID: string = peer.mspid;
                peerInfo.push({ name, mspID });
            }

            return peerInfo;

        } catch (error) {
            throw new Error(`Unable to get channel peers info: ${error.message}`);
        }
    }

    protected async connectInner(connectionProfile: object, wallet: Wallet, identityName: string, timeout: number): Promise<void> {

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

        await this.gateway.connect(connectionProfile, options);

        // This bit is needed to add all the peers to the list of peers the lifecycle knows about
        const endorsers: Endorser[] = this.gateway['client'].getEndorsers();
        for (const endorser of endorsers) {
            const name: string = endorser.name;
            const mspid: string = endorser.mspid;
            const url: string = endorser.endpoint['url'];
            const pem: string = endorser.endpoint['options'].pem;

            this.lifecycle.addPeer({ name, mspid, url, pem });
        }
    }

    protected async getChannelPeers(channelName: string, peerNames: string[]): Promise<Endorser[]> {
        try {
            const network: Network = await this.gateway.getNetwork(channelName);
            const channel: Channel = network.getChannel();

            const channelPeers: Endorser[] = [];

            for (const name of peerNames) {
                const peer: Endorser = channel.getEndorser(name);
                channelPeers.push(peer);
            }

            return channelPeers;
        } catch (error) {
            throw new Error(`Unable to get channel peers: ${error.message}`);
        }
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

    private getAllPeers(): Array<Endorser> {
        return this.gateway['client'].getEndorsers();
    }
}
