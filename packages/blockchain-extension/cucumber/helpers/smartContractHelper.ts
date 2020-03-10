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
import { UserInputUtil } from '../../extension/commands/UserInputUtil';
import { UserInputUtilHelper } from './userInputUtilHelper';
import { ExtensionCommands } from '../../ExtensionCommands';
import { CommandUtil } from '../../extension/util/CommandUtil';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { PackageRegistry } from '../../extension/registries/PackageRegistry';
import { PackageRegistryEntry } from '../../extension/registries/PackageRegistryEntry';
import { BlockchainEnvironmentExplorerProvider } from '../../extension/explorer/environmentExplorer';

import { ExtensionUtil } from '../../extension/util/ExtensionUtil';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const should: Chai.Should = chai.should();

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

    public async createSmartContract(language: string, assetType: string, contractName: string, mspid?: string): Promise<string> {

        let type: LanguageType;
        if (language === 'Go') {
            type = LanguageType.CHAINCODE;
        } else if (language === 'JavaScript' || language === 'TypeScript' || language === 'Java') {
            type = LanguageType.CONTRACT;
        } else {
            throw new Error(`You must update this test to support the ${language} language`);
        }

        if (contractName.includes('Private')) {
            this.userInputUtilHelper.showQuickPickItemStub.resolves({label: UserInputUtil.GENERATE_PD_CONTRACT, description: UserInputUtil.GENERATE_PD_CONTRACT_DESCRIPTION, data: 'private'});
            this.userInputUtilHelper.inputBoxStub.withArgs('Name the type of asset managed by this smart contract', 'MyPrivateAsset').resolves(assetType);
            this.userInputUtilHelper.inputBoxStub.withArgs('Please provide an mspID for the private data collection', 'Org1MSP').resolves(mspid);
        } else {
            this.userInputUtilHelper.showQuickPickItemStub.resolves({label: UserInputUtil.GENERATE_DEFAULT_CONTRACT, description: UserInputUtil.GENERATE_DEFAULT_CONTRACT_DESCRIPTION, data: 'default'});
            this.userInputUtilHelper.inputBoxStub.withArgs('Name the type of asset managed by this smart contract', 'MyAsset').resolves(assetType);
        }

        this.userInputUtilHelper.showLanguagesQuickPickStub.resolves({ label: language, type });

        this.userInputUtilHelper.showFolderOptionsStub.withArgs('Choose how to open your new project').resolves(UserInputUtil.ADD_TO_WORKSPACE);

        const contractDirectory: string = this.getContractDirectory(contractName, language);

        const uri: vscode.Uri = vscode.Uri.file(contractDirectory);

        this.userInputUtilHelper.browseStub.withArgs('Choose the location to save the smart contract.', { label: UserInputUtil.BROWSE_LABEL, description: UserInputUtil.VALID_FOLDER_NAME }, {
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

    public getContractDirectory(name: string, language: string): string {
        let contractDirectory: string;
        if (language === 'Go') {
            process.env.GOPATH = path.join(__dirname, '..', '..', '..', 'cucumber', 'tmp', 'contracts');
            contractDirectory = path.join(process.env.GOPATH, 'src', name);
        } else {
            contractDirectory = path.join(__dirname, '..', '..', '..', 'cucumber', 'tmp', 'contracts', name);
        }

        return contractDirectory;
    }

    public async packageSmartContract(name: string, version: string, language: string, directory: string): Promise<void> {
        // Check that the package exists!
        const _package: PackageRegistryEntry = await PackageRegistry.instance().get(name, version);
        if (!_package) {
            let workspaceFolder: vscode.WorkspaceFolder;

            if (language === 'JavaScript') {
                workspaceFolder = { index: 0, name: name, uri: vscode.Uri.file(directory) };
            } else if (language === 'TypeScript') {
                workspaceFolder = { index: 0, name: name, uri: vscode.Uri.file(directory) };
            } else if (language === 'Java') {
                this.userInputUtilHelper.inputBoxStub.withArgs('Enter a name for your Java package').resolves(name);
                this.userInputUtilHelper.inputBoxStub.withArgs('Enter a version for your Java package').resolves(version);
                workspaceFolder = { index: 0, name: name, uri: vscode.Uri.file(directory) };
            } else if (language === 'Go') {
                this.userInputUtilHelper.inputBoxStub.withArgs('Enter a name for your Go package').resolves(name);
                this.userInputUtilHelper.inputBoxStub.withArgs('Enter a version for your Go package').resolves(version);
                workspaceFolder = { index: 0, name: name, uri: vscode.Uri.file(directory) };
            } else {
                throw new Error(`I do not know how to handle language ${language}`);
            }

            await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT, workspaceFolder, undefined, version);
        }
    }

    public async installSmartContract(name: string, version: string): Promise<void> {
        const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();
        const allTreeItems: any[] = await blockchainRuntimeExplorerProvider.getChildren();
        const smartContracts: any[] = await blockchainRuntimeExplorerProvider.getChildren(allTreeItems[0]);
        const installedLabel: any[] = await blockchainRuntimeExplorerProvider.getChildren(smartContracts[1]); // Smart contracts
        const installedContracts: any[] = await blockchainRuntimeExplorerProvider.getChildren(installedLabel[0]); // installed smart contracts
        const installedContract: any = installedContracts.find((contract: any) => {
            return contract.label === `${name}@${version}`;
        });

        if (!installedContract) {
            if (process.env.ANSIBLE_FABRIC) {
                this.userInputUtilHelper.showPeersQuickPickStub.resolves(['Org1Peer1', 'Org1Peer2', 'Org2Peer1', 'Org2Peer2']);
            }

            if (process.env.TWO_ORG_FABRIC) {
                this.userInputUtilHelper.showPeersQuickPickStub.resolves(['Org1Peer1', 'Org2Peer1']);
            }

            const _package: PackageRegistryEntry = await PackageRegistry.instance().get(name, version);

            should.exist(_package);

            this.userInputUtilHelper.showInstallableStub.resolves({
                label: name,
                data: {
                    packageEntry: _package,
                    workspace: undefined
                }
            });
            await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT);
        }
    }

    public async instantiateSmartContract(name: string, version: string, transaction: string, args: string, privateData: boolean, channel: string): Promise<void> {
        // Check if instantiated contract exists
        const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();
        const allTreeItems: any[] = await blockchainRuntimeExplorerProvider.getChildren();
        const smartContracts: any[] = await blockchainRuntimeExplorerProvider.getChildren(allTreeItems[0]);
        const instantiatedLabel: any[] = await blockchainRuntimeExplorerProvider.getChildren(smartContracts[1]); // smart contracts
        const instantiatedContracts: any[] = await blockchainRuntimeExplorerProvider.getChildren(instantiatedLabel[1]); // instantiated contracts
        const instantiatedContract: any = instantiatedContracts.find((contract: any) => {
            return contract.name === name;
        });

        if (!instantiatedContract) {

            let peer: string;
            if (process.env.OTHER_FABRIC) {
                // Using old Fabric
                peer = 'peer0.org1.example.com';
            } else {
                // Using new Ansible Fabric
                peer = 'Org1Peer1';
            }

            this.userInputUtilHelper.showChannelStub.resolves({
                label: channel,
                data: [peer]
            });

            const allPackages: Array<PackageRegistryEntry> = await PackageRegistry.instance().getAll();

            const wantedPackage: PackageRegistryEntry = allPackages.find((packageEntry: PackageRegistryEntry) => {
                return packageEntry.name === name && packageEntry.version === version;
            });

            this.userInputUtilHelper.showChaincodeAndVersionStub.resolves({
                label: `${name}@${version}`,
                description: 'Installed',
                data: {
                    packageEntry: wantedPackage,
                    workspaceFolder: undefined,
                }
            });

            this.userInputUtilHelper.inputBoxStub.withArgs('optional: What function do you want to call on instantiate?').resolves(transaction);
            this.userInputUtilHelper.inputBoxStub.withArgs('optional: What are the arguments to the function, (comma seperated)').resolves(args);

            this.userInputUtilHelper.showYesNoQuickPick.resolves(UserInputUtil.NO);
            if (privateData) {
                this.userInputUtilHelper.showYesNoQuickPick.resolves(UserInputUtil.YES);
                this.userInputUtilHelper.getWorkspaceFoldersStub.callThrough();
                const collectionPath: string = path.join(__dirname, '../../../cucumber/data/collection.json');
                this.userInputUtilHelper.browseStub.resolves(collectionPath);
            }

            this.userInputUtilHelper.showQuickPickStub.withArgs('Choose a smart contract endorsement policy', [UserInputUtil.DEFAULT_SC_EP, UserInputUtil.CUSTOM]).resolves(UserInputUtil.DEFAULT_SC_EP);
            await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT);
        }
    }

    public async upgradeSmartContract(name: string, version: string, transaction: string, args: string, privateData: boolean, channel: string): Promise<void> {

        let peer: string;
        if (process.env.OTHER_FABRIC) {
            // Using old Fabric
            peer = 'peer0.org1.example.com';
        } else {
            // Using new Ansible Fabric
            peer = 'Org1Peer1';
        }

        this.userInputUtilHelper.showChannelStub.resolves({
            label: channel,
            data: [peer]
        });

        const allPackages: Array<PackageRegistryEntry> = await PackageRegistry.instance().getAll();

        const wantedPackage: PackageRegistryEntry = allPackages.find((packageEntry: PackageRegistryEntry) => {
            return packageEntry.name === name && packageEntry.version === version;
        });

        this.userInputUtilHelper.showChaincodeAndVersionStub.resolves({
            label: `${name}@${version}`,
            description: 'Installed',
            data: {
                packageEntry: wantedPackage,
                workspaceFolder: undefined,
            }
        });

        // Upgrade from instantiated contract at version 0.0.1
        this.userInputUtilHelper.showRuntimeInstantiatedSmartContractsStub.resolves({
            label: `${name}@0.0.1`,
            data: { name: name, channel: 'mychannel', version: '0.0.1' }
        });

        this.userInputUtilHelper.inputBoxStub.withArgs('optional: What function do you want to call on upgrade?').resolves(transaction);
        this.userInputUtilHelper.inputBoxStub.withArgs('optional: What are the arguments to the function, (e.g. ["arg1", "arg2"])', '[]').resolves(args);

        this.userInputUtilHelper.showYesNoQuickPick.resolves(UserInputUtil.NO);
        if (privateData) {
            this.userInputUtilHelper.showYesNoQuickPick.resolves(UserInputUtil.YES);
            const collectionPath: string = path.join(__dirname, '../../../cucumber/data/collection.json');
            this.userInputUtilHelper.browseStub.resolves(collectionPath);
        }

        this.userInputUtilHelper.showQuickPickStub.withArgs('Choose a smart contract endorsement policy', [UserInputUtil.DEFAULT_SC_EP, UserInputUtil.CUSTOM]).resolves(UserInputUtil.DEFAULT_SC_EP);

        await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT);
    }

    public async viewContractInformation(name: string, version: string): Promise<void> {
        const _package: PackageRegistryEntry = await PackageRegistry.instance().get(name, version);
        this.userInputUtilHelper.showSmartContractPackagesQuickPickBoxStub.resolves({ label: _package.name, description: _package.version, data: _package });
        await vscode.commands.executeCommand(ExtensionCommands.VIEW_PACKAGE_INFORMATION);
    }

}
