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
import { FabricConnection } from './FabricConnection';
import { FabricWallet } from 'ibm-blockchain-platform-wallet';
import { IFabricGatewayConnection, OutputAdapter, LogType, ConnectionProfileUtil } from 'ibm-blockchain-platform-common';
import { Network, Contract, Transaction } from 'fabric-network';
import * as Client from 'fabric-client';

export class FabricGatewayConnection extends FabricConnection implements IFabricGatewayConnection {

    private description: boolean;

    constructor(connectionProfilePath: string, outputAdapter?: OutputAdapter) {
        super(connectionProfilePath, outputAdapter);
    }

    async connect(wallet: FabricWallet, identityName: string, timeout: number): Promise<void> {
        const connectionProfile: object = await ConnectionProfileUtil.readConnectionProfile(this.connectionProfilePath);
        if (connectionProfile['description']) {
            this.description = (connectionProfile['description'].includes('Network on IBP') ? true : false);
        } else {
            this.description = false;
        }
        await this.connectInner(connectionProfile, wallet, identityName, timeout);
    }

    public isIBPConnection(): boolean {
        return this.description;
    }

    public async getMetadata(instantiatedChaincodeName: string, channel: string): Promise<any> {
        const network: Network = await this.gateway.getNetwork(channel);
        const smartContract: Contract = network.getContract(instantiatedChaincodeName);

        let metadataBuffer: Buffer;
        try {
            metadataBuffer = await smartContract.evaluateTransaction('org.hyperledger.fabric:GetMetadata');
        } catch (error) {
            // This is the most likely case; smart contract does not support metadata.
            throw new Error(`Transaction function "org.hyperledger.fabric:GetMetadata" returned an error: ${error.message}`);
        }
        const metadataString: string = metadataBuffer.toString();
        if (!metadataString) {
            // This is the unusual case; the function name is ignored, or accepted, but an empty string is returned.
            throw new Error(`Transaction function "org.hyperledger.fabric:GetMetadata" did not return any metadata`);
        }
        try {
            const metadataObject: any = JSON.parse(metadataBuffer.toString());
            return metadataObject;
        } catch (error) {
            // This is another unusual case; the function name is ignored, or accepted, but non-JSON data is returned.
            throw new Error(`Transaction function "org.hyperledger.fabric:GetMetadata" did not return valid JSON metadata: ${error.message}`);
        }
    }

    public async submitTransaction(chaincodeName: string, transactionName: string, channelName: string, args: Array<string>, namespace: string, transientData: { [key: string]: Buffer }, evaluate?: boolean, peerTargetNames: string[] = []): Promise<string | undefined> {

        const network: Network = await this.gateway.getNetwork(channelName);
        const smartContract: Contract = network.getContract(chaincodeName, namespace);

        const transaction: Transaction = smartContract.createTransaction(transactionName);
        if (transientData) {
            transaction.setTransient(transientData);
        }

        if (peerTargetNames && peerTargetNames.length > 0) {
            const peerTargets: Client.ChannelPeer[] = await this.getChannelPeers(channelName, peerTargetNames);
            transaction.setEndorsingPeers(peerTargets);
        }

        let response: Buffer;
        if (evaluate) {
            response = await transaction.evaluate(...args);
        } else {
            response = await transaction.submit(...args);
        }

        if (response.buffer.byteLength === 0) {
            // If the transaction returns no data
            return undefined;
        } else {
            // Turn the response into a string
            const result: any = response.toString('utf8');
            return result;
        }

    }

    public async addContractListener(channelName: string, contractName: string, eventName: string, outputAdapter: OutputAdapter): Promise<void> {
        const network: Network = await this.gateway.getNetwork(channelName);
        const contract: Contract = network.getContract(contractName);
        const eventListenerName: string = `${eventName}-listener`;
        await contract.addContractListener(eventListenerName, eventName, (error: Error, event: any) => {
            if (error) {
                outputAdapter.log(LogType.ERROR, `Error from event: ${error.message}`, `Error from event: ${error.toString()}`);
                return;
            }

            const eventString: string = `chaincode_id: ${event.chaincode_id}, tx_id: ${event.tx_id}, event_name: "${event.event_name}", payload: ${event.payload.toString()}`;
            outputAdapter.log(LogType.INFO, undefined, `Event emitted: ${eventString}`);
        });
    }

}
