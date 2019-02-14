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
import { InstantiatedChaincodeTreeItem } from '../../src/explorer/model/InstantiatedChaincodeTreeItem';
import { InstalledTreeItem } from '../../src/explorer/runtimeOps/InstalledTreeItem';
import { PackageRegistryEntry } from '../../src/packages/PackageRegistryEntry';
import { PackageRegistry } from '../../src/packages/PackageRegistry';
import { ExtensionCommands } from '../../ExtensionCommands';
import { LogType } from '../../src/logging/OutputAdapter';

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

        VSCodeBlockchainOutputAdapter.instance().setConsole(true);

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
        VSCodeBlockchainOutputAdapter.instance().setConsole(false);
        await TestUtil.restoreGatewaysConfig();
        await TestUtil.restoreRuntimesConfig();
        await TestUtil.restoreExtensionDirectoryConfig();
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

            isRunning.should.equal(false);
            const connectionItems: Array<BlockchainTreeItem> = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren();
            const localFabricItem: RuntimeTreeItem = connectionItems.find((value: BlockchainTreeItem) => value instanceof RuntimeTreeItem && value.label.startsWith('Local fabric runtime is stopped. Click to start.')) as RuntimeTreeItem;
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

                let instantiatedChaincodesItems: Array<InstantiatedChaincodeTreeItem> = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(smartContractsChildren[0]) as Array<InstantiatedChaincodeTreeItem>;

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

                instantiatedChaincodesItems = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(smartContractsChildren[0]) as Array<InstantiatedChaincodeTreeItem>;

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

                instantiatedChaincodesItems = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(channels[0]) as Array<InstantiatedChaincodeTreeItem>;

                instantiatedSmartContract = instantiatedChaincodesItems.find((_instantiatedSmartContract: BlockchainTreeItem) => {
                    return _instantiatedSmartContract.label === `${smartContractName}@0.0.2`;
                });

                instantiatedSmartContract.should.not.be.null;

                await checkGeneratedSmartContractAndSubmitTransaction(language, smartContractName, testRunResult);
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
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

                const instantiatedChaincodesItems: Array<InstantiatedChaincodeTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(channels[0]) as Array<InstantiatedChaincodeTreeItem>;

                const instantiatedSmartContract: InstantiatedChaincodeTreeItem = instantiatedChaincodesItems.find((_instantiatedSmartContract: BlockchainTreeItem) => {
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
        // // Did it open?
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
        // // Check the test file was populated properly
        testFileContents.includes(smartContractName).should.be.true;
        testFileContents.startsWith('/*').should.be.true;
        testFileContents.includes('gateway.connect').should.be.true;
        testFileContents.includes('submitTransaction').should.be.true;
        testFileContents.includes(smartContractTransactionsArray[0]).should.be.true;
        testFileContents.includes(smartContractTransactionsArray[1]).should.be.true;
        testFileContents.includes(smartContractTransactionsArray[2]).should.be.true;
        await integrationTestUtil.submitTransaction(smartContractName, '0.0.1', 'transaction1', 'hello world', contractName);
        testRunResult.includes('success for transaction').should.be.true;
        testRunResult.includes('1 passing').should.be.true;
        logSpy.should.not.have.been.calledWith(LogType.ERROR);
    }
});
