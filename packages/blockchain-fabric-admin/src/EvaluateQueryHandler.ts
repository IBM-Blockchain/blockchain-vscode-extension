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

import { Network, Query, QueryHandler, QueryHandlerFactory, QueryResponse, QueryResults } from 'fabric-network';
import { Channel, Endorser } from 'fabric-common';

/**
 * Governs the construction of querys to evaluate transactions with user determined peers.
 *
 *   Allows the user to select peers by modifying this value when creating a transaction
 *   object. Without the static peers, we would not be able to change the target peers of
 *   a transaction, since the QueryHandler needs to be assigned when connecting to the
 *   gateway.
 */
export class EvaluateQueryHandler implements QueryHandler {
    private static peers: Endorser[];

    public static setPeers(peers: Endorser[]): void {
        EvaluateQueryHandler.peers = peers;
    }
    public static getPeers(): Endorser[] {
        return EvaluateQueryHandler.peers;
    }

    /**
     * Set peers to all peers in the network. This QueryHandler will be used
     * as a gateway option when connecting to the gateway.
     * @param network
     */
    public static createQueryHandler: QueryHandlerFactory = (network: Network) => {
        const mspId: string = network.getGateway().getIdentity().mspId;
        const channel: Channel = network.getChannel();
        const orgPeers: Endorser[] = channel.getEndorsers(mspId);
        const otherPeers: Endorser[] = channel.getEndorsers().filter((peer) => !orgPeers.includes(peer));
        const allPeers: Endorser[] = orgPeers.concat(otherPeers);

        EvaluateQueryHandler.setPeers(allPeers);
        return new EvaluateQueryHandler();
    };

    /**
     * Evaluate the supplied query on appropriate peers.
     * @param {Query} query - A query object that will send the
     * query proposal to the peers and format the responses for this query handler
     * @returns {Buffer} Query result.
     */
    public async evaluate(query: Query): Promise<Buffer> {
        const errorMessages: string[] = [];

        if (EvaluateQueryHandler.peers && EvaluateQueryHandler.peers.length > 0) {
            for (const peer of EvaluateQueryHandler.peers) {
                const results: QueryResults = await query.evaluate([peer]);
                const result: QueryResponse | Error = results[peer.name];
                if (result instanceof Error) {
                    errorMessages.push(`Peer ${peer.name}: ${result.toString()}`);
                } else {
                    if (result.isEndorsed) {
                        return result.payload;
                    }
                    errorMessages.push(`Peer ${peer.name}: ${result.message}`);
                }
            }
        } else {
            errorMessages.push('No target peers provided');
        }
        const message: string = `Query failed. Errors: ${JSON.stringify(errorMessages)}`;
        const error: Error = new Error(message);
        throw error;
    }
}