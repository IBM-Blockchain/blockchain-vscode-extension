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
import { getBlockchainNetworkExplorerProvider } from '../../../src/extension';
import { RuntimeTreeItem } from '../../../src/explorer/runtimeOps/RuntimeTreeItem';
import { BlockchainNetworkExplorerProvider } from '../../../src/explorer/BlockchainNetworkExplorer';
import { FabricRuntimeManager } from '../../../src/fabric/FabricRuntimeManager';
import { FabricRuntime, FabricRuntimeState } from '../../../src/fabric/FabricRuntime';
import { FabricRuntimeRegistry } from '../../../src/fabric/FabricRuntimeRegistry';
import { FabricGatewayRegistry } from '../../../src/fabric/FabricGatewayRegistry';
import { FabricGatewayRegistryEntry } from '../../../src/fabric/FabricGatewayRegistryEntry';
import { ExtensionUtil } from '../../../src/util/ExtensionUtil';
import { TestUtil } from '../../TestUtil';

import * as chai from 'chai';
import * as sinon from 'sinon';
import { ExtensionCommands } from '../../../ExtensionCommands';
import { VSCodeBlockchainOutputAdapter } from '../../../src/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../../../src/logging/OutputAdapter';

const should: Chai.Should = chai.should();

describe('RuntimeTreeItem', () => {

    const connectionRegistry: FabricGatewayRegistry = FabricGatewayRegistry.instance();
    const runtimeRegistry: FabricRuntimeRegistry = FabricRuntimeRegistry.instance();
    const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
    let connection: FabricGatewayRegistryEntry;

    let sandbox: sinon.SinonSandbox;
    let clock: sinon.SinonFakeTimers;
    let provider: BlockchainNetworkExplorerProvider;
    let runtime: FabricRuntime;

    before(async () => {
        await TestUtil.setupTests();
        await TestUtil.storeGatewaysConfig();
        await TestUtil.storeRuntimesConfig();
    });

    after(async () => {
        await TestUtil.restoreGatewaysConfig();
        await TestUtil.restoreRuntimesConfig();

    });

    beforeEach(async () => {
        await ExtensionUtil.activateExtension();
        await connectionRegistry.clear();
        await runtimeRegistry.clear();
        await runtimeManager.clear();

        connection = new FabricGatewayRegistryEntry();
        connection.name = 'myRuntime';
        connection.managedRuntime = true;

        provider = getBlockchainNetworkExplorerProvider();
        await runtimeManager.add('myRuntime');
        runtime = runtimeManager.get('myRuntime');
        sandbox = sinon.createSandbox();
        clock = sinon.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    });

    afterEach(async () => {
        clock.runToLast();
        clock.restore();
        sandbox.restore();
        await connectionRegistry.clear();
        await runtimeRegistry.clear();
        await runtimeManager.clear();
    });

    describe('#constructor', () => {

        it('should have the right properties for a runtime that is not created', async () => {
            sandbox.stub(runtime, 'isCreated').returns(false);
            sandbox.stub(runtime, 'isBusy').returns(false);
            sandbox.stub(runtime, 'isRunning').resolves(false);
            const treeItem: RuntimeTreeItem = await RuntimeTreeItem.newRuntimeTreeItem(provider, 'myRuntime', new FabricGatewayRegistryEntry({
                name: 'myRuntime',
                managedRuntime: true,
                connectionProfilePath: 'myPath',
                walletPath: 'walletPath'
            }), vscode.TreeItemCollapsibleState.None);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal('Local Fabric runtime is stopped. Click to start.');
            treeItem.command.should.deep.equal({
                command: ExtensionCommands.START_FABRIC,
                title: '',
                arguments: [treeItem]
            });
            treeItem.contextValue.should.equal('blockchain-runtime-item-removed');
            treeItem.tooltip.should.equal('Creates a local development runtime using Hyperledger Fabric Docker images');
        });

        it('should have the right properties for a runtime that is not running', async () => {
            sandbox.stub(runtime, 'isCreated').returns(true);
            sandbox.stub(runtime, 'isBusy').returns(false);
            sandbox.stub(runtime, 'isRunning').resolves(false);
            const treeItem: RuntimeTreeItem = await RuntimeTreeItem.newRuntimeTreeItem(provider, 'myRuntime', new FabricGatewayRegistryEntry({
                name: 'myRuntime',
                managedRuntime: true,
                connectionProfilePath: 'myPath',
                walletPath: 'walletPath'
            }), vscode.TreeItemCollapsibleState.None);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal('Local Fabric runtime is stopped. Click to start.');
            treeItem.command.should.deep.equal({
                command: ExtensionCommands.START_FABRIC,
                title: '',
                arguments: [treeItem]
            });
            treeItem.contextValue.should.equal('blockchain-runtime-item-stopped');
        });

        it('should have the right properties for a runtime that is busy starting', async () => {
            sandbox.stub(runtime, 'isCreated').returns(true);
            sandbox.stub(runtime, 'isBusy').returns(true);
            sandbox.stub(runtime, 'isRunning').resolves(false);
            sandbox.stub(runtime, 'getState').returns(FabricRuntimeState.STARTING);

            const treeItem: RuntimeTreeItem = await RuntimeTreeItem.newRuntimeTreeItem(provider, 'myRuntime', connection, vscode.TreeItemCollapsibleState.None);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal('Local Fabric runtime is starting... ◐');
            should.equal(treeItem.command, null);
            treeItem.contextValue.should.equal('blockchain-runtime-item-busy');
        });

        it('should have the right properties for a runtime that is busy stopping', async () => {
            sandbox.stub(runtime, 'isCreated').returns(true);
            sandbox.stub(runtime, 'isBusy').returns(true);
            sandbox.stub(runtime, 'isRunning').resolves(false);
            sandbox.stub(runtime, 'getState').returns(FabricRuntimeState.STOPPING);

            const treeItem: RuntimeTreeItem = await RuntimeTreeItem.newRuntimeTreeItem(provider, 'myRuntime', connection, vscode.TreeItemCollapsibleState.None);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal('Local Fabric runtime is stopping... ◐');
            should.equal(treeItem.command, null);
            treeItem.contextValue.should.equal('blockchain-runtime-item-busy');
        });

        it('should have the right properties for a runtime that is busy restarting', async () => {
            sandbox.stub(runtime, 'isCreated').returns(true);
            sandbox.stub(runtime, 'isBusy').returns(true);
            sandbox.stub(runtime, 'isRunning').resolves(false);
            sandbox.stub(runtime, 'getState').returns(FabricRuntimeState.RESTARTING);

            const treeItem: RuntimeTreeItem = await RuntimeTreeItem.newRuntimeTreeItem(provider, 'myRuntime', connection, vscode.TreeItemCollapsibleState.None);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal('Local Fabric runtime is restarting... ◐');
            should.equal(treeItem.command, null);
            treeItem.contextValue.should.equal('blockchain-runtime-item-busy');
        });

        it('should animate the label for a runtime that is busy', async () => {
            sandbox.stub(runtime, 'isCreated').returns(true);
            sandbox.stub(runtime, 'isBusy').returns(true);
            sandbox.stub(runtime, 'isRunning').resolves(false);
            sandbox.stub(runtime, 'getState').returns(FabricRuntimeState.STARTING);

            const treeItem: RuntimeTreeItem = await RuntimeTreeItem.newRuntimeTreeItem(provider, 'myRuntime', connection, vscode.TreeItemCollapsibleState.None);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            const states: string[] = ['◐', '◓', '◑', '◒', '◐'];
            for (const state of states) {
                treeItem.label.should.equal(`Local Fabric runtime is starting... ${state}`);
                clock.tick(500);
                await new Promise((resolve: any): any => {
                    setTimeout(resolve, 0);
                });
            }
        });

        it('should have the right properties for a runtime that is running', async () => {
            sandbox.stub(runtime, 'isCreated').returns(true);
            sandbox.stub(runtime, 'isBusy').returns(false);
            sandbox.stub(runtime, 'isRunning').resolves(true);
            const treeItem: RuntimeTreeItem = await RuntimeTreeItem.newRuntimeTreeItem(provider, 'myRuntime', connection, vscode.TreeItemCollapsibleState.None);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal('myRuntime  ●');
            treeItem.command.should.deep.equal({
                command: ExtensionCommands.CONNECT,
                title: '',
                arguments: [connection]
            });
            treeItem.contextValue.should.equal('blockchain-runtime-item-started');
        });

        it('should have the right properties for a runtime that becomes busy', async () => {
            sandbox.stub(runtime, 'isCreated').returns(true);
            const isBusyStub: sinon.SinonStub = sandbox.stub(runtime, 'isBusy');
            isBusyStub.returns(false);
            sandbox.stub(runtime, 'isRunning').resolves(false);

            const treeItem: RuntimeTreeItem = await RuntimeTreeItem.newRuntimeTreeItem(provider, 'myRuntime', connection, vscode.TreeItemCollapsibleState.None);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal('Local Fabric runtime is stopped. Click to start.');
            treeItem.command.should.deep.equal({
                command: ExtensionCommands.START_FABRIC,
                title: '',
                arguments: [treeItem]
            });
            treeItem.contextValue.should.equal('blockchain-runtime-item-stopped');
            isBusyStub.returns(true);
            sandbox.stub(runtime, 'getState').returns(FabricRuntimeState.STARTING);
            runtime.emit('busy', true);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal('Local Fabric runtime is starting... ◐');
            should.equal(treeItem.command, null);
            treeItem.contextValue.should.equal('blockchain-runtime-item-busy');
        });

        it('should animate the label for a runtime that becomes busy', async () => {
            sandbox.stub(runtime, 'isCreated').returns(true);
            const isBusyStub: sinon.SinonStub = sandbox.stub(runtime, 'isBusy');
            isBusyStub.returns(false);
            sandbox.stub(runtime, 'isRunning').resolves(false);

            const treeItem: RuntimeTreeItem = await RuntimeTreeItem.newRuntimeTreeItem(provider, 'myRuntime', connection, vscode.TreeItemCollapsibleState.None);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            isBusyStub.returns(true);
            sandbox.stub(runtime, 'getState').returns(FabricRuntimeState.STARTING);
            runtime.emit('busy', true);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            const states: string[] = ['◐', '◓', '◑', '◒', '◐'];
            for (const state of states) {
                treeItem.label.should.equal(`Local Fabric runtime is starting... ${state}`);
                clock.tick(500);
                await new Promise((resolve: any): any => {
                    setTimeout(resolve, 0);
                });
            }
        });

        it('should have the right properties for a runtime that stops being busy', async () => {
            sandbox.stub(runtime, 'isCreated').returns(true);
            const isBusyStub: sinon.SinonStub = sandbox.stub(runtime, 'isBusy');
            isBusyStub.returns(true);
            sandbox.stub(runtime, 'getState').returns(FabricRuntimeState.STARTING);
            sandbox.stub(runtime, 'isRunning').resolves(false);

            const treeItem: RuntimeTreeItem = await RuntimeTreeItem.newRuntimeTreeItem(provider, 'myRuntime', connection, vscode.TreeItemCollapsibleState.None);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal('Local Fabric runtime is starting... ◐');
            should.equal(treeItem.command, null);
            treeItem.contextValue.should.equal('blockchain-runtime-item-busy');
            isBusyStub.returns(false);
            runtime.emit('busy', false);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal('Local Fabric runtime is stopped. Click to start.');
            treeItem.command.should.deep.equal({
                command: ExtensionCommands.START_FABRIC,
                title: '',
                arguments: [treeItem]
            });
            treeItem.contextValue.should.equal('blockchain-runtime-item-stopped');
        });

        it('should report errors animating the label for a runtime that is busy', async () => {
            sandbox.stub(runtime, 'isCreated').returns(true);
            sandbox.stub(runtime, 'isBusy').returns(true);
            sandbox.stub(runtime, 'getState').returns(FabricRuntimeState.STARTING);
            sandbox.stub(runtime, 'isRunning').resolves(false);
            const treeItem: RuntimeTreeItem = await RuntimeTreeItem.newRuntimeTreeItem(provider, 'myRuntime', new FabricGatewayRegistryEntry({
                name: 'myRuntime',
                managedRuntime: true,
                connectionProfilePath: 'myPath',
                walletPath: 'walletPath'
            }), vscode.TreeItemCollapsibleState.None);
            sandbox.stub(treeItem, 'refresh').throws(new Error('such error'));
            const logSpy: sinon.SinonSpy = sandbox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            const states: string[] = ['◐', '◓', '◑', '◒', '◐'];
            for (const state of states) {
                treeItem.label.should.equal(`Local Fabric runtime is starting... ${state}`);
                clock.tick(500);
                await new Promise((resolve: any): any => {
                    setTimeout(resolve, 0);
                });
                logSpy.should.have.been.calledOnceWithExactly(LogType.ERROR, 'such error', 'Error: such error');
                logSpy.resetHistory();
            }
        });
    });
});
