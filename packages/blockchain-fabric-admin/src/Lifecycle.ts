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

import {ConnectOptions, Utils} from 'fabric-common';
import {LifecyclePeer, LifecyclePeerOptions} from './LifecyclePeer';
import {Wallet} from 'fabric-network';
import {LifecycleChannel} from './LifecycleChannel';

const logger: any = Utils.getLogger('Lifecycle');

export interface OrdererOptions {
    name: string,
    url: string,
    pem?: string
    sslTargetNameOverride?: string,
    requestTimeout?: number;
    apiOptions?: object;
}

/**
 * The Lifecycle class lets you add details of peers that you want to perform lifecycle operations on.
 */
export class Lifecycle {

    private peers: Map<string, LifecyclePeer> = new Map<string, LifecyclePeer>();

    private orderers: Map<string, ConnectOptions> = new Map<string, OrdererOptions>();

    /**
     * Add details of a peer that you want to perform lifecycle options on
     * @param options LifecyclePeerOptions
     */
    public addPeer(options: LifecyclePeerOptions): void {
        if (!options) {
            throw new Error('Missing options parameter');
        }

        logger.debug('addPeer: name: %s, url: %s, mspid: %s, sslTargetNameOverride: %s pem: %s clientCertKey: %s clientKey %s requestTimout: %s',
            options.name, options.url, options.mspid, options.sslTargetNameOverride, options.pem, options.clientCertKey, options.clientKey, options.requestTimeout);

        if (!options.name) {
            throw new Error('Missing option name');
        }

        if (!options.url) {
            throw new Error('Missing option url');
        }

        if (!options.mspid) {
            throw new Error('Missing option mspid');
        }

        const peer: LifecyclePeer = new LifecyclePeer(options);
        this.peers.set(options.name, peer);
    }

    /**
     * Get a previously added peer
     * @param name string, the name of the peer that was added
     * @param wallet Wallet, the wallet containing the identity to be used to interact with the peer
     * @param identity string, the name of the identity to be used to interact with the peer
     * @returns LifecyclePeer, an instance of a LifecyclePeer
     */
    public getPeer(name: string, wallet: Wallet, identity: string): LifecyclePeer {
        if (!name) {
            throw new Error('Missing parameter name');
        }

        if (!wallet) {
            throw new Error('Missing parameter wallet');
        }

        if (!identity) {
            throw new Error('Missing parameter identity');
        }

        logger.debug('getPeer: name: %s', name);

        const peer: LifecyclePeer | undefined = this.peers.get(name);
        if (!peer) {
            throw new Error(`Could not get peer ${name}, no peer with that name has been added`);
        }

        peer.setCredentials(wallet, identity);

        return peer;
    }

    /**
     * Get all the names of the peers
     * @returns string[], all the names or the peers
     */
    public getAllPeerNames(): string[] {
        return Array.from(this.peers.keys()).sort();
    }

    /**
     * Get all the peer names for a org
     * @param orgName
     * @returns string[], the names of the peer in an org
     */
    public getAllPeerNamesForOrg(orgName: string): string[] {
        const allPeerNames: string[] = this.getAllPeerNames();
        const peerNames: string [] = [];
        for (const peerName of allPeerNames) {
            const lifecyclePeer: LifecyclePeer = this.peers.get(peerName);
            if (lifecyclePeer.mspid === orgName) {
                peerNames.push(peerName);
            }
        }
        return peerNames.sort();
    }

    /**
     * Get a channel
     * @param channelName string, the name of the channel
     * @param wallet Wallet, the wallet to use with the channel
     * @param identity string, the identity to use with the channel
     * @returns LifecycleChannel, an instance of a LifecycleChannel
     */
    public getChannel(channelName: string, wallet: Wallet, identity: string): LifecycleChannel {
        if (!channelName) {
            throw new Error('parameter channelName is missing');
        }

        if (!wallet) {
            throw new Error('parameter wallet is missing');
        }

        if (!identity) {
            throw new Error('parameter identity is missing');
        }

        return new LifecycleChannel(this, channelName, wallet, identity);
    }

    /**
     * Add an orderer
     * @param options OrdererOptions, the details about the orderer that is to be used
     */
    public addOrderer(options: OrdererOptions): void {
        if (!options) {
            throw new Error('parameter options is missing');
        }

        if (!options.name) {
            throw new Error('missing option name');
        }

        if (!options.url) {
            throw new Error('missing option url');
        }

        const connectOptions: ConnectOptions = {
            url: options.url
        };

        if (options.pem) {
            connectOptions.pem = options.pem;
        }

        if (options.sslTargetNameOverride) {
            connectOptions['ssl-target-name-override'] = options.sslTargetNameOverride;
        }

        if (options.requestTimeout) {
            connectOptions.requestTimeout = options.requestTimeout;
        }

        if (options.apiOptions) {
            Object.assign(connectOptions, options.apiOptions);
        }

        this.orderers.set(options.name, connectOptions);
    }

    /**
     * Get all the names of the orderers
     * @returns string[] an array containing the names of the orderers
     */
    public getAllOrdererNames(): string[] {
        return Array.from(this.orderers.keys()).sort();
    }

    /**
     * Gets the list of options for an orderer
     * @param name
     */
    public getOrderer(name: string): ConnectOptions {
        return this.orderers.get(name);
    }
}
