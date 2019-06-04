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
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as myExtension from '../../src/extension';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricRuntimeManager } from '../../src/fabric/FabricRuntimeManager';
import { FabricRuntime } from '../../src/fabric/FabricRuntime';
import { ExtensionUtil } from '../../src/util/ExtensionUtil';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { PackageRegistryEntry } from '../../src/packages/PackageRegistryEntry';
import { PackageRegistry } from '../../src/packages/PackageRegistry';
import { BlockchainWalletExplorerProvider } from '../../src/explorer/walletExplorer';
import { BlockchainGatewayExplorerProvider } from '../../src/explorer/gatewayExplorer';
import { BlockchainRuntimeExplorerProvider } from '../../src/explorer/runtimeOpsExplorer';
import { BlockchainPackageExplorerProvider } from '../../src/explorer/packageExplorer';
import { TestUtil } from '../../test/TestUtil';
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';
import { SettingConfigurations } from '../../SettingConfigurations';
import { FabricGatewayRegistry } from '../../src/fabric/FabricGatewayRegistry';
import { FabricGatewayRegistryEntry } from '../../src/fabric/FabricGatewayRegistryEntry';
import { FabricWalletRegistryEntry } from '../../src/fabric/FabricWalletRegistryEntry';
import { FabricWalletUtil } from '../../src/fabric/FabricWalletUtil';
import { FabricRuntimeUtil } from '../../src/fabric/FabricRuntimeUtil';
import { FabricWalletRegistry } from '../../src/fabric/FabricWalletRegistry';
import { FabricConnectionManager } from '../../src/fabric/FabricConnectionManager';
import { IFabricClientConnection } from '../../src/fabric/IFabricClientConnection';
import { MetadataUtil } from '../../src/util/MetadataUtil';
import { UserInputUtilHelper } from '../helpers/userInputUtilHelper';
import { SmartContractHelper } from '../helpers/smartContractHelper';
import { GeneratedTestsHelper } from '../helpers/generatedTestsHelper';

// tslint:disable:no-unused-expression

chai.use(sinonChai);
chai.use(chaiAsPromised);
const should: Chai.Should = chai.should();

const mySandBox: sinon.SinonSandbox = sinon.createSandbox();
const timeout: any = { timeout: 120000 * 1000 }; // Global timeout - 2 minutes

const userInputUtilHelper: UserInputUtilHelper = new UserInputUtilHelper(mySandBox);
const smartContractHelper: SmartContractHelper = new SmartContractHelper(mySandBox, userInputUtilHelper);
const generatedTestsHelper: GeneratedTestsHelper = new GeneratedTestsHelper(mySandBox, userInputUtilHelper, smartContractHelper);

export enum LanguageType {
    CHAINCODE = 'chaincode',
    CONTRACT = 'contract'
}

let torndownFabric: boolean = false; // Flag used for running teardown only once before any tests

module.exports = function (): any {

    this.Before(timeout, async () => {

        try {

            if (!torndownFabric) {
                // If we don't teardown the existing Fabric, we're told that the package is already installed
                userInputUtilHelper.showConfirmationWarningMessageStub.resolves(true);
                try {
                    await vscode.commands.executeCommand(ExtensionCommands.TEARDOWN_FABRIC);
                } catch (error) {
                    // If the Fabric is already torn down, do nothing
                }
                userInputUtilHelper.showConfirmationWarningMessageStub.reset();
                torndownFabric = true;

                await ExtensionUtil.activateExtension();

                // We need to delete any created packages here !!!
                await ExtensionUtil.activateExtension();
                await TestUtil.storeGatewaysConfig();
                await TestUtil.storeRuntimesConfig();
                await TestUtil.storeExtensionDirectoryConfig();
                await TestUtil.storeRepositoriesConfig();
                await TestUtil.storeWalletsConfig();

                VSCodeBlockchainOutputAdapter.instance().setConsole(true);

                const extDir: string = path.join(__dirname, '..', '..', '..', 'integrationTest', 'tmp');

                await vscode.workspace.getConfiguration().update(SettingConfigurations.EXTENSION_DIRECTORY, extDir, vscode.ConfigurationTarget.Global);
                const packageDir: string = path.join(extDir, 'packages');
                const exists: boolean = await fs.pathExists(packageDir);

                if (exists) {
                    await fs.remove(packageDir);
                }

                await vscode.workspace.getConfiguration().update(SettingConfigurations.EXTENSION_REPOSITORIES, [], vscode.ConfigurationTarget.Global);
            }
        } catch (error) {
            console.log(error);
        }
    });

    // TODO: We want an After hook which clears the call count on all of our stubs after each scenario - then we can getCalls/ check call counts

    /**
     *
     * GIVEN
     *
     */

    this.Given('the Local Fabric is running', timeout, async () => {

        const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
        const runtime: FabricRuntime = runtimeManager.getRuntime();

        let isRunning: boolean = await runtime.isRunning();
        if (!isRunning) {
            await vscode.commands.executeCommand(ExtensionCommands.START_FABRIC);
            isRunning = await runtime.isRunning();
        }

        isRunning.should.equal(true);
    });

    this.Given('a {string} smart contract for {string} assets with the name {string} and version {string}', timeout, async (language: string, assetType: string, name: string, version: string) => {
        this.contractLanguage = language;
        if (assetType === 'null') {
            assetType = null;
        }
        this.contractAssetType = assetType;
        this.contractName = name;
        this.contractVersion = version;
    });

    this.Given("the contract hasn't been created already", timeout, async () => {
        const contractDirectory: string = smartContractHelper.getContractDirectory(this.contractName, this.contractLanguage);
        const exists: boolean = await fs.pathExists(contractDirectory);
        if (exists) {
            await fs.remove(contractDirectory);
        }
    });

    this.Given('the contract has been created', timeout, async () => {
        const contractDirectory: string = smartContractHelper.getContractDirectory(this.contractName, this.contractLanguage);
        const exists: boolean = await fs.pathExists(contractDirectory);
        if (!exists) {
            this.contractDirectory = await smartContractHelper.createSmartContract(this.contractLanguage, this.contractAssetType, this.contractName);
        } else {
            this.contractDirectory = contractDirectory;
        }
    });

    this.Given('the contract has been packaged', timeout, async () => {
        // Check that the package exists!
        const _package: PackageRegistryEntry = await PackageRegistry.instance().get(this.contractName, this.contractVersion);
        if (_package) {
            // Package exists!
        } else {
            // If the package doesn't exist

            await packageSmartContract(this.contractName, this.contractVersion, this.contractLanguage, this.contractDirectory);
        }

    });

    this.Given('the package has been installed', timeout, async () => {
        const blockchainRuntimeExplorerProvider: BlockchainRuntimeExplorerProvider = myExtension.getBlockchainRuntimeExplorerProvider();
        const allTreeItems: any[] = await blockchainRuntimeExplorerProvider.getChildren();
        const smartContracts: any[] = await blockchainRuntimeExplorerProvider.getChildren(allTreeItems[0]);
        const installedContracts: any[] = await blockchainRuntimeExplorerProvider.getChildren(smartContracts[0]); // Installed smart contracts
        const installedContract: any = installedContracts.find((contract: any) => {
            return contract.label === `${this.contractName}@${this.contractVersion}`;
        });

        if (!installedContract) {
            await installSmartContract(this.contractName, this.contractVersion);
        } else {
            // Contract has been installed
        }

    });

    this.Given("the package with the name '{string}' and version '{string}' doesn\'t already exist", timeout, async (packageName: string, packageVersion: string) => {
        const packages: Array<PackageRegistryEntry> = await PackageRegistry.instance().getAll();
        const _package: PackageRegistryEntry = packages.find((pkg: PackageRegistryEntry) => {
            return pkg.name === packageName;
        });

        if (_package) {
            const showSmartContractPackagesQuickPickBoxStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'showSmartContractPackagesQuickPickBox');
            showSmartContractPackagesQuickPickBoxStub.resolves([{
                label: packageName,
                description: packageVersion,
                data: _package
            }]);
            await vscode.commands.executeCommand(ExtensionCommands.DELETE_SMART_CONTRACT);

        } else {
            // Package doesn't exist
            return;
        }

    });

    this.Given("the '{string}' wallet", timeout, async (wallet: string) => {
        if (wallet === 'Local Fabric') {
            wallet = FabricWalletUtil.LOCAL_WALLET;
        }
        // Might want to detect if 'Local Fabric', then use FabricRuntime/WalletUtil
        this.wallet = wallet;
    });

    this.Given("the '{string}' identity", timeout, async (identity: string) => {
        if (identity === 'Local Fabric Admin') {
            identity = FabricRuntimeUtil.ADMIN_USER;
        }
        this.identity = identity;
    });

    this.Given("the identity '{string}' exists", timeout, async (identity: string) => {
        let walletEntry: FabricWalletRegistryEntry;
        try {
            walletEntry = FabricWalletRegistry.instance().get(this.wallet);
        } catch (error) {
            walletEntry = new FabricWalletRegistryEntry();
            walletEntry.name = FabricWalletUtil.LOCAL_WALLET;
            walletEntry.walletPath = path.join(__dirname, `../../integrationTest/tmp/${FabricWalletUtil.LOCAL_WALLET}`);
            walletEntry.managedWallet = true;
        }

        const identityExists: boolean = await fs.pathExists(path.join(walletEntry.walletPath, identity));
        if (identityExists) {
            // Remove it
            userInputUtilHelper.showWalletsQuickPickStub.resolves({
                label: walletEntry.name,
                data: walletEntry
            });

            userInputUtilHelper.showIdentitiesQuickPickStub.resolves(identity);

            // If the identity already exists, remove it from the wallet
            await vscode.commands.executeCommand(ExtensionCommands.DELETE_IDENTITY);
        }

        await createCAIdentity(identity);

        this.identity = identity;
    });

    this.Given("connected to the '{string}' gateway", timeout, async (gateway: string) => {
        if (gateway === 'Local Fabric') {
            gateway = FabricRuntimeUtil.LOCAL_FABRIC;
        }

        this.gateway = gateway;

        await connectToFabric(this.gateway, this.wallet, this.identity);

    });

    this.Given(/the contract has been instantiated with the transaction '(.*?)' and args '(.*?)', (not )?using private data/, timeout, async (transaction: string, args: string, usingPrivateData: string) => {
        let privateData: boolean;
        if (usingPrivateData === 'not ') {
            privateData = false;
        } else {
            privateData = true;
        }

        // Check if instantiated contract exists
        const blockchainRuntimeExplorerProvider: BlockchainRuntimeExplorerProvider = myExtension.getBlockchainRuntimeExplorerProvider();
        const allTreeItems: any[] = await blockchainRuntimeExplorerProvider.getChildren();
        const smartContracts: any[] = await blockchainRuntimeExplorerProvider.getChildren(allTreeItems[0]);
        const instantiatedContracts: any[] = await blockchainRuntimeExplorerProvider.getChildren(smartContracts[1]); // Installed smart contracts
        const instantiatedContract: any = instantiatedContracts.find((contract: any) => {
            return contract.label === `${this.contractName}@${this.contractVersion}`;
        });

        if (!instantiatedContract) {
            // Instantiate
            await instantiateSmartContract(this.contractName, this.contractVersion, transaction, args, privateData);
        } else {
            // Contract with that name has been instantiated (although we don't know with what tx/args)
        }

    });

    this.Given("the contract version has been updated to '{string}'", timeout, async (version: string) => {
        this.contractVersion = version;
        if (this.contractLanguage === 'JavaScript' || this.contractLanguage === 'TypeScript') {
            const contractDirectory: string = smartContractHelper.getContractDirectory(this.contractName, this.contractLanguage);

            // Actually write to the package.json
            const fileContents: Buffer = await fs.readFile(path.join(contractDirectory, 'package.json'));
            const packageObject: any = JSON.parse(fileContents.toString());
            packageObject.verison = version;
            const packageJsonString: string = JSON.stringify(packageObject, null, 4);
            return fs.writeFile(path.join(contractDirectory, 'package.json'), packageJsonString, 'utf8');
        }
    });

    /**
     *
     * When
     *
     */

    this.When('I create the contract', timeout, async () => {
        this.contractDirectory = await smartContractHelper.createSmartContract(this.contractLanguage, this.contractAssetType, this.contractName);
    });

    this.When('I package the contract', timeout, async () => {
        await packageSmartContract(this.contractName, this.contractVersion, this.contractLanguage, this.contractDirectory);
    });

    this.When('I install the package', timeout, async () => {
        await installSmartContract(this.contractName, this.contractVersion);
    });

    this.When(/I instantiate the installed package with the transaction '(.*?)' and args '(.*?)', (not )?using private data/, timeout, async (transaction: string, args: string, usingPrivateData: string) => {
        let privateData: boolean;
        if (usingPrivateData === 'not ') {
            privateData = false;
        } else {
            privateData = true;
        }
        await instantiateSmartContract(this.contractName, this.contractVersion, transaction, args, privateData);

    });

    this.When(/I upgrade the installed package with the transaction '(.*?)' and args '(.*?)', (not )?using private data/, timeout, async (transaction: string, args: string, usingPrivateData: string) => {
        let privateData: boolean;
        if (usingPrivateData === 'not ') {
            privateData = false;
        } else {
            privateData = true;
        }
        await upgradeSmartContract(this.contractName, this.contractVersion, transaction, args, privateData);

    });

    this.When("connecting to the '{string}' gateway", timeout, async (gateway: string) => {
        if (gateway === 'Local Fabric') {
            gateway = FabricRuntimeUtil.LOCAL_FABRIC;
        }

        this.gateway = gateway;

        await connectToFabric(gateway, this.wallet, this.identity);
    });

    this.When('I generate a {string} functional test for a {string} contract', timeout, async (testLanguage: string, contractLanguage: string) => {

        await generatedTestsHelper.generateSmartContractTests(this.contractName, '0.0.1', testLanguage, FabricRuntimeUtil.LOCAL_FABRIC);
        this.testLanguage = testLanguage;
        this.contractLanguage = contractLanguage;
    });

    this.When(/^I submit the transaction '(.*?)' with args '(.*?)' ?(and with the transient data '.*?')?$/, timeout, async (transaction: string, args: string, transientData: string) => {
        await submitTransaction(this.contractName, this.contractVersion, this.contractLanguage, transaction, args, this.gateway, `${this.contractAssetType}Contract`, transientData);
    });

    /**
     *
     * THEN
     *
     */

    this.Then('a new contract directory should exist', timeout, async () => {

        const exists: boolean = await fs.pathExists(this.contractDirectory);
        exists.should.equal(true);
    });

    this.Then("a functional test file with the filename '{string}' should exist and contain the correct contents", timeout, async (fileName: string) => {
        const filePath: string = path.join(this.contractDirectory, 'functionalTests', fileName);
        const exists: boolean = await fs.pathExists(filePath);
        exists.should.equal(true);

        const testFileContentsBuffer: Buffer = await fs.readFile(filePath);
        const testFileContents: string = testFileContentsBuffer.toString();
        // Did it open?
        const textEditors: vscode.TextEditor[] = vscode.window.visibleTextEditors;
        const openFileNameArray: string[] = [];
        for (const textEditor of textEditors) {
            openFileNameArray.push(textEditor.document.fileName);
        }
        openFileNameArray.includes(filePath).should.be.true;
        // Get the smart contract metadata
        const connection: IFabricClientConnection = FabricConnectionManager.instance().getConnection();
        const smartContractTransactionsMap: Map<string, string[]> = await MetadataUtil.getTransactionNames(connection, this.contractName, 'mychannel');
        let smartContractTransactionsArray: string[];
        for (const name of smartContractTransactionsMap.keys()) {
            smartContractTransactionsArray = smartContractTransactionsMap.get(name);
        }
        // Check the test file was populated properly
        testFileContents.includes(this.contractName).should.be.true;
        testFileContents.startsWith('/*').should.be.true;
        testFileContents.includes('gateway.connect').should.be.true;
        testFileContents.includes('submitTransaction').should.be.true;
        testFileContents.includes(smartContractTransactionsArray[0]).should.be.true;
        testFileContents.includes(smartContractTransactionsArray[1]).should.be.true;
        testFileContents.includes(smartContractTransactionsArray[2]).should.be.true;

    });

    this.Then('a new package should be created with the name {string} and verison {string}', timeout, async (packageName: string, packageVersion: string) => {
        const _package: PackageRegistryEntry = await PackageRegistry.instance().get(packageName, packageVersion);
        _package.should.exist;

        // showInstallableStub.should.have.been.calledOnce; -> Want to uncomment these once we get the AFTER ALL hook implemented
        // showPeerQuickPickStub.should.have.been.calledOnce;
    });

    this.Then(/^there should be an? (installed smart contract |instantiated smart contract |Node )?tree item with a label '(.*?)' in the '(Smart Contract Packages|Local Fabric Ops|Fabric Gateways|Fabric Wallets)' panel$/, timeout, async (child: string, label: string, panel: string) => {

        let treeItems: any[];
        if (panel === 'Smart Contract Packages') {
            const blockchainPackageExplorerProvider: BlockchainPackageExplorerProvider = myExtension.getBlockchainPackageExplorerProvider();
            treeItems = await blockchainPackageExplorerProvider.getChildren();
        } else if (panel === 'Local Fabric Ops') {
            const blockchainRuntimeExplorerProvider: BlockchainRuntimeExplorerProvider = myExtension.getBlockchainRuntimeExplorerProvider();
            if (child.includes('installed smart contract')) {
                const allTreeItems: any[] = await blockchainRuntimeExplorerProvider.getChildren();
                const smartContracts: any[] = await blockchainRuntimeExplorerProvider.getChildren(allTreeItems[0]);
                treeItems = await blockchainRuntimeExplorerProvider.getChildren(smartContracts[0]); // Installed smart contracts
            } else if (child.includes('instantiated smart contract')) {
                const allTreeItems: any[] = await blockchainRuntimeExplorerProvider.getChildren();
                const smartContracts: any[] = await blockchainRuntimeExplorerProvider.getChildren(allTreeItems[0]);
                treeItems = await blockchainRuntimeExplorerProvider.getChildren(smartContracts[1]); // Instantiated smart contracts
            } else if (child.includes('Node')) {
                const allTreeItems: any[] = await blockchainRuntimeExplorerProvider.getChildren();
                treeItems = await blockchainRuntimeExplorerProvider.getChildren(allTreeItems[2]); // Nodes
            } else {
                treeItems = await blockchainRuntimeExplorerProvider.getChildren();
            }
        } else if (panel === 'Fabric Gateways') {
            const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = myExtension.getBlockchainGatewayExplorerProvider();
            treeItems = await blockchainGatewayExplorerProvider.getChildren();
        } else if (panel === 'Fabric Wallets') {
            const blockchainWalletExplorerProvider: BlockchainWalletExplorerProvider = myExtension.getBlockchainWalletExplorerProvider();
            treeItems = await blockchainWalletExplorerProvider.getChildren();
        } else {
            throw new Error('Name of panel doesn\'t exist');
        }

        // Find tree item using label
        const treeItem: any = treeItems.find((item: any) => {
            return item.label === label;
        });

        should.exist(treeItem);

        this.treeItem = treeItem;
    });

    this.Then("the tree item should have a tooltip equal to '{string}'", timeout, async (tooltipValue: string) => {
        this.treeItem.tooltip.should.equal(tooltipValue);
    });

    this.Then('the tests should be runnable', timeout, async () => {
        if (this.contractLanguage === 'TypeScript') {
            const testRunResult: string = await generatedTestsHelper.runSmartContractTests(this.contractName, this.testLanguage, this.contractAssetType);
            testRunResult.includes('1 passing').should.be.true;
        }
    });

    this.Then("the logger should have been called with '{string}', '{string}' and '{string}'", timeout, async (type: string, popupMessage: string, outputMessage: string) => {
        userInputUtilHelper.logSpy.should.have.been.calledWith(type, popupMessage, outputMessage);
    });

    /**
     *
     * HELPER
     *
     */

    async function packageSmartContract(name: string, version: string, language: string, directory: string): Promise<void> {
        let workspaceFolder: vscode.WorkspaceFolder;

        let workspaceFiles: vscode.Uri[];
        if (language === 'JavaScript') {
            workspaceFolder = { index: 0, name: name, uri: vscode.Uri.file(directory) };
        } else if (language === 'TypeScript') {
            workspaceFolder = { index: 0, name: name, uri: vscode.Uri.file(directory) };
        } else if (language === 'Java') {
            userInputUtilHelper.inputBoxStub.withArgs('Enter a name for your Java package').resolves(name);
            userInputUtilHelper.inputBoxStub.withArgs('Enter a version for your Java package').resolves(version);
            workspaceFolder = { index: 0, name: name, uri: vscode.Uri.file(directory) };
        } else if (language === 'Go') {
            userInputUtilHelper.inputBoxStub.withArgs('Enter a name for your Go package').resolves(name);
            userInputUtilHelper.inputBoxStub.withArgs('Enter a version for your Go package').resolves(version);
            workspaceFolder = { index: 0, name: name, uri: vscode.Uri.file(directory) };
            workspaceFiles = [vscode.Uri.file('chaincode.go')];
            userInputUtilHelper.findFilesStub.withArgs(new vscode.RelativePattern(workspaceFolder, '**/*.go'), null, 1).resolves(workspaceFiles);
        } else {
            throw new Error(`I do not know how to handle language ${language}`);
        }

        userInputUtilHelper.getWorkspaceFoldersStub.returns([workspaceFolder]);

        await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT, workspaceFolder, undefined, version);

    }

    async function installSmartContract(name: string, version: string): Promise<void> {
        userInputUtilHelper.showPeersQuickPickStub.resolves(['peer0.org1.example.com']);
        const _package: PackageRegistryEntry = await PackageRegistry.instance().get(name, version);

        should.exist(_package);

        userInputUtilHelper.showInstallableStub.resolves({
            label: name,
            data: {
                packageEntry: _package,
                workspace: undefined
            }
        });
        await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT);
    }

    async function instantiateSmartContract(name: string, version: string, transaction: string, args: string, privateData: boolean): Promise<void> {
        userInputUtilHelper.showChannelStub.resolves({
            label: 'mychannel',
            data: ['peer0.org1.example.com']
        });

        const allPackages: Array<PackageRegistryEntry> = await PackageRegistry.instance().getAll();

        const wantedPackage: PackageRegistryEntry = allPackages.find((packageEntry: PackageRegistryEntry) => {
            return packageEntry.name === name && packageEntry.version === version;
        });

        userInputUtilHelper.showChaincodeAndVersionStub.resolves({
            label: `${name}@${version}`,
            description: 'Installed',
            data: {
                packageEntry: wantedPackage,
                workspaceFolder: undefined,
            }
        });

        userInputUtilHelper.inputBoxStub.withArgs('optional: What function do you want to call?').resolves(transaction);
        userInputUtilHelper.inputBoxStub.withArgs('optional: What are the arguments to the function, (comma seperated)').resolves(args);

        userInputUtilHelper.showYesNoQuickPick.resolves(UserInputUtil.NO);
        if (privateData) {
            userInputUtilHelper.showYesNoQuickPick.resolves(UserInputUtil.YES);
            const collectionPath: string = path.join(__dirname, '../../integrationTest/data/collection.json');
            userInputUtilHelper.browseStub.resolves(collectionPath);
        }
        await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT);
    }

    async function upgradeSmartContract(name: string, version: string, transaction: string, args: string, privateData: boolean): Promise<void> {
        userInputUtilHelper.showChannelStub.resolves({
            label: 'mychannel',
            data: ['peer0.org1.example.com']
        });

        const allPackages: Array<PackageRegistryEntry> = await PackageRegistry.instance().getAll();

        const wantedPackage: PackageRegistryEntry = allPackages.find((packageEntry: PackageRegistryEntry) => {
            return packageEntry.name === name && packageEntry.version === version;
        });

        userInputUtilHelper.showChaincodeAndVersionStub.resolves({
            label: `${name}@${version}`,
            description: 'Installed',
            data: {
                packageEntry: wantedPackage,
                workspaceFolder: undefined,
            }
        });

        // Upgrade from instantiated contract at version 0.0.1
        userInputUtilHelper.showRuntimeInstantiatedSmartContractsStub.resolves({
            label: `${name}@0.0.1`,
            data: { name: name, channel: 'mychannel', version: '0.0.1' }
        });

        userInputUtilHelper.inputBoxStub.withArgs('optional: What function do you want to call?').resolves(transaction);
        userInputUtilHelper.inputBoxStub.withArgs('optional: What are the arguments to the function, (e.g. ["arg1", "arg2"])', '[]').resolves(args);

        userInputUtilHelper.showYesNoQuickPick.resolves(UserInputUtil.NO);
        if (privateData) {
            userInputUtilHelper.showYesNoQuickPick.resolves(UserInputUtil.YES);
            const collectionPath: string = path.join(__dirname, '../../integrationTest/data/collection.json');
            userInputUtilHelper.browseStub.resolves(collectionPath);
        }
        await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT);
    }

    async function connectToFabric(name: string, walletName: string, identityName: string = 'greenConga', expectAssociated: boolean = false): Promise<void> {
        // TODO: Fix up stubs and `this` references

        let gatewayEntry: FabricGatewayRegistryEntry;

        try {
            gatewayEntry = FabricGatewayRegistry.instance().get(name);
        } catch (error) {
            const gatewayEntries: FabricGatewayRegistryEntry[] = await FabricRuntimeManager.instance().getGatewayRegistryEntries();
            gatewayEntry = gatewayEntries[0];
        }

        if (!expectAssociated) {
            let walletEntry: FabricWalletRegistryEntry;

            try {
                walletEntry = FabricWalletRegistry.instance().get(walletName);
            } catch (error) {
                walletEntry = new FabricWalletRegistryEntry();
                walletEntry.name = FabricWalletUtil.LOCAL_WALLET;
                walletEntry.walletPath = path.join(__dirname, '..', '..', '..', 'integrationTest', 'tmp', FabricWalletUtil.LOCAL_WALLET);
                walletEntry.managedWallet = true;
            }

            userInputUtilHelper.showWalletsQuickPickStub.resolves({
                name: walletEntry.name,
                data: walletEntry
            });
        }

        userInputUtilHelper.showIdentitiesQuickPickStub.withArgs('Choose an identity to connect with').resolves(identityName);

        await vscode.commands.executeCommand(ExtensionCommands.CONNECT, gatewayEntry);
    }

    async function createCAIdentity(name: string): Promise<void> {

        const walletEntry: FabricWalletRegistryEntry = new FabricWalletRegistryEntry();
        walletEntry.name = FabricWalletUtil.LOCAL_WALLET;
        walletEntry.walletPath = path.join(__dirname, '..', '..', '..', 'integrationTest', 'tmp', FabricWalletUtil.LOCAL_WALLET);

        const identityExists: boolean = await fs.pathExists(path.join(walletEntry.walletPath, name));
        if (identityExists) {
            userInputUtilHelper.showWalletsQuickPickStub.resolves({
                label: walletEntry.name,
                data: walletEntry
            });
            userInputUtilHelper.showIdentitiesQuickPickStub.resolves(name);
            userInputUtilHelper.showConfirmationWarningMessageStub.resolves(true);

            // If the identity already exists, remove it from the wallet
            await vscode.commands.executeCommand(ExtensionCommands.DELETE_IDENTITY);
        }

        userInputUtilHelper.showCertificateAuthorityQuickPickStub.withArgs('Choose certificate authority to create a new identity with').resolves('ca.org1.example.com');
        userInputUtilHelper.inputBoxStub.withArgs('Provide a name for the identity').resolves(name);
        await vscode.commands.executeCommand(ExtensionCommands.CREATE_NEW_IDENTITY);
    }

    async function submitTransaction(name: string, version: string, contractLanguage: string, transaction: string, args: string, gatewayName: string, contractName?: string, transientData?: string): Promise<void> {

        let gatewayEntry: FabricGatewayRegistryEntry;

        try {
            gatewayEntry = FabricGatewayRegistry.instance().get(gatewayName);
        } catch (error) {
            gatewayEntry = new FabricGatewayRegistryEntry();
            gatewayEntry.name = gatewayName;
            gatewayEntry.managedRuntime = true;
            gatewayEntry.associatedWallet = FabricWalletUtil.LOCAL_WALLET;
        }

        userInputUtilHelper.showGatewayQuickPickStub.resolves({
            label: gatewayName,
            data: gatewayEntry
        });

        if (contractLanguage === 'Go' || contractLanguage === 'Java') {
            userInputUtilHelper.showClientInstantiatedSmartContractsStub.resolves({
                label: `${name}@${version}`,
                data: { name: name, channel: 'mychannel', version: version }
            });

            userInputUtilHelper.showTransactionStub.resolves({
                label: null,
                data: { name: transaction, contract: null }
            });

        } else {
            userInputUtilHelper.showClientInstantiatedSmartContractsStub.resolves({
                label: `${name}@${version}`,
                data: { name: name, channel: 'mychannel', version: version }
            });

            userInputUtilHelper.showTransactionStub.resolves({
                label: `${name} - ${transaction}`,
                data: { name: transaction, contract: contractName }
            });

        }

        userInputUtilHelper.inputBoxStub.withArgs('optional: What are the arguments to the transaction, (e.g. ["arg1", "arg2"])').resolves(args);

        if (!transientData) {
            transientData = '';
        }
        userInputUtilHelper.inputBoxStub.withArgs('optional: What is the transient data for the transaction, e.g. {"key": "value"}', '{}').resolves(transientData);

        await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);
    }
};
