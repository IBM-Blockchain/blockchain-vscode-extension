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
import * as sinon from 'sinon';
import { getBlockchainGatewayExplorerProvider } from '../../../src/extension';
import { LocalGatewayTreeItem } from '../../../src/explorer/model/LocalGatewayTreeItem';
import { BlockchainGatewayExplorerProvider } from '../../../src/explorer/gatewayExplorer';
import { FabricRuntimeManager } from '../../../src/fabric/FabricRuntimeManager';
import { FabricRuntime } from '../../../src/fabric/FabricRuntime';
import { FabricGatewayRegistry } from '../../../src/fabric/FabricGatewayRegistry';
import { FabricGatewayRegistryEntry } from '../../../src/fabric/FabricGatewayRegistryEntry';
import { ExtensionUtil } from '../../../src/util/ExtensionUtil';
import { TestUtil } from '../../TestUtil';
import { VSCodeBlockchainOutputAdapter } from '../../../src/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../../../src/logging/OutputAdapter';
import { FabricWalletUtil } from '../../../src/fabric/FabricWalletUtil';
import { FabricRuntimeUtil } from '../../../src/fabric/FabricRuntimeUtil';

describe('LocalGatewayTreeItem', () => {

    const gatewayRegistry: FabricGatewayRegistry = FabricGatewayRegistry.instance();

    let connection: FabricGatewayRegistryEntry;
    let mockRuntime: sinon.SinonStubbedInstance<FabricRuntime>;
    let onBusyCallback: any;

    let sandbox: sinon.SinonSandbox;
    let clock: sinon.SinonFakeTimers;
    let provider: BlockchainGatewayExplorerProvider;

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

        connection = new FabricGatewayRegistryEntry();
        connection.name = FabricRuntimeUtil.LOCAL_FABRIC;
        connection.managedRuntime = true;

        provider = getBlockchainGatewayExplorerProvider();
        const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
        mockRuntime = sinon.createStubInstance(FabricRuntime);
        mockRuntime.on.callsFake((name: string, callback: any) => {
            name.should.equal('busy');
            onBusyCallback = callback;
        });
        sandbox = sinon.createSandbox();
        sandbox.stub(runtimeManager, 'getRuntime').returns(mockRuntime);
        clock = sinon.useFakeTimers({toFake: ['setInterval', 'clearInterval']});
    });

    afterEach(async () => {
        clock.runToLast();
        clock.restore();
        sandbox.restore();
        await gatewayRegistry.clear();
    });

    describe('#constructor', () => {

        it('should have the right properties for a runtime that is not running', async () => {
            mockRuntime.isBusy.returns(false);
            mockRuntime.isRunning.resolves(false);
            const treeItem: LocalGatewayTreeItem = await LocalGatewayTreeItem.newLocalGatewayTreeItem(provider, FabricWalletUtil.LOCAL_WALLET, new FabricGatewayRegistryEntry({
                name: FabricRuntimeUtil.LOCAL_FABRIC,
                managedRuntime: true,
                connectionProfilePath: 'myPath',
                associatedWallet: FabricWalletUtil.LOCAL_WALLET
            }), vscode.TreeItemCollapsibleState.None);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal(`${FabricRuntimeUtil.LOCAL_FABRIC}  ○`);
        });

        it('should have the right properties for a runtime that is busy', async () => {
            mockRuntime.isBusy.returns(true);
            mockRuntime.isRunning.resolves(false);

            const treeItem: LocalGatewayTreeItem = await LocalGatewayTreeItem.newLocalGatewayTreeItem(provider, FabricRuntimeUtil.LOCAL_FABRIC, connection, vscode.TreeItemCollapsibleState.None);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal(`${FabricRuntimeUtil.LOCAL_FABRIC}  ◐`);
        });

        it('should animate the label for a runtime that is busy', async () => {
            mockRuntime.isBusy.returns(true);
            mockRuntime.isRunning.resolves(false);

            const treeItem: LocalGatewayTreeItem = await LocalGatewayTreeItem.newLocalGatewayTreeItem(provider, FabricRuntimeUtil.LOCAL_FABRIC, connection, vscode.TreeItemCollapsibleState.None);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            const states: string[] = ['◐', '◓', '◑', '◒', '◐'];
            for (const state of states) {
                treeItem.label.should.equal(`${FabricRuntimeUtil.LOCAL_FABRIC}  ${state}`);
                clock.tick(500);
                await new Promise((resolve: any): any => {
                    setTimeout(resolve, 0);
                });
            }
        });

        it('should have the right properties for a runtime that is running', async () => {
            mockRuntime.isBusy.returns(false);
            mockRuntime.isRunning.resolves(true);
            const treeItem: LocalGatewayTreeItem = await LocalGatewayTreeItem.newLocalGatewayTreeItem(provider, FabricRuntimeUtil.LOCAL_FABRIC, connection, vscode.TreeItemCollapsibleState.None);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal(`${FabricRuntimeUtil.LOCAL_FABRIC}  ●`);
        });

        it('should have the right properties for a runtime that becomes busy', async () => {
            mockRuntime.isBusy.returns(false);
            mockRuntime.isRunning.resolves(false);

            const treeItem: LocalGatewayTreeItem = await LocalGatewayTreeItem.newLocalGatewayTreeItem(provider, FabricRuntimeUtil.LOCAL_FABRIC, connection, vscode.TreeItemCollapsibleState.None);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal(`${FabricRuntimeUtil.LOCAL_FABRIC}  ○`);
            mockRuntime.isBusy.returns(true);
            onBusyCallback(true);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal(`${FabricRuntimeUtil.LOCAL_FABRIC}  ◐`);
        });

        it('should animate the label for a runtime that becomes busy', async () => {
            mockRuntime.isBusy.returns(false);
            mockRuntime.isRunning.resolves(false);

            const treeItem: LocalGatewayTreeItem = await LocalGatewayTreeItem.newLocalGatewayTreeItem(provider, FabricRuntimeUtil.LOCAL_FABRIC, connection, vscode.TreeItemCollapsibleState.None);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            mockRuntime.isBusy.returns(true);
            onBusyCallback(true);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            const states: string[] = ['◐', '◓', '◑', '◒', '◐'];
            for (const state of states) {
                treeItem.label.should.equal(`${FabricRuntimeUtil.LOCAL_FABRIC}  ${state}`);
                clock.tick(500);
                await new Promise((resolve: any): any => {
                    setTimeout(resolve, 0);
                });
            }
        });

        it('should have the right properties for a runtime that stops being busy', async () => {
            mockRuntime.isBusy.returns(true);
            mockRuntime.isRunning.resolves(false);

            const treeItem: LocalGatewayTreeItem = await LocalGatewayTreeItem.newLocalGatewayTreeItem(provider, FabricRuntimeUtil.LOCAL_FABRIC, connection, vscode.TreeItemCollapsibleState.None);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal(`${FabricRuntimeUtil.LOCAL_FABRIC}  ◐`);
            mockRuntime.isBusy.returns(false);
            onBusyCallback(false);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal(`${FabricRuntimeUtil.LOCAL_FABRIC}  ○`);
        });

        it('should have the right properties for a runtime that is not running in development mode', async () => {
            mockRuntime.isDevelopmentMode.returns(true);
            mockRuntime.isBusy.returns(false);
            mockRuntime.isRunning.resolves(false);

            const treeItem: LocalGatewayTreeItem = await LocalGatewayTreeItem.newLocalGatewayTreeItem(provider, FabricRuntimeUtil.LOCAL_FABRIC, connection, vscode.TreeItemCollapsibleState.None);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal(`${FabricRuntimeUtil.LOCAL_FABRIC}  ○  ∞`);
        });

        it('should have the right properties for a runtime that is running in development mode', async () => {
            mockRuntime.isDevelopmentMode.returns(true);
            mockRuntime.isBusy.returns(false);
            mockRuntime.isRunning.resolves(true);
            const treeItem: LocalGatewayTreeItem = await LocalGatewayTreeItem.newLocalGatewayTreeItem(provider, FabricRuntimeUtil.LOCAL_FABRIC, connection, vscode.TreeItemCollapsibleState.None);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal(`${FabricRuntimeUtil.LOCAL_FABRIC}  ●  ∞`);
        });

        it('should report errors animating the label for a runtime that is busy', async () => {
            mockRuntime.isBusy.returns(true);
            mockRuntime.isRunning.resolves(false);
            const treeItem: LocalGatewayTreeItem = await LocalGatewayTreeItem.newLocalGatewayTreeItem(provider, FabricRuntimeUtil.LOCAL_FABRIC, new FabricGatewayRegistryEntry({
                name: FabricRuntimeUtil.LOCAL_FABRIC,
                managedRuntime: true,
                connectionProfilePath: 'myPath',
                associatedWallet: FabricWalletUtil.LOCAL_WALLET
            }), vscode.TreeItemCollapsibleState.None);
            sandbox.stub(treeItem, 'refresh').throws(new Error('such error'));
            const logSpy: sinon.SinonSpy = sandbox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            const states: string[] = ['◐', '◓', '◑', '◒', '◐'];
            for (const state of states) {
                treeItem.label.should.equal(`${FabricRuntimeUtil.LOCAL_FABRIC}  ${state}`);
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
