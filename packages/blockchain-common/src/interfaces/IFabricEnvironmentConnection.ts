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

import { FabricCommittedSmartContract } from '../fabricModel/FabricCommittedSmartContract';
import {IFabricWallet} from './IFabricWallet';
import { FabricNode } from '../fabricModel/FabricNode';
import { Attribute } from '../fabricModel/FabricCertificate';
import { FabricInstalledSmartContract } from '../fabricModel/FabricInstalledSmartContract';

export interface IFabricEnvironmentConnection {

    environmentName: string;

    connect(nodes: FabricNode[]): Promise<void>;

    disconnect(): void;

    getAllPeerNames(): Array<string>;

    createChannelMap(): Promise<Map<string, Array<string>>>;

    getCommittedSmartContracts(peerNames: Array<string>, channelName: string): Promise<Array<FabricCommittedSmartContract>>;

    getAllCommittedSmartContracts(): Promise<Array<{name: string, version: string}>>;

    getAllOrganizationNames(): Array<string>;

    getAllCertificateAuthorityNames(): Array<string>;

    getInstalledSmartContracts(peerName: string): Promise<FabricInstalledSmartContract[]>;

    getAllOrdererNames(): Array<string>;

    installSmartContract(pathToPackage: string, peerName: string): Promise<string>;

    instantiateChaincode(chaincodeName: string, version: string, peerNames: Array<string>, channelName: string, fcn: string, args: Array<string>, collectionPath: string, contractEP: any): Promise<Buffer>;

    upgradeChaincode(chaincodeName: string, version: string, peerNames: Array<string>, channelName: string, fcn: string, args: Array<string>, collectionPath: string, contractEP: any): Promise<Buffer>;

    enroll(certificateAuthorityName: string, enrollmentID: string, enrollmentSecret: string): Promise<{certificate: string, privateKey: string}>;

    register(certificateAuthorityName: string, enrollmentID: string, affiliation: string, attributes?: Attribute[]): Promise<string>;

    getNode(nodeName: string): FabricNode;

    getWallet(nodeName: string): Promise<IFabricWallet>;

    approveSmartContractDefinition(ordererName: string, channelName: string, peerNames: string[],  name: string, version: string, packageId: string, sequence: number): Promise<void>;

    commitSmartContractDefinition(ordererName: string, channelName: string, peerNames: string[],  name: string, version: string, sequence: number): Promise<void>;

    getCommitReadiness(channelName: string, peerName: string, name: string, version: string, sequence: number ): Promise<boolean>;
}
