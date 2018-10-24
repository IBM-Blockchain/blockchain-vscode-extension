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
import * as path from 'path';

import * as myExtension from '../../src/extension';
import { FabricClientConnection } from '../../src/fabric/FabricClientConnection';

import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { BlockchainTreeItem } from '../../src/explorer/model/BlockchainTreeItem';
import { ConnectionTreeItem } from '../../src/explorer/model/ConnectionTreeItem';
import { ConnectionIdentityTreeItem } from '../../src/explorer/model/ConnectionIdentityTreeItem';
import { FabricRuntimeConnection } from '../../src/fabric/FabricRuntimeConnection';
import { FabricRuntimeManager } from '../../src/fabric/FabricRuntimeManager';
import { TestUtil } from '../TestUtil';
import { FabricConnectionRegistry } from '../../src/fabric/FabricConnectionRegistry';
import { FabricConnectionRegistryEntry } from '../../src/fabric/FabricConnectionRegistryEntry';
import { FabricRuntimeRegistry } from '../../src/fabric/FabricRuntimeRegistry';
import { FabricRuntimeRegistryEntry } from '../../src/fabric/FabricRuntimeRegistryEntry';
import { FabricRuntime } from '../../src/fabric/FabricRuntime';
import { FabricConnectionFactory } from '../../src/fabric/FabricConnectionFactory';
import { Reporter } from '../../src/util/Reporter';
import { ExtensionUtil } from '../../src/util/ExtensionUtil';
import { BlockchainNetworkExplorerProvider } from '../../src/explorer/BlockchainNetworkExplorer';

chai.should();
chai.use(sinonChai);
// tslint:disable-next-line no-var-requires
chai.use(require('chai-as-promised'));

// tslint:disable no-unused-expression
describe('ConnectCommand', () => {

    before(async () => {
        await TestUtil.setupTests();
        await TestUtil.storeConnectionsConfig();
        await TestUtil.storeRuntimesConfig();
    });

    after(async () => {
        await TestUtil.restoreConnectionsConfig();
        await TestUtil.restoreRuntimesConfig();
    });

    describe('connect', () => {

        let mySandBox: sinon.SinonSandbox;
        let mockConnection: sinon.SinonStubbedInstance<FabricClientConnection>;
        let mockRuntimeConnection: sinon.SinonStubbedInstance<FabricRuntimeConnection>;
        let mockRuntime: sinon.SinonStubbedInstance<FabricRuntime>;
        let errorMessageSpy: sinon.SinonSpy;

        beforeEach(async () => {
            mySandBox = sinon.createSandbox();

            mockConnection = sinon.createStubInstance(FabricClientConnection);
            mockConnection.connect.resolves();
            mockRuntimeConnection = sinon.createStubInstance(FabricRuntimeConnection);
            mockRuntimeConnection.connect.resolves();

            mySandBox.stub(FabricConnectionFactory, 'createFabricClientConnection').returns(mockConnection);
            mySandBox.stub(FabricConnectionFactory, 'createFabricRuntimeConnection').returns(mockRuntimeConnection);

            const rootPath: string = path.dirname(__dirname);

            const connectionSingle: FabricConnectionRegistryEntry = new FabricConnectionRegistryEntry({
                name: 'myConnectionA',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                managedRuntime: false,
                identities: [{
                    certificatePath: path.join(rootPath, '../../test/data/connectionOne/credentials/certificate'),
                    privateKeyPath: path.join(rootPath, '../../test/data/connectionOne/credentials/privateKey')
                }]
            });

            const connectionMultiple: FabricConnectionRegistryEntry = new FabricConnectionRegistryEntry({
                name: 'myConnectionB',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
                managedRuntime: false,
                identities: [{
                    certificatePath: path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'),
                    privateKeyPath: path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey')
                }]
            });

            connectionMultiple.identities.push({
                certificatePath: path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'),
                privateKeyPath: path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey')
            });

            const connectionRuntime: FabricConnectionRegistryEntry = new FabricConnectionRegistryEntry({
                name: 'myConnectionC',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                managedRuntime: true,
                identities: [{
                    certificatePath: path.join(rootPath, '../../test/data/connectionOne/credentials/certificate'),
                    privateKeyPath: path.join(rootPath, '../../test/data/connectionOne/credentials/privateKey')
                }]
            });

            await FabricConnectionRegistry.instance().clear();
            await FabricConnectionRegistry.instance().add(connectionSingle);
            await FabricConnectionRegistry.instance().add(connectionMultiple);
            await FabricConnectionRegistry.instance().add(connectionRuntime);

            const runtimeRegistry: FabricRuntimeRegistryEntry = new FabricRuntimeRegistryEntry({
                name: 'myConnectionC',
                developmentMode: false
            });
            await FabricRuntimeRegistry.instance().clear();
            await FabricRuntimeRegistry.instance().add(runtimeRegistry);

            mockRuntime = sinon.createStubInstance(FabricRuntime);
            mockRuntime.getName.returns('myConnectionC');
            mockRuntime.isBusy.returns(false);
            mockRuntime.isRunning.resolves(true);
            mySandBox.stub(FabricRuntimeManager.instance(), 'get').withArgs('myConnectionC').returns(mockRuntime);

            errorMessageSpy = mySandBox.spy(vscode.window, 'showErrorMessage');
        });

        afterEach(async () => {
            await vscode.commands.executeCommand('blockchainExplorer.disconnectEntry');
            mySandBox.restore();
        });

        it('should test the a fabric can be connected to from the command', async () => {
            mySandBox.stub(vscode.window, 'showQuickPick').resolves({
                label: 'myConnectionA',
                data: FabricConnectionRegistry.instance().get('myConnectionA')
            });

            const connectStub: sinon.SinonStub = mySandBox.stub(myExtension.getBlockchainNetworkExplorerProvider(), 'connect');

            await vscode.commands.executeCommand('blockchainExplorer.connectEntry');

            connectStub.should.have.been.calledOnceWithExactly(sinon.match.instanceOf(FabricClientConnection));
        });

        it('should test the a fabric can be connected to from the command with multiple identities', async () => {
            const quickPickStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showQuickPick');
            quickPickStub.onFirstCall().resolves({
                label: 'myConnectionB',
                data: FabricConnectionRegistry.instance().get('myConnectionB')
            });
            quickPickStub.onSecondCall().resolves({
                label: 'Admin@org1.example.com',
                data: FabricConnectionRegistry.instance().get('myConnectionB').identities[0]
            });

            const connectStub: sinon.SinonStub = mySandBox.stub(myExtension.getBlockchainNetworkExplorerProvider(), 'connect');

            await vscode.commands.executeCommand('blockchainExplorer.connectEntry');

            connectStub.should.have.been.calledOnceWithExactly(sinon.match.instanceOf(FabricClientConnection));
        });

        it('should test that can cancel on choosing connection', async () => {
            const refreshSpy: sinon.SinonSpy = mySandBox.spy(vscode.commands, 'executeCommand');

            const quickPickStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showQuickPick');
            quickPickStub.onFirstCall().resolves();

            await vscode.commands.executeCommand('blockchainExplorer.connectEntry');

            refreshSpy.callCount.should.equal(1);
            refreshSpy.getCall(0).should.have.been.calledWith('blockchainExplorer.connectEntry');
        });

        it('should test that can be cancelled on choose identity', async () => {
            const quickPickStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showQuickPick');
            quickPickStub.onFirstCall().resolves({
                label: 'myConnectionB',
                data: FabricConnectionRegistry.instance().get('myConnectionB')
            });
            quickPickStub.onSecondCall().resolves();

            await vscode.commands.executeCommand('blockchainExplorer.connectEntry');
        });

        it('should test the a fabric with a single identity can be connected to from the tree', async () => {
            const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
            const allChildren: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren();

            const myConnectionItem: ConnectionTreeItem = allChildren[0] as ConnectionTreeItem;

            const connectStub: sinon.SinonStub = mySandBox.stub(myExtension.getBlockchainNetworkExplorerProvider(), 'connect');

            await vscode.commands.executeCommand(myConnectionItem.command.command, ...myConnectionItem.command.arguments);

            connectStub.should.have.been.calledOnceWithExactly(sinon.match.instanceOf(FabricClientConnection));
        });

        it('should test the a fabric with multiple identities can be connected to from the tree', async () => {
            const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
            const allChildren: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren();

            const myConnectionItem: ConnectionTreeItem = allChildren[1] as ConnectionTreeItem;
            const allIdentityChildren: ConnectionIdentityTreeItem[] = await blockchainNetworkExplorerProvider.getChildren(myConnectionItem) as ConnectionIdentityTreeItem[];
            const myIdentityItem: ConnectionIdentityTreeItem = allIdentityChildren[1] as ConnectionIdentityTreeItem;

            const connectStub: sinon.SinonStub = mySandBox.stub(myExtension.getBlockchainNetworkExplorerProvider(), 'connect');

            await vscode.commands.executeCommand(myIdentityItem.command.command, ...myIdentityItem.command.arguments);

            connectStub.should.have.been.calledOnceWithExactly(sinon.match.instanceOf(FabricClientConnection));
        });

        it('should handle identity not found', async () => {
            const quickPickStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showQuickPick');
            quickPickStub.onFirstCall().resolves({
                label: 'myConnectionB',
                data: FabricConnectionRegistry.instance().get('myConnectionB')
            });
            quickPickStub.onSecondCall().resolves('no identity');

            await vscode.commands.executeCommand('blockchainExplorer.connectEntry');

            errorMessageSpy.should.have.been.calledWith('Could not connect as no identity found');
        });

        it('should handle error from conecting', async () => {
            const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
            await blockchainNetworkExplorerProvider.getChildren();

            mockConnection.connect.rejects({ message: 'some error' });

            const quickPickStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showQuickPick');
            quickPickStub.onFirstCall().resolves({
                label: 'myConnectionB',
                data: FabricConnectionRegistry.instance().get('myConnectionB')
            });
            quickPickStub.onSecondCall().resolves({
                label: 'Admin@org1.example.com',
                data: FabricConnectionRegistry.instance().get('myConnectionB').identities[0]
            });

            await vscode.commands.executeCommand('blockchainExplorer.connectEntry').should.be.rejected;

            errorMessageSpy.should.have.been.calledWith('some error');
        });

        it('should connect to a managed runtime using a quick pick', async () => {
            mySandBox.stub(vscode.window, 'showQuickPick').resolves({
                label: 'myConnectionC',
                data: FabricConnectionRegistry.instance().get('myConnectionC')
            });

            const connectStub: sinon.SinonStub = mySandBox.stub(myExtension.getBlockchainNetworkExplorerProvider(), 'connect');

            await vscode.commands.executeCommand('blockchainExplorer.connectEntry');

            connectStub.should.have.been.calledOnceWithExactly(sinon.match.instanceOf(FabricRuntimeConnection));
        });

        it('should connect to a managed runtime from the tree', async () => {
            const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
            const allChildren: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren();
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });

            const myConnectionItem: ConnectionTreeItem = allChildren[2] as ConnectionTreeItem;

            const connectStub: sinon.SinonStub = mySandBox.stub(myExtension.getBlockchainNetworkExplorerProvider(), 'connect');

            await vscode.commands.executeCommand(myConnectionItem.command.command, myConnectionItem.command.arguments[0]);

            connectStub.should.have.been.calledOnceWithExactly(sinon.match.instanceOf(FabricRuntimeConnection));
        });

        it('should start a stopped fabric runtime before connecting', async () => {
            mockRuntime.isRunning.resolves(false);
            const showQuickPickStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showQuickPick').resolves({
                label: 'myConnectionC',
                data: FabricConnectionRegistry.instance().get('myConnectionC')
            });
            const connectStub: sinon.SinonStub = mySandBox.stub(myExtension.getBlockchainNetworkExplorerProvider(), 'connect');

            await vscode.commands.executeCommand('blockchainExplorer.connectEntry');

            showQuickPickStub.should.have.been.calledOnce;
            mockRuntime.start.should.have.been.calledOnce;
            connectStub.should.have.been.calledOnceWithExactly(sinon.match.instanceOf(FabricRuntimeConnection));
            errorMessageSpy.should.not.have.been.called;
        });

        it('should send a telemetry event if the extension is for production', async () => {
            mySandBox.stub(ExtensionUtil, 'getPackageJSON').returns({ production: true });
            const reporterSpy: sinon.SinonSpy = mySandBox.spy(Reporter.instance(), 'sendTelemetryEvent');

            mySandBox.stub(vscode.window, 'showQuickPick').resolves({
                label: 'myConnectionA',
                data: FabricConnectionRegistry.instance().get('myConnectionA')
            });

            mySandBox.stub(myExtension.getBlockchainNetworkExplorerProvider(), 'connect');

            await vscode.commands.executeCommand('blockchainExplorer.connectEntry');

            reporterSpy.should.have.been.calledWith('connectCommand', { runtimeData: 'user runtime' });
        });

        it('should send a telemetry event if using IBP', async () => {
            mySandBox.stub(ExtensionUtil, 'getPackageJSON').returns({ production: true });
            const reporterSpy: sinon.SinonSpy = mySandBox.spy(Reporter.instance(), 'sendTelemetryEvent');
            mockConnection.isIBPConnection.returns(true);
            mySandBox.stub(vscode.window, 'showQuickPick').resolves({
                label: 'myConnectionA',
                data: FabricConnectionRegistry.instance().get('myConnectionA')
            });

            mySandBox.stub(myExtension.getBlockchainNetworkExplorerProvider(), 'connect');

            await vscode.commands.executeCommand('blockchainExplorer.connectEntry');

            reporterSpy.should.have.been.calledWith('connectCommand', { runtimeData: 'IBP instance' });
        });

        it('should send a telemetry event if not using IBP', async () => {
            mySandBox.stub(ExtensionUtil, 'getPackageJSON').returns({ production: true });
            const reporterSpy: sinon.SinonSpy = mySandBox.spy(Reporter.instance(), 'sendTelemetryEvent');
            mockConnection.isIBPConnection.returns(false);
            mySandBox.stub(vscode.window, 'showQuickPick').resolves({
                label: 'myConnectionA',
                data: FabricConnectionRegistry.instance().get('myConnectionA')
            });

            mySandBox.stub(myExtension.getBlockchainNetworkExplorerProvider(), 'connect');

            await vscode.commands.executeCommand('blockchainExplorer.connectEntry');

            reporterSpy.should.have.been.calledWith('connectCommand', { runtimeData: 'user runtime' });
        });
    });
});
