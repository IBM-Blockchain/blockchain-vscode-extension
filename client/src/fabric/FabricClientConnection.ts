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
import { OutputAdapter } from '../logging/OutputAdapter';
import { FabricConnection } from './FabricConnection';
import { FabricWallet } from './FabricWallet';
import { ExtensionUtil } from '../util/ExtensionUtil';
import { IFabricClientConnection } from './IFabricClientConnection';
import { Network, Contract } from 'fabric-network';

export class FabricClientConnection extends FabricConnection implements IFabricClientConnection {

    private connectionProfilePath: string;
    private networkIdProperty: boolean;

    constructor(connectionData: { connectionProfilePath: string, walletPath: string }, outputAdapter?: OutputAdapter) {
        super(outputAdapter);
        this.connectionProfilePath = connectionData.connectionProfilePath;
    }

    async connect(wallet: FabricWallet, identityName: string): Promise<void> {
        console.log('FabricClientConnection: connect');
        const connectionProfile: object = await ExtensionUtil.readConnectionProfile(this.connectionProfilePath);
        this.networkIdProperty = (connectionProfile['x-networkId'] ? true : false);
        await this.connectInner(connectionProfile, wallet, identityName);
    }

    public isIBPConnection(): boolean {
        return this.networkIdProperty;
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

            console.log('Metadata object is:', metadataObject);
            return metadataObject;
        } catch (error) {
            // This is another unusual case; the function name is ignored, or accepted, but non-JSON data is returned.
            throw new Error(`Transaction function "org.hyperledger.fabric:GetMetadata" did not return valid JSON metadata: ${error.message}`);
        }
    }

    public async submitTransaction(chaincodeName: string, transactionName: string, channel: string, args: Array<string>, namespace: string, evaluate?: boolean): Promise<string | undefined> {
        const network: Network = await this.gateway.getNetwork(channel);
        const smartContract: Contract = network.getContract(chaincodeName, namespace);

        let response: Buffer;
        if (evaluate) {
            response = await smartContract.evaluateTransaction(transactionName, ...args);
        } else {
            response = await smartContract.submitTransaction(transactionName, ...args);
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

}
