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

import {Contract, Gateway, Network, Transaction, Wallet} from 'fabric-network';
import {Channel, Endorser} from 'fabric-common';

export class TransactionHelper {
    public static async submitTransaction(wallet: Wallet, identity: string, connectionProfile: any, contractName: string, transactionName: string, argumements: string[], channelName: string, orgNames: string[]): Promise<void> {

        const gateway: Gateway = new Gateway();
        try {
            await gateway.connect(connectionProfile, {
                wallet: wallet, identity: identity, discovery: {
                    asLocalhost: true,
                    enabled: true
                }
            });

            const network: Network = await gateway.getNetwork(channelName);

            const channel: Channel = network.getChannel();

            const endorsers: Endorser[] = [];

            for (const orgName of orgNames) {
                endorsers.push(...channel.getEndorsers(orgName));
            }

            const contract: Contract = network.getContract(contractName);

            const transaction: Transaction = contract.createTransaction(transactionName);

            transaction.setEndorsingPeers(endorsers);

            await transaction.submit(...argumements);
        } finally {
            gateway.disconnect();
        }
    }
}

