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
import { IFabricWallet } from './IFabricWallet';
import { FabricWalletRegistryEntry } from './FabricWalletRegistryEntry';
import { FabricNode } from './FabricNode';

export interface IFabricRuntimeConnection {

    identityName: string;

    wallet: FabricWalletRegistryEntry;

    connect(wallet: IFabricWallet, identityName: string): Promise<void>;

    createChannelMap(): Promise<Map<string, Array<string>>>;

    disconnect(): void;

    getAllPeerNames(): Array<string>;

    getAllChannelsForPeer(peerName: string): Promise<Array<string>>;

    getAllInstantiatedChaincodes(): Promise<Array<{name: string, version: string}>>;

    getOrganizations(channelName: string): Promise<Array<string>>;

    getAllCertificateAuthorityNames(): Array<string>;

    getInstalledChaincode(peerName: string): Promise<Map<string, Array<string>>>;

    getInstantiatedChaincode(channelName: string): Promise<Array<{name: string, version: string}>>;

    getAllOrdererNames(): Array<string>;

    installChaincode(packageRegistryEntry: PackageRegistryEntry, peerName: string): Promise<void>;

    instantiateChaincode(chaincodeName: string, version: string, channel: string, fcn: string, args: Array<string>): Promise<void>;

    upgradeChaincode(chaincodeName: string, version: string, channel: string, fcn: string, args: Array<string>): Promise<void>;

    enroll(certificateAuthorityName: string, enrollmentID: string, enrollmentSecret: string): Promise<{certificate: string, privateKey: string}>;

    register(certificateAuthorityName: string, enrollmentID: string, affiliation: string): Promise<string>;

    getNode(nodeName: string): FabricNode;

    getWallet(nodeName: string): Promise<IFabricWallet>;

}
