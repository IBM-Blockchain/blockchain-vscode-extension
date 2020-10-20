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
    Endorsement,
    Endorser,
    Endpoint,
    IdentityContext,
    ProposalResponse,
    User,
    Utils,
    ConnectOptions, EndorsementResponse
} from 'fabric-common';
import * as protos from 'fabric-protos';
import { Identity, IdentityProvider, Wallet } from 'fabric-network';
import { LifecycleCommon } from './LifecycleCommon';

const logger: any = Utils.getLogger('LifecyclePeer');

export interface LifecyclePeerOptions {
    name: string,
    url: string,
    mspid: string,
    sslTargetNameOverride?: string,
    pem?: string,
    clientCertKey?: string;
    clientKey?: string;
    requestTimeout?: number;
    apiOptions?: object;
}

export interface InstalledSmartContract {
    label: string;
    packageId: string;
}

export class LifecyclePeer {

    public name!: string;
    public url!: string;
    public mspid!: string;
    public sslTargetNameOverride?: string;
    public pem?: string;
    public clientCertKey?: string;
    public clientKey?: string;
    public requestTimeout?: number;
    public apiOptions?: object;

    private wallet: Wallet | undefined;
    private identity: string | undefined;

    /**
     * internal use only
     * @param options: LifecyclePeerOptions
     */
    constructor(options: LifecyclePeerOptions) {
        Object.assign(this, options);
    }

    /**
     * Set the wallet and identity that you want to use when doing lifecycle operations
     * @param wallet Wallet, the wallet containing the identity to be used to interact with the peer
     * @param identity string, the name of the identity to be used to interact with the peer
     */
    public setCredentials(wallet: Wallet, identity: string): void {
        this.wallet = wallet;
        this.identity = identity;
    }

    /**
     * Install a smart contract package onto a peer
     * @param buffer Buffer, the smart contract package buffer
     * @param requestTimeout number, [optional] the timeout used when performing the install operation
     * @return Promise<string>, the packageId of the installed smart contract
     */
    public async installSmartContractPackage(buffer: Buffer, requestTimeout?: number): Promise<string | undefined> {
        const method: string = 'installPackage';
        logger.debug(method);

        let packageId: string | undefined;

        if (!buffer) {
            throw new Error('parameter buffer missing');
        }

        try {
            logger.debug('%s - build the install smart contract request', method);
            const protoArgs: protos.lifecycle.IInstallChaincodeArgs = {};

            protoArgs.chaincode_install_package = new Uint8Array(buffer);

            const arg: Uint8Array = protos.lifecycle.InstallChaincodeArgs.encode(protoArgs).finish();

            const buildRequest: { fcn: string; args: Buffer[] } = {
                fcn: 'InstallChaincode',
                args: [Buffer.from(arg)]
            };

            const responses: ProposalResponse = await this.sendRequest(buildRequest, '_lifecycle', requestTimeout);

            const payloads: Buffer[] = await LifecycleCommon.processResponse(responses);

            const installChaincodeResult: protos.lifecycle.InstallChaincodeResult = protos.lifecycle.InstallChaincodeResult.decode(payloads[0]);

            packageId = installChaincodeResult.package_id;

            logger.debug('%s - return %s', method, packageId);

            return packageId;
        } catch (error) {
            logger.error('Problem with the request :: %s', error);
            logger.error(' problem at ::' + error.stack);
            throw new Error(`Could not install smart contact received error: ${error.message}`);
        }
    }

    /**
     * Install a smart contract package - CDS - onto a peer
     * @param buffer Buffer, the smart contract package buffer
     * @param requestTimeout number, [optional] the timeout used when performing the install operation
     * @return Promise<void>, nothing to return
     */
    public async installSmartContractPackageCds(buffer: Buffer, requestTimeout?: number): Promise<void> {
        const method: string = 'installPackage';
        logger.debug(method);

        if (!buffer) {
            throw new Error('parameter buffer missing');
        }

        try {
            logger.debug('%s - build the install smart contract request', method);
            const buildRequest: { fcn: string; args: Buffer[] } = {
                fcn: 'install',
                args: [buffer]
            };

            const responses: ProposalResponse = await this.sendRequest(buildRequest, 'lscc', requestTimeout);
            await LifecycleCommon.processResponse(responses);

            logger.debug('%s - return %s', method);
            return;
        } catch (error) {
            logger.error('Problem with the request :: %s', error);
            logger.error(' problem at ::' + error.stack);
            throw new Error(`Could not install smart contact received error: ${error.message}`);
        }

    }
    /**
     * Get all the smart contracts installed on a peer
     * @param requestTimeout number [optional, [optional] the timeout used when performing the install operation
     * @return Promise<InstalledSmartContract>, the label and packageId of each installed smart contract
     */
    public async getAllInstalledSmartContracts(requestTimeout?: number): Promise<InstalledSmartContract[]> {
        const method: string = 'getAllInstalledSmartContracts';
        logger.debug(method);

        const results: InstalledSmartContract[] = [];

        try {
            logger.debug('%s - build the get all installed smart contracts request', method);
            const arg: Uint8Array = protos.lifecycle.QueryInstalledChaincodesArgs.encode({}).finish();

            const buildRequest: { fcn: string; args: Buffer[] } = {
                fcn: 'QueryInstalledChaincodes',
                args: [Buffer.from(arg)]
            };

            const responses: ProposalResponse = await this.sendRequest(buildRequest, '_lifecycle', requestTimeout);

            const payloads: Buffer[] = await LifecycleCommon.processResponse(responses);

            // only sent to one peer so should only be one payload
            const queryAllResults: protos.lifecycle.QueryInstalledChaincodesResult = protos.lifecycle.QueryInstalledChaincodesResult.decode(payloads[0]);
            for (const queryResults of queryAllResults.installed_chaincodes) {
                const packageId: string = queryResults.package_id;
                const label: string = queryResults.label;

                const result: InstalledSmartContract = {
                    packageId: packageId,
                    label: label
                };

                results.push(result);
            }

            logger.debug('%s - end', method);
            return results;
        } catch (error) {
            logger.error('Problem with the request :: %s', error);
            logger.error(' problem at ::' + error.stack);
            throw new Error(`Could not get all the installed smart contract packages, received: ${error.message}`);
        }
    }

    public async getAllInstalledSmartContractsV1(requestTimeout?: number): Promise<InstalledSmartContract[]> {
        const method: string = 'getAllInstalledSmartContracts';
        logger.debug(method);

        const results: InstalledSmartContract[] = [];

        try {
            logger.debug('%s - build the get all installed smart contracts request', method);
            const buildRequest: { fcn: string; args: Buffer[] } = {
                fcn: 'GetInstalledChaincodes',
                args: []
            };
            const result: ProposalResponse = await this.sendRequest(buildRequest, 'lscc', requestTimeout);
            if (result) {
                // will only be one response as we are only querying one peer
                if (result.errors && result.errors[0] instanceof Error) {
                    throw result.errors[0];
                }
                const response: EndorsementResponse = result.responses[0];
                if (response.response) {
                    if (response.response.status === 200) {
                        const queryTrans: protos.protos.ChaincodeQueryResponse = protos.protos.ChaincodeQueryResponse.decode(response.response.payload);
                        for (const queryResults of queryTrans.chaincodes) {
                            const contract: InstalledSmartContract = {
                                packageId: queryResults.name,
                                label: `${queryResults.name}@${queryResults.version}`
                            };
                            results.push(contract);
                        }
                        logger.debug('%s - end', method);
                        return results;
                    } else if (response.response.message) {
                        throw new Error(response.response.message);
                    }
                }
                // no idea what we have, lets fail it and send it back
                throw new Error(response.toString());
            }
            throw new Error('Payload results are missing from the query');
        } catch (error) {
            logger.error('Problem with the request :: %s', error);
            logger.error(' problem at ::' + error.stack);
            throw new Error(`Could not get all the installed smart contract packages, received: ${error.message}`);
        }
    }

    /**
     * Get the buffer containing a smart contract package that has been installed on the peer
     * @param packageId string, the packageId of the installed smart contract package to be retrieved
     * @param requestTimeout number, [optional] the timeout used when performing the install operation
     * @return Promise<Buffer>, the buffer containing the smart contract package
     */
    public async getInstalledSmartContractPackage(packageId: string, requestTimeout?: number): Promise<Buffer> {
        const method: string = 'getInstalledSmartContractPackage';
        logger.debug(method);

        if (!packageId) {
            throw new Error('parameter packageId missing');
        }

        let result: Buffer;

        try {
            logger.debug('%s - build the get package chaincode request', method);
            const protoArgs: protos.lifecycle.IGetInstalledChaincodePackageArgs = {};
            protoArgs.package_id = packageId;

            const arg: Uint8Array = protos.lifecycle.GetInstalledChaincodePackageArgs.encode(protoArgs).finish();
            const buildRequest: { fcn: string; args: Buffer[] } = {
                fcn: 'GetInstalledChaincodePackage',
                args: [Buffer.from(arg)]
            };

            const responses: ProposalResponse = await this.sendRequest(buildRequest, '_lifecycle', requestTimeout);

            const payloads: Buffer[] = await LifecycleCommon.processResponse(responses);

            // only sent to one peer so can only be one payload
            const results: protos.lifecycle.GetInstalledChaincodePackageResult = protos.lifecycle.GetInstalledChaincodePackageResult.decode(payloads[0]);
            const packageBytes: Uint8Array = results.chaincode_install_package; // the package bytes
            result = Buffer.from(packageBytes);

            logger.debug('%s - end', method);
            return result;
        } catch (error) {
            logger.error('Problem with the request :: %s', error);
            logger.error(' problem at ::' + error.stack);
            throw new Error(`Could not get the installed smart contract package, received: ${error.message}`);
        }
    }

    public async getChannelCapabilities(channelName: string, requestTimeout?: number): Promise<string[]> {
        const buildRequest: { fcn: string; args: Buffer[] } = {
            fcn: 'GetConfigBlock',
            args: [channelName as any]
        };

        const response: ProposalResponse = await this.sendRequest(buildRequest, 'cscc', requestTimeout);
        const payload: Buffer[] = await LifecycleCommon.processResponse(response);
        const block: protos.common.Block = protos.common.Block.decode(payload[0]);
        const blockData: Uint8Array = block.data.data[0];
        const envelope: protos.common.Envelope = protos.common.Envelope.decode(blockData);
        const dataPayload: protos.common.Payload = protos.common.Payload.decode(envelope.payload);
        const configEnvelope: protos.common.ConfigEnvelope = protos.common.ConfigEnvelope.decode(dataPayload.data);
        const _capabilities: protos.common.Capabilities = protos.common.Capabilities.decode(configEnvelope.config.channel_group.groups.Application.values.Capabilities.value);
        const capabilities: any = _capabilities.capabilities;
        const keys: string[] = Object.keys(capabilities);
        return keys;
    }

    /**
     * Get a list of all the channel names that the peer has joined
     * @param requestTimeout number, [optional] the timeout used when performing the install operation
     * @return Promise<string[]>, An array of the names of the channels
     */
    public async getAllChannelNames(requestTimeout?: number): Promise<string[]> {
        const method: string = 'getAllChannelNames';
        logger.debug(method);

        const results: string[] = [];

        try {
            logger.debug('%s - build the get all installed smart contracts request', method);

            const buildRequest: { fcn: string; args: Buffer[] } = {
                fcn: 'GetChannels',
                args: []
            };

            const responses: ProposalResponse = await this.sendRequest(buildRequest, 'cscc', requestTimeout);

            const payloads: Buffer[] = await LifecycleCommon.processResponse(responses);

            // only sent to one peer so only one payload
            const queryTrans: protos.protos.ChannelQueryResponse = protos.protos.ChannelQueryResponse.decode(payloads[0]);
            logger.debug('queryChannels - ProcessedTransaction.channelInfo.length :: %s', queryTrans.channels.length);
            for (const channelInfo of queryTrans.channels) {
                logger.debug('>>> channel id %s ', channelInfo.channel_id);
                results.push(channelInfo.channel_id);
            }

            logger.debug('%s - end', method);
            return results;
        } catch (error) {
            logger.error('Problem with the request :: %s', error);
            logger.error(' problem at ::' + error.stack);
            throw new Error(`Could not get all channel names, received: ${error.message}`);
        }
    }

    private initialize(): Client {
        const fabricClient: Client = new Client('lifecycle');
        fabricClient.setTlsClientCertAndKey(this.clientCertKey!, this.clientKey!);

        const options: ConnectOptions = {
            url: this.url
        };

        if (this.pem) {
            options.pem = this.pem;
        }

        if (this.sslTargetNameOverride) {
            options['ssl-target-name-override'] = this.sslTargetNameOverride;
        }

        if (this.requestTimeout) {
            options.requestTimeout = this.requestTimeout;
        }

        if (this.apiOptions) {
            Object.assign(options, this.apiOptions);
        }

        const endpoint: Endpoint = fabricClient.newEndpoint(options);

        // this will add the peer to the list of endorsers
        const endorser: Endorser = fabricClient.getEndorser(this.name, this.mspid);
        endorser.setEndpoint(endpoint);

        return fabricClient;
    }

    private async sendRequest(buildRequest: { fcn: string, args: Buffer[] }, smartContractName: string, requestTimeout?: number): Promise<ProposalResponse> {
        if (!this.wallet || !this.identity) {
            throw new Error('Wallet or identity property not set, call setCredentials first');
        }

        const fabricClient: Client = this.initialize();

        const endorser: Endorser = fabricClient.getEndorser(this.name, this.mspid);

        try {
            // @ts-ignore
            await endorser.connect();

            const channel: Channel = fabricClient.newChannel('noname');
            // this will tell the peer it is a system wide request
            // not for a specific channel
            // @ts-ignore
            channel['name'] = '';

            const endorsement: Endorsement = channel.newEndorsement(smartContractName);

            const identity: Identity | undefined = await this.wallet.get(this.identity);
            if (!identity) {
                throw new Error(`Identity ${this.identity} does not exist in the wallet`);
            }

            const provider: IdentityProvider = this.wallet.getProviderRegistry().getProvider(identity.type);
            const user: User = await provider.getUserContext(identity, this.identity);
            const identityContext: IdentityContext = fabricClient.newIdentityContext(user);
            endorsement.build(identityContext, buildRequest as any);

            logger.debug('%s - sign the get all install smart contract request');
            endorsement.sign(identityContext);

            const endorseRequest: any = {
                targets: [endorser]
            };

            if (requestTimeout || this.requestTimeout) {
                // use the one set in the params if set otherwise use the one set when the peer was added
                endorseRequest.requestTimeout = requestTimeout ? requestTimeout : this.requestTimeout;
            }

            logger.debug('%s - send the query request');
            const response: ProposalResponse = await endorsement.send(endorseRequest);
            return response;
        } finally {
            endorser.disconnect();
        }
    }
}
