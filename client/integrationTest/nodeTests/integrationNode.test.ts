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
import { IFabricClientConnection } from '../../src/fabric/IFabricClientConnection';
import { GatewayTreeItem } from '../../src/explorer/model/GatewayTreeItem';
import { FabricWalletUtil } from '../../src/fabric/FabricWalletUtil';
import { FabricRuntimeUtil } from '../../src/fabric/FabricRuntimeUtil';

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
        await TestUtil.storeWalletsConfig();

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
        await TestUtil.restoreWalletsConfig();
    });

    describe('local fabric', () => {
        beforeEach(async function(): Promise<void> {
            this.timeout(600000);
            delete process.env.GOPATH;
            mySandBox = sinon.createSandbox();
            integrationTestUtil = new IntegrationTestUtil(mySandBox);
            logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');

            // Ensure that the Fabric runtime is in the right state.
            runtime = runtimeManager.getRuntime();

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

                const nodesChildren: Array<SmartContractsTreeItem> = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(allChildren[2]) as Array<SmartContractsTreeItem>;
                nodesChildren.length.should.equal(3);
                nodesChildren[0].label.should.equal('peer0.org1.example.com');
                nodesChildren[1].label.should.equal('ca.example.com');
                nodesChildren[2].label.should.equal('orderer.example.com');

                let instantiatedChaincodesItems: Array<InstantiatedContractTreeItem> = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(smartContractsChildren[0]) as Array<InstantiatedContractTreeItem>;

                let instantiatedSmartContract: BlockchainTreeItem = instantiatedChaincodesItems.find((_instantiatedSmartContract: BlockchainTreeItem) => {
                    return _instantiatedSmartContract.label === `${smartContractName}@0.0.1`;
                });

                instantiatedSmartContract.should.not.be.null;

                let installedChaincodesItems: Array<InstalledTreeItem> = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(smartContractsChildren[1]);

                let installedSmartContract: BlockchainTreeItem = installedChaincodesItems.find((_installedSmartContract: BlockchainTreeItem) => {
                    return _installedSmartContract.label === `${smartContractName}@0.0.1`;
                });

                installedSmartContract.should.not.be.null;

                // Create a new identity from the certificate authority
                const otherUserName: string = 'otherUser';
                await integrationTestUtil.createCAIdentity(otherUserName);

                // Connect using it
                integrationTestUtil.showIdentitiesQuickPickStub.withArgs('Choose an identity to connect with').resolves(otherUserName);
                await integrationTestUtil.connectToFabric(FabricRuntimeUtil.LOCAL_FABRIC, FabricWalletUtil.LOCAL_WALLET, otherUserName);

                await integrationTestUtil.generateSmartContractTests(smartContractName, '0.0.1', language, FabricRuntimeUtil.LOCAL_FABRIC);
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
                    return _installedSmartContract.label === `${smartContractName}@0.0.2`;
                });

                installedSmartContract.should.not.be.null;

                allChildren = await myExtension.getBlockchainGatewayExplorerProvider().getChildren();

                allChildren.length.should.equal(3);

                allChildren[0].label.should.equal(`Connected via gateway: ${FabricRuntimeUtil.LOCAL_FABRIC}`);
                allChildren[1].label.should.equal(`Using ID: ${otherUserName}`);
                allChildren[2].label.should.equal('Channels');

                const channels: Array<ChannelTreeItem> = await myExtension.getBlockchainGatewayExplorerProvider().getChildren(allChildren[2]) as Array<ChannelTreeItem>;
                channels.length.should.equal(1);
                channels[0].label.should.equal('mychannel');

                instantiatedChaincodesItems = await myExtension.getBlockchainGatewayExplorerProvider().getChildren(channels[0]) as Array<InstantiatedContractTreeItem>;

                instantiatedSmartContract = instantiatedChaincodesItems.find((_instantiatedSmartContract: BlockchainTreeItem) => {
                    return _instantiatedSmartContract.label === `${smartContractName}@0.0.2`;
                });

                instantiatedSmartContract.should.not.be.null;

                await checkGeneratedSmartContract(language, smartContractName, testRunResult);
                await integrationTestUtil.submitTransactionToContract(smartContractName, '0.0.1', 'transaction1', 'hello world', 'MyContract');
                logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successful submitTransaction');

                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            }).timeout(0);

            it(`should install and instantiate the ${language} FabCar sample and submit transactions`, async () => {

                const languageLowerCase: string = language.toLowerCase();

                await vscode.commands.executeCommand(ExtensionCommands.START_FABRIC);
                runtime.isRunning().should.eventually.be.true;
                runtime.isDevelopmentMode().should.be.false;

                integrationTestUtil.showFolderOptions.withArgs('Choose how to open the sample files').resolves(UserInputUtil.ADD_TO_WORKSPACE);
                await SampleView.cloneAndOpenRepository('hyperledger/fabric-samples', `chaincode/fabcar/${languageLowerCase}`, 'release-1.4', `fabcar-contract-${languageLowerCase}`);

                integrationTestUtil.testContractType = language;
                integrationTestUtil.testContractDir = path.join(__dirname, '..', '..', '..', 'integrationTest', 'data', `fabric-samples`, 'chaincode', 'fabcar', languageLowerCase);

                await CommandUtil.sendCommandWithOutput('npm', ['install'], integrationTestUtil.testContractDir, undefined, VSCodeBlockchainOutputAdapter.instance(), false);

                await integrationTestUtil.packageSmartContract('1.0.0', `fabcar-contract-${languageLowerCase}`);

                await integrationTestUtil.installSmartContract(`fabcar-contract-${languageLowerCase}`, '1.0.0');

                await integrationTestUtil.instantiateSmartContract(`fabcar-contract-${languageLowerCase}`, '1.0.0', 'initLedger');

                let allChildren: Array<BlockchainTreeItem> = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren();
                const smartContractsChildren: Array<SmartContractsTreeItem> = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(allChildren[0]) as Array<SmartContractsTreeItem>;

                smartContractsChildren.length.should.equal(2);
                smartContractsChildren[0].label.should.equal('Instantiated');
                smartContractsChildren[1].label.should.equal('Installed');

                const nodesChildren: Array<SmartContractsTreeItem> = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(allChildren[2]) as Array<SmartContractsTreeItem>;
                nodesChildren.length.should.equal(3);
                nodesChildren[0].label.should.equal('peer0.org1.example.com');
                nodesChildren[1].label.should.equal('ca.example.com');
                nodesChildren[2].label.should.equal('orderer.example.com');

                const instantiatedChaincodesItems: Array<InstantiatedContractTreeItem> = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(smartContractsChildren[0]) as Array<InstantiatedContractTreeItem>;

                const instantiatedSmartContract: BlockchainTreeItem = instantiatedChaincodesItems.find((_instantiatedSmartContract: BlockchainTreeItem) => {
                    return _instantiatedSmartContract.label === `fabcar-contract-${languageLowerCase}@1.0.0`;
                });

                instantiatedSmartContract.should.not.be.null;

                const installedChaincodesItems: Array<InstalledTreeItem> = await myExtension.getBlockchainRuntimeExplorerProvider().getChildren(smartContractsChildren[1]);

                const installedSmartContract: BlockchainTreeItem = installedChaincodesItems.find((_installedSmartContract: BlockchainTreeItem) => {
                    return _installedSmartContract.label === `fabcar-contract-${languageLowerCase}@1.0.0`;
                });

                installedSmartContract.should.not.be.null;

                integrationTestUtil.showIdentitiesQuickPickStub.withArgs('Choose an identity to connect with').resolves(FabricRuntimeUtil.ADMIN_USER);
                await integrationTestUtil.connectToFabric(FabricRuntimeUtil.LOCAL_FABRIC, FabricWalletUtil.LOCAL_WALLET, 'Admin@org1.example.com');

                allChildren = await myExtension.getBlockchainGatewayExplorerProvider().getChildren();

                allChildren.length.should.equal(3);

                allChildren[0].label.should.equal(`Connected via gateway: ${FabricRuntimeUtil.LOCAL_FABRIC}`);
                allChildren[1].label.should.equal(`Using ID: ${FabricRuntimeUtil.ADMIN_USER}`);
                allChildren[2].label.should.equal('Channels');

                // Submit some transactions and then check the results
                logSpy.resetHistory();
                await integrationTestUtil.submitTransactionToContract(`fabcar-contract-${languageLowerCase}`, '1.0.0', 'queryCar', 'CAR0', 'FabCar');

                const message: string = `"{\\"color\\":\\"blue\\",\\"docType\\":\\"car\\",\\"make\\":\\"Toyota\\",\\"model\\":\\"Prius\\",\\"owner\\":\\"Tomoko\\"}"`;
                logSpy.should.have.been.calledThrice;
                logSpy.getCall(2).should.have.been.calledWith(LogType.SUCCESS, 'Successful submitTransaction', `Returned value from queryCar: ${message}`);

            }).timeout(0);
        });
    });

    describe('other fabric gateway', () => {

        before(async function(): Promise<void> {
            this.timeout(600000);
            // make sure the extension activates
            await vscode.commands.executeCommand(ExtensionCommands.REFRESH_WALLETS);
            // work around the grpc problem
            const remoteFabricUtil: any = require('../integrationTestRemoteFabricUtil');
            const integrationTestRemoteFabricUtil: any = new remoteFabricUtil.IntegrationTestRemoteFabricUtil();

            await integrationTestRemoteFabricUtil.connect();

            const languages: Array<string> = ['JavaScript', 'TypeScript'];

            mySandBox = sinon.createSandbox();
            integrationTestUtil = new IntegrationTestUtil(mySandBox);
            logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
            mySandBox.stub(UserInputUtil, 'showConfirmationWarningMessage').resolves(true);

            for (const language of languages) {
                integrationTestUtil.testContractType = language;
                await integrationTestUtil.createSmartContract(language + 'SmartContract', language);
                await integrationTestUtil.packageSmartContract();
                await integrationTestRemoteFabricUtil.installChaincode(language);
                await integrationTestRemoteFabricUtil.instantiateChaincode(language);
            }
        });

        beforeEach(async function(): Promise<void> {
            this.timeout(600000);
            delete process.env.GOPATH;

            logSpy.resetHistory();

            await integrationTestUtil.createFabricConnection();
            await integrationTestUtil.addWallet('myWallet');
            await integrationTestUtil.connectToFabric('myGateway', 'myWallet');
        });

        afterEach(async () => {
            await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT);

            try {
            const gatewayItems: Array<GatewayTreeItem> = await myExtension.getBlockchainGatewayExplorerProvider().getChildren() as Array<GatewayTreeItem>;
            const myGatewayItem: GatewayTreeItem = gatewayItems.find((value: BlockchainTreeItem) => value instanceof GatewayTreeItem && value.label.startsWith('myGateway')) as GatewayTreeItem;

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_GATEWAY, myGatewayItem);
            } catch (error) {
                // ignore the error as its probably that it doesn't exist because it happened after the delete gateway test
            }

            delete process.env.GOPATH;
        });

        after(() => {
            mySandBox.restore();
        });

        ['JavaScript', 'TypeScript'].forEach((language: string) => {

            const smartContractName: string = `${language}SmartContract`;

            it(`should ${language} check the tree is correct`, async () => {

                const allChildren: Array<BlockchainTreeItem> = await myExtension.getBlockchainGatewayExplorerProvider().getChildren();

                allChildren.length.should.equal(3);

                allChildren[0].label.should.equal('Connected via gateway: myGateway');
                allChildren[1].label.should.equal('Using ID: greenConga');
                allChildren[2].label.should.equal('Channels');

                const channels: Array<ChannelTreeItem> = await myExtension.getBlockchainGatewayExplorerProvider().getChildren(allChildren[2]) as Array<ChannelTreeItem>;
                channels.length.should.equal(2);
                channels[0].label.should.equal('mychannel');
                channels[1].label.should.equal('myotherchannel');

                const instantiatedChaincodesItems: Array<InstantiatedContractTreeItem> = await myExtension.getBlockchainGatewayExplorerProvider().getChildren(channels[0]) as Array<InstantiatedContractTreeItem>;

                const instantiatedSmartContract: InstantiatedContractTreeItem = instantiatedChaincodesItems.find((_instantiatedSmartContract: BlockchainTreeItem) => {
                    return _instantiatedSmartContract.label === `${smartContractName}@0.0.1`;
                });

                instantiatedSmartContract.should.not.be.null;

            });

            it(`should ${language} submit transaction`, async () => {
                await integrationTestUtil.submitTransactionToContract(smartContractName, '0.0.1', 'transaction1', 'hello world', 'MyContract');

                logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successful submitTransaction');

                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            }).timeout(0);

            it(`should ${language} update connection profile to use yml`, async () => {

                // Disconnect from Fabric
                await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT);

                // Update gateway connection profile to use YAML file
                await integrationTestUtil.updateConnectionProfile();

                // Connect to myGateway
                await integrationTestUtil.addWallet('myWallet');
                await integrationTestUtil.connectToFabric('myGateway', 'myWallet');
                const newConnectedGateway: Array<BlockchainTreeItem> = await myExtension.getBlockchainGatewayExplorerProvider().getChildren();
                newConnectedGateway.length.should.equal(3);

                newConnectedGateway[0].label.should.equal('Connected via gateway: myGateway');
                newConnectedGateway[1].label.should.equal('Using ID: greenConga');
                newConnectedGateway[2].label.should.equal('Channels');

                const channels: Array<ChannelTreeItem> = await myExtension.getBlockchainGatewayExplorerProvider().getChildren(newConnectedGateway[2]) as Array<ChannelTreeItem>;
                channels.length.should.equal(2);
                channels[0].label.should.equal('mychannel');
                channels[1].label.should.equal('myotherchannel');

                const instantiatedChaincodesItems: Array<InstantiatedContractTreeItem> = await myExtension.getBlockchainGatewayExplorerProvider().getChildren(channels[0]) as Array<InstantiatedContractTreeItem>;

                const instantiatedSmartContract: BlockchainTreeItem = instantiatedChaincodesItems.find((_instantiatedSmartContract: BlockchainTreeItem) => {
                    return _instantiatedSmartContract.label === `${smartContractName}@0.0.1`;
                });

                instantiatedSmartContract.should.not.be.null;
            });

            it(`should ${language} add new identity and connect with it`, async () => {

                // Try to add new identity to wallet using enrollment id and secret
                await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT);
                await integrationTestUtil.addIdentityToWallet('admin', 'adminpw', 'myWallet'); // Unlimited enrollments

                const gateways: Array<GatewayTreeItem> = await myExtension.getBlockchainGatewayExplorerProvider().getChildren() as Array<GatewayTreeItem>;
                await integrationTestUtil.associateWalletAndGateway('myWallet', gateways[1]);

                await integrationTestUtil.connectToFabric('myGateway', 'myWallet', 'redConga', true);

                const newConnectedGateway: Array<BlockchainTreeItem> = await myExtension.getBlockchainGatewayExplorerProvider().getChildren();
                newConnectedGateway.length.should.equal(3);

                newConnectedGateway[0].label.should.equal('Connected via gateway: myGateway');
                newConnectedGateway[1].label.should.equal('Using ID: redConga');
                newConnectedGateway[2].label.should.equal('Channels');
            });

            it(`should  ${language} delete the gateway`, async () => {
                await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT);
                const gatewayItems: Array<GatewayTreeItem> = await myExtension.getBlockchainGatewayExplorerProvider().getChildren() as Array<GatewayTreeItem>;
                const myGatewayItem: GatewayTreeItem = gatewayItems.find((value: BlockchainTreeItem) => value instanceof GatewayTreeItem && value.label.startsWith('myGateway')) as GatewayTreeItem;

                await vscode.commands.executeCommand(ExtensionCommands.DELETE_GATEWAY, myGatewayItem);
                integrationTestUtil.gatewayRegistry.exists('myGateway').should.be.false;
                logSpy.should.not.have.been.calledWith(LogType.ERROR);
            });

            it(`should ${language} generate tests`, async () => {
                integrationTestUtil.testContractDir = path.join(__dirname, '..', '..', '..', 'integrationTest', 'tmp', language + 'SmartContract');
                await integrationTestUtil.generateSmartContractTests(smartContractName, '0.0.1', language, 'myGateway');
                const testRunResult: string = await integrationTestUtil.runSmartContractTests(smartContractName, language);

                await checkGeneratedSmartContract(language, smartContractName, testRunResult);
            }).timeout(0);
        });
    });

    async function checkGeneratedSmartContract(language: string, smartContractName: string, testRunResult: string): Promise<void> {
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
        const connection: IFabricClientConnection = FabricConnectionManager.instance().getConnection();
        const smartContractTransactionsMap: Map<string, string[]> = await MetadataUtil.getTransactionNames(connection, smartContractName, 'mychannel');
        let smartContractTransactionsArray: string[];
        for (const name of smartContractTransactionsMap.keys()) {
            smartContractTransactionsArray = smartContractTransactionsMap.get(name);
        }
        // Check the test file was populated properly
        testFileContents.includes(smartContractName).should.be.true;
        testFileContents.startsWith('/*').should.be.true;
        testFileContents.includes('gateway.connect').should.be.true;
        testFileContents.includes('submitTransaction').should.be.true;
        testFileContents.includes(smartContractTransactionsArray[0]).should.be.true;
        testFileContents.includes(smartContractTransactionsArray[1]).should.be.true;
        testFileContents.includes(smartContractTransactionsArray[2]).should.be.true;

        testRunResult.includes('success for transaction').should.be.true;
        testRunResult.includes('1 passing').should.be.true;

        logSpy.should.not.have.been.calledWith(LogType.ERROR);
    }
});
