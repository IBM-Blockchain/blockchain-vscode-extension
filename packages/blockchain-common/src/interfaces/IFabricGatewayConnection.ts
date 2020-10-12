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

import { IFabricWallet } from './IFabricWallet';
import { OutputAdapter } from '../logging/OutputAdapter';

export interface IFabricGatewayConnection {

    identityName: string;

    connect(wallet: IFabricWallet, identityName: string, timeout: number): Promise<void>;

    createChannelMap(): Promise<{channelMap: Map<string, Array<string>>, v2channels: Array<string>}>;

    disconnect(): void;

    getAllPeerNames(): Array<string>;

    getAllChannelsForPeer(peerName: string): Promise<Array<string>>;

    getChannelPeersInfo(channelName: string): Promise<{name: string, mspID: string}[]>;

    getInstantiatedChaincode(channelName: string): Promise<Array<{name: string, version: string}>>;

    isIBPConnection(): boolean;

    getMetadata(instantiatedChaincodeName: string, channel: string): Promise<any>;

    submitTransaction(chaincodeName: string, transactionName: string, channel: string, args: Array<string>, namespace: string, transientData: {[key: string]: Buffer}, evaluate?: boolean, peerTargetNames?: string[]): Promise<string | undefined>;

    addContractListener(channelName: string, contractName: string, eventName: string, outputAdapter: OutputAdapter): Promise<void>;

}
