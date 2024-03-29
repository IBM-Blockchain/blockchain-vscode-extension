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
    EndorsementResponse,
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
import { LifecycleCommon } from './LifecycleCommon';
import { Lifecycle } from './Lifecycle';
import { LifecyclePeer } from './LifecyclePeer';
import { EndorsementPolicy } from './Policy';
import { Collection, CollectionConfig } from './CollectionConfig';
import { URL } from 'url';
import deepEqual = require('deep-equal');

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
    private INSTANTIATE: string = 'deploy';
    private UPGRADE: string = 'upgrade';

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
     * @param requestTimeout number, [optional] the timeout in seconds used when performing the install operation
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
     * @param requestTimeout number, [optional] the timeout in seconds used when performing the install operation
     */
    public async commitSmartContractDefinition(peerNames: string[], ordererName: string, options: SmartContractDefinitionOptions, requestTimeout?: number): Promise<void> {
        const method: string = 'commit';
        logger.debug('%s - start', method);
        return this.submitTransaction(peerNames, ordererName, options, this.COMMIT, requestTimeout);
    }

    /**
     * Instantiate or upgrade a smart contract definition
     * @param peerNames string[], the names of the peer to endorse the transaction
     * @param ordererName string, the orderer to send the request to
     * @param options SmartContractDefinitionOptions, the details of the definition
     * @param fcn string, the chaincode function to run
     * @param args string[], array of chaincode arguments
     * @param isUpgrade boolean, true for an upgrade or false to instantiate
     * @param requestTimeout number, [optional] the timeout in seconds used when performing the install operation
     */
    public async instantiateOrUpgradeSmartContractDefinition(peerNames: string[], ordererName: string, options: SmartContractDefinitionOptions, fcn: string, args: Array<string>, isUpgrade: boolean, requestTimeout?: number): Promise<void> {
        const functionName: string = isUpgrade ? this.UPGRADE : this.INSTANTIATE
        logger.debug('%s - start', functionName);

        const specArgs: Buffer[] = [];
        const specFcn: string = typeof fcn === 'undefined' ? 'init' : fcn;
        if (specFcn) {
            specArgs.push(Buffer.from(specFcn, 'utf8'));
        }
        if (!args) {
            args = [];
        }
        for (const arg of args) {
            specArgs.push(Buffer.from(arg, 'utf8'));
        }

        const ccSpec: any = {
            // TODO Golang is defaul in v1 fabric-client, and v1 exension always used default. Should we try to extract language from packaged contracts somehow?
            type: protos.protos.ChaincodeSpec.Type.GOLANG,
            chaincode_id: {
                name: options.smartContractName,
                version: options.smartContractVersion
            },
            input: {
                args: specArgs
            }
        };

        const chaincodeDeploymentSpec: protos.protos.ChaincodeDeploymentSpec = new protos.protos.ChaincodeDeploymentSpec();
        chaincodeDeploymentSpec.chaincode_spec = ccSpec;

        const lcccSpecArgs: string[] = [
            functionName,
            this.channelName,
            protos.protos.ChaincodeDeploymentSpec.encode(chaincodeDeploymentSpec).finish().toString(),
            '',
            'escc', // default
            'vscc' // default
        ];

        return this.submitTransaction(peerNames, ordererName, options, functionName, requestTimeout, 'lscc', lcccSpecArgs);
    }

    /**
     * Get the commit readiness of a smart contract definition
     * @param peerName string, the name of the peer to endorse the transaction
     * @param options SmartContractDefinitionOptions, the details of the definition
     * @param requestTimeout number, [optional] the timeout in seconds used when performing the install operation
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
            const protoArgs: protos.lifecycle.ICheckCommitReadinessArgs = {};
            protoArgs.name = options.smartContractName;
            protoArgs.version = options.smartContractVersion;
            protoArgs.sequence = options.sequence;

            if (typeof options.initRequired === 'boolean') {
                protoArgs.init_required = options.initRequired;
            }

            if (options.endorsementPlugin) {
                protoArgs.endorsement_plugin = options.endorsementPlugin;
            }

            if (options.validationPlugin) {
                protoArgs.validation_plugin = options.validationPlugin;
            }

            if (options.endorsementPolicy) {
                protoArgs.validation_parameter = LifecycleChannel.getEndorsementPolicyBytes(options.endorsementPolicy);
            }
            if (options.collectionConfig) {
                protoArgs.collections = LifecycleChannel.getCollectionConfig(options.collectionConfig) as protos.common.ICollectionConfigPackage;
            }


            const arg: Uint8Array = protos.lifecycle.CheckCommitReadinessArgs.encode(protoArgs).finish();

            const buildRequest: { fcn: string; args: Buffer[] } = {
                fcn: 'CheckCommitReadiness',
                args: [Buffer.from(arg)]
            };

            const responses: ProposalResponse = await this.evaluateTransaction(peerName, buildRequest, requestTimeout);

            const payloads: Buffer[] = await LifecycleCommon.processResponse(responses);

            const results: protos.lifecycle.CheckCommitReadinessResult = protos.lifecycle.CheckCommitReadinessResult.decode(payloads[0]);
            const approvals: { [k: string]: boolean } = results.approvals;
            const approvalMap: Map<string, boolean> = new Map(Object.entries(approvals));
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
     * @param requestTimeout number, [optional] the timeout in seconds used when performing the install operation
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
            const protoArgs: protos.lifecycle.IQueryChaincodeDefinitionsArgs = {};

            const arg: Uint8Array = protos.lifecycle.QueryChaincodeDefinitionsArgs.encode(protoArgs).finish();

            const buildRequest: { fcn: string; args: Buffer[] } = {
                fcn: 'QueryChaincodeDefinitions',
                args: [Buffer.from(arg)]
            };

            const responses: ProposalResponse = await this.evaluateTransaction(peerName, buildRequest, requestTimeout);

            const payloads: Buffer[] = await LifecycleCommon.processResponse(responses);

            // only sent the request to one peer so only expect one response
            const results: protos.lifecycle.QueryChaincodeDefinitionsResult = protos.lifecycle.QueryChaincodeDefinitionsResult.decode(payloads[0]);
            const smartContractDefinitions: protos.lifecycle.QueryChaincodeDefinitionsResult.IChaincodeDefinition[] = results.chaincode_definitions;
            for (const smartContractDefinition of smartContractDefinitions) {

                const defined: DefinedSmartContract = {
                    smartContractName: smartContractDefinition.name,
                    sequence: Number(smartContractDefinition.sequence),
                    smartContractVersion: smartContractDefinition.version,
                    initRequired: smartContractDefinition.init_required,
                    endorsementPlugin: smartContractDefinition.endorsement_plugin,
                    validationPlugin: smartContractDefinition.validation_plugin,
                    endorsementPolicy: Buffer.from(smartContractDefinition.validation_parameter),
                    collectionConfig: Buffer.from(smartContractDefinition.collections.config),
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
     * Get a list of all the committed smart contracts
     * @param peerName
     * @param requestTimeout number, [optional] the timeout in seconds used when performing each operation
     * @return DefinedSmartContract[], a list of the defined smart contracts
     */
    public async getAllInstantiatedSmartContracts(peerName: string, requestTimeout?: number): Promise<DefinedSmartContract[]> {
        const method: string = 'getAllInstantiatedSmartContracts';
        logger.debug('%s - start', method);

        if (!peerName) {
            throw new Error('parameter peerName is missing');
        }

        const definitions: DefinedSmartContract[] = [];
        try {
            logger.debug('%s - build the get defined smart contract request', method);
            const buildRequest: { fcn: string; args: Buffer[] } = {
                fcn: 'GetChaincodes',
                args: []
            };

            const result: ProposalResponse = await this.evaluateTransaction(peerName, buildRequest, requestTimeout, 'lscc');
            if (result) {
                // will only be one response as we are only querying one peer
                if (result.errors && result.errors[0] instanceof Error) {
                    throw result.errors[0];
                }
                const response: EndorsementResponse = result.responses[0];
                if (response.response) {
                    if (response.response.status === 200) {
                        const queryTrans: protos.protos.ChaincodeQueryResponse = protos.protos.ChaincodeQueryResponse.decode(response.response.payload);
                        for (const chaincode of queryTrans.chaincodes) {
                            const defined: DefinedSmartContract = {
                                smartContractName: chaincode.name,
                                sequence: Number(-1),
                                smartContractVersion: chaincode.version,
                                initRequired: undefined,
                                endorsementPlugin: chaincode.escc,
                                validationPlugin: chaincode.vscc,
                                endorsementPolicy: undefined,
                                collectionConfig: undefined,
                            };
                            definitions.push(defined);
                        }
                        logger.debug('%s - end', method);
                        return definitions;
                    } else if (response.response.message) {
                        throw new Error(response.response.message);
                    }
                }
                // no idea what we have, lets fail it and send it back
                throw new Error(response.toString());
            }
            throw new Error('Payload results are missing from the query');

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
     * @param requestTimeout number, [optional] the timeout in seconds used when performing the operation
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
            const protoArgs: protos.lifecycle.IQueryChaincodeDefinitionArgs = {
                name: smartContractName
            };

            const arg: Uint8Array = protos.lifecycle.QueryChaincodeDefinitionArgs.encode(protoArgs).finish();

            const buildRequest: { fcn: string; args: Buffer[] } = {
                fcn: 'QueryChaincodeDefinition',
                args: [Buffer.from(arg)]
            };

            const responses: ProposalResponse = await this.evaluateTransaction(peerName, buildRequest, requestTimeout);

            const payloads: Buffer[] = await LifecycleCommon.processResponse(responses);

            const results: protos.lifecycle.QueryChaincodeDefinitionResult = protos.lifecycle.QueryChaincodeDefinitionResult.decode(payloads[0]);
            defined = {
                smartContractName: smartContractName,
                sequence: Number(results.sequence),
                smartContractVersion: results.version,
                initRequired: results.init_required,
                endorsementPlugin: results.endorsement_plugin,
                validationPlugin: results.validation_plugin,
                endorsementPolicy: Buffer.from(results.validation_parameter),
                collectionConfig: Buffer.from(results.collections.config)
            };

            const approvals: { [k: string]: boolean } = results.approvals;
            const approvalMap: Map<string, boolean> = new Map(Object.entries(approvals))
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

    public static getEndorsementPolicyBytes(endorsementPolicy: string, isV1: boolean = false): Buffer {
        const method: string = 'getEndorsementPolicyBytes';
        logger.debug('%s - start', method);

        if (!endorsementPolicy || endorsementPolicy === '') {
            throw new Error('Missing parameter endorsementPolicy');
        }

        const protoArgs: protos.common.IApplicationPolicy = {};

        if (endorsementPolicy.startsWith(EndorsementPolicy.AND) || endorsementPolicy.startsWith(EndorsementPolicy.OR) || endorsementPolicy.startsWith(EndorsementPolicy.OUT_OF)) {
            logger.debug('%s - have an  actual policy :: %s', method, endorsementPolicy);
            const policy: EndorsementPolicy = new EndorsementPolicy();
            const signaturePolicy: protos.common.SignaturePolicyEnvelope = policy.buildPolicy(endorsementPolicy);
            protoArgs.signature_policy = signaturePolicy;
        } else if (isV1) {
            throw new Error(`Cannot build endorsement policy from user input: ${endorsementPolicy}`);
        } else {
            logger.debug('%s - have a policy reference :: %s', method, endorsementPolicy);
            protoArgs.channel_config_policy_reference = endorsementPolicy;
        }

        let applicationPolicy: Uint8Array;
        if (isV1) {
            applicationPolicy = protos.common.SignaturePolicyEnvelope.encode(protoArgs.signature_policy).finish();
        } else {
            applicationPolicy = protos.common.ApplicationPolicy.encode(protoArgs).finish();

        }

        return Buffer.from(applicationPolicy);
    }

    public static getCollectionConfig(collectionConfig: Collection[], asBuffer: boolean = false): Buffer | protos.common.CollectionConfigPackage {
        const collection: protos.common.CollectionConfigPackage = CollectionConfig.buildCollectionConfigPackage(collectionConfig);

        if (asBuffer) {
            const arg: Uint8Array = protos.common.CollectionConfigPackage.encode({ config: collection.config }).finish();
            return Buffer.from(arg);
        } else {
            return collection;
        }
    }

    /**
     * Get discovered peer names
     * @param peerNames string[]
     * @param requestTimeout number, [optional] the timeout in seconds used when performing the operation
     */
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

    /**
     * Get discovered peers
     * @param peerNames string[]
     * @param requestTimeout number, [optional] the timeout in seconds used when performing the operation
     */
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
            const duplicateIndex: number = endorsers.findIndex((_endorser: Endorser) => {
                if (_endorser.endpoint['url'] !== endorser.endpoint['url']) {
                    return false;
                } else if (!deepEqual(_endorser.endpoint['options'] || {}, endorser.endpoint['options'] || {})) {
                    return false;
                } else {
                    return _endorser.name !== endorser.name;
                }
            });
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

    public async discoverChannel(peerNames: string[], fabricClient: Client, channel: Channel, gateway: Gateway): Promise<any> {
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
        const result: {msps: any, orderers: any, peers_by_org: any, timestamp: number} = await discoveryService.send({
            asLocalhost: asLocalHost,
            targets: discoverers
        });

        return result;
    }

    private async discoverPeers(peerNames: string[], fabricClient: Client, channel: Channel, gateway: Gateway): Promise<Endorser[]> {
        await this.discoverChannel(peerNames, fabricClient, channel, gateway);

        const allEndorsers: Endorser[] = channel.getEndorsers();
        return allEndorsers;
    }

    public async submitTransaction(peerNames: string[], ordererName: string, options: SmartContractDefinitionOptions, functionName: string, requestTimeout?: number, smartContract: string = '_lifecycle', lcccSpecArgs?: string[]): Promise<void> {
        if (!peerNames || peerNames.length === 0
        ) {
            throw new Error('parameter peers was missing or empty array');
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

            let channelDiscoveryResults: {msps: any, orderers: any, peers_by_org: any, timestamp: number};
            if (!ordererName) {
                // Discover channel msps, orderers, peers, etc.
                channelDiscoveryResults = await this.discoverChannel(peerNames, fabricClient, channel, gateway);


                if (channelDiscoveryResults.orderers && Object.keys(channelDiscoveryResults.orderers).length > 0){
                    const orderers: any = Object.entries(channelDiscoveryResults.orderers);

                    // Get first orderer
                    ordererName = orderers[0][1].endpoints[0].host;

                }

                if (!ordererName){
                    throw new Error('Unable to discover any orderers.');
                }

            }

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

            let ordererConnectOptions: ConnectOptions = this.lifecycle.getOrderer(ordererName);
            if (!ordererConnectOptions){
                // If the user hasn't provided an orderer, try to manualy build the connection options.

                const orderers: any = Object.entries(channelDiscoveryResults.orderers);

                // Get first orderer's url - will be used for building connection options.
                const _ordererUrl: string = orderers[0][1].endpoints[0].name

                // Get first orderer's msp.
                const _ordererMsp: any = channelDiscoveryResults.msps[orderers[0][0]]

                const isGrpcs: boolean = endorsers[0].endpoint['protocol'] === 'grpcs' ? true : false;

                // Initiate connection options.
                ordererConnectOptions = {
                    url: (isGrpcs) ? `grpcs://${_ordererUrl}` : `grpc://${_ordererUrl}`
                };

                if (isGrpcs){
                    // Set pem
                    if (_ordererMsp.tlsRootCerts && _ordererMsp.tlsIntermediateCerts){
                        // Root and intermediate certs.
                        ordererConnectOptions.pem = [_ordererMsp.tlsRootCerts, _ordererMsp.tlsIntermediateCerts].join('\n');
                    } else {
                        // Only a root cert.
                        ordererConnectOptions.pem = _ordererMsp.tlsRootCerts;
                    }
                }

            }



            committer = fabricClient.getCommitter(ordererName);

            const endpoint: Endpoint = fabricClient.newEndpoint(ordererConnectOptions);
            committer.setEndpoint(endpoint);

            // @ts-ignore
            await committer.connect();
            channel.addCommitter(committer, true);

            const contract: Contract = network.getContract(smartContract);
            let transaction: Transaction;
            let arg: Uint8Array;
            if (functionName === this.APPROVE || functionName === this.COMMIT) {
                const protoArgs: protos.lifecycle.IApproveChaincodeDefinitionForMyOrgArgs | protos.lifecycle.ICommitChaincodeDefinitionArgs = {};
                if (functionName === this.APPROVE) {

                    logger.debug('%s - build the approve smart contract argument');

                    const source: protos.lifecycle.ChaincodeSource = new protos.lifecycle.ChaincodeSource();
                    if (options.packageId) {
                        const local: protos.lifecycle.ChaincodeSource.Local = new protos.lifecycle.ChaincodeSource.Local();
                        local.package_id = options.packageId;
                        source.local_package = local;
                    } else {
                        const unavailable: protos.lifecycle.ChaincodeSource.Unavailable = new protos.lifecycle.ChaincodeSource.Unavailable();
                        source.unavailable = unavailable;
                    }

                    (protoArgs as protos.lifecycle.IApproveChaincodeDefinitionForMyOrgArgs).source = source;
                } else {
                    logger.debug('%s - build the commit smart contract argument');
                }

                protoArgs.name = options.smartContractName;
                protoArgs.version = options.smartContractVersion;
                protoArgs.sequence = options.sequence;

                if (typeof options.initRequired === 'boolean') {
                    protoArgs.init_required = options.initRequired;
                }

                if (options.endorsementPlugin) {
                    protoArgs.endorsement_plugin = options.endorsementPlugin;
                }
                if (options.validationPlugin) {
                    protoArgs.validation_plugin = options.validationPlugin;
                }

                if (options.endorsementPolicy) {
                    const endorsementPolicyBuffer: Buffer = LifecycleChannel.getEndorsementPolicyBytes(options.endorsementPolicy);
                    protoArgs.validation_parameter = endorsementPolicyBuffer;
                }

                if (options.collectionConfig) {
                    protoArgs.collections = LifecycleChannel.getCollectionConfig(options.collectionConfig) as protos.common.ICollectionConfigPackage;
                }

                if (functionName === this.APPROVE) {
                    transaction = contract.createTransaction('ApproveChaincodeDefinitionForMyOrg');
                    arg = protos.lifecycle.ApproveChaincodeDefinitionForMyOrgArgs.encode(protoArgs).finish();
                } else {
                    transaction = contract.createTransaction('CommitChaincodeDefinition');
                    arg = protos.lifecycle.CommitChaincodeDefinitionArgs.encode(protoArgs).finish();
                }
            } else {
                // functionName === this.INSTANTIATE || functionName === this.UPGRADE
                if (options.endorsementPolicy) {
                    const endorsementPolicyBuffer: Buffer = LifecycleChannel.getEndorsementPolicyBytes(options.endorsementPolicy, true);
                    lcccSpecArgs[3] = endorsementPolicyBuffer.toString();
                }

                if (options.endorsementPlugin && typeof options.endorsementPlugin === 'string') {
                    lcccSpecArgs[4] = options.endorsementPlugin;
                }
                if (options.validationPlugin && typeof options.validationPlugin === 'string') {
                    lcccSpecArgs[5] = options.validationPlugin;
                }

                if (options.collectionConfig) {
                    lcccSpecArgs[6] = LifecycleChannel.getCollectionConfig(options.collectionConfig, true).toString();
                }

                transaction = contract.createTransaction(functionName);
            }

            transaction.setEndorsingPeers(endorsers);

            if (!lcccSpecArgs) {
                const txArg: Buffer = Buffer.from(arg);
                await transaction.submit(txArg as any);
            } else if (options.collectionConfig) {
                await transaction.submit(lcccSpecArgs[1], lcccSpecArgs[2], lcccSpecArgs[3], lcccSpecArgs[4], lcccSpecArgs[5], lcccSpecArgs[6]);
            } else {
                await transaction.submit(lcccSpecArgs[1], lcccSpecArgs[2], lcccSpecArgs[3], lcccSpecArgs[4], lcccSpecArgs[5]);
            }
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
        const peer: LifecyclePeer = this.lifecycle.peers.get(peerName);

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
            // convert from seconds to milliseconds
            peerConnectOptions.requestTimeout = peer.requestTimeout * 1000;
        }

        if (peer.apiOptions) {
            Object.assign(peerConnectOptions, peer.apiOptions);
        }


        // this will add the peer to the list of endorsers
        const endorser: Endorser = fabricClient.getEndorser(peer.name, peer.mspid);

        if (!endorser['connected']){
            const endpoint: Endpoint = fabricClient.newEndpoint(peerConnectOptions);
            endorser.setEndpoint(endpoint);
            // @ts-ignore
            await endorser.connect();
        }

        return endorser;
    }

    private async evaluateTransaction(peerName: string, buildRequest: any, requestTimeout?: number, smartContractName: string = '_lifecycle'): Promise<ProposalResponse> {

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
            const endorsement: Endorsement = network.getChannel().newEndorsement(smartContractName);
            endorsement.build(network.getGateway().identityContext, buildRequest);

            logger.debug('%s - sign the request');
            endorsement.sign(network.getGateway().identityContext);

            const endorseRequest: any = {
                targets: [endorser]
            };

            if (requestTimeout) {
                // convert from seconds to milliseconds
                endorseRequest.requestTimeout = requestTimeout * 1000;
            }

            logger.debug('%s - send the query request');
            const response: ProposalResponse = await endorsement.send(endorseRequest);
            return response;
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
            const peer: LifecyclePeer = this.lifecycle.peers.get(peerName);
            urls.push(peer.url);
        }
        return urls.some((url: string) => this.isLocalhostURL(url));
    }
}
