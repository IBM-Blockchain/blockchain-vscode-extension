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
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as path from 'path';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';
import {UserInputUtil} from '../../extension/commands/UserInputUtil';
import {UserInputUtilHelper} from './userInputUtilHelper';
import {ExtensionCommands} from '../../ExtensionCommands';
import {CommandUtil} from '../../extension/util/CommandUtil';
import {VSCodeBlockchainOutputAdapter} from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import {PackageRegistry} from '../../extension/registries/PackageRegistry';
import {PackageRegistryEntry} from '../../extension/registries/PackageRegistryEntry';
import {FabricEnvironmentManager} from '../../extension/fabric/environments/FabricEnvironmentManager';
import {
    FabricSmartContractDefinition,
    IFabricEnvironmentConnection,
    FabricEnvironmentRegistryEntry,
    FabricCollectionDefinition
} from 'ibm-blockchain-platform-common';

import * as privateCollectionConfig from '../../cucumber/data/collection.json';

chai.use(sinonChai);
chai.use(chaiAsPromised);

export enum LanguageType {
    CHAINCODE = 'chaincode',
    CONTRACT = 'contract'
}

export class SmartContractHelper {

    mySandBox: sinon.SinonSandbox;
    userInputUtilHelper: UserInputUtilHelper;

    constructor(sandbox: sinon.SinonSandbox, userInputUtilHelper: UserInputUtilHelper) {
        this.mySandBox = sandbox;
        this.userInputUtilHelper = userInputUtilHelper;
    }

    public async createSmartContract(language: string, assetType: string, contractName: string, capability?: string): Promise<string> {

        let type: LanguageType;
        if (language === 'JavaScript' || language === 'TypeScript' || language === 'Java' || language === 'Go') {
            type = LanguageType.CONTRACT;
        } else {
            throw new Error(`You must update this test to support the ${language} language`);
        }

        if (contractName.includes('Private')) {
            this.userInputUtilHelper.showQuickPickItemStub.withArgs('Choose a contract type to generate:').resolves({
                label: UserInputUtil.GENERATE_PD_CONTRACT,
                description: UserInputUtil.GENERATE_PD_CONTRACT_DESCRIPTION,
                data: 'private'
            });
            this.userInputUtilHelper.inputBoxStub.withArgs('Name the type of asset managed by this smart contract', 'MyPrivateAsset').resolves(assetType);
        } else {
            this.userInputUtilHelper.showQuickPickItemStub.withArgs('Choose a contract type to generate:').resolves({
                label: UserInputUtil.GENERATE_DEFAULT_CONTRACT,
                description: UserInputUtil.GENERATE_DEFAULT_CONTRACT_DESCRIPTION,
                data: 'default'
            });
            this.userInputUtilHelper.inputBoxStub.withArgs('Name the type of asset managed by this smart contract', 'MyAsset').resolves(assetType);
        }

        this.userInputUtilHelper.showLanguagesQuickPickStub.resolves({label: language, type});

        this.userInputUtilHelper.showFolderOptionsStub.withArgs('Choose how to open your new project').resolves(UserInputUtil.ADD_TO_WORKSPACE);

        const contractDirectory: string = this.getContractDirectory(contractName, language, capability);

        const uri: vscode.Uri = vscode.Uri.file(contractDirectory);

        this.userInputUtilHelper.browseStub.withArgs('Choose the location to save the smart contract.', {
            label: UserInputUtil.BROWSE_LABEL,
            description: UserInputUtil.VALID_FOLDER_NAME
        }, {
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Save',
            filters: undefined
        }, true).resolves(uri);

        await vscode.commands.executeCommand(ExtensionCommands.CREATE_SMART_CONTRACT_PROJECT);

        if (language === 'JavaScript' || language === 'TypeScript') {
            // TODO can we remove this?
            await CommandUtil.sendCommandWithOutput('npm', ['install'], contractDirectory, undefined, VSCodeBlockchainOutputAdapter.instance(), false);
        }

        return contractDirectory;
    }

    public getContractDirectory(name: string, language?: string, capability?: string): string {
        let contractDirectory: string;
        if (language === 'Go' && capability === UserInputUtil.V1_4_2) {
            process.env.GOPATH = path.join(this.userInputUtilHelper.cucumberDir, 'tmp', 'contracts');
            contractDirectory = path.join(process.env.GOPATH, 'src', name);
        } else {
            contractDirectory = path.join(this.userInputUtilHelper.cucumberDir, 'tmp', 'contracts', name);
        }

        return contractDirectory;
    }

    public async packageSmartContract(name: string, version: string, language: string, directory: string, packageFormat: string): Promise<PackageRegistryEntry> {
        // Check that the package exists!
        const _package: PackageRegistryEntry = await PackageRegistry.instance().get(name, version);
        if (!_package) {
            let workspaceFolder: vscode.WorkspaceFolder;

            if (language === 'JavaScript') {
                workspaceFolder = {index: 0, name: name, uri: vscode.Uri.file(directory)};
            } else if (language === 'TypeScript') {
                workspaceFolder = {index: 0, name: name, uri: vscode.Uri.file(directory)};
            } else if (language === 'Java') {
                this.userInputUtilHelper.inputBoxStub.withArgs('Enter a name for your Java package').resolves(name);
                this.userInputUtilHelper.inputBoxStub.withArgs('Enter a version for your Java package').resolves(version);
                workspaceFolder = {index: 0, name: name, uri: vscode.Uri.file(directory)};
            } else if (language === 'Go') {
                this.userInputUtilHelper.inputBoxStub.withArgs('Enter a name for your Go package').resolves(name);
                this.userInputUtilHelper.inputBoxStub.withArgs('Enter a version for your Go package').resolves(version);
                workspaceFolder = {index: 0, name: name, uri: vscode.Uri.file(directory)};
            } else {
                throw new Error(`I do not know how to handle language ${language}`);
            }

            let packageVersion: number;
            if (packageFormat === 'cds') {
                packageVersion = 1;
            } else {
                // tar.gz or tgz
                packageVersion = 2;
            }

            return vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT, workspaceFolder, undefined, version, packageVersion);
        } else {
            return _package;
        }
    }

    public async deploySmartContract(channel: string, name: string, version: string, packageRegistryEntry: PackageRegistryEntry, sequence: number = 1, privateData: boolean = false, ignorePreviousDeploy: boolean = false): Promise<void> {
        const fabricEnvironmentConnection: IFabricEnvironmentConnection = FabricEnvironmentManager.instance().getConnection();
        const environmentRegistryEntry: FabricEnvironmentRegistryEntry = FabricEnvironmentManager.instance().getEnvironmentRegistryEntry();

        const orgMap: Map<string, string[]> = new Map<string, string[]>();
        let peers: string [] = [];
        let orderer: string = '';
        if (process.env.OTHER_FABRIC) {
            // Using old Fabric
            peers = ['peer0.org1.example.com'];
            orgMap.set('Org1MSP', peers);
            orderer = 'orderer.example.com';
        } else if (process.env.TWO_ORG_FABRIC) {
            // local fabric 2 orgs
            peers = ['Org1 Peer', 'Org2 Peer'];
            orgMap.set('Org1MSP', ['Org1 Peer']);
            orgMap.set('Org2MSP', ['Org2 Peer']);
            orderer = 'Orderer';
        } else if (process.env.OPSTOOLS_FABRIC) {
            if (environmentRegistryEntry.name === 'mySaaSOpsToolsFabric') {
                // saas
                peers = ['Org1 Peer Saas', 'Org2 Peer Saas'];
                orgMap.set('Org1MSP', ['Org1 Peer Saas']);
                orgMap.set('Org2MSP', ['Org2 Peer Saas']);
                orderer = 'Ordering Service Saas_1';
            } else {
                // software
                peers = ['Org1 Peer', 'Org2 Peer'];
                orgMap.set('Org1MSP', ['Org1 Peer']);
                orgMap.set('Org2MSP', ['Org2 Peer']);
                orderer = 'Ordering Service_1';
            }

        } else {
            // local fabric 1 org
            peers = ['Org1 Peer'];
            orgMap.set('Org1MSP', peers);
            orderer = 'Orderer';
        }

        let committedContract: FabricSmartContractDefinition;

        if (!ignorePreviousDeploy) {

            const committedContracts: FabricSmartContractDefinition[] = await fabricEnvironmentConnection.getCommittedSmartContractDefinitions(peers, channel);

            committedContract = committedContracts.find((contract: FabricSmartContractDefinition) => {
                return name === contract.name && version === contract.version;
            });
        }

        let collectionConfig: FabricCollectionDefinition[];
        if (privateData) {
            collectionConfig = privateCollectionConfig;
        }

        if (!committedContract) {
            await vscode.commands.executeCommand(ExtensionCommands.DEPLOY_SMART_CONTRACT, true, environmentRegistryEntry, orderer, channel, orgMap, packageRegistryEntry, new FabricSmartContractDefinition(name, version, sequence, undefined, undefined, collectionConfig));
        }
    }

    public async viewContractInformation(name: string, version: string): Promise<void> {
        const _package: PackageRegistryEntry = await PackageRegistry.instance().get(name, version);
        this.userInputUtilHelper.showSmartContractPackagesQuickPickBoxStub.resolves({
            label: _package.name,
            description: _package.version,
            data: _package
        });
        await vscode.commands.executeCommand(ExtensionCommands.VIEW_PACKAGE_INFORMATION);
    }

    public async installSmartContract(name: string, version: string): Promise<void> {
        const connection: IFabricEnvironmentConnection = FabricEnvironmentManager.instance().getConnection();
        const channelMap: Map<string, string[]> = await connection.createChannelMap();
        const _package: PackageRegistryEntry = await PackageRegistry.instance().get(name, version);

        await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT, channelMap, _package);
    }

    public async instantiateSmartContract(name: string, version: string, transaction: string, args: string, privateData: boolean, channel: string): Promise<void> {
        const connection: IFabricEnvironmentConnection = FabricEnvironmentManager.instance().getConnection();
        const channelMap: Map<string, string[]> = await connection.createChannelMap();
        const peerNames: string[] = channelMap.get(channel);

        const allPackages: Array<PackageRegistryEntry> = await PackageRegistry.instance().getAll();

        const wantedPackage: PackageRegistryEntry = allPackages.find((packageEntry: PackageRegistryEntry) => {
            return packageEntry.name === name && packageEntry.version === version;
        });

        let collectionConfigString: string;
        if (privateData) {
            collectionConfigString = JSON.stringify(privateCollectionConfig);
        }

        await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT, channel, peerNames, wantedPackage, transaction, args, undefined, collectionConfigString);
    }

    public async upgradeSmartContract(name: string, version: string, transaction: string, args: string, privateData: boolean, channel: string): Promise<void> {
        const connection: IFabricEnvironmentConnection = FabricEnvironmentManager.instance().getConnection();
        const channelMap: Map<string, string[]> = await connection.createChannelMap();
        const peerNames: string[] = channelMap.get(channel);

        const allPackages: Array<PackageRegistryEntry> = await PackageRegistry.instance().getAll();

        const wantedPackage: PackageRegistryEntry = allPackages.find((packageEntry: PackageRegistryEntry) => {
            return packageEntry.name === name && packageEntry.version === version;
        });

        let collectionConfigString: string;
        if (privateData) {
            collectionConfigString = JSON.stringify(privateCollectionConfig);
        }

        await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT, channel, peerNames, wantedPackage, transaction, args, undefined, collectionConfigString);
    }
}
