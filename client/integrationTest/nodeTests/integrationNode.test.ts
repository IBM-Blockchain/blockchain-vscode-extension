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
import * as vscode from 'vscode';
import * as myExtension from '../../src/extension';
import * as path from 'path';
import * as fs from 'fs-extra';

import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';
import { ChannelTreeItem } from '../../src/explorer/model/ChannelTreeItem';
import { ExtensionUtil } from '../../src/util/ExtensionUtil';
import { FabricConnectionRegistry } from '../../src/fabric/FabricConnectionRegistry';
import { FabricConnectionRegistryEntry } from '../../src/fabric/FabricConnectionRegistryEntry';
import { BlockchainTreeItem } from '../../src/explorer/model/BlockchainTreeItem';
import { VSCodeOutputAdapter } from '../../src/logging/VSCodeOutputAdapter';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { InstalledChainCodeTreeItem } from '../../src/explorer/model/InstalledChainCodeTreeItem';
import { InstalledChainCodeVersionTreeItem } from '../../src/explorer/model/InstalledChaincodeVersionTreeItem';
import { PackageRegistryEntry } from '../../src/packages/PackageRegistryEntry';
import { PackageRegistry } from '../../src/packages/PackageRegistry';
import { TestUtil } from '../../test/TestUtil';
import { CommandUtil } from '../../src/util/CommandUtil';
import { FabricConnectionManager } from '../../src/fabric/FabricConnectionManager';
import { IFabricConnection } from '../../src/fabric/IFabricConnection';
import { MetadataUtil } from '../../src/util/MetadataUtil';

const should: Chai.Should = chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

// tslint:disable no-unused-expression
describe('Integration Tests for Node Smart Contracts', () => {

    const connectionRegistry: FabricConnectionRegistry = FabricConnectionRegistry.instance();

    let mySandBox: sinon.SinonSandbox;
    let keyPath: string;
    let certPath: string;
    let testContractName: string;
    let testContractDir: string;
    let testContractType: string;

    let getWorkspaceFoldersStub: sinon.SinonStub;
    let findFilesStub: sinon.SinonStub;
    let showPeerQuickPickStub: sinon.SinonStub;
    let showChannelStub: sinon.SinonStub;
    let showChanincodeAndVersionStub: sinon.SinonStub;
    let inputBoxStub: sinon.SinonStub;
    let browseEditStub: sinon.SinonStub;
    let showInstantiatedSmartContractsStub: sinon.SinonStub;
    let workspaceFolder: vscode.WorkspaceFolder;
    let showTransactionStub: sinon.SinonStub;
    let errorSpy: sinon.SinonSpy;
    let showLanguagesQuickPickStub: sinon.SinonStub;
    let showInstallableStub: sinon.SinonStub;
    let workspaceConfigurationUpdateStub: sinon.SinonStub;
    let workspaceConfigurationGetStub: sinon.SinonStub;
    let getConfigurationStub: sinon.SinonStub;

    before(async function(): Promise<void> {
        this.timeout(600000);
        keyPath = path.join(__dirname, `../../../integrationTest/hlfv1/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore/key.pem`);
        certPath = path.join(__dirname, `../../../integrationTest/hlfv1/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/Admin@org1.example.com-cert.pem`);

        await ExtensionUtil.activateExtension();
        await TestUtil.storeConnectionsConfig();
        await TestUtil.storeRuntimesConfig();
        await TestUtil.storeExtensionDirectoryConfig();

        VSCodeOutputAdapter.instance().setConsole(true);

        vscode.workspace.updateWorkspaceFolders(1, vscode.workspace.workspaceFolders.length - 1);

        const extDir: string = path.join(__dirname, '..', '..', '..', 'integrationTest', 'tmp');
        await vscode.workspace.getConfiguration().update('blockchain.ext.directory', extDir, vscode.ConfigurationTarget.Global);
        const packageDir: string = path.join(extDir, 'packages');
        const exists: boolean = await fs.pathExists(packageDir);
        if (exists) {
            await fs.remove(packageDir);
        }
    });

    after(async () => {
        vscode.workspace.updateWorkspaceFolders(1, vscode.workspace.workspaceFolders.length - 1);
        VSCodeOutputAdapter.instance().setConsole(false);
        await TestUtil.restoreConnectionsConfig();
        await TestUtil.restoreRuntimesConfig();
        await TestUtil.restoreExtensionDirectoryConfig();
    });

    beforeEach(() => {
        delete process.env.GOPATH;
        mySandBox = sinon.createSandbox();
        getWorkspaceFoldersStub = mySandBox.stub(UserInputUtil, 'getWorkspaceFolders');
        findFilesStub = mySandBox.stub(vscode.workspace, 'findFiles').resolves([]);
        showPeerQuickPickStub = mySandBox.stub(UserInputUtil, 'showPeerQuickPickBox');
        showInstallableStub = mySandBox.stub(UserInputUtil, 'showInstallableSmartContractsQuickPick');
        showChannelStub = mySandBox.stub(UserInputUtil, 'showChannelQuickPickBox');
        showChanincodeAndVersionStub = mySandBox.stub(UserInputUtil, 'showChaincodeAndVersionQuickPick');
        inputBoxStub = mySandBox.stub(UserInputUtil, 'showInputBox');
        browseEditStub = mySandBox.stub(UserInputUtil, 'browseEdit');
        showInstantiatedSmartContractsStub = mySandBox.stub(UserInputUtil, 'showInstantiatedSmartContractsQuickPick');
        showTransactionStub = mySandBox.stub(UserInputUtil, 'showTransactionQuickPick');

        workspaceConfigurationUpdateStub = mySandBox.stub();
        workspaceConfigurationGetStub = mySandBox.stub();

        errorSpy = mySandBox.spy(vscode.window, 'showErrorMessage');
        showLanguagesQuickPickStub = mySandBox.stub(UserInputUtil, 'showLanguagesQuickPick');
    });

    afterEach(async () => {
        await vscode.commands.executeCommand('blockchainExplorer.disconnectEntry');
        mySandBox.restore();
        delete process.env.GOPATH;
    });

    async function createSmartContract(name: string, type: string): Promise<void> {
        showLanguagesQuickPickStub.resolves(type);
        mySandBox.stub(UserInputUtil, 'showFolderOptions').resolves(UserInputUtil.ADD_TO_WORKSPACE);

        testContractName = name;
        if (type === 'Go') {
            process.env.GOPATH = path.join(__dirname, '..', '..', '..', 'integrationTest', 'tmp');
            testContractDir = path.join(process.env.GOPATH, 'src', name);
        } else {
            testContractDir = path.join(__dirname, '..', '..', '..', 'integrationTest', 'tmp', name);
        }
        testContractType = type;
        const exists: boolean = await fs.pathExists(testContractDir);
        if (exists) {
            await fs.remove(testContractDir);
        }

        const uri: vscode.Uri = vscode.Uri.file(testContractDir);
        const uriArr: Array<vscode.Uri> = [uri];
        const openDialogStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showOpenDialog');
        openDialogStub.resolves(uriArr);

        let generator: string;
        if (type === 'Go' || type === 'Java') {
            generator = 'fabric:chaincode';
        }

        await vscode.commands.executeCommand('blockchain.createSmartContractProjectEntry', generator);

        if (type === 'JavaScript' || type === 'TypeScript') {
            await CommandUtil.sendCommandWithOutput('npm', ['install'], testContractDir, undefined, VSCodeOutputAdapter.instance(), false);
        }
    }

    async function packageSmartContract(version: string = '0.0.1'): Promise<void> {
        let workspaceFiles: vscode.Uri[];
        if (testContractType === 'JavaScript') {
            workspaceFolder = { index: 0, name: 'javascriptProject', uri: vscode.Uri.file(testContractDir) };
        } else if (testContractType === 'TypeScript') {
            workspaceFolder = { index: 0, name: 'typescriptProject', uri: vscode.Uri.file(testContractDir) };
        } else if (testContractType === 'Java') {
            inputBoxStub.withArgs('Enter a name for your Java package').resolves(testContractName);
            inputBoxStub.withArgs('Enter a version for your Java package').resolves(version);
            workspaceFolder = { index: 0, name: 'javaProject', uri: vscode.Uri.file(testContractDir) };
        } else if (testContractType === 'Go') {
            inputBoxStub.withArgs('Enter a name for your Go package').resolves(testContractName);
            inputBoxStub.withArgs('Enter a version for your Go package').resolves(version);
            workspaceFolder = { index: 0, name: 'goProject', uri: vscode.Uri.file(testContractDir) };
            workspaceFiles = [vscode.Uri.file('chaincode.go')];
            findFilesStub.withArgs(new vscode.RelativePattern(workspaceFolder, '**/*.go'), null, 1).resolves(workspaceFiles);
        } else {
            throw new Error(`I do not know how to handle language ${testContractType}`);
        }
        getWorkspaceFoldersStub.returns([workspaceFolder]);

        await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry');
    }

    async function createFabricConnection(): Promise<void> {
        if (connectionRegistry.exists('myConnection')) {
            await connectionRegistry.delete('myConnection');
        }

        const rootPath: string = path.dirname(__dirname);

        inputBoxStub.withArgs('Enter a name for the connection').resolves('myConnection');
        browseEditStub.withArgs('Enter a file path to the connection profile file', 'myConnection').resolves(path.join(rootPath, '../../integrationTest/data/connection/connection.json'));
        browseEditStub.withArgs('Enter a file path to the certificate file', 'myConnection').resolves(certPath);
        browseEditStub.withArgs('Enter a file path to the private key file', 'myConnection').resolves(keyPath);

        await vscode.commands.executeCommand('blockchainExplorer.addConnectionEntry');

        connectionRegistry.exists('myConnection').should.be.true;
    }

    async function connectToFabric(): Promise<void> {
        const connection: FabricConnectionRegistryEntry = FabricConnectionRegistry.instance().get('myConnection');
        await vscode.commands.executeCommand('blockchainExplorer.connectEntry', connection);

    }

    async function installSmartContract(name: string, version: string): Promise<void> {
        showPeerQuickPickStub.resolves('peer0.org1.example.com');
        const allPackages: Array<PackageRegistryEntry> = await PackageRegistry.instance().getAll();

        const packageToInstall: PackageRegistryEntry = allPackages.find((packageEntry: PackageRegistryEntry): boolean => {
            return packageEntry.version === version && packageEntry.name === name;
        });

        should.exist(packageToInstall);

        showInstallableStub.resolves({
            label: name,
            data: {
                packageEntry: packageToInstall,
                workspace: undefined
            }
        });
        await vscode.commands.executeCommand('blockchainExplorer.installSmartContractEntry');
    }

    async function instantiateSmartContract(name: string, version: string): Promise<void> {
        showChannelStub.resolves('mychannel');

        const allPackages: Array<PackageRegistryEntry> = await PackageRegistry.instance().getAll();

        const wantedPackage: PackageRegistryEntry = allPackages.find((packageEntry: PackageRegistryEntry) => {
            return packageEntry.name === name && packageEntry.version === version;
        });

        showChanincodeAndVersionStub.resolves({
            label: `${name}@${version}`,
            description: 'Installed',
            data: {
                packageEntry: wantedPackage,
                workspaceFolder: undefined,
            }
        });

        inputBoxStub.withArgs('optional: What function do you want to call?').resolves('instantiate');
        inputBoxStub.withArgs('optional: What are the arguments to the function, (comma seperated)').resolves();
        await vscode.commands.executeCommand('blockchainExplorer.instantiateSmartContractEntry');
    }

    async function upgradeSmartContract(name: string, version: string): Promise<void> {
        showChannelStub.resolves('mychannel');

        const allPackages: Array<PackageRegistryEntry> = await PackageRegistry.instance().getAll();

        const wantedPackage: PackageRegistryEntry = allPackages.find((packageEntry: PackageRegistryEntry) => {
            return packageEntry.name === name && packageEntry.version === version;
        });

        showChanincodeAndVersionStub.resolves({
            label: `${name}@${version}`,
            description: 'Installed',
            data: {
                packageEntry: wantedPackage,
                workspaceFolder: undefined,
            }
        });

        // Upgrade from instantiated contract at version 0.0.1
        showInstantiatedSmartContractsStub.resolves({
            label: `${name}@0.0.1`,
            data: { name: name, channel: 'mychannel', version: '0.0.1' }
        });

        inputBoxStub.withArgs('optional: What function do you want to call?').resolves('instantiate');
        inputBoxStub.withArgs('optional: What are the arguments to the function, (comma seperated)').resolves();
        await vscode.commands.executeCommand('blockchainExplorer.upgradeSmartContractEntry');
    }

    async function submitTransaction(name: string, version: string, transaction: string, args: string, contractName: string): Promise<void> {
        showInstantiatedSmartContractsStub.resolves({
            label: `${name}@${version}`,
            data: { name: name, channel: 'mychannel', version: version }
        });

        showTransactionStub.resolves({
            label: `${contractName} - ${transaction}`,
            data: { name: transaction, contract: contractName}
        });

        inputBoxStub.withArgs('optional: What are the arguments to the function, (comma seperated)').resolves(args);

        await vscode.commands.executeCommand('blockchainExplorer.submitTransactionEntry');
    }

    async function generateSmartContractTests(name: string, version: string, language: string): Promise<void> {
        showChannelStub.resolves('mychannel');
        showInstantiatedSmartContractsStub.resolves({
            label: `${name}@${version}`,
            data: { name: name, channel: 'mychannel', version: version }
        });
        showLanguagesQuickPickStub.resolves(language);
        getWorkspaceFoldersStub.returns([workspaceFolder]);
        const packageJSONPath: string = path.join(testContractDir, 'package.json');
        findFilesStub.resolves([vscode.Uri.file(packageJSONPath)]);

        if (language === 'TypeScript') {
            // Stub out the update of JavaScript Test Runner user settings
            workspaceConfigurationGetStub.onCall(0).returns('');
            getConfigurationStub = mySandBox.stub(vscode.workspace, 'getConfiguration');
            getConfigurationStub.returns({
                get: workspaceConfigurationGetStub,
                update: workspaceConfigurationUpdateStub
            });
        }

        await vscode.commands.executeCommand('blockchainExplorer.testSmartContractEntry');
    }

    async function runSmartContractTests(name: string, language: string): Promise<string> {
        // Run the same command that the JavaScript Test Runner runs to run javascript/typescript tests
        let testCommand: string = `node_modules/.bin/mocha functionalTests/${name}@0.0.1.test.js --grep="instantiate"`;
        if (language === 'TypeScript') {
            testCommand = `node_modules/.bin/mocha functionalTests/${name}@0.0.1.test.ts --grep="instantiate" -r ts-node/register`;
        }
        const testResult: string = await CommandUtil.sendCommand(testCommand, testContractDir);
        return testResult;
    }

    async function getRawPackageJson(): Promise<any> {
        const fileContents: Buffer = await fs.readFile(path.join(testContractDir, 'package.json'));
        return JSON.parse(fileContents.toString());
    }

    async function writePackageJson(packageJson: any): Promise<void> {
        const packageJsonString: string = JSON.stringify(packageJson, null, 4);

        return fs.writeFile(path.join(testContractDir, 'package.json'), packageJsonString, 'utf8');
    }

    async function updatePackageJsonVersion(version: string): Promise<void> {
        const packageJson: any = await getRawPackageJson();

        packageJson.version = version;

        return writePackageJson(packageJson);
    }

    ['JavaScript', 'TypeScript'].forEach((language: string) => {

        it(`should create a ${language} smart contract, package, install and instantiate it on a peer, generate tests and upgrade it`, async () => {
            const smartContractName: string = `my${language}SC`;
            let testRunResult: string;

            await createFabricConnection();

            await connectToFabric();

            await createSmartContract(smartContractName, language);

            await packageSmartContract();

            await installSmartContract(smartContractName, '0.0.1');

            await instantiateSmartContract(smartContractName, '0.0.1');

            await generateSmartContractTests(smartContractName, '0.0.1', language);
            testRunResult = await runSmartContractTests(smartContractName, language);

            await updatePackageJsonVersion('0.0.2');

            if (language === 'TypeScript') {
                getConfigurationStub.callThrough();
            }

            await packageSmartContract('0.0.2');

            await installSmartContract(smartContractName, '0.0.2');

            await upgradeSmartContract(smartContractName, '0.0.2');

            const allChildren: Array<ChannelTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren() as Array<ChannelTreeItem>;

            const channelChildrenOne: Array<BlockchainTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(allChildren[1]) as Array<BlockchainTreeItem>;

            const installedSmartContracts: Array<InstalledChainCodeTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(channelChildrenOne[0]) as Array<InstalledChainCodeTreeItem>;

            const installedSmartContract: InstalledChainCodeTreeItem = installedSmartContracts.find((_installedSmartContract: InstalledChainCodeTreeItem) => {
                return _installedSmartContract.label === smartContractName;
            });

            installedSmartContract.should.not.be.null;

            const versions: Array<InstalledChainCodeVersionTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(installedSmartContract) as Array<InstalledChainCodeVersionTreeItem>;

            versions.length.should.equal(2);

            versions[0].label.should.equal('0.0.1');
            versions[1].label.should.equal('0.0.2');

            const instantiatedSmartContract: BlockchainTreeItem = channelChildrenOne.find((_instantiatedSmartContract: BlockchainTreeItem) => {
                return _instantiatedSmartContract.label === `${smartContractName}@0.0.2`;
            });

            instantiatedSmartContract.should.not.be.null;

            let fileSuffix: string;
            fileSuffix = (language === 'TypeScript' ? 'ts' : 'js');
            // Check test file exists
            const pathToTestFile: string = path.join(testContractDir, 'functionalTests', `${smartContractName}@0.0.1.test.${fileSuffix}`);
            fs.pathExists(pathToTestFile).should.eventually.be.true;
            const testFileContentsBuffer: Buffer = await fs.readFile(pathToTestFile);
            const testFileContents: string = testFileContentsBuffer.toString();

            // Did it open?
            const textEditors: vscode.TextEditor[] = vscode.window.visibleTextEditors;
            const openFileNameArray: string[] = [];
            for (const textEditor of textEditors) {
                openFileNameArray.push(textEditor.document.fileName);
            }
            openFileNameArray.includes(pathToTestFile).should.be.true;
            // Get the smart contract metadata
            const connection: IFabricConnection = FabricConnectionManager.instance().getConnection();
            const smartContractTransactionsMap: Map<string, string[]> = await MetadataUtil.getTransactionNames(connection, smartContractName, 'mychannel');
            let smartContractTransactionsArray: string[];
            let contractName: string = '';
            for (const name of smartContractTransactionsMap.keys()) {
                smartContractTransactionsArray = smartContractTransactionsMap.get(name);
                contractName = name;
            }

            // Check the test file was populated properly
            testFileContents.includes(smartContractName).should.be.true;
            testFileContents.startsWith('/*').should.be.true;
            testFileContents.includes('gateway.connect').should.be.true;
            testFileContents.includes('submitTransaction').should.be.true;
            testFileContents.includes(smartContractTransactionsArray[0]).should.be.true;
            testFileContents.includes(smartContractTransactionsArray[1]).should.be.true;
            testFileContents.includes(smartContractTransactionsArray[2]).should.be.true;

            await submitTransaction(smartContractName, '0.0.1', 'transaction1', 'hello world', contractName);

            testRunResult.includes('success for transaction').should.be.true;
            testRunResult.includes('1 passing').should.be.true;

            errorSpy.should.not.have.been.called;

        }).timeout(0);

    });
});
