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

import { PackageRegistryEntry } from '../packages/PackageRegistryEntry';

export interface IFabricConnection {

    connect(): Promise<void>;

    getConnectionDetails(): Promise<{connectionProfile: object, certificatePath: string, privateKeyPath: string} | {connectionProfilePath: string, certificatePath: string, privateKeyPath: string}>;

    disconnect(): void;

    getAllPeerNames(): Array<string>;

    getAllChannelsForPeer(peerName: string): Promise<Array<string>>;

    getInstalledChaincode(peerName: string): Promise<Map<string, Array<string>>>;

    getInstantiatedChaincode(channelName: string): Promise<Array<any>>;

    installChaincode(packageRegistryEntry: PackageRegistryEntry, peerName: string): Promise<void>;

    instantiateChaincode(chaincodeName: string, version: string, channel: string, fcn: string, args: Array<string>): Promise<void>;

    isIBPConnection(): boolean;
}
