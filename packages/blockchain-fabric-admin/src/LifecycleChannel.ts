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

import {
    Channel,
    Client,
    Committer,
    ConnectOptions,
    Discoverer,
    DiscoveryService,
    Endorsement,
    Endorser,
    Endpoint,
    IdentityContext,
    ProposalResponse,
    User,
    Utils
} from 'fabric-common';
import * as protos from 'fabric-protos';
import {
    Contract,
    Gateway,
    GatewayOptions,
    Identity,
    IdentityProvider,
    Network,
    Transaction,
    Wallet
} from 'fabric-network';
import * as Long from 'long';
import { LifecycleCommon } from './LifecycleCommon';
import { Lifecycle } from './Lifecycle';
import { LifecyclePeer } from './LifecyclePeer';
import { EndorsementPolicy } from './Policy';
import { Collection, CollectionConfig } from './CollectionConfig';
import { URL } from 'url';

const logger: any = Utils.getLogger('LifecycleChannel');

export interface SmartContractDefinitionOptions {
    sequence: number;
    smartContractName: string;
    smartContractVersion: string;
    packageId?: string;
    endorsementPlugin?: string;
    validationPlugin?: string;
    endorsementPolicy?: string;
    collectionConfig?: Collection[]
    initRequired?: boolean;
}

export interface DefinedSmartContract {
    smartContractName: string;
    smartContractVersion: string;
    sequence: number;
    endorsementPolicy?: Buffer;
    collectionConfig?: Buffer;
    initRequired?: boolean;
    endorsementPlugin?: string;
    validationPlugin?: string;
    approvals?: Map<string, boolean>;
}

export class LifecycleChannel {

    private lifecycle: Lifecycle;

    private readonly channelName: string;
    private readonly wallet: Wallet;
    private readonly identity: string;

    private APPROVE: string = 'approve';
    private COMMIT: string = 'commit';

    /**
     * internal use only
     * @param lifecycle
     * @param channelName
     * @param wallet
     * @param identity
     */
    constructor(lifecycle: Lifecycle, channelName: string, wallet: Wallet, identity: string) {
        this.lifecycle = lifecycle;
        this.channelName = channelName;
        this.wallet = wallet;
        this.identity = identity;
    }

    /**
     * Approve a smart contract definition
     * @param peerNames string[], the names of the peer to endorse the transaction
     * @param ordererName string, the orderer to send the request to
     * @param options SmartContractDefinitionOptions, the details of the definition
     * @param requestTimeout number, [optional] the timeout used when performing the install operation
     */
    public async approveSmartContractDefinition(peerNames: string[], ordererName: string, options: SmartContractDefinitionOptions, requestTimeout?: number): Promise<void> {
        const method: string = 'approvePackage';
        logger.debug('%s - start', method);
        return this.submitTransaction(peerNames, ordererName, options, this.APPROVE, requestTimeout);
    }

    /**
     * Commit a smart contract definition
     * @param peerNames string[], the names of the peer to endorse the transaction
     * @param ordererName string, the orderer to send the request to
     * @param options SmartContractDefinitionOptions, the details of the definition
     * @param requestTimeout number, [optional] the timeout used when performing the install operation
     */
    public async commitSmartContractDefinition(peerNames: string[], ordererName: string, options: SmartContractDefinitionOptions, requestTimeout?: number): Promise<void> {
        const method: string = 'commit';
        logger.debug('%s - start', method);
        return this.submitTransaction(peerNames, ordererName, options, this.COMMIT, requestTimeout);
    }

    /**
     * Get the commit readiness of a smart contract definition
     * @param peerName string, the name of the peer to endorse the transaction
     * @param options SmartContractDefinitionOptions, the details of the definition
     * @param requestTimeout number, [optional] the timeout used when performing the install operation
     * @return Promise<Map<string, boolean>>, the status of if an organisation has approved the definition or not
     */
    public async getCommitReadiness(peerName: string, options: SmartContractDefinitionOptions, requestTimeout?: number): Promise<Map<string, boolean>> {
        const method: string = 'getCommitReadiness';
        logger.debug('%s - start', method);

        if (!peerName) {
            throw new Error('parameter peerName is missing');
        }

        if (!options) {
            throw new Error('parameter options is missing');
        }

        if (!options.smartContractName) {
            throw new Error('missing option smartContractName');
        }

        if (!options.smartContractVersion) {
            throw new Error('missing option smartContractVersion');
        }

        const commitReadiness: Map<string, boolean> = new Map();

        try {
            logger.debug('%s - build the get defined smart contract request', method);
            const arg: protos.lifecycle.CheckCommitReadinessArgs = new protos.lifecycle.CheckCommitReadinessArgs();
            arg.setName(options.smartContractName);
            arg.setVersion(options.smartContractVersion);
            arg.setSequence(Long.fromValue(options.sequence));

            if (typeof options.initRequired === 'boolean') {
                arg.setInitRequired(options.initRequired);
            }

            if (options.endorsementPlugin) {
                arg.setEndorsementPlugin(options.endorsementPlugin);
            }

            if (options.validationPlugin) {
                arg.setValidationPlugin(options.validationPlugin);
            }

            if (options.endorsementPolicy) {
                arg.setValidationParameter(LifecycleChannel.getEndorsementPolicyBytes(options.endorsementPolicy));
            }
            if (options.collectionConfig) {
                arg.setCollections(LifecycleChannel.getCollectionConfig(options.collectionConfig));
            }

            const buildRequest: { fcn: string; args: Promise<Buffer>[] } = {
                fcn: 'CheckCommitReadiness',
                args: [arg.toBuffer()]
            };

            const responses: ProposalResponse = await this.evaluateTransaction(peerName, buildRequest, requestTimeout);

            const payloads: Buffer[] = await LifecycleCommon.processResponse(responses);

            const results: protos.lifecycle.CheckCommitReadinessResult = protos.lifecycle.CheckCommitReadinessResult.decode(payloads[0]);
            const approvalMap: Map<string, boolean> = results.getApprovals();
            const keys: IterableIterator<string> = approvalMap.keys();
            let key: any;
            while ((key = keys.next()).done !== true) {
                const isApproved: boolean = approvalMap.get(key.value);
                commitReadiness.set(key.value, isApproved);
            }

            logger.debug('%s - end', method);
            return commitReadiness;
        } catch (error) {
            logger.error('Problem with the request :: %s', error);
            logger.error(' problem at ::' + error.stack);
            throw new Error(`Could not get commit readiness, received error: ${error.message}`);
        }
    }

    /**
     * Get a list of all the committed smart contracts
     * @param peerName string, the name of the peer to endorse the transaction
     * @param requestTimeout number, [optional] the timeout used when performing the install operation
     * @return DefinedSmartContract[], a list of the defined smart contracts
     */
    public async getAllCommittedSmartContracts(peerName: string, requestTimeout?: number): Promise<DefinedSmartContract[]> {
        const method: string = 'getAllCommittedSmartContracts';
        logger.debug('%s - start', method);

        if (!peerName) {
            throw new Error('parameter peerName is missing');
        }

        const definitions: DefinedSmartContract[] = [];

        try {
            logger.debug('%s - build the get defined smart contract request', method);
            const arg: protos.lifecycle.QueryChaincodeDefinitionsArgs = new protos.lifecycle.QueryChaincodeDefinitionsArgs();

            const buildRequest: { fcn: string; args: Promise<any>[] } = {
                fcn: 'QueryChaincodeDefinitions',
                args: [arg.toBuffer()]
            };

            const responses: ProposalResponse = await this.evaluateTransaction(peerName, buildRequest, requestTimeout);

            const payloads: Buffer[] = await LifecycleCommon.processResponse(responses);

            // only sent the request to one peer so only expect one response
            const results: protos.lifecycle.QueryChaincodeDefinitionsResult = protos.lifecycle.QueryChaincodeDefinitionsResult.decode(payloads[0]);
            const smartContractDefinitions: any = results.getChaincodeDefinitions();
            for (const smartContractDefinition of smartContractDefinitions) {

                const defined: DefinedSmartContract = {
                    smartContractName: smartContractDefinition.getName(),
                    sequence: smartContractDefinition.getSequence().toNumber(),
                    smartContractVersion: smartContractDefinition.getVersion(),
                    initRequired: smartContractDefinition.getInitRequired(),
                    endorsementPlugin: smartContractDefinition.getEndorsementPlugin(),
                    validationPlugin: smartContractDefinition.getValidationPlugin(),
                    endorsementPolicy: smartContractDefinition.getValidationParameter(),
                    collectionConfig: smartContractDefinition.getCollections().toBuffer(),
                };
                definitions.push(defined);
            }

            logger.debug('%s - end', method);
            return definitions;
        } catch (error) {
            logger.error('Problem with request :: %s', error);
            logger.error(' problem at ::' + error.stack);
            throw new Error(`Could not get smart contract definitions, received error: ${error.message}`);
        }
    }

    /**
     * Get the details of a committed smart contract
     * @param peerName string, the name of the peer to endorse the transaction
     * @param smartContractName string, the name of the comitted smart contract to get the details for
     * @param requestTimeout number, [optional] the timeout used when performing the install operation
     * @return DefinedSmartContract, the defined smart contract
     */
    public async getCommittedSmartContract(peerName: string, smartContractName: string, requestTimeout?: number): Promise<DefinedSmartContract> {
        const method: string = 'getCommittedSmartContract';
        logger.debug('%s - start', method);

        if (!peerName) {
            throw new Error('parameter peerName is missing');
        }

        if (!smartContractName) {
            throw new Error('parameter smartContractName is missing');
        }

        let defined: DefinedSmartContract;

        try {
            logger.debug('%s - build the get defined smart contract request', method);
            const arg: protos.lifecycle.QueryChaincodeDefinitionArgs = new protos.lifecycle.QueryChaincodeDefinitionArgs();
            arg.setName(smartContractName);

            const buildRequest: { fcn: string; args: Promise<any>[] } = {
                fcn: 'QueryChaincodeDefinition',
                args: [arg.toBuffer()]
            };

            const responses: ProposalResponse = await this.evaluateTransaction(peerName, buildRequest, requestTimeout);

            const payloads: Buffer[] = await LifecycleCommon.processResponse(responses);

            const results: protos.lifecycle.QueryChaincodeDefinitionResult = protos.lifecycle.QueryChaincodeDefinitionResult.decode(payloads[0]);
            defined = {
                smartContractName: smartContractName,
                sequence: results.getSequence().toNumber(),
                smartContractVersion: results.getVersion(),
                initRequired: results.getInitRequired(),
                endorsementPlugin: results.getEndorsementPlugin(),
                validationPlugin: results.getValidationPlugin(),
                endorsementPolicy: results.getValidationParameter(),
                collectionConfig: results.getCollections().toBuffer()
            };

            const approvalMap: Map<string, boolean> = results.getApprovals();
            const keys: IterableIterator<string> = approvalMap.keys();
            let key: any;

            defined.approvals = new Map<string, boolean>();
            while ((key = keys.next()).done !== true) {
                const isApproved: boolean = approvalMap.get(key.value);
                defined.approvals.set(key.value, isApproved);
            }

            logger.debug('%s - end', method);
            return defined;

        } catch (error) {
            logger.error('Problem with the request :: %s', error);
            logger.error(' problem at ::' + error.stack);
            throw new Error(`Could not get smart contract definition, received error: ${error.message}`);
        }
    }
    public static getEndorsementPolicyBytes(endorsementPolicy: string): Buffer {
        const method: string = 'getEndorsementPolicyBytes';
        logger.debug('%s - start', method);

        if (!endorsementPolicy || endorsementPolicy === '') {
            throw new Error('Missing parameter endorsementPolicy');
        }

        const applicationPolicy: protos.common.ApplicationPolicy = new protos.common.ApplicationPolicy();

        if (endorsementPolicy.startsWith(EndorsementPolicy.AND) || endorsementPolicy.startsWith(EndorsementPolicy.OR) || endorsementPolicy.startsWith(EndorsementPolicy.OUT_OF)) {
            logger.debug('%s - have an  actual policy :: %s', method, endorsementPolicy);
            const policy: EndorsementPolicy = new EndorsementPolicy();
            const signaturePolicy: protos.common.SignaturePolicyEnvelope = policy.buildPolicy(endorsementPolicy);
            applicationPolicy.setSignaturePolicy(signaturePolicy);
        } else {
            logger.debug('%s - have a policy reference :: %s', method, endorsementPolicy);
            applicationPolicy.setChannelConfigPolicyReference(endorsementPolicy);
        }

        return applicationPolicy.toBuffer();
    }

    public static getCollectionConfig(collectionConfig: Collection[], asBuffer: boolean = false): Buffer | protos.common {
        const collection: protos.common.CollectionConfigPackage = CollectionConfig.buildCollectionConfigPackage(collectionConfig);

        if (asBuffer) {
            return collection.toBuffer();
        } else {
            return collection;
        }
    }

    public async getDiscoveredPeerNames(peerNames: string[], requestTimeout?: number): Promise<string[]> {

        if (!peerNames || peerNames.length === 0) {
            throw new Error('parameter peers was missing or empty array');
        }

        const gateway: Gateway = new Gateway();

        const gatewayOptions: GatewayOptions = {
            wallet: this.wallet,
            identity: this.identity,
            discovery: { enabled: false }
        };

        if (requestTimeout) {
            gatewayOptions.eventHandlerOptions = {
                commitTimeout: requestTimeout,
                endorseTimeout: requestTimeout
            };
        }

        try {

            const fabricClient: Client = new Client('lifecycle');

            logger.debug('%s - connect to the network');
            await gateway.connect(fabricClient, gatewayOptions);
            const network: Network = await gateway.getNetwork(this.channelName);

            logger.debug('%s - add the endorsers to the channel');
            const channel: Channel = network.getChannel();

            const allEndorsers: Endorser[] = await this.discoverPeers(peerNames, fabricClient, channel, gateway);

            const filteredEndorsers: Endorser[] = this.filterDuplicateEndorsers(allEndorsers);

            // Endorsers should be unique as they've been filtered out by endpoint urls.
            return filteredEndorsers.map((endorser: Endorser) => {
                return endorser.name;
            });
        } catch (error) {
            throw new Error(`Could discover peers, received error ${error.message}`);
        } finally {
            gateway.disconnect();
        }
    }

    public async getDiscoveredPeers(peerNames: string[], requestTimeout?: number): Promise<Endorser[]> {

        if (!peerNames || peerNames.length === 0) {
            throw new Error('parameter peers was missing or empty array');
        }

        const gateway: Gateway = new Gateway();

        const gatewayOptions: GatewayOptions = {
            wallet: this.wallet,
            identity: this.identity,
            discovery: { enabled: false }
        };

        if (requestTimeout) {
            gatewayOptions.eventHandlerOptions = {
                commitTimeout: requestTimeout,
                endorseTimeout: requestTimeout
            };
        }

        try {

            const fabricClient: Client = new Client('lifecycle');

            logger.debug('%s - connect to the network');
            await gateway.connect(fabricClient, gatewayOptions);
            const network: Network = await gateway.getNetwork(this.channelName);

            logger.debug('%s - add the endorsers to the channel');
            const channel: Channel = network.getChannel();

            const allEndorsers: Endorser[] = await this.discoverPeers(peerNames, fabricClient, channel, gateway);


            const filteredEndorsers: Endorser[] = this.filterDuplicateEndorsers(allEndorsers);

            // Endorsers should be unique as they've been filtered out by endpoint urls.
            return filteredEndorsers;

        } catch (error) {
            throw new Error(`Could discover peers, received error ${error.message}`);
        } finally {
            gateway.disconnect();
        }
    }

    private filterDuplicateEndorsers(endorsers: Endorser[]): Endorser[] {
        // TODO JAKE: THIS MIGHT NOT BE REQUIRED ANYMORE WHEN WE UPGRADE TO USE LATEST SDK, AS THERE WAS A PR TO FIX DUPLICATE ENDORSERS.

        for (let currentIndex: number = endorsers.length - 1; currentIndex >= 0; currentIndex--) {
            const endorser: Endorser = endorsers[currentIndex];
            const duplicateIndex: number = endorsers.findIndex((_endorser: Endorser) => { return _endorser.endpoint['url'] === endorser.endpoint['url'] && endorser.name !== _endorser.name });
            if (duplicateIndex === -1) {
                continue;
            } else {
                const duplicateEndorser: Endorser = endorsers[duplicateIndex];
                const duplicateEndorserIsUrl: boolean = duplicateEndorser.name.includes('.') || duplicateEndorser.name.includes(':');
                const endorserIsUrl: boolean = endorser.name.includes('.') || endorser.name.includes(':');

                let indexToRemove: number;
                if (duplicateEndorserIsUrl && !endorserIsUrl) {
                    indexToRemove = duplicateIndex;
                } else if (!duplicateEndorserIsUrl && endorserIsUrl) {
                    indexToRemove = currentIndex;
                } else {
                    // Keep either one
                    indexToRemove = duplicateIndex;
                }


                endorsers.splice(indexToRemove, 1);
            }
        }
        return endorsers;
    }

    private async discoverPeers(peerNames: string[], fabricClient: Client, channel: Channel, gateway: Gateway): Promise<Endorser[]> {
        const endorsers: Endorser[] = [];
        const asLocalHost: boolean = this.hasLocalhostURLs(peerNames);

        for (const peerName of peerNames) {
            const endorser: Endorser = await this.createEndorser(peerName, fabricClient);

            channel.addEndorser(endorser, true);
            endorsers.push(endorser);
        }

        const discoverers: Discoverer[] = [];
        for (const peer of endorsers) {
            const discoverer: Discoverer = channel.client.newDiscoverer(peer.name, peer.mspid);
            await discoverer.connect(peer.endpoint);
            discoverers.push(discoverer);
        }

        const discoveryService: DiscoveryService = channel.newDiscoveryService(this.channelName);
        const identity: Identity = gateway.getIdentity();
        const provider: IdentityProvider = this.wallet.getProviderRegistry().getProvider(identity.type);
        const user: User = await provider.getUserContext(identity, this.identity);
        const identityContext: IdentityContext = fabricClient.newIdentityContext(user);

        // do the three steps
        discoveryService.build(identityContext);
        discoveryService.sign(identityContext);
        await discoveryService.send({
            asLocalhost: asLocalHost,
            targets: discoverers
        });

        const allEndorsers: Endorser[] = channel.getEndorsers();
        return allEndorsers;
    }

    private async submitTransaction(peerNames: string[], ordererName: string, options: SmartContractDefinitionOptions, functionName: string, requestTimeout?: number): Promise<void> {
        if (!peerNames || peerNames.length === 0
        ) {
            throw new Error('parameter peers was missing or empty array');
        }

        if (!ordererName) {
            throw new Error('parameter ordererName is missing');
        }

        if (!options) {
            throw new Error('parameter options is missing');
        }

        if (!options.sequence) {
            throw new Error('missing option sequence');
        }

        if (!options.smartContractName) {
            throw new Error('missing option smartContractName');
        }

        if (!options.smartContractVersion) {
            throw new Error('missing option smartContractVersion');
        }

        const endorsers: Endorser[] = [];
        let committer: Committer;

        const gateway: Gateway = new Gateway();

        try {

            const gatewayOptions: GatewayOptions = {
                wallet: this.wallet,
                identity: this.identity,
                discovery: { enabled: false }
            };

            if (requestTimeout) {
                gatewayOptions.eventHandlerOptions = {
                    commitTimeout: requestTimeout,
                    endorseTimeout: requestTimeout
                };
            }

            const fabricClient: Client = new Client('lifecycle');

            logger.debug('%s - connect to the network');
            await gateway.connect(fabricClient, gatewayOptions);
            const network: Network = await gateway.getNetwork(this.channelName);

            logger.debug('%s - add the endorsers to the channel');
            const channel: Channel = network.getChannel();

            const alreadyKnownPeers: string[] = peerNames.filter((peerName: string) => {
                return this.lifecycle.peerExists(peerName);
            });

            const allEndorsers: Endorser[] = await this.discoverPeers(alreadyKnownPeers, fabricClient, channel, gateway);
            for (const peerName of peerNames) {
                const endorser: Endorser = allEndorsers.find((_endorser: Endorser) => {
                    return _endorser.name === peerName;
                });

                if (!endorser) {
                    throw new Error(`Could not find peer ${peerName} in discovered peers`);
                } else {
                    endorsers.push(endorser);
                }
            }
            const ordererConnectOptions: ConnectOptions = this.lifecycle.getOrderer(ordererName);

            committer = fabricClient.getCommitter(ordererName);

            const endpoint: Endpoint = fabricClient.newEndpoint(ordererConnectOptions);
            committer.setEndpoint(endpoint);

            // @ts-ignore
            await committer.connect();
            channel.addCommitter(committer, true);

            let arg: any;
            if (functionName === this.APPROVE) {

                logger.debug('%s - build the approve smart contract argument');
                arg = new protos.lifecycle.ApproveChaincodeDefinitionForMyOrgArgs();

                const source: protos.lifecycle.ChaincodeSource = new protos.lifecycle.ChaincodeSource();
                if (options.packageId) {
                    const local: protos.lifecycle.ChaincodeSource.Local = new protos.lifecycle.ChaincodeSource.Local();
                    local.setPackageId(options.packageId);
                    source.setLocalPackage(local);
                } else {
                    const unavailable: protos.lifecycle.ChaincodeSource.Unavailable = new protos.lifecycle.ChaincodeSource.Unavailable();
                    source.setUnavailable(unavailable);
                }

                arg.setSource(source);
            } else {
                logger.debug('%s - build the commit smart contract argument');
                arg = new protos.lifecycle.CommitChaincodeDefinitionArgs();
            }

            arg.setName(options.smartContractName);
            arg.setVersion(options.smartContractVersion);
            arg.setSequence(Long.fromValue(options.sequence));

            if (typeof options.initRequired === 'boolean') {
                arg.setInitRequired(options.initRequired);
            }

            if (options.endorsementPlugin) {
                arg.setEndorsementPlugin(options.endorsementPlugin);
            }
            if (options.validationPlugin) {
                arg.setValidationPlugin(options.validationPlugin);
            }

            if (options.endorsementPolicy) {
                const endorsementPolicyBuffer: Buffer = LifecycleChannel.getEndorsementPolicyBytes(options.endorsementPolicy);
                arg.setValidationParameter(endorsementPolicyBuffer);
            }

            if (options.collectionConfig) {
                arg.setCollections(LifecycleChannel.getCollectionConfig(options.collectionConfig));
            }

            const contract: Contract = network.getContract('_lifecycle');

            let transaction: Transaction;

            if (functionName === this.APPROVE) {
                transaction = contract.createTransaction('ApproveChaincodeDefinitionForMyOrg');
            } else {
                transaction = contract.createTransaction('CommitChaincodeDefinition');
            }

            transaction.setEndorsingPeers(endorsers);

            await transaction.submit(arg.toBuffer());
            logger.debug('%s - submitted successfully');
        } catch (error) {
            logger.error('Problem with the lifecycle approval :: %s', error);
            logger.error(' problem at ::' + error.stack);
            throw new Error(`Could not ${functionName} smart contract definition, received error: ${error.message}`);
        } finally {
            // this will disconnect the endorsers and committer
            gateway.disconnect();
        }
    }

    private async createEndorser(peerName: string, fabricClient: Client): Promise<Endorser> {
        const peer: LifecyclePeer = this.lifecycle.getPeer(peerName, this.wallet, this.identity);

        fabricClient.setTlsClientCertAndKey(peer.clientCertKey!, peer.clientKey!);

        const peerConnectOptions: ConnectOptions = {
            url: peer.url
        };

        if (peer.pem) {
            peerConnectOptions.pem = peer.pem;
        }

        if (peer.sslTargetNameOverride) {
            peerConnectOptions['ssl-target-name-override'] = peer.sslTargetNameOverride;
        }

        if (peer.requestTimeout) {
            peerConnectOptions.requestTimeout = peer.requestTimeout;
        }

        const endpoint: Endpoint = fabricClient.newEndpoint(peerConnectOptions);

        // this will add the peer to the list of endorsers
        const endorser: Endorser = fabricClient.getEndorser(peer.name, peer.mspid);
        endorser.setEndpoint(endpoint);
        // @ts-ignore
        await endorser.connect();
        return endorser;
    }

    private async evaluateTransaction(peerName: string, buildRequest: any, requestTimeout?: number): Promise<ProposalResponse> {

        const gateway: Gateway = new Gateway();

        const fabricClient: Client = new Client('lifecycle');

        const endorser: Endorser = await this.createEndorser(peerName, fabricClient);

        try {
            const gatewayOptions: GatewayOptions = {
                wallet: this.wallet,
                identity: this.identity,
                discovery: { enabled: false }
            };

            logger.debug('%s - connect to the network');
            await gateway.connect(fabricClient, gatewayOptions);
            const network: Network = await gateway.getNetwork(this.channelName);

            //  we are going to talk to lifecycle which is really just a smart contract
            const endorsement: Endorsement = network.getChannel().newEndorsement('_lifecycle');
            endorsement.build(network.getGateway().identityContext, buildRequest);

            logger.debug('%s - sign the request');
            endorsement.sign(network.getGateway().identityContext);

            const endorseRequest: any = {
                targets: [endorser]
            };

            if (requestTimeout) {
                endorseRequest.requestTimeout = requestTimeout;
            }

            logger.debug('%s - send the query request');
            return endorsement.send(endorseRequest);
        } finally {
            gateway.disconnect();
            endorser.disconnect();
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

    private hasLocalhostURLs(peerNames: string[]): boolean {
        const urls: string[] = [];
        for (const peerName of peerNames) {
            const peer: LifecyclePeer = this.lifecycle.getPeer(peerName, this.wallet, this.identity);
            urls.push(peer.url);
        }
        return urls.some((url: string) => this.isLocalhostURL(url));
    }
}
