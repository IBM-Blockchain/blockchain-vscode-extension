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
import {
    FabricSmartContractDefinition,
    Attribute,
    FabricNode,
    FabricNodeType,
    IFabricEnvironmentConnection,
    FabricWalletRegistryEntry,
    FabricWalletRegistry,
    IFabricWallet,
    FabricInstalledSmartContract
} from 'ibm-blockchain-platform-common';
import {FabricWalletGenerator, FabricWallet} from 'ibm-blockchain-platform-wallet';
import {
    Lifecycle,
    LifecyclePeer,
    LifecycleChannel,
    DefinedSmartContract,
    InstalledSmartContract
} from 'ibm-blockchain-platform-fabric-admin';
import {Identity, IdentityProvider} from 'fabric-network';
import {User} from 'fabric-common';
import {FabricCollectionDefinition} from 'ibm-blockchain-platform-common/build/src/fabricModel/FabricCollectionDefinition';

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
                case FabricNodeType.PEER: {
                    let pem: string;
                    if (node.pem) {
                        pem = Buffer.from(node.pem, 'base64').toString();
                    }
                    let sslTargetNameOverride: string;
                    if (node.ssl_target_name_override) {
                        sslTargetNameOverride = node.ssl_target_name_override;
                    }
                    let apiOptions: object;
                    if (node.api_options) {
                        apiOptions = node.api_options;
                    }
                    // Figure out what the name of the node should be; if the hostname is localhost, and any of these options are
                    // being used to set the actual name in the host/authority header - then we should use that name instead.
                    let name: string = node.name;
                    if (apiOptions) {
                        const nameOverrides: string[] = ['grpc.default_authority', 'grpc.ssl_target_name_override'];
                        for (const nameOverride of nameOverrides) {
                            if (apiOptions[nameOverride]) {
                                name = apiOptions[nameOverride];
                                break;
                            }
                        }
                    }
                    this.lifecycle.addPeer({
                        name,
                        mspid: node.msp_id,
                        pem,
                        sslTargetNameOverride,
                        url: node.api_url,
                        apiOptions
                    });

                    break;
                }
                case FabricNodeType.ORDERER: {
                    let pem: string;
                    if (node.pem) {
                        pem = Buffer.from(node.pem, 'base64').toString();
                    }
                    let sslTargetNameOverride: string;
                    if (node.ssl_target_name_override) {
                        sslTargetNameOverride = node.ssl_target_name_override;
                    }
                    let apiOptions: object;
                    if (node.api_options) {
                        apiOptions = node.api_options;
                    }
                    // Figure out what the name of the node should be; if the hostname is localhost, and any of these options are
                    // being used to set the actual name in the host/authority header - then we should use that name instead.
                    let name: string = node.name;
                    if (apiOptions) {
                        const nameOverrides: string[] = ['grpc.default_authority', 'grpc.ssl_target_name_override'];
                        for (const nameOverride of nameOverrides) {
                            if (apiOptions[nameOverride]) {
                                name = apiOptions[nameOverride];
                                break;
                            }
                        }
                    }
                    this.lifecycle.addOrderer({
                        name,
                        pem: pem,
                        sslTargetNameOverride,
                        url: node.api_url,
                        apiOptions
                    });
                    break;
                }
                case FabricNodeType.CERTIFICATE_AUTHORITY: {
                    let trustedRoots: Buffer;
                    if (node.pem) {
                        trustedRoots = Buffer.from(node.pem, 'base64');
                    }

                    const caName: string = node.ca_name || node.name;
                    const certificateAuthority: FabricCAServices = new FabricCAServices(node.api_url, {
                        trustedRoots,
                        verify: false
                    }, caName);
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

    public getAllPeerNamesForOrg(orgName: string): Array<string> {
        return this.lifecycle.getAllPeerNamesForOrg(orgName);
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

    public async getCommittedSmartContractDefinitions(peerNames: Array<string>, channelName: string): Promise<Array<FabricSmartContractDefinition>> {

        const wallet: FabricWallet = await this.getWallet(peerNames[0]) as FabricWallet;
        const peerNode: FabricNode = this.getNode(peerNames[0]);

        // Get the channel.
        const channel: LifecycleChannel = this.lifecycle.getChannel(channelName, wallet.getWallet(), peerNode.identity);
        const committedContracts: DefinedSmartContract[] = await channel.getAllCommittedSmartContracts(peerNames[0]);

        return committedContracts.map((committedContract: DefinedSmartContract) => {
            return new FabricSmartContractDefinition(committedContract.smartContractName, committedContract.smartContractVersion, committedContract.sequence, undefined, committedContract.endorsementPolicy, committedContract.collectionConfig);
        });
    }

    public async getAllCommittedSmartContractDefinitions(): Promise<Array<FabricSmartContractDefinition>> {

        try {
            const channelMap: Map<string, Array<string>> = await this.createChannelMap();

            const smartContractDefinitions: Array<FabricSmartContractDefinition> = [];

            for (const [channelName, peerNames] of channelMap) {
                const channelSmartContractDefinitions: Array<FabricSmartContractDefinition> = await this.getCommittedSmartContractDefinitions(peerNames, channelName); // Returns channel smart contracts
                for (const definition of channelSmartContractDefinitions) { // For each channel smart contract, push it to the 'smart contracts' array if it doesn't exist

                    const alreadyExists: boolean = smartContractDefinitions.some((_definition: FabricSmartContractDefinition) => {
                        return _definition.name === definition.name && _definition.version === definition.version;
                    });
                    if (!alreadyExists) {
                        smartContractDefinitions.push(definition);
                    }
                }
            }

            smartContractDefinitions.sort((a: FabricSmartContractDefinition, b: FabricSmartContractDefinition): number => {
                if (a.name === b.name) {
                    return a.version.localeCompare(b.version);
                } else {
                    return a.name.localeCompare(b.name);
                }
            });

            return smartContractDefinitions;
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
            return {label: installedSmartContract.label, packageId: installedSmartContract.packageId};
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

    public async approveSmartContractDefinition(ordererName: string, channelName: string, peerNames: string[], smartContractDefinition: FabricSmartContractDefinition): Promise<void> {
        const wallet: FabricWallet = await this.getWallet(peerNames[0]) as FabricWallet;
        const peerNode: FabricNode = this.getNode(peerNames[0]);
        const channel: LifecycleChannel = this.lifecycle.getChannel(channelName, wallet.getWallet(), peerNode.identity);

        return channel.approveSmartContractDefinition(peerNames, ordererName, {
            smartContractName: smartContractDefinition.name,
            smartContractVersion: smartContractDefinition.version,
            packageId: smartContractDefinition.packageId,
            sequence: smartContractDefinition.sequence,
            endorsementPolicy: smartContractDefinition.endorsementPolicy as string,
            collectionConfig: smartContractDefinition.collectionConfig as FabricCollectionDefinition[]
        });
    }

    public async commitSmartContractDefinition(ordererName: string, channelName: string, peerNames: string[], smartContractDefinition: FabricSmartContractDefinition): Promise<void> {
        const wallet: FabricWallet = await this.getWallet(peerNames[0]) as FabricWallet;
        const peerNode: FabricNode = this.getNode(peerNames[0]);
        const channel: LifecycleChannel = this.lifecycle.getChannel(channelName, wallet.getWallet(), peerNode.identity);

        return channel.commitSmartContractDefinition(peerNames, ordererName, {
            smartContractName: smartContractDefinition.name,
            smartContractVersion: smartContractDefinition.version,
            sequence: smartContractDefinition.sequence,
            endorsementPolicy: smartContractDefinition.endorsementPolicy as string,
            collectionConfig: smartContractDefinition.collectionConfig as FabricCollectionDefinition[]
        });
    }

    public async getCommitReadiness(channelName: string, peerName: string, smartContractDefinition: FabricSmartContractDefinition): Promise<boolean> {
        const wallet: FabricWallet = await this.getWallet(peerName) as FabricWallet;
        const peerNode: FabricNode = this.getNode(peerName);
        const channel: LifecycleChannel = this.lifecycle.getChannel(channelName, wallet.getWallet(), peerNode.identity);

        const result: Map<string, boolean> = await channel.getCommitReadiness(peerName, {
            smartContractName: smartContractDefinition.name,
            smartContractVersion: smartContractDefinition.version,
            sequence: smartContractDefinition.sequence,
            endorsementPolicy: smartContractDefinition.endorsementPolicy as string,
            collectionConfig: smartContractDefinition.collectionConfig as FabricCollectionDefinition[]
        });

        return Array.from(result.values()).every((value) => value);
    }

    public getEndorsementPolicyBuffer(policy: string): Buffer {
        return LifecycleChannel.getEndorsementPolicyBytes(policy);
    }

    public getCollectionConfigBuffer(collectionConfig: FabricCollectionDefinition[]): Buffer {
        return LifecycleChannel.getCollectionConfig(collectionConfig, true);
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
        const enrollment: FabricCAServices.IEnrollResponse = await certificateAuthority.enroll({
            enrollmentID,
            enrollmentSecret
        });
        return {certificate: enrollment.certificate, privateKey: enrollment.key.toBytes()};
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
