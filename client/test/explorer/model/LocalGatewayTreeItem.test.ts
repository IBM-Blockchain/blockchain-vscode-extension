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
import { LocalGatewayTreeItem } from '../../../src/explorer/model/LocalGatewayTreeItem';
import { BlockchainNetworkExplorerProvider } from '../../../src/explorer/BlockchainNetworkExplorer';
import { FabricRuntimeManager } from '../../../src/fabric/FabricRuntimeManager';
import { FabricRuntime } from '../../../src/fabric/FabricRuntime';
import { FabricRuntimeRegistry } from '../../../src/fabric/FabricRuntimeRegistry';
import { FabricGatewayRegistry } from '../../../src/fabric/FabricGatewayRegistry';
import { FabricGatewayRegistryEntry } from '../../../src/fabric/FabricGatewayRegistryEntry';
import { ExtensionUtil } from '../../../src/util/ExtensionUtil';
import { TestUtil } from '../../TestUtil';

import * as chai from 'chai';
import * as sinon from 'sinon';
import { BlockchainTreeItem } from '../../../src/explorer/model/BlockchainTreeItem';

const should: Chai.Should = chai.should();

describe('LocalGatewayTreeItem', () => {

    const gatewayRegistry: FabricGatewayRegistry = FabricGatewayRegistry.instance();
    const runtimeRegistry: FabricRuntimeRegistry = FabricRuntimeRegistry.instance();
    const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
    let connection: FabricGatewayRegistryEntry;

    let sandbox: sinon.SinonSandbox;
    let clock: sinon.SinonFakeTimers;
    let provider: BlockchainNetworkExplorerProvider;
    let localGateway: FabricRuntime;

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
        await gatewayRegistry.clear();
        await runtimeRegistry.clear();
        await runtimeManager.clear();

        connection = new FabricGatewayRegistryEntry();
        connection.name = 'local_fabric';
        connection.managedRuntime = true;

        provider = getBlockchainNetworkExplorerProvider();
        await runtimeManager.add('local_fabric');
        localGateway = runtimeManager.get('local_fabric');
        sandbox = sinon.createSandbox();
        clock = sinon.useFakeTimers({toFake: ['setInterval', 'clearInterval']});
    });

    afterEach(async () => {
        clock.runToLast();
        clock.restore();
        sandbox.restore();
        await gatewayRegistry.clear();
        await runtimeRegistry.clear();
        await runtimeManager.clear();
    });

    describe('#constructor', () => {

        it('should have the right properties for a local gateway that is not created', async () => {
            sandbox.stub(localGateway, 'isCreated').returns(false);
            sandbox.stub(localGateway, 'isBusy').returns(false);
            sandbox.stub(localGateway, 'isRunning').resolves(false);
            const treeItem: LocalGatewayTreeItem = await LocalGatewayTreeItem.newLocalGatewayTreeItem(provider, 'local_fabric', new FabricGatewayRegistryEntry({
                name: 'local_fabric',
                managedRuntime: true,
                connectionProfilePath: 'myPath',
                walletPath: 'walletPath'
            }), vscode.TreeItemCollapsibleState.None);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal('local_fabric  ○');

            treeItem.contextValue.should.equal('blockchain-local-gateway-item-removed');
        });

        it('should have the right properties for a runtime that is not running', async () => {
            sandbox.stub(localGateway, 'isCreated').returns(true);
            sandbox.stub(localGateway, 'isBusy').returns(false);
            sandbox.stub(localGateway, 'isRunning').resolves(false);
            const treeItem: LocalGatewayTreeItem = await LocalGatewayTreeItem.newLocalGatewayTreeItem(provider, 'local_fabric', new FabricGatewayRegistryEntry({
                name: 'local_fabric',
                managedRuntime: true,
                connectionProfilePath: 'myPath',
                walletPath: 'walletPath'
            }), vscode.TreeItemCollapsibleState.None);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal('local_fabric  ○');
            treeItem.contextValue.should.equal('blockchain-local-gateway-item-stopped');
        });

        it('should have the right properties for a runtime that is busy', async () => {
            sandbox.stub(localGateway, 'isCreated').returns(true);
            sandbox.stub(localGateway, 'isBusy').returns(true);
            sandbox.stub(localGateway, 'isRunning').resolves(false);

            const treeItem: LocalGatewayTreeItem = await LocalGatewayTreeItem.newLocalGatewayTreeItem(provider, 'local_fabric', connection, vscode.TreeItemCollapsibleState.None);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal('local_fabric  ◐');
            should.equal(treeItem.command, null);
            treeItem.contextValue.should.equal('blockchain-local-gateway-item-busy');
        });

        it('should animate the label for a runtime that is busy', async () => {
            sandbox.stub(localGateway, 'isCreated').returns(true);
            sandbox.stub(localGateway, 'isBusy').returns(true);
            sandbox.stub(localGateway, 'isRunning').resolves(false);

            const treeItem: LocalGatewayTreeItem = await LocalGatewayTreeItem.newLocalGatewayTreeItem(provider, 'local_fabric', connection, vscode.TreeItemCollapsibleState.None);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            const states: string[] = ['◐', '◓', '◑', '◒', '◐'];
            for (const state of states) {
                treeItem.label.should.equal(`local_fabric  ${state}`);
                clock.tick(500);
                await new Promise((resolve: any): any => {
                    setTimeout(resolve, 0);
                });
            }
        });

        it('should have the right properties for a runtime that is running', async () => {
            sandbox.stub(localGateway, 'isCreated').returns(true);
            sandbox.stub(localGateway, 'isBusy').returns(false);
            sandbox.stub(localGateway, 'isRunning').resolves(true);
            const treeItem: LocalGatewayTreeItem = await LocalGatewayTreeItem.newLocalGatewayTreeItem(provider, 'local_fabric', connection, vscode.TreeItemCollapsibleState.None);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal('local_fabric  ●');
            treeItem.contextValue.should.equal('blockchain-local-gateway-item-started');
        });

        it('should have the right properties for a runtime that becomes busy', async () => {
            sandbox.stub(localGateway, 'isCreated').returns(true);
            const isBusyStub: sinon.SinonStub = sandbox.stub(localGateway, 'isBusy');
            isBusyStub.returns(false);
            sandbox.stub(localGateway, 'isRunning').resolves(false);

            const treeItem: LocalGatewayTreeItem = await LocalGatewayTreeItem.newLocalGatewayTreeItem(provider, 'local_fabric', connection, vscode.TreeItemCollapsibleState.None);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal('local_fabric  ○');
            treeItem.contextValue.should.equal('blockchain-local-gateway-item-stopped');
            isBusyStub.returns(true);
            localGateway.emit('busy', true);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal('local_fabric  ◐');
            should.equal(treeItem.command, null);
            treeItem.contextValue.should.equal('blockchain-local-gateway-item-busy');
        });

        it('should animate the label for a runtime that becomes busy', async () => {
            sandbox.stub(localGateway, 'isCreated').returns(true);
            const isBusyStub: sinon.SinonStub = sandbox.stub(localGateway, 'isBusy');
            isBusyStub.returns(false);
            sandbox.stub(localGateway, 'isRunning').resolves(false);

            const treeItem: LocalGatewayTreeItem = await LocalGatewayTreeItem.newLocalGatewayTreeItem(provider, 'local_fabric', connection, vscode.TreeItemCollapsibleState.None);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            isBusyStub.returns(true);
            localGateway.emit('busy', true);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            const states: string[] = ['◐', '◓', '◑', '◒', '◐'];
            for (const state of states) {
                treeItem.label.should.equal(`local_fabric  ${state}`);
                clock.tick(500);
                await new Promise((resolve: any): any => {
                    setTimeout(resolve, 0);
                });
            }
        });

        it('should have the right properties for a runtime that stops being busy', async () => {
            sandbox.stub(localGateway, 'isCreated').returns(true);
            const isBusyStub: sinon.SinonStub = sandbox.stub(localGateway, 'isBusy');
            isBusyStub.returns(true);
            sandbox.stub(localGateway, 'isRunning').resolves(false);

            const treeItem: LocalGatewayTreeItem = await LocalGatewayTreeItem.newLocalGatewayTreeItem(provider, 'local_fabric', connection, vscode.TreeItemCollapsibleState.None);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal('local_fabric  ◐');
            treeItem.contextValue.should.equal('blockchain-local-gateway-item-busy');
            isBusyStub.returns(false);
            localGateway.emit('busy', false);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal('local_fabric  ○');

            treeItem.contextValue.should.equal('blockchain-local-gateway-item-stopped');
        });

        it('should have the right properties for a runtime that is not running in development mode', async () => {
            sandbox.stub(localGateway, 'isCreated').returns(true);
            sandbox.stub(localGateway, 'isDevelopmentMode').returns(true);
            sandbox.stub(localGateway, 'isBusy').returns(false);
            sandbox.stub(localGateway, 'isRunning').resolves(false);

            const treeItem: LocalGatewayTreeItem = await LocalGatewayTreeItem.newLocalGatewayTreeItem(provider, 'local_fabric', connection, vscode.TreeItemCollapsibleState.None);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal('local_fabric  ○  ∞');
            treeItem.contextValue.should.equal('blockchain-local-gateway-item-stopped');
        });

        it('should have the right properties for a runtime that is running in development mode', async () => {
            sandbox.stub(localGateway, 'isCreated').returns(true);
            sandbox.stub(localGateway, 'isDevelopmentMode').returns(true);
            sandbox.stub(localGateway, 'isBusy').returns(false);
            sandbox.stub(localGateway, 'isRunning').resolves(true);
            const treeItem: LocalGatewayTreeItem = await LocalGatewayTreeItem.newLocalGatewayTreeItem(provider, 'local_fabric', connection, vscode.TreeItemCollapsibleState.None);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal('local_fabric  ●  ∞');

            treeItem.contextValue.should.equal('blockchain-local-gateway-item-started');
        });

        it('should report errors animating the label for a runtime that is busy', async () => {
            sandbox.stub(localGateway, 'isCreated').returns(true);
            sandbox.stub(localGateway, 'isBusy').returns(true);
            sandbox.stub(localGateway, 'isRunning').resolves(false);
            const treeItem: LocalGatewayTreeItem = await LocalGatewayTreeItem.newLocalGatewayTreeItem(provider, 'local_fabric', new FabricGatewayRegistryEntry({
                name: 'local_fabric',
                managedRuntime: true,
                connectionProfilePath: 'myPath',
                walletPath: 'walletPath'
            }), vscode.TreeItemCollapsibleState.None);
            sandbox.stub(treeItem, 'refresh').throws(new Error('such error'));
            const showErrorMessageSpy: sinon.SinonSpy = sandbox.spy(vscode.window, 'showErrorMessage');
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            const states: string[] = ['◐', '◓', '◑', '◒', '◐'];
            for (const state of states) {
                treeItem.label.should.equal(`local_fabric  ${state}`);
                clock.tick(500);
                await new Promise((resolve: any): any => {
                    setTimeout(resolve, 0);
                });
                showErrorMessageSpy.should.have.been.calledOnceWithExactly('such error');
                showErrorMessageSpy.resetHistory();
            }
        });
    });

});
