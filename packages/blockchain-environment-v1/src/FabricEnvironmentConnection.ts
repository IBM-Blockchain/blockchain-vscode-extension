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

import * as FabricCAServices from 'fabric-ca-client';
import * as fs from 'fs-extra';
import { FabricCommittedSmartContract, Attribute, FabricNode, FabricNodeType, IFabricEnvironmentConnection, FabricWalletRegistryEntry, FabricWalletRegistry, IFabricWallet, FabricInstalledSmartContract } from 'ibm-blockchain-platform-common';
import { FabricWalletGenerator, FabricWallet } from 'ibm-blockchain-platform-wallet';
import { URL } from 'url';
import { Lifecycle, LifecyclePeer, LifecycleChannel, DefinedSmartContract, InstalledSmartContract } from 'ibm-blockchain-platform-fabric-admin';
import { Identity, IdentityProvider } from 'fabric-network';
import { User } from 'fabric-common';

export class FabricEnvironmentConnection implements IFabricEnvironmentConnection {
    public environmentName: string;

    private nodes: Map<string, FabricNode> = new Map<string, FabricNode>();
    private certificateAuthorities: Map<string, FabricCAServices> = new Map<string, FabricCAServices>();
    private mspIDs: Set<string> = new Set<string>();
    private lifecycle: Lifecycle;

    constructor(environmentName: string) {
        this.environmentName = environmentName;
    }

    public async connect(nodes: FabricNode[]): Promise<void> {
        this.lifecycle = new Lifecycle();

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
<<<<<<< HEAD

                    this.lifecycle.addPeer({ name: node.name, mspid: node.msp_id, pem: pem, sslTargetNameOverride: sslTargetNameOverride, url: node.api_url });

                    break;
                }
                case FabricNodeType.ORDERER: {
                    const url: URL = new URL(node.api_url);
                    let pem: string;
                    if (node.pem) {
                        pem = Buffer.from(node.pem, 'base64').toString();
=======
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
>>>>>>> 4653e531... Add api_options and chaincode_options to a peer/orderer (resolves #2312)
                    }
                    if (node.type === FabricNodeType.PEER) {
                        const peer: Client.Peer = this.client.newPeer(node.api_url, mergedOptions);
                        this.peers.set(node.name, peer);
                    } else {
                        const orderer: Client.Orderer = this.client.newOrderer(node.api_url, mergedOptions);
                        this.orderers.set(node.name, orderer);
                    }
<<<<<<< HEAD

                    this.lifecycle.addOrderer({ name: node.name, pem: pem, sslTargetNameOverride: sslTargetNameOverride, url: node.api_url });
=======
>>>>>>> 4653e531... Add api_options and chaincode_options to a peer/orderer (resolves #2312)
                    break;
                }
                case FabricNodeType.CERTIFICATE_AUTHORITY: {
                    let trustedRoots: Buffer;
                    if (node.pem) {
                        trustedRoots = Buffer.from(node.pem, 'base64');
                    }

                    const caName: string = node.ca_name || node.name;
                    const certificateAuthority: FabricCAServices = new FabricCAServices(node.api_url, { trustedRoots, verify: false }, caName);
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
        this.lifecycle = null;
        this.certificateAuthorities.clear();
    }

    public getAllPeerNames(): Array<string> {
        return this.lifecycle.getAllPeerNames();
    }

    public async createChannelMap(): Promise<Map<string, Array<string>>> {
        try {
            const channelMap: Map<string, Array<string>> = new Map<string, Array<string>>();

            const peerNames: string[] = this.getAllPeerNames();

            for (const peerName of peerNames) {
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
                throw new Error(`Error querying channels: ${error.message}`);
            }
        }
    }

    public async getCommittedSmartContracts(peerNames: Array<string>, channelName: string): Promise<Array<FabricCommittedSmartContract>> {

        const wallet: FabricWallet = await this.getWallet(peerNames[0]) as FabricWallet;
        const peerNode: FabricNode = this.getNode(peerNames[0]);

        // Get the channel.
        const channel: LifecycleChannel = this.lifecycle.getChannel(channelName, wallet.getWallet(), peerNode.identity);
        const committedContracts: DefinedSmartContract[] = await channel.getAllCommittedSmartContracts(peerNames[0]);

        // TODO: might need to update this to return more things but keeping the same for now
        return committedContracts.map((committedContract: DefinedSmartContract) => {
            return new FabricCommittedSmartContract(committedContract.smartContractName, committedContract.smartContractVersion, committedContract.sequence);
        });
    }

    public async getAllCommittedSmartContracts(): Promise<Array<FabricCommittedSmartContract>> {

        try {
            const channelMap: Map<string, Array<string>> = await this.createChannelMap();

            const chaincodes: Array<FabricCommittedSmartContract> = []; // We can change the array type if we need more detailed chaincodes in future

            for (const [channelName, peerNames] of channelMap) {
                const channelChaincodes: Array<FabricCommittedSmartContract> = await this.getCommittedSmartContracts(peerNames, channelName); // Returns channel smart contracts
                for (const chaincode of channelChaincodes) { // For each channel smart contract, push it to the 'smart contracts' array if it doesn't exist

                    const alreadyExists: boolean = chaincodes.some((_chaincode: FabricCommittedSmartContract) => {
                        return _chaincode.name === chaincode.name && _chaincode.version === chaincode.version;
                    });
                    if (!alreadyExists) {
                        chaincodes.push(chaincode);
                    }
                }
            }

            chaincodes.sort((a: FabricCommittedSmartContract, b: FabricCommittedSmartContract): number => {
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

    public async getInstalledSmartContracts(peerName: string): Promise<Array<FabricInstalledSmartContract>> {
        const peer: LifecyclePeer = await this.getPeer(peerName);
        let installedSmartContracts: InstalledSmartContract[];
        try {
            installedSmartContracts = await peer.getAllInstalledSmartContracts();
        } catch (error) {
            if (error.message && error.message.match(/access denied/)) {
                // Not allowed to do this as we're probably not an administrator.
                // This is probably not the end of the world, so return the empty map.
                return [];
            }
            throw error;
        }

        // Need to do this so we don't need to import fabric admin everywhere
        return installedSmartContracts.map((installedSmartContract: InstalledSmartContract) => {
            return { label: installedSmartContract.label, packageId: installedSmartContract.packageId };
        });
    }

    public getAllOrdererNames(): Array<string> {
        return this.lifecycle.getAllOrdererNames();
    }

    public async installSmartContract(pathToPackage: string, peerName: string): Promise<string> {
        const peer: LifecyclePeer = await this.getPeer(peerName);

        const pkgBuffer: Buffer = await fs.readFile(pathToPackage);

        return peer.installSmartContractPackage(pkgBuffer, 90000);
    }

    public async approveSmartContractDefinition(ordererName: string, channelName: string, peerNames: string[],  name: string, version: string, packageId: string, sequence: number): Promise<void> {
        const wallet: FabricWallet = await this.getWallet(peerNames[0]) as FabricWallet;
        const peerNode: FabricNode = this.getNode(peerNames[0]);
        const channel: LifecycleChannel = this.lifecycle.getChannel(channelName, wallet.getWallet(), peerNode.identity);

        return channel.approveSmartContractDefinition(peerNames, ordererName, {smartContractName: name, smartContractVersion: version, packageId: packageId, sequence: sequence});
    }

    public async commitSmartContractDefinition(ordererName: string, channelName: string, peerNames: string[],  name: string, version: string, sequence: number): Promise<void> {
        const wallet: FabricWallet = await this.getWallet(peerNames[0]) as FabricWallet;
        const peerNode: FabricNode = this.getNode(peerNames[0]);
        const channel: LifecycleChannel = this.lifecycle.getChannel(channelName, wallet.getWallet(), peerNode.identity);

        return channel.commitSmartContractDefinition(peerNames, ordererName, {smartContractName: name, smartContractVersion: version, sequence: sequence});
    }

    public async getCommitReadiness(channelName: string, peerName: string, name: string, version: string, sequence: number ): Promise<boolean>  {
        const wallet: FabricWallet = await this.getWallet(peerName) as FabricWallet;
        const peerNode: FabricNode = this.getNode(peerName);
        const channel: LifecycleChannel = this.lifecycle.getChannel(channelName, wallet.getWallet(), peerNode.identity);

        const result: Map<string, boolean> = await channel.getCommitReadiness(peerName, {smartContractName: name, smartContractVersion: version, sequence: sequence });

        return Array.from(result.values()).every((value) => value);
    }

    public async instantiateChaincode(_name: string, _version: string, _peerNames: Array<string>, _channelName: string, _fcn: string, _args: Array<string>, _collectionPath: string, _contractEP: any): Promise<Buffer> {
        return Buffer.from('TODO');
        // return this.instantiateOrUpgradeChaincode(name, version, peerNames, channelName, fcn, args, collectionPath, contractEP, false);
    }

    public async upgradeChaincode(_name: string, _version: string, _peerNames: Array<string>, _channelName: string, _fcn: string, _args: Array<string>, _collectionPath: string, _contractEP: any): Promise<Buffer> {
        return Buffer.from('TODO');
        // return this.instantiateOrUpgradeChaincode(name, version, peerNames, channelName, fcn, args, collectionPath, contractEP, true);
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

        const node: FabricNode = this.getNode(certificateAuthorityName);
        const fabricWallet: FabricWallet = await this.getWallet(certificateAuthorityName) as FabricWallet;
        const identity: Identity = await fabricWallet.getWallet().get(node.identity);
        const provider: IdentityProvider = fabricWallet.getWallet().getProviderRegistry().getProvider(identity.type);
        const user: User = await provider.getUserContext(identity, node.identity);
        const secret: string = await certificateAuthority.register(request, user);
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

    // private async instantiateOrUpgradeChaincode(name: string, version: string, peerNames: Array<string>, channelName: string, fcn: string, args: Array<string>, collectionsConfig: string, contractEP: any, upgrade: boolean): Promise<Buffer> {

    //     const peers: Array<Client.Peer> = [];
    //     // filter out the peers that don't have the smart contract installed
    //     for (const peerName of peerNames) {
    //         const installedChaicodes: Map<string, string[]> = await this.getInstalledChaincode(peerName);
    //         const chaincodeVersions: string[] = installedChaicodes.get(name);
    //         if (chaincodeVersions) {
    //             const foundVersion: string = chaincodeVersions.find((_version: string) => version === _version);
    //             if (foundVersion) {
    //                 const peer: Client.Peer = this.getPeer(peerName);
    //                 peers.push(peer);
    //             }
    //         }
    //     }

    //     // Get the channel.
    //     const channel: Client.Channel = this.getOrCreateChannel(channelName);

    //     // Determine if a chaincode with the specified name is already instantiated on this channel.
    //     // Use the first peer to perform this query, and as the signing identity for all subsequent operations.
    //     await this.setNodeContext(peerNames[0]);
    //     const instantiatedChaincodes: Client.ChaincodeQueryResponse = await channel.queryInstantiatedChaincodes(peers[0]);
    //     let foundChaincodeName: boolean = false;
    //     let foundChaincodeNameAndVersion: boolean = false;
    //     for (const chaincode of instantiatedChaincodes.chaincodes) {
    //         if (chaincode.name === name) {
    //             foundChaincodeName = true;
    //             if (chaincode.version === version) {
    //                 foundChaincodeNameAndVersion = true;
    //             }
    //         }
    //     }

    //     // Check for the error cases.
    //     if (!upgrade) {
    //         if (foundChaincodeName) {
    //             throw new Error(`The smart contract ${name} is already instantiated on the channel ${channelName}`);
    //         }
    //     } else {
    //         if (foundChaincodeNameAndVersion) {
    //             throw new Error(`The smart contract ${name} with version ${version} is already instantiated on the channel ${channelName}`);
    //         } else if (!foundChaincodeName) {
    //             throw new Error(`The smart contract ${name} is not instantiated on the channel ${channelName}, so cannot be upgraded`);
    //         }
    //     }

    //     // Find the orderer for this channel.
    //     const orderer: Client.Orderer = await this.getOrdererForChannel(peers, channel);

    //     // Build the transaction proposal.
    //     const txId: Client.TransactionId = this.client.newTransactionID();
    //     const instantiateOrUpgradeRequest: Client.ChaincodeInstantiateUpgradeRequest = {
    //         'targets': peers,
    //         'chaincodeId': name,
    //         'chaincodeVersion': version,
    //         txId,
    //         fcn,
    //         args,
    //         'collections-config': collectionsConfig,
    //         'endorsement-policy': contractEP
    //     };

    //     // Send the instantiate/upgrade proposal to all of the specified peers.
    //     let proposalResponseObject: Client.ProposalResponseObject;
    //     if (!upgrade) {
    //         this.outputAdapter.log(LogType.INFO, undefined, `Instantiating with function: '${fcn}' and arguments: '${args}'`);
    //         // Use a lengthy timeout to cater for building of Docker images on slower systems.
    //         proposalResponseObject = await channel.sendInstantiateProposal(instantiateOrUpgradeRequest, 5 * 60 * 1000);
    //     } else {
    //         this.outputAdapter.log(LogType.INFO, undefined, `Upgrading with function: '${fcn}' and arguments: '${args}'`);
    //         // Use a lengthy timeout to cater for building of Docker images on slower systems.
    //         proposalResponseObject = await channel.sendUpgradeProposal(instantiateOrUpgradeRequest, 5 * 60 * 1000);
    //     }

    //     // Validate the proposal responses.
    //     let payload: Buffer = null;
    //     const validProposalResponses: Client.ProposalResponse[] = [];
    //     const proposal: Client.Proposal = proposalResponseObject[1];
    //     for (const proposalResponse of proposalResponseObject[0]) {
    //         if (proposalResponse instanceof Error) {
    //             throw proposalResponse;
    //         } else if (proposalResponse.response.status !== 200) {
    //             throw new Error(proposalResponse.response.message);
    //         } else if (proposalResponse.response.payload.length) {
    //             payload = proposalResponse.response.payload;
    //         }
    //         validProposalResponses.push(proposalResponse);
    //     }

    //     // Set up the channel event hub for this transaction.
    //     const eventHub: Client.ChannelEventHub = channel.newChannelEventHub(peers[0]);
    //     let eventReceived: boolean = false;
    //     await new Promise((resolve: any, reject: any): void => {
    //         eventHub.connect(null, (err: Error) => {
    //             // Doesn't matter if we received the event.
    //             if (err && !eventReceived) {
    //                 return reject(err);
    //             }
    //             resolve();
    //         });
    //     });
    //     const eventHubPromise: any = new Promise((resolve: any, reject: any): void => {
    //         eventHub.registerTxEvent(txId.getTransactionID(), (eventTxId: string, code: string, blockNumber: number): void => {
    //             eventReceived = true;
    //             if (code !== 'VALID') {
    //                 return reject(new Error(`Peer ${peerNames[0]} has rejected the transaction ${eventTxId} with code ${code} in block ${blockNumber}`));
    //             }
    //             resolve();
    //         }, (err: Error): void => {
    //             // Doesn't matter if we received the event.
    //             if (err && !eventReceived) {
    //                 return reject(err);
    //             }
    //         }, {
    //             disconnect: true,
    //             unregister: true
    //         });
    //     });

    //     // Send the proposal responses to the ordering service.
    //     const broadcastResponse: Client.BroadcastResponse = await channel.sendTransaction({
    //         proposal,
    //         proposalResponses: validProposalResponses,
    //         orderer,
    //         txId
    //     });

    //     // Check that the ordering service accepted the transaction.
    //     if (broadcastResponse.status !== 'SUCCESS') {
    //         eventHub.disconnect();
    //         throw new Error(`Failed to send peer responses for transaction ${txId.getTransactionID()} to orderer. Response status: ${broadcastResponse.status}`);
    //     }

    //     // Wait for the transaction to be committed to the ledger.
    //     await eventHubPromise;

    //     // Return the payload, if any.
    //     return payload;

    // }

    private async getPeer(peerName: string): Promise<LifecyclePeer> {
        const node: FabricNode = this.getNode(peerName);
        const fabricWallet: FabricWallet = await this.getWallet(peerName) as FabricWallet;

        return this.lifecycle.getPeer(peerName, fabricWallet.getWallet(), node.identity);
    }

    private getCertificateAuthority(certificateAuthorityName: string): FabricCAServices {
        if (!this.certificateAuthorities.has(certificateAuthorityName)) {
            throw new Error(`The Fabric certificate authority ${certificateAuthorityName} does not exist`);
        }
        return this.certificateAuthorities.get(certificateAuthorityName);
    }

    private async getAllChannelNamesForPeer(peerName: string): Promise<Array<string>> {
        const peer: LifecyclePeer = await this.getPeer(peerName);

        return peer.getAllChannelNames();
    }
}
