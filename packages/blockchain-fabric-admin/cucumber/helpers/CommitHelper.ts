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

import {Wallet} from 'fabric-network';
import {DefinedSmartContract, Lifecycle, LifecycleChannel} from '../../src';

export class CommitHelper {

    public static async commitSmartContract(lifecycle: Lifecycle, peerNames: string[], name: string, version: string, wallet: Wallet, identity: string, policy?: string, sequence?: number): Promise<void> {

        const channel: LifecycleChannel = lifecycle.getChannel('mychannel', wallet, identity);

        if (!sequence) {
            sequence = 1;
        }

        await channel.commitSmartContractDefinition(peerNames, 'orderer.example.com', {
            smartContractName: name,
            smartContractVersion: version,
            sequence: sequence,
            endorsementPolicy: policy
        });
    }

    public static async getCommittedSmartContracts(lifecycle: Lifecycle, peerName: string, wallet: Wallet, identity: string): Promise<string[]> {
        const channel: LifecycleChannel = lifecycle.getChannel('mychannel', wallet, identity);

        const result: DefinedSmartContract[] = await channel.getAllCommittedSmartContracts(peerName);

        return result.map(data => {
            return data.smartContractName;
        });
    }

    public static async getCommittedSmartContract(lifecycle: Lifecycle, peerName: string, name: string, wallet: Wallet, identity: string): Promise<DefinedSmartContract> {
        const channel: LifecycleChannel = lifecycle.getChannel('mychannel', wallet, identity);

        return await channel.getCommittedSmartContract(peerName, name);
    }
}
