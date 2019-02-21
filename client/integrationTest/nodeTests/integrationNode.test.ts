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
import { BlockchainTreeItem } from '../../src/explorer/model/BlockchainTreeItem';
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';
import { TestUtil } from '../../test/TestUtil';
import { FabricConnectionManager } from '../../src/fabric/FabricConnectionManager';
import { FabricRuntimeManager } from '../../src/fabric/FabricRuntimeManager';
import { FabricRuntime } from '../../src/fabric/FabricRuntime';
import { IFabricConnection } from '../../src/fabric/IFabricConnection';
import { MetadataUtil } from '../../src/util/MetadataUtil';
import { IntegrationTestUtil } from '../integrationTestUtil';
import { RuntimeTreeItem } from '../../src/explorer/runtimeOps/RuntimeTreeItem';
import { SmartContractsTreeItem } from '../../src/explorer/runtimeOps/SmartContractsTreeItem';
import { InstantiatedContractTreeItem } from '../../src/explorer/model/InstantiatedContractTreeItem';
import { InstalledTreeItem } from '../../src/explorer/runtimeOps/InstalledTreeItem';
import { ExtensionCommands } from '../../ExtensionCommands';
import { LogType } from '../../src/logging/OutputAdapter';
import { SampleView } from '../../src/webview/SampleView';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { CommandUtil } from '../../src/util/CommandUtil';
import { PackageRegistryEntry } from '../../src/packages/PackageRegistryEntry';
import { PackageRegistry } from '../../src/packages/PackageRegistry';

const should: Chai.Should = chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

// tslint:disable no-unused-expression
describe('Integration Tests for Node Smart Contracts', () => {

    let mySandBox: sinon.SinonSandbox;
    let integrationTestUtil: IntegrationTestUtil;
    let logSpy: sinon.SinonSpy;

    const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
    let runtime: FabricRuntime;

    before(async function(): Promise<void> {
        this.timeout(600000);

        await ExtensionUtil.activateExtension();
        await TestUtil.storeGatewaysConfig();
        await TestUtil.storeRuntimesConfig();
        await TestUtil.storeExtensionDirectoryConfig();
        await TestUtil.storeRepositoriesConfig();

        VSCodeBlockchainOutputAdapter.instance().setConsole(true);

        vscode.workspace.updateWorkspaceFolders(1, vscode.workspace.workspaceFolders.length - 1);

        const extDir: string = path.join(__dirname, '..', '..', '..', 'integrationTest', 'tmp');
        await vscode.workspace.getConfiguration().update('blockchain.ext.directory', extDir, vscode.ConfigurationTarget.Global);
        const packageDir: string = path.join(extDir, 'packages');
        const exists: boolean = await fs.pathExists(packageDir);
        if (exists) {
            await fs.remove(packageDir);
        }

        await vscode.workspace.getConfiguration().update('blockchain.repositories', [], vscode.ConfigurationTarget.Global);
        sinon.stub(vscode.window, 'showSaveDialog').withArgs({
            defaultUri: sinon.match.any,
            saveLabel: 'Clone Repository'
        }).resolves(vscode.Uri.file(path.join(__dirname, '..', '..', '..', 'integrationTest', 'data', 'fabric-samples')));
        await SampleView.cloneRepository('hyperledger/fabric-samples', false);
    });

    after(async function(): Promise<void> {
        this.timeout(600000);
        vscode.workspace.updateWorkspaceFolders(1, vscode.workspace.workspaceFolders.length - 1);
        await IntegrationTestUtil.deleteSampleDirectory();
        VSCodeBlockchainOutputAdapter.instance().setConsole(false);
        await TestUtil.restoreGatewaysConfig();
        await TestUtil.restoreRuntimesConfig();
        await TestUtil.restoreExtensionDirectoryConfig();
        await TestUtil.restoreRepositoriesConfig();
    });

    describe('local fabric', () => {
        beforeEach(async function(): Promise<void> {
            this.timeout(600000);
            delete process.env.GOPATH;
            mySandBox = sinon.createSandbox();
            integrationTestUtil = new IntegrationTestUtil(mySandBox);
            logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');

            // Ensure that the Fabric runtime is in the right state.
            runtime = runtimeManager.get('local_fabric');

            let isRunning: boolean = await runtime.isRunning();
            if (isRunning) {
                await vscode.commands.executeCommand(ExtensionCommands.STOP_FABRIC);
                isRunning = await runtime.isRunning();
            }

            // If we don't teardown the existing Fabric, we're told that the package is already installed
            mySandBox.stub(UserInputUtil, 'showConfirmationWarningMessage').resolves(true);
            try {
                await vscode.commands.executeCommand(ExtensionCommands.TEARDOWN_FABRIC);
            } catch (error) {
                // If the Fabric is already torn down, do nothing
            }

            isRunning.should.equal(false);
            const connectionItems: Array<BlockchainTreeItem> = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren();
            const localFabricItem: RuntimeTreeItem = connectionItems.find((value: BlockchainTreeItem) => value instanceof RuntimeTreeItem && value.label.startsWith('Local Fabric runtime is stopped. Click to start.')) as RuntimeTreeItem;
            if (runtime.isDevelopmentMode()) {
                await vscode.commands.executeCommand(ExtensionCommands.TOGGLE_FABRIC_DEV_MODE);
            }
            localFabricItem.should.not.be.null;
            logSpy.should.not.have.been.calledWith(LogType.ERROR);
        });

        afterEach(async () => {
            await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT);
            mySandBox.restore();
            delete process.env.GOPATH;
        });

        ['JavaScript', 'TypeScript'].forEach((language: string) => {

            it(`should create a ${language} smart contract, package, install and instantiate it on a peer, submit transactions, generate tests and upgrade it`, async () => {
                // Start the Fabric runtime, and ensure that it is in the right state.
                await vscode.commands.executeCommand(ExtensionCommands.START_FABRIC);
                runtime.isRunning().should.eventually.be.true;
                runtime.isDevelopmentMode().should.be.false;

                await integrationTestUtil.connectToFabric('local_fabric');

                const smartContractName: string = `my${language}SC`;

                let testRunResult: string;

                await integrationTestUtil.createSmartContract(smartContractName, language);

                await integrationTestUtil.packageSmartContract();

                await integrationTestUtil.installSmartContract(smartContractName, '0.0.1');

                await integrationTestUtil.instantiateSmartContract(smartContractName, '0.0.1');

                let allChildren: Array<BlockchainTreeItem> = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren();
                let smartContractsChildren: Array<SmartContractsTreeItem> = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(allChildren[0]) as Array<SmartContractsTreeItem>;

                smartContractsChildren.length.should.equal(2);
                smartContractsChildren[0].label.should.equal('Instantiated');
                smartContractsChildren[1].label.should.equal('Installed');

                let instantiatedChaincodesItems: Array<InstantiatedContractTreeItem> = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(smartContractsChildren[0]) as Array<InstantiatedContractTreeItem>;

                let instantiatedSmartContract: BlockchainTreeItem = instantiatedChaincodesItems.find((_instantiatedSmartContract: BlockchainTreeItem) => {
                    return _instantiatedSmartContract.label === `${smartContractName}@0.0.1`;
                });

                instantiatedSmartContract.should.not.be.null;

                let installedChaincodesItems: Array<InstalledTreeItem> = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(smartContractsChildren[1]);

                let installedSmartContract: BlockchainTreeItem = installedChaincodesItems.find((_installedSmartContract: BlockchainTreeItem) => {
                    return _installedSmartContract.label === `${smartContractName} v0.0.1`;
                });

                installedSmartContract.should.not.be.null;

                await integrationTestUtil.generateSmartContractTests(smartContractName, '0.0.1', language, 'local_fabric');
                testRunResult = await integrationTestUtil.runSmartContractTests(smartContractName, language);

                await integrationTestUtil.updatePackageJsonVersion('0.0.2');

                if (language === 'TypeScript') {
                    integrationTestUtil.getConfigurationStub.callThrough();
                }

                await integrationTestUtil.packageSmartContract('0.0.2');

                await integrationTestUtil.installSmartContract(smartContractName, '0.0.2');

                await integrationTestUtil.upgradeSmartContract(smartContractName, '0.0.2');

                allChildren = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren();
                smartContractsChildren = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(allChildren[0]) as Array<SmartContractsTreeItem>;

                smartContractsChildren.length.should.equal(2);
                smartContractsChildren[0].label.should.equal('Instantiated');
                smartContractsChildren[1].label.should.equal('Installed');

                instantiatedChaincodesItems = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(smartContractsChildren[0]) as Array<InstantiatedContractTreeItem>;

                instantiatedSmartContract = instantiatedChaincodesItems.find((_instantiatedSmartContract: BlockchainTreeItem) => {
                    return _instantiatedSmartContract.label === `${smartContractName}@0.0.2`;
                });

                instantiatedSmartContract.should.not.be.null;

                installedChaincodesItems = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(smartContractsChildren[1]);

                installedSmartContract = installedChaincodesItems.find((_installedSmartContract: BlockchainTreeItem) => {
                    return _installedSmartContract.label === `${smartContractName} v0.0.2`;
                });

                installedSmartContract.should.not.be.null;

                allChildren = await myExtension.getBlockchainNetworkExplorerProvider().getChildren();

                allChildren.length.should.equal(3);

                allChildren[0].label.should.equal('Connected via gateway: local_fabric');
                allChildren[1].label.should.equal('Using ID: Admin@org1.example.com');
                allChildren[2].label.should.equal('Channels');

                const channels: Array<ChannelTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(allChildren[2]) as Array<ChannelTreeItem>;
                channels.length.should.equal(1);
                channels[0].label.should.equal('mychannel');

                instantiatedChaincodesItems = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(channels[0]) as Array<InstantiatedContractTreeItem>;

                instantiatedSmartContract = instantiatedChaincodesItems.find((_instantiatedSmartContract: BlockchainTreeItem) => {
                    return _instantiatedSmartContract.label === `${smartContractName}@0.0.2`;
                });

                instantiatedSmartContract.should.not.be.null;

                await checkGeneratedSmartContractAndSubmitTransaction(language, smartContractName, testRunResult);
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            }).timeout(0);

            it(`should install and instantiate the ${language} FabCar sample and submit transactions`, async () => {

                const languageLowerCase: string = language.toLowerCase();

                await vscode.commands.executeCommand(ExtensionCommands.START_FABRIC);
                runtime.isRunning().should.eventually.be.true;
                runtime.isDevelopmentMode().should.be.false;

                await integrationTestUtil.connectToFabric('local_fabric');

                mySandBox.stub(UserInputUtil, 'showFolderOptions').withArgs('Choose how to open the sample files').resolves(UserInputUtil.ADD_TO_WORKSPACE);
                await SampleView.cloneAndOpenRepository('hyperledger/fabric-samples', `chaincode/fabcar/${languageLowerCase}`, 'release-1.4', `fabcar-contract-${languageLowerCase}`);

                integrationTestUtil.testContractType = language;
                integrationTestUtil.testContractDir = path.join(__dirname, '..', '..', '..', 'integrationTest', 'data', `fabric-samples`, 'chaincode', 'fabcar', languageLowerCase);

                await CommandUtil.sendCommandWithOutput('npm', ['install'], integrationTestUtil.testContractDir, undefined, VSCodeBlockchainOutputAdapter.instance(), false);

                await integrationTestUtil.packageSmartContract('1.0.0', `fabcar-contract-${languageLowerCase}`);

                await integrationTestUtil.installSmartContract(`fabcar-contract-${languageLowerCase}`, '1.0.0');

                await integrationTestUtil.instantiateSmartContract(`fabcar-contract-${languageLowerCase}`, '1.0.0', 'initLedger');

                const allChildren: Array<BlockchainTreeItem> = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren();
                const smartContractsChildren: Array<SmartContractsTreeItem> = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(allChildren[0]) as Array<SmartContractsTreeItem>;

                smartContractsChildren.length.should.equal(2);
                smartContractsChildren[0].label.should.equal('Instantiated');
                smartContractsChildren[1].label.should.equal('Installed');

                const instantiatedChaincodesItems: Array<InstantiatedContractTreeItem> = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(smartContractsChildren[0]) as Array<InstantiatedContractTreeItem>;

                const instantiatedSmartContract: BlockchainTreeItem = instantiatedChaincodesItems.find((_instantiatedSmartContract: BlockchainTreeItem) => {
                    return _instantiatedSmartContract.label === `fabcar-contract-${languageLowerCase}@1.0.0`;
                });

                instantiatedSmartContract.should.not.be.null;

                const installedChaincodesItems: Array<InstalledTreeItem> = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(smartContractsChildren[1]);

                const installedSmartContract: BlockchainTreeItem = installedChaincodesItems.find((_installedSmartContract: BlockchainTreeItem) => {
                    return _installedSmartContract.label === `fabcar-contract-${languageLowerCase} v1.0.0`;
                });

                installedSmartContract.should.not.be.null;

                // Submit some transactions and then check the results
                logSpy.resetHistory();
                await integrationTestUtil.submitTransactionToContract(`fabcar-contract-${languageLowerCase}`, '1.0.0', 'queryCar', 'CAR0', 'FabCar');

                const message: string = `"{\\"color\\":\\"blue\\",\\"docType\\":\\"car\\",\\"make\\":\\"Toyota\\",\\"model\\":\\"Prius\\",\\"owner\\":\\"Tomoko\\"}"`;
                logSpy.getCall(2).should.have.been.calledWith(LogType.SUCCESS, 'Successfully submitted transaction', `Returned value from queryCar: ${message}`);

            }).timeout(0);
        });
    });

    describe('other fabric', () => {
        beforeEach(async function(): Promise<void> {
            this.timeout(600000);
            delete process.env.GOPATH;
            mySandBox = sinon.createSandbox();
            integrationTestUtil = new IntegrationTestUtil(mySandBox);
            logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
        });

        afterEach(async () => {
            await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT);
            mySandBox.restore();
            delete process.env.GOPATH;
        });

        ['JavaScript', 'TypeScript'].forEach((language: string) => {

            it(`should create a ${language} smart contract, submit transactions, and generate tests`, async () => {
                const smartContractName: string = `my${language}SC3`;

                await integrationTestUtil.createFabricConnection();

                await integrationTestUtil.connectToFabric('myGateway');

                await integrationTestUtil.createSmartContract(smartContractName, language);

                await integrationTestUtil.packageSmartContract();

                const fabricConnection: IFabricConnection = FabricConnectionManager.instance().getConnection();

                const allPackages: Array<PackageRegistryEntry> = await PackageRegistry.instance().getAll();

                const packageToInstall: PackageRegistryEntry = allPackages.find((_package: PackageRegistryEntry) => {
                    return _package.name === smartContractName;
                });

                packageToInstall.should.not.be.null;
                await fabricConnection.installChaincode(packageToInstall, 'peer0.org1.example.com');

                await fabricConnection.instantiateChaincode(smartContractName, '0.0.1', 'mychannel', 'instantiate', []);

                const allChildren: Array<BlockchainTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren();

                allChildren.length.should.equal(3);

                allChildren[0].label.should.equal('Connected via gateway: myGateway');
                allChildren[1].label.should.equal('Using ID: greenConga');
                allChildren[2].label.should.equal('Channels');

                const channels: Array<ChannelTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(allChildren[2]) as Array<ChannelTreeItem>;
                channels.length.should.equal(2);
                channels[0].label.should.equal('mychannel');
                channels[1].label.should.equal('myotherchannel');

                const instantiatedChaincodesItems: Array<InstantiatedContractTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(channels[0]) as Array<InstantiatedContractTreeItem>;

                const instantiatedSmartContract: InstantiatedContractTreeItem = instantiatedChaincodesItems.find((_instantiatedSmartContract: BlockchainTreeItem) => {
                    return _instantiatedSmartContract.label === `${smartContractName}@0.0.1`;
                });

                instantiatedSmartContract.should.not.be.null;
                await integrationTestUtil.generateSmartContractTests(smartContractName, '0.0.1', language, 'myGateway');
                const testRunResult: string = await integrationTestUtil.runSmartContractTests(smartContractName, language);

                await checkGeneratedSmartContractAndSubmitTransaction(language, smartContractName, testRunResult);
            }).timeout(0);
        });
    });

    async function checkGeneratedSmartContractAndSubmitTransaction(language: string, smartContractName: string, testRunResult: string): Promise<void> {
        let fileSuffix: string;
        fileSuffix = (language === 'TypeScript' ? 'ts' : 'js');
        // Check test file exists
        const pathToTestFile: string = path.join(integrationTestUtil.testContractDir, 'functionalTests', `MyContract-${smartContractName}@0.0.1.test.${fileSuffix}`);
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
        await integrationTestUtil.submitTransactionToContract(smartContractName, '0.0.1', 'transaction1', 'hello world', contractName);
        testRunResult.includes('success for transaction').should.be.true;
        testRunResult.includes('1 passing').should.be.true;
        logSpy.should.not.have.been.calledWith(LogType.ERROR);
    }
});
