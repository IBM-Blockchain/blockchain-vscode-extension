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

import { PackageRegistryEntry } from '../registries/PackageRegistryEntry';
import { FabricChaincode, IFabricWallet } from 'ibm-blockchain-platform-common';
import { FabricNode } from './FabricNode';
import { Attribute } from './FabricCertificate';

export interface IFabricEnvironmentConnection {

    connect(): Promise<void>;

    disconnect(): void;

    getAllPeerNames(): Array<string>;

    createChannelMap(): Promise<Map<string, Array<string>>>;

    getInstantiatedChaincode(peerNames: Array<string>, channelName: string): Promise<Array<FabricChaincode>>;

    getAllInstantiatedChaincodes(): Promise<Array<{name: string, version: string}>>;

    getAllOrganizationNames(): Promise<Array<string>>;

    getAllCertificateAuthorityNames(): Array<string>;

    getInstalledChaincode(peerName: string): Promise<Map<string, Array<string>>>;

    getAllOrdererNames(): Array<string>;

    installChaincode(packageRegistryEntry: PackageRegistryEntry, peerName: string): Promise<void>;

    instantiateChaincode(chaincodeName: string, version: string, peerNames: Array<string>, channelName: string, fcn: string, args: Array<string>, collectionPath: string): Promise<Buffer>;

    upgradeChaincode(chaincodeName: string, version: string, peerNames: Array<string>, channelName: string, fcn: string, args: Array<string>, collectionPath: string): Promise<Buffer>;

    enroll(certificateAuthorityName: string, enrollmentID: string, enrollmentSecret: string): Promise<{certificate: string, privateKey: string}>;

    register(certificateAuthorityName: string, enrollmentID: string, affiliation: string, attributes?: Attribute[]): Promise<string>;

    getNode(nodeName: string): FabricNode;

    getWallet(nodeName: string): Promise<IFabricWallet>;

}
