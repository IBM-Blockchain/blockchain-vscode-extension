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
import * as FabricCAServices from 'fabric-ca-client';
import * as fs from 'fs-extra';
import { ConsoleOutputAdapter, FabricChaincode, Attribute, FabricNode, FabricNodeType, IFabricEnvironmentConnection, IFabricWallet, OutputAdapter, LogType, FabricWalletRegistryEntry, FabricWalletRegistry } from 'ibm-blockchain-platform-common';
import { FabricWalletGenerator } from 'ibm-blockchain-platform-wallet';
import { URL } from 'url';

export class FabricEnvironmentConnection implements IFabricEnvironmentConnection {
    public environmentName: string;

    private outputAdapter: OutputAdapter;
    private nodes: Map<string, FabricNode> = new Map<string, FabricNode>();
    private client: Client;
    private peers: Map<string, Client.Peer> = new Map<string, Client.Peer>();
    private orderers: Map<string, Client.Orderer> = new Map<string, Client.Orderer>();
    private certificateAuthorities: Map<string, FabricCAServices> = new Map<string, FabricCAServices>();
    private mspIDs: Set<string> = new Set<string>();

    constructor(environmentName: string, outputAdapter?: OutputAdapter) {
        if (!outputAdapter) {
            this.outputAdapter = ConsoleOutputAdapter.instance();
        } else {
            this.outputAdapter = outputAdapter;
        }

        this.environmentName = environmentName;
    }

    public async connect(nodes: FabricNode[]): Promise<void> {
        this.client = new Client();
        this.client.setCryptoSuite(Client.newCryptoSuite());
        for (const node of nodes) {
            switch (node.type) {
                case FabricNodeType.PEER:
                case FabricNodeType.ORDERER: {
                    // Build the default options - don't specify pem or ssl_target_name_override unless they're actually specified
                    // as part of the node, as they stop us being able to set some of the 'grpc.*' options below.
                    let pem: string;
                    if (node.pem) {
                        pem = Buffer.from(node.pem, 'base64').toString();
                    }
                    let sslTargetNameOverride: string;
                    if (node.ssl_target_name_override) {
                        sslTargetNameOverride = node.ssl_target_name_override;
                    }
                    const defaultOptions: Client.ConnectionOpts = { pem, 'ssl-target-name-override': sslTargetNameOverride };
                    // Merge these with any user provided options.
                    const mergedOptions: Client.ConnectionOpts = Object.assign(defaultOptions, node.api_options);
                    // Figure out what the name of the node should be; if the hostname is localhost, and any of these options are
                    // being used to set the actual name in the host/authority header - then we should use that name instead.
                    const nameOverrides: string[] = ['grpc.default_authority', 'grpc.ssl_target_name_override'];
                    for (const nameOverride of nameOverrides) {
                        if (mergedOptions[nameOverride]) {
                            mergedOptions.name = mergedOptions[nameOverride];
                            break;
                        }
                    }
                    if (node.type === FabricNodeType.PEER) {
                        const peer: Client.Peer = this.client.newPeer(node.api_url, mergedOptions);
                        this.peers.set(node.name, peer);
                    } else {
                        const orderer: Client.Orderer = this.client.newOrderer(node.api_url, mergedOptions);
                        this.orderers.set(node.name, orderer);
                    }
                    break;
                }
                case FabricNodeType.CERTIFICATE_AUTHORITY: {
                    let trustedRoots: Buffer;
                    if (node.pem) {
                        trustedRoots = Buffer.from(node.pem, 'base64');
                    }

                    const caName: string = node.ca_name || node.name;
                    const certificateAuthority: FabricCAServices = new FabricCAServices(node.api_url, { trustedRoots, verify: false }, caName, this.client.getCryptoSuite());
                    this.certificateAuthorities.set(node.name, certificateAuthority);
                    break;
                }
                default:
                    continue;
            }

            if (node.msp_id) {
                this.mspIDs.add(node.msp_id);
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

    public async createChannelMap(): Promise<{channelMap: Map<string, Array<string>>, v2channels: Array<string>}> {
        try {
            const channelMap: Map<string, Array<string>> = new Map<string, Array<string>>();
            const v2channels: Array<string> = [];

            for (const [peerName, peer] of this.peers.entries()) {
                const channelNames: Array<string> = await this.getAllChannelNamesForPeer(peerName);
                for (const channelName of channelNames) {
                    const channel: Client.Channel = this.getOrCreateChannel(channelName);

                    const configEnvelope: any = await channel.getChannelConfig(peer);
                    const capabilities: string[] = channel.getChannelCapabilities(configEnvelope);
                    if (capabilities.includes('V2_0')) {
                        if (!v2channels.includes(channelName)) {
                            v2channels.push(channelName);
                        }
                        continue;
                    }

                    if (!channelMap.has(channelName)) {
                        channelMap.set(channelName, [peerName]);
                    } else {
                        channelMap.get(channelName).push(peerName);
                    }
                }
            }

            if (channelMap.size === 0) {
                throw new Error(`There are no channels with V1 capabilities enabled.`);
            }
            return {channelMap: channelMap, v2channels: v2channels};

        } catch (error) {
            if (error.message && error.message.includes('Received http2 header with status: 503')) { // If gRPC can't connect to Fabric
                throw new Error(`Cannot connect to Fabric: ${error.message}`);
            } else if (error.message.includes('There are no channels with V1 capabilities enabled.')) {
                throw new Error(`Unable to connect to network, ${error.message}`);
            } else {
                throw new Error(`Error querying channels: ${error.message}`);
            }
        }
    }

    public async getInstantiatedChaincode(peerNames: Array<string>, channelName: string): Promise<Array<FabricChaincode>> {

        // Locate all of the requested peer nodes.
        const peers: Array<Client.Peer> = peerNames.map((peerName: string) => this.getPeer(peerName));

        // Get the channel.
        const channel: Client.Channel = this.getOrCreateChannel(channelName);

        // Use the first peer to perform this query.
        await this.setNodeContext(peerNames[0]);
        const instantiatedChaincodes: Client.ChaincodeQueryResponse = await channel.queryInstantiatedChaincodes(peers[0]);
        return instantiatedChaincodes.chaincodes.map((chaincode: Client.ChaincodeInfo) => {
            return new FabricChaincode(chaincode.name, chaincode.version);
        });

    }

    public async getAllInstantiatedChaincodes(): Promise<Array<FabricChaincode>> {

        try {
            const createChannelsResult: {channelMap: Map<string, string[]>, v2channels: string[]} = await this.createChannelMap();

            const chaincodes: Array<FabricChaincode> = []; // We can change the array type if we need more detailed chaincodes in future

            for (const [channelName, peerNames] of createChannelsResult.channelMap) {
                const channelChaincodes: Array<FabricChaincode> = await this.getInstantiatedChaincode(peerNames, channelName); // Returns channel chaincodes
                for (const chaincode of channelChaincodes) { // For each channel chaincodes, push it to the 'chaincodes' array if it doesn't exist

                    const alreadyExists: boolean = chaincodes.some((_chaincode: FabricChaincode) => {
                        return _chaincode.name === chaincode.name && _chaincode.version === chaincode.version;
                    });
                    if (!alreadyExists) {
                        chaincodes.push(chaincode);
                    }
                }
            }

            chaincodes.sort((a: FabricChaincode, b: FabricChaincode): number => {
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
        return Array.from(this.mspIDs).sort();
    }

    public getAllCertificateAuthorityNames(): Array<string> {
        return Array.from(this.certificateAuthorities.keys()).sort();
    }

    public async getInstalledChaincode(peerName: string): Promise<Map<string, Array<string>>> {
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

    public async installChaincode(pathToPackage: string, peerName: string): Promise<void> {
        const peer: Client.Peer = this.getPeer(peerName);
        await this.setNodeContext(peerName);
        const pkgBuffer: Buffer = await fs.readFile(pathToPackage);
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

    public async instantiateChaincode(name: string, version: string, peerNames: Array<string>, channelName: string, fcn: string, args: Array<string>, collectionPath: string, contractEP: any): Promise<Buffer> {
        return this.instantiateOrUpgradeChaincode(name, version, peerNames, channelName, fcn, args, collectionPath, contractEP, false);
    }

    public async upgradeChaincode(name: string, version: string, peerNames: Array<string>, channelName: string, fcn: string, args: Array<string>, collectionPath: string, contractEP: any): Promise<Buffer> {
        return this.instantiateOrUpgradeChaincode(name, version, peerNames, channelName, fcn, args, collectionPath, contractEP, true);
    }

    public async enroll(certificateAuthorityName: string, enrollmentID: string, enrollmentSecret: string): Promise<{ certificate: string, privateKey: string }> {
        const certificateAuthority: FabricCAServices = this.getCertificateAuthority(certificateAuthorityName);
        const enrollment: FabricCAServices.IEnrollResponse = await certificateAuthority.enroll({ enrollmentID, enrollmentSecret });
        return { certificate: enrollment.certificate, privateKey: enrollment.key.toBytes() };
    }

    public async register(certificateAuthorityName: string, enrollmentID: string, affiliation: string, attributes: Attribute[] = []): Promise<string> {
        const certificateAuthority: FabricCAServices = this.getCertificateAuthority(certificateAuthorityName);
        const request: FabricCAServices.IRegisterRequest = {
            enrollmentID: enrollmentID,
            affiliation: affiliation,
            role: 'client',
            attrs: attributes
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

        const walletRegistryEntry: FabricWalletRegistryEntry = await FabricWalletRegistry.instance().get(walletName, this.environmentName);
        return FabricWalletGenerator.instance().getWallet(walletRegistryEntry);
    }

    private async instantiateOrUpgradeChaincode(name: string, version: string, peerNames: Array<string>, channelName: string, fcn: string, args: Array<string>, collectionsConfig: string, contractEP: any,  upgrade: boolean): Promise<Buffer> {

        const peers: Array<Client.Peer> = [];
        // filter out the peers that don't have the smart contract installed
        for (const peerName of peerNames) {
            const installedChaicodes: Map<string, string[]> = await this.getInstalledChaincode(peerName);
            const chaincodeVersions: string[] = installedChaicodes.get(name);
            if (chaincodeVersions) {
                const foundVersion: string = chaincodeVersions.find((_version: string) => version === _version);
                if (foundVersion) {
                    const peer: Client.Peer = this.getPeer(peerName);
                    peers.push(peer);
                }
            }
        }

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

        // Check for the error cases.
        if (!upgrade) {
            if (foundChaincodeName) {
                throw new Error(`The smart contract ${name} is already instantiated on the channel ${channelName}`);
            }
        } else {
            if (foundChaincodeNameAndVersion) {
                throw new Error(`The smart contract ${name} with version ${version} is already instantiated on the channel ${channelName}`);
            } else if (!foundChaincodeName) {
                throw new Error(`The smart contract ${name} is not instantiated on the channel ${channelName}, so cannot be upgraded`);
            }
        }

        // Find the orderer for this channel.
        const orderer: Client.Orderer = await this.getOrdererForChannel(peers, channel);

        // Build the transaction proposal.
        const txId: Client.TransactionId = this.client.newTransactionID();
        const instantiateOrUpgradeRequest: Client.ChaincodeInstantiateUpgradeRequest = {
            'targets': peers,
            'chaincodeId': name,
            'chaincodeVersion': version,
            txId,
            fcn,
            args,
            'collections-config': collectionsConfig,
            'endorsement-policy': contractEP
        };

        // Send the instantiate/upgrade proposal to all of the specified peers.
        let proposalResponseObject: Client.ProposalResponseObject;
        if (!upgrade) {
            this.outputAdapter.log(LogType.INFO, undefined, `Instantiating with function: '${fcn}' and arguments: '${args}'`);
            // Use a lengthy timeout to cater for building of Docker images on slower systems.
            proposalResponseObject = await channel.sendInstantiateProposal(instantiateOrUpgradeRequest, 5 * 60 * 1000);
        } else {
            this.outputAdapter.log(LogType.INFO, undefined, `Upgrading with function: '${fcn}' and arguments: '${args}'`);
            // Use a lengthy timeout to cater for building of Docker images on slower systems.
            proposalResponseObject = await channel.sendUpgradeProposal(instantiateOrUpgradeRequest, 5 * 60 * 1000);
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
        const fabricWallet: IFabricWallet = await this.getWallet(nodeName);
        await fabricWallet['setUserContext'](this.client, node.identity);
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

    private isPeerLocal(peer: Client.Peer): boolean {
        const localhosts: string[] = [
            'localhost',
            '127.0.0.1'
        ];
        const peerURL: URL = new URL(`${peer.getUrl()}`);
        return localhosts.indexOf(peerURL.hostname) !== -1;
    }

    private areAllPeersLocal(peers: Client.Peer[]): boolean {
        return peers.every((peer: Client.Peer) => this.isPeerLocal(peer));
    }

    private async getOrdererForChannel(peers: Client.Peer[], channel: Client.Channel): Promise<Client.Orderer> {

        // Get and decode the channel configuration, which contains an array of orderer addresses.
        const configEnvelope: any = await channel.getChannelConfig(peers[0]);
        const loadedConfigEnvelope: any = channel.loadConfigEnvelope(configEnvelope);

        // Check for a direct match against the "name" (aka host) of the orderer.
        for (const ordererHost of loadedConfigEnvelope.orderers as string[]) {
            for (const orderer of this.orderers.values()) {
                if (orderer.getName() === ordererHost) {
                    return orderer;
                }
            }
        }

        // We didn't find a direct match - if all the peers are local, then it's a good chance the orderer
        // is local and we need to force the hostname to localhost - if not, throw an error.
        const areAllPeersLocal: boolean = this.areAllPeersLocal(peers);
        if (!areAllPeersLocal) {
            throw new Error(`Failed to find Fabric orderer(s) ${loadedConfigEnvelope.orderers.join(', ')} for channel ${channel.getName()}`);
        }

        // Check for a match against the port of the orderer.
        for (const ordererHost of loadedConfigEnvelope.orderers as string[]) {
            const ordererPort: string = ordererHost.split(':')[1];
            for (const orderer of this.orderers.values()) {
                if (orderer.getName() === `localhost:${ordererPort}`) {
                    return orderer;
                }
            }
        }

        // Couldn't find any match.
        throw new Error(`Failed to find Fabric orderer(s) ${loadedConfigEnvelope.orderers.join(', ')} for channel ${channel.getName()}`);

    }

}
