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
import { VSCodeOutputAdapter } from '../../src/logging/VSCodeOutputAdapter';
import { TestUtil } from '../../test/TestUtil';
import { FabricConnectionManager } from '../../src/fabric/FabricConnectionManager';
import { IFabricConnection } from '../../src/fabric/IFabricConnection';
import { MetadataUtil } from '../../src/util/MetadataUtil';
import { IntegrationTestUtil } from '../integrationTestUtil';

const should: Chai.Should = chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

// tslint:disable no-unused-expression
describe('Integration Tests for Node Smart Contracts', () => {

    let mySandBox: sinon.SinonSandbox;
    let integrationTestUtil: IntegrationTestUtil;
    let errorSpy: sinon.SinonSpy;

    before(async function(): Promise<void> {
        this.timeout(600000);

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
        integrationTestUtil = new IntegrationTestUtil(mySandBox);
        errorSpy = mySandBox.spy(vscode.window, 'showErrorMessage');
    });

    afterEach(async () => {
        await vscode.commands.executeCommand('blockchainConnectionsExplorer.disconnectEntry');
        mySandBox.restore();
        delete process.env.GOPATH;
    });

    ['JavaScript', 'TypeScript'].forEach((language: string) => {

        it(`should create a ${language} smart contract, package, install and instantiate it on a peer, generate tests and upgrade it`, async () => {
            const smartContractName: string = `my${language}SC`;
            let testRunResult: string;

            await integrationTestUtil.createFabricConnection();

            await integrationTestUtil.connectToFabric();

            await integrationTestUtil.createSmartContract(smartContractName, language);

            await integrationTestUtil.packageSmartContract();

            await integrationTestUtil.installSmartContract(smartContractName, '0.0.1');

            await integrationTestUtil.instantiateSmartContract(smartContractName, '0.0.1');

            await integrationTestUtil.generateSmartContractTests(smartContractName, '0.0.1', language);
            testRunResult = await integrationTestUtil.runSmartContractTests(smartContractName, language);

            await integrationTestUtil.updatePackageJsonVersion('0.0.2');

            if (language === 'TypeScript') {
                integrationTestUtil.getConfigurationStub.callThrough();
            }

            await integrationTestUtil.packageSmartContract('0.0.2');

            await integrationTestUtil.installSmartContract(smartContractName, '0.0.2');

            await integrationTestUtil.upgradeSmartContract(smartContractName, '0.0.2');

            const allChildren: Array<ChannelTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren() as Array<ChannelTreeItem>;

            const channelChildrenOne: Array<BlockchainTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(allChildren[1]) as Array<BlockchainTreeItem>;

            const instantiatedSmartContract: BlockchainTreeItem = channelChildrenOne.find((_instantiatedSmartContract: BlockchainTreeItem) => {
                return _instantiatedSmartContract.label === `${smartContractName}@0.0.2`;
            });

            instantiatedSmartContract.should.not.be.null;

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

            await integrationTestUtil.submitTransaction(smartContractName, '0.0.1', 'transaction1', 'hello world', contractName);

            testRunResult.includes('success for transaction').should.be.true;
            testRunResult.includes('1 passing').should.be.true;

            errorSpy.should.not.have.been.called;

        }).timeout(0);

    });
});
