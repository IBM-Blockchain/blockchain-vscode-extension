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
    FabricInstalledSmartContract,
    FabricCollectionDefinition
} from 'ibm-blockchain-platform-common';
import { FabricWalletGenerator, FabricWallet } from 'ibm-blockchain-platform-wallet';
import {
    Lifecycle,
    LifecyclePeer,
    LifecycleChannel,
    DefinedSmartContract,
    InstalledSmartContract
} from 'ibm-blockchain-platform-fabric-admin';
import { Identity, IdentityProvider } from 'fabric-network';
import { User, Endorser } from 'fabric-common';

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
                    this.lifecycle.addPeer({
                        name: node.name,
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
                    this.lifecycle.addOrderer({
                        name: node.name,
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

                    const caName: string = node.ca_name;
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

    public async getDiscoveredOrgs(channelName: string): Promise<Map<string, Array<string>>> {
        const environmentPeers: string[] = this.getAllPeerNames();
        if (environmentPeers.length === 0) {
            throw new Error('No lifecycle peers available.');
        } else {
            const wallet: FabricWallet = await this.getWallet(environmentPeers[0]) as FabricWallet;
            const peerNode: FabricNode = this.getNode(environmentPeers[0]);
            const channel: LifecycleChannel = this.lifecycle.getChannel(channelName, wallet.getWallet(), peerNode.identity);

            // Use known environment peers to discover other peers on the network
            const orgMap: Map<string, Array<string>> = new Map<string, Array<string>>();

            const discoveredPeers: Endorser[] = await channel.getDiscoveredPeers(environmentPeers);

            for (const peer of discoveredPeers) {
                if (!orgMap.has(peer.mspid)) {
                    orgMap.set(peer.mspid, [peer.name]);
                } else {
                    orgMap.get(peer.mspid).push(peer.name);
                }
            }

            return orgMap;
        }
    }

    public async getAllDiscoveredPeerNames(channelName: string): Promise<Array<string>> {
        const environmentPeers: string[] = this.getAllPeerNames();
        if (environmentPeers.length === 0) {
            throw new Error('No lifecycle peers available.');
        } else {
            const wallet: FabricWallet = await this.getWallet(environmentPeers[0]) as FabricWallet;
            const peerNode: FabricNode = this.getNode(environmentPeers[0]);
            const channel: LifecycleChannel = this.lifecycle.getChannel(channelName, wallet.getWallet(), peerNode.identity);

            // Use known environment peers to discover other peers on the network
            const discoveredPeersNames: string[] = await channel.getDiscoveredPeerNames(environmentPeers);

            return discoveredPeersNames;

        }
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
                    // TODO remove/modify this when a design for displaying v1 and v2 tree elements is decided
                    // const peer: LifecyclePeer = await this.getPeer(peerName);
                    // const capabilities: string[] = await peer.getChannelCapabilities(channelName);
                    // if (!capabilities.includes('V2_0')) {
                    //     throw new Error(`channel '${channelName}' does not have V2_0 capabilities enabled.`);
                    // }
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
            // TODO remove/modify this when a design for displaying v1 and v2 tree elements is decided
            // } else if (error.message.includes('does not have V2_0 capabilities enabled.')) {
            //     throw new Error(`Unable to connect to network, ${error.message}`);
            } else {
                throw new Error(`Error querying channels: ${error.message}`);
            }
        }
    }

    public async getCommittedSmartContractDefinitions(peerNames: Array<string>, channelName: string): Promise<Array<FabricSmartContractDefinition>> {

        const wallet: FabricWallet = await this.getWallet(peerNames[0]) as FabricWallet;
        const peerNode: FabricNode = this.getNode(peerNames[0]);

        const peer: LifecyclePeer = await this.getPeer(peerNames[0]);
        const capabilities: string[] = await peer.getChannelCapabilities(channelName);

        const channel: LifecycleChannel = this.lifecycle.getChannel(channelName, wallet.getWallet(), peerNode.identity);
        let committedContracts: DefinedSmartContract[];
        if (!capabilities.includes('V2_0')) {
            committedContracts = await channel.getAllInstantiatedSmartContracts(peerNames[0]);
        } else {
            committedContracts = await channel.getAllCommittedSmartContracts(peerNames[0]);
        }
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

    public async getInstalledSmartContracts(peerName: string, isV1?: boolean): Promise<Array<FabricInstalledSmartContract>> {
        const peer: LifecyclePeer = await this.getPeer(peerName);
        let installedSmartContracts: InstalledSmartContract[];
        try {
            if (!isV1) {
                installedSmartContracts = await peer.getAllInstalledSmartContracts();
            } else {
                installedSmartContracts = await peer.getAllInstalledSmartContractsV1();
            }
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

    public async installSmartContract(pathToPackage: string, peerName: string, label: string, requestTimeout?: number): Promise<string> {
        const peer: LifecyclePeer = await this.getPeer(peerName);

        const pkgBuffer: Buffer = await fs.readFile(pathToPackage);

        let packageId: string;

        try {
            if (pathToPackage.endsWith('.cds')) {
                await peer.installSmartContractPackageCds(pkgBuffer, requestTimeout);
            } else {
                packageId = await peer.installSmartContractPackage(pkgBuffer, requestTimeout);
            }
        } catch (error) {
            if (error.message.includes('chaincode already successfully installed')) {
                const installedContracts: FabricInstalledSmartContract[] = await this.getInstalledSmartContracts(peerName);
                const installedContract: FabricInstalledSmartContract[] =  installedContracts.filter((contract: FabricInstalledSmartContract) => {
                    return contract.label === label;
                });

                if (installedContract.length === 0) {
                    throw new Error(`Unable to find installed contract for ${label} after receiving: ${error.message}`);
                } else {
                    packageId = installedContract[0].packageId;
                }
            } else {
                throw error;
            }
        }
        return packageId;
    }

    public async approveSmartContractDefinition(ordererName: string, channelName: string, peerNames: string[], smartContractDefinition: FabricSmartContractDefinition, requestTimeout?: number): Promise<boolean> {
        const wallet: FabricWallet = await this.getWallet(peerNames[0]) as FabricWallet;
        const peerNode: FabricNode = this.getNode(peerNames[0]);
        const channel: LifecycleChannel = this.lifecycle.getChannel(channelName, wallet.getWallet(), peerNode.identity);

        try {
            await channel.approveSmartContractDefinition(peerNames, ordererName, {
                smartContractName: smartContractDefinition.name,
                smartContractVersion: smartContractDefinition.version,
                packageId: smartContractDefinition.packageId,
                sequence: smartContractDefinition.sequence,
                endorsementPolicy: smartContractDefinition.endorsementPolicy as string,
                collectionConfig: smartContractDefinition.collectionConfig as FabricCollectionDefinition[]
            }, requestTimeout);
            return true;
        } catch (error) {
            if (error.message.match(/.*attempted to redefine uncommitted sequence (.+) for namespace .+ with unchanged content/)) {
                // Smart contract already approved and ready for commit. Should not attempt to approve again.
                const readyToCommit: boolean = await this.getCommitReadiness(channelName, peerNames[0], smartContractDefinition);
                if (readyToCommit) {
                    return false;
                }
            }
            throw error;
        }
    }

    public async commitSmartContractDefinition(ordererName: string, channelName: string, peerNames: string[], smartContractDefinition: FabricSmartContractDefinition, requestTimeout?: number): Promise<void> {
        const wallet: FabricWallet = await this.getWallet(peerNames[0]) as FabricWallet;
        const peerNode: FabricNode = this.getNode(peerNames[0]);
        const channel: LifecycleChannel = this.lifecycle.getChannel(channelName, wallet.getWallet(), peerNode.identity);

        return channel.commitSmartContractDefinition(peerNames, ordererName, {
            smartContractName: smartContractDefinition.name,
            smartContractVersion: smartContractDefinition.version,
            sequence: smartContractDefinition.sequence,
            endorsementPolicy: smartContractDefinition.endorsementPolicy as string,
            collectionConfig: smartContractDefinition.collectionConfig as FabricCollectionDefinition[]
        }, requestTimeout);
    }

    public async getCommitReadiness(channelName: string, peerName: string, smartContractDefinition: FabricSmartContractDefinition): Promise<boolean> {
        const result: Map<string, boolean> = await this.getOrgApprovals(channelName, peerName, smartContractDefinition);

        return Array.from(result.values()).every((value) => value);
    }

    public async getOrgApprovals(channelName: string, peerName: string, smartContractDefinition: FabricSmartContractDefinition): Promise<Map<string, boolean>> {
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

        return result;

    }

    public getEndorsementPolicyBuffer(policy: string): Buffer {
        return LifecycleChannel.getEndorsementPolicyBytes(policy);
    }

    public getCollectionConfigBuffer(collectionConfig: FabricCollectionDefinition[]): Buffer {
        return LifecycleChannel.getCollectionConfig(collectionConfig, true) as Buffer;
    }

    public async instantiateChaincode(_name: string, _version: string, _peerNames: Array<string>, _channelName: string, _fcn: string, _args: Array<string>, _collectionConfigString: string, _contractEP: any): Promise<void> {
        return this.instantiateOrUpgradeChaincode(_name, _version, _peerNames, _channelName, _fcn, _args, _collectionConfigString, _contractEP, false);
    }

    public async upgradeChaincode(_name: string, _version: string, _peerNames: Array<string>, _channelName: string, _fcn: string, _args: Array<string>, _collectionConfigString: string, _contractEP: any): Promise<void> {
        return this.instantiateOrUpgradeChaincode(_name, _version, _peerNames, _channelName, _fcn, _args, _collectionConfigString, _contractEP, true);
    }

    public async enroll(certificateAuthorityName: string, enrollmentID: string, enrollmentSecret: string): Promise<{ certificate: string, privateKey: string }> {
        const certificateAuthority: FabricCAServices = this.getCertificateAuthority(certificateAuthorityName);
        const enrollment: FabricCAServices.IEnrollResponse = await certificateAuthority.enroll({
            enrollmentID,
            enrollmentSecret
        });
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
        const providerRegistry: any = fabricWallet.getWallet().getProviderRegistry();
        const provider: IdentityProvider = providerRegistry.getProvider(identity.type);
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

    public async getChannelCapabilityFromPeer(channelName: string, peerName: string): Promise<Array<string>> {
        try {
            const peer: LifecyclePeer = await this.getPeer(peerName);
            const capabilities: string[] = await peer.getChannelCapabilities(channelName);
            return capabilities;
        } catch (error) {
            throw new Error(`Unable to determine channel capabilities of channel ${channelName}: ${error.message}`);
        }
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

    private async instantiateOrUpgradeChaincode(_name: string, _version: string, _peerNames: Array<string>, _channelName: string, _fcn: string, _args: Array<string>, _collectionConfigString: string, _contractEP: any, isUpgrade: boolean): Promise<void> {
        const wallet: FabricWallet = await this.getWallet(_peerNames[0]) as FabricWallet;
        const peerNode: FabricNode = this.getNode(_peerNames[0]);
        const channel: LifecycleChannel = this.lifecycle.getChannel(_channelName, wallet.getWallet(), peerNode.identity);
        const ordererName: string = this.getAllOrdererNames()[0];
        let collectionFile: FabricCollectionDefinition[];
        if (_collectionConfigString && _collectionConfigString !== '') {
            collectionFile = JSON.parse(_collectionConfigString) as FabricCollectionDefinition[];
        }

        return channel.instantiateOrUpgradeSmartContractDefinition(
            _peerNames,
            ordererName, {
                smartContractName: _name,
                smartContractVersion: _version,
                sequence: -1,
                endorsementPolicy: _contractEP as string,
                collectionConfig: collectionFile,
            },
            _fcn,
            _args,
            isUpgrade,
            5 * 60 * 1000
        );
    }
}
