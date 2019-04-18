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

import { FabricRuntime } from './FabricRuntime';
import { OutputAdapter, LogType } from '../logging/OutputAdapter';
import { IFabricRuntimeConnection } from './IFabricRuntimeConnection';
import * as Client from 'fabric-client';
import * as FabricCAServices from 'fabric-ca-client';
import { PackageRegistryEntry } from '../packages/PackageRegistryEntry';
import * as fs from 'fs-extra';
import { FabricNode, FabricNodeType } from './FabricNode';
import { IFabricWalletGenerator } from './IFabricWalletGenerator';
import { IFabricWallet } from './IFabricWallet';
import { FabricWalletGeneratorFactory } from './FabricWalletGeneratorFactory';
import { ConsoleOutputAdapter } from '../logging/ConsoleOutputAdapter';

export class FabricRuntimeConnection implements IFabricRuntimeConnection {

    private outputAdapter: OutputAdapter;
    private runtime: FabricRuntime;
    private nodes: Map<string, FabricNode> = new Map<string, FabricNode>();
    private client: Client;
    private peers: Map<string, Client.Peer> = new Map<string, Client.Peer>();
    private orderers: Map<string, Client.Orderer> = new Map<string, Client.Orderer>();
    private certificateAuthorities: Map<string, FabricCAServices> = new Map<string, FabricCAServices>();

    constructor(runtime: FabricRuntime, outputAdapter?: OutputAdapter) {
        if (!outputAdapter) {
            this.outputAdapter = ConsoleOutputAdapter.instance();
        } else {
            this.outputAdapter = outputAdapter;
        }
        this.runtime = runtime;
    }

    public async connect(): Promise<void> {
        console.log('FabricRuntimeConnection: connect');

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
        this.nodes.clear();
        this.client = null;
        this.peers.clear();
        this.orderers.clear();
        this.certificateAuthorities.clear();
    }

    public getAllPeerNames(): Array<string> {
        return Array.from(this.peers.keys()).sort();
    }

    public async createChannelMap(): Promise<Map<string, Array<string>>> {
        try {
            const channelMap: Map<string, Array<string>> = new Map<string, Array<string>>();

            for (const [peerName] of this.peers) {
                const channelNames: Array<string> = await this.getAllChannelNamesForPeer(peerName);
                for (const channelName of channelNames) {
                    if (!channelMap.has(channelName)) {
                        channelMap.set(channelName, [peerName]);
                    } else {
                        channelMap.get(channelName).push(peerName);
                    }
                }
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

    public async getInstantiatedChaincode(peerNames: Array<string>, channelName: string): Promise<Array<{name: string, version: string}>> {

        // Locate all of the requested peer nodes.
        const peers: Array<Client.Peer> = peerNames.map((peerName: string) => this.getPeer(peerName));

        // Get the channel.
        const channel: Client.Channel = this.getOrCreateChannel(channelName);

        // Use the first peer to perform this query.
        await this.setNodeContext(peerNames[0]);
        const instantiatedChaincodes: Client.ChaincodeQueryResponse = await channel.queryInstantiatedChaincodes(peers[0]);
        return instantiatedChaincodes.chaincodes.map((chaincode: Client.ChaincodeInfo) => {
            return {
                name: chaincode.name,
                version: chaincode.version
            };
        });

    }

    public async getAllInstantiatedChaincodes(): Promise<Array<{name: string, version: string}>> {

        try {
            const channelMap: Map<string, Array<string>> = await this.createChannelMap();

            const chaincodes: Array<{name: string, version: string}> = []; // We can change the array type if we need more detailed chaincodes in future

            for (const [channelName, peerNames] of channelMap) {
                const channelChaincodes: Array<{name: string, version: string}> = await this.getInstantiatedChaincode(peerNames, channelName); // Returns channel chaincodes
                for (const chaincode of channelChaincodes) { // For each channel chaincodes, push it to the 'chaincodes' array if it doesn't exist

                    const alreadyExists: boolean = chaincodes.some((_chaincode: {name: string, version: string}) => {
                        return _chaincode.name === chaincode.name && _chaincode.version === chaincode.version;
                    });
                    if (!alreadyExists) {
                        chaincodes.push(chaincode);
                    }
                }
            }

            chaincodes.sort((a: { name: string, version: string }, b: { name: string, version: string }): number => {
                if (a.name === b.name) {
                    return a.version.localeCompare(b.version);
                } else {
                    return a.name.localeCompare(b.name);
                }
            });

            return chaincodes;
        } catch (error) {
            throw new Error(`Could not get all instantiated chaincodes: ${error}`);
        }

    }

    public getAllOrganizationNames(): string[] {
        const mspIDs: Set<string> = new Set<string>();
        for (const node of this.nodes.values()) {
            mspIDs.add(node.msp_id);
        }
        return Array.from(mspIDs).sort();
    }

    public getAllCertificateAuthorityNames(): Array<string> {
        return Array.from(this.certificateAuthorities.keys()).sort();
    }

    public async getInstalledChaincode(peerName: string): Promise<Map<string, Array<string>>> {
        console.log('getInstalledChaincode', peerName);
        const installedChainCodes: Map<string, Array<string>> = new Map<string, Array<string>>();
        const peer: Client.Peer = this.getPeer(peerName);
        await this.setNodeContext(peerName);
        let chaincodeResponse: Client.ChaincodeQueryResponse;
        try {
            chaincodeResponse = await this.client.queryInstalledChaincodes(peer);
        } catch (error) {
            if (error.message && error.message.match(/access denied/)) {
                // Not allowed to do this as we're probably not an administrator.
                // This is probably not the end of the world, so return the empty map.
                return installedChainCodes;
            }
            throw error;
        }
        for (const chaincode of chaincodeResponse.chaincodes) {
            if (installedChainCodes.has(chaincode.name)) {
                installedChainCodes.get(chaincode.name).push(chaincode.version);
            } else {
                installedChainCodes.set(chaincode.name, [chaincode.version]);
            }
        }

        return installedChainCodes;
    }

    public getAllOrdererNames(): Array<string> {
        return Array.from(this.orderers.keys()).sort();
    }

    public async installChaincode(packageRegistryEntry: PackageRegistryEntry, peerName: string): Promise<void> {
        const peer: Client.Peer = this.getPeer(peerName);
        await this.setNodeContext(peerName);
        const pkgBuffer: Buffer = await fs.readFile(packageRegistryEntry.path);
        const installRequest: Client.ChaincodePackageInstallRequest = {
            targets: [peer],
            chaincodePackage: pkgBuffer,
            txId: this.client.newTransactionID()
        };
        const response: Client.ProposalResponseObject = await this.client.installChaincode(installRequest);
        const proposalResponse: Client.ProposalResponse | Error = response[0][0];
        if (proposalResponse instanceof Error) {
            throw proposalResponse;
        } else if (proposalResponse.response.status !== 200) {
            throw new Error(proposalResponse.response.message);
        }
    }

    public async instantiateChaincode(name: string, version: string, peerNames: Array<string>, channelName: string, fcn: string, args: Array<string>): Promise<Buffer> {
        return this.instantiateOrUpgradeChaincode(name, version, peerNames, channelName, fcn, args, false);
    }

    public async upgradeChaincode(name: string, version: string, peerNames: Array<string>, channelName: string, fcn: string, args: Array<string>): Promise<Buffer> {
        return this.instantiateOrUpgradeChaincode(name, version, peerNames, channelName, fcn, args, true);
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

    private async instantiateOrUpgradeChaincode(name: string, version: string, peerNames: Array<string>, channelName: string, fcn: string, args: Array<string>, upgrade: boolean): Promise<Buffer> {

        // Locate all of the requested peer nodes.
        const peers: Array<Client.Peer> = peerNames.map((peerName: string) => this.getPeer(peerName));

        // Get the channel.
        const channel: Client.Channel = this.getOrCreateChannel(channelName);

        // Determine if a chaincode with the specified name is already instantiated on this channel.
        // Use the first peer to perform this query, and as the signing identity for all subsequent operations.
        await this.setNodeContext(peerNames[0]);
        const instantiatedChaincodes: Client.ChaincodeQueryResponse = await channel.queryInstantiatedChaincodes(peers[0]);
        let foundChaincodeName: boolean = false;
        let foundChaincodeNameAndVersion: boolean = false;
        for (const chaincode of instantiatedChaincodes.chaincodes) {
            if (chaincode.name === name) {
                foundChaincodeName = true;
                if (chaincode.version === version) {
                    foundChaincodeNameAndVersion = true;
                }
            }
        }

        // Build the transaction proposal.
        const txId: Client.TransactionId = this.client.newTransactionID();
        const instantiateOrUpgradeRequest: Client.ChaincodeInstantiateUpgradeRequest = {
            targets: peers,
            chaincodeId: name,
            chaincodeVersion: version,
            txId,
            fcn,
            args
        };

        // Send the instantiate/upgrade proposal to all of the specified peers.
        let proposalResponseObject: Client.ProposalResponseObject;
        if (!upgrade) {
            if (foundChaincodeName) {
                throw new Error(`The smart contract ${name} is already instantiated on the channel ${channelName}`);
            } else {
                this.outputAdapter.log(LogType.INFO, undefined, `Instantiating with function: '${fcn}' and arguments: '${args}'`);
                // Use a lengthy timeout to cater for building of Docker images on slower systems.
                proposalResponseObject = await channel.sendInstantiateProposal(instantiateOrUpgradeRequest, 5 * 60 * 1000);
            }
        } else {
            if (foundChaincodeNameAndVersion) {
                throw new Error(`The smart contract ${name} with version ${version} is already instantiated on the channel ${channelName}`);
            } else if (!foundChaincodeName) {
                throw new Error(`The smart contract ${name} is not instantiated on the channel ${channelName}, so cannot be upgraded`);
            } else {
                this.outputAdapter.log(LogType.INFO, undefined, `Upgrading with function: '${fcn}' and arguments: '${args}'`);
                // Use a lengthy timeout to cater for building of Docker images on slower systems.
                proposalResponseObject = await channel.sendUpgradeProposal(instantiateOrUpgradeRequest, 5 * 60 * 1000);
            }
        }

        // Validate the proposal responses.
        let payload: Buffer = null;
        const validProposalResponses: Client.ProposalResponse[] = [];
        const proposal: Client.Proposal = proposalResponseObject[1];
        for (const proposalResponse of proposalResponseObject[0]) {
            if (proposalResponse instanceof Error) {
                throw proposalResponse;
            } else if (proposalResponse.response.status !== 200) {
                throw new Error(proposalResponse.response.message);
            } else if (proposalResponse.response.payload.length) {
                payload = proposalResponse.response.payload;
            }
            validProposalResponses.push(proposalResponse);
        }

        // Set up the channel event hub for this transaction.
        const eventHub: Client.ChannelEventHub = channel.newChannelEventHub(peers[0]);
        let eventReceived: boolean = false;
        await new Promise((resolve: any, reject: any): void => {
            eventHub.connect(null, (err: Error) => {
                // Doesn't matter if we received the event.
                if (err && !eventReceived) {
                    return reject(err);
                }
                resolve();
            });
        });
        const eventHubPromise: any = new Promise((resolve: any, reject: any): void => {
            eventHub.registerTxEvent(txId.getTransactionID(), (eventTxId: string, code: string, blockNumber: number): void => {
                eventReceived = true;
                if (code !== 'VALID') {
                    return reject(new Error(`Peer ${peerNames[0]} has rejected the transaction ${eventTxId} with code ${code} in block ${blockNumber}`));
                }
                resolve();
            }, (err: Error): void => {
                // Doesn't matter if we received the event.
                if (err && !eventReceived) {
                    return reject(err);
                }
            }, {
                disconnect: true,
                unregister: true
            });
        });

        // Send the proposal responses to the ordering service.
        // TODO: this badly assumes there is only ever one ordering service.
        const orderer: Client.Orderer = Array.from(this.orderers.values())[0];
        const broadcastResponse: Client.BroadcastResponse = await channel.sendTransaction({
            proposal,
            proposalResponses: validProposalResponses,
            orderer,
            txId
        });

        // Check that the ordering service accepted the transaction.
        if (broadcastResponse.status !== 'SUCCESS') {
            eventHub.disconnect();
            throw new Error(`Failed to send peer responses for transaction ${txId.getTransactionID()} to orderer. Response status: ${broadcastResponse.status}`);
        }

        // Wait for the transaction to be committed to the ledger.
        await eventHubPromise;

        // Return the payload, if any.
        return payload;

    }

    private async setNodeContext(nodeName: string): Promise<void> {
        const node: FabricNode = this.getNode(nodeName);
        const walletName: string = node.wallet;
        const identityName: string = node.identity;
        const fabricWalletGenerator: IFabricWalletGenerator = FabricWalletGeneratorFactory.createFabricWalletGenerator();
        const fabricWallet: IFabricWallet = await fabricWalletGenerator.createLocalWallet(walletName);
        await fabricWallet['setUserContext'](this.client, identityName);
    }

    private getPeer(peerName: string): Client.Peer {
        if (!this.peers.has(peerName)) {
            throw new Error(`The Fabric peer ${peerName} does not exist`);
        }
        return this.peers.get(peerName);
    }

    private getCertificateAuthority(certificateAuthorityName: string): FabricCAServices {
        if (!this.certificateAuthorities.has(certificateAuthorityName)) {
            throw new Error(`The Fabric certificate authority ${certificateAuthorityName} does not exist`);
        }
        return this.certificateAuthorities.get(certificateAuthorityName);
    }

    private getOrCreateChannel(channelName: string): Client.Channel {
        let channel: Client.Channel = this.client.getChannel(channelName, false);
        if (!channel) {
            channel = this.client.newChannel(channelName);
        }
        return channel;
    }

    private async getAllChannelNamesForPeer(peerName: string): Promise<Array<string>> {
        const peer: Client.Peer = this.getPeer(peerName);
        await this.setNodeContext(peerName);
        const channelQueryResponse: Client.ChannelQueryResponse = await this.client.queryChannels(peer);
        return channelQueryResponse.channels.map((channel: Client.ChannelInfo) => channel.channel_id).sort();
    }

}
