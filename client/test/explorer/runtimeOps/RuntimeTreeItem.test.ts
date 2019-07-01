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

import * as chai from 'chai';
import * as sinon from 'sinon';
import { getBlockchainGatewayExplorerProvider } from '../../../src/extension';
import { RuntimeTreeItem } from '../../../src/explorer/runtimeOps/RuntimeTreeItem';
import { BlockchainGatewayExplorerProvider } from '../../../src/explorer/gatewayExplorer';
import { FabricRuntimeManager } from '../../../src/fabric/FabricRuntimeManager';
import { FabricRuntime, FabricRuntimeState } from '../../../src/fabric/FabricRuntime';
import { FabricGatewayRegistry } from '../../../src/fabric/FabricGatewayRegistry';
import { FabricGatewayRegistryEntry } from '../../../src/fabric/FabricGatewayRegistryEntry';
import { ExtensionUtil } from '../../../src/util/ExtensionUtil';
import { TestUtil } from '../../TestUtil';
import { ExtensionCommands } from '../../../ExtensionCommands';
import { VSCodeBlockchainOutputAdapter } from '../../../src/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../../../src/logging/OutputAdapter';
import { FabricWalletUtil } from '../../../src/fabric/FabricWalletUtil';
import { FabricRuntimeUtil } from '../../../src/fabric/FabricRuntimeUtil';

const should: Chai.Should = chai.should();

describe('RuntimeTreeItem', () => {

    const connectionRegistry: FabricGatewayRegistry = FabricGatewayRegistry.instance();
    let connection: FabricGatewayRegistryEntry;

    const sandbox: sinon.SinonSandbox = sinon.createSandbox();
    let clock: sinon.SinonFakeTimers;
    let provider: BlockchainGatewayExplorerProvider;
    let mockRuntime: sinon.SinonStubbedInstance<FabricRuntime>;
    let onBusyCallback: any;

    before(async () => {
        await TestUtil.setupTests(sandbox);
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

        connection = new FabricGatewayRegistryEntry();
        connection.name = FabricRuntimeUtil.LOCAL_FABRIC;
        connection.managedRuntime = true;
        connection.associatedWallet = FabricWalletUtil.LOCAL_WALLET;

        provider = getBlockchainGatewayExplorerProvider();
        const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
        mockRuntime = sinon.createStubInstance(FabricRuntime);
        mockRuntime.on.callsFake((name: string, callback: any) => {
            name.should.equal('busy');
            onBusyCallback = callback;
        });
        sandbox.stub(runtimeManager, 'getRuntime').returns(mockRuntime);
        clock = sinon.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    });

    afterEach(async () => {
        clock.runToLast();
        clock.restore();
        sandbox.restore();
        await connectionRegistry.clear();
    });

    describe('#constructor', () => {

        it('should have the right properties for a runtime that is not running', async () => {
            mockRuntime.isBusy.returns(false);
            mockRuntime.isRunning.resolves(false);
            const treeItem: RuntimeTreeItem = await RuntimeTreeItem.newRuntimeTreeItem(provider, FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME, new FabricGatewayRegistryEntry({
                name: FabricRuntimeUtil.LOCAL_FABRIC,
                managedRuntime: true,
                connectionProfilePath: 'myPath',
                associatedWallet: FabricWalletUtil.LOCAL_WALLET
            }));
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal('Local Fabric  ○ (click to start)');
            treeItem.command.should.deep.equal({
                command: ExtensionCommands.START_FABRIC,
                title: '',
                arguments: [treeItem]
            });
            treeItem.tooltip.should.equal('Creates a local development runtime using Hyperledger Fabric Docker images');
        });

        it('should have the right properties for a runtime that is busy starting', async () => {
            mockRuntime.isBusy.returns(true);
            mockRuntime.isRunning.resolves(false);
            mockRuntime.getState.returns(FabricRuntimeState.STARTING);

            const treeItem: RuntimeTreeItem = await RuntimeTreeItem.newRuntimeTreeItem(provider, FabricRuntimeUtil.LOCAL_FABRIC, connection);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal('Local Fabric runtime is starting... ◐');
            treeItem.tooltip.should.equal('The local development runtime is starting...');
            should.equal(treeItem.command, null);
        });

        it('should have the right properties for a runtime that is busy stopping', async () => {
            mockRuntime.isBusy.returns(true);
            mockRuntime.isRunning.resolves(false);
            mockRuntime.getState.returns(FabricRuntimeState.STOPPING);

            const treeItem: RuntimeTreeItem = await RuntimeTreeItem.newRuntimeTreeItem(provider, FabricRuntimeUtil.LOCAL_FABRIC, connection);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal('Local Fabric runtime is stopping... ◐');
            treeItem.tooltip.should.equal('The local development runtime is stopping...');
            should.equal(treeItem.command, null);
        });

        it('should have the right properties for a runtime that is busy restarting', async () => {
            mockRuntime.isBusy.returns(true);
            mockRuntime.isRunning.resolves(false);
            mockRuntime.getState.returns(FabricRuntimeState.RESTARTING);

            const treeItem: RuntimeTreeItem = await RuntimeTreeItem.newRuntimeTreeItem(provider, FabricRuntimeUtil.LOCAL_FABRIC, connection);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal('Local Fabric runtime is restarting... ◐');
            treeItem.tooltip.should.equal('The local development runtime is restarting...');
            should.equal(treeItem.command, null);
        });

        it('should animate the label for a runtime that is busy', async () => {
            mockRuntime.isBusy.returns(true);
            mockRuntime.isRunning.resolves(false);
            mockRuntime.getState.returns(FabricRuntimeState.STARTING);

            const treeItem: RuntimeTreeItem = await RuntimeTreeItem.newRuntimeTreeItem(provider, FabricRuntimeUtil.LOCAL_FABRIC, connection);
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
            mockRuntime.isBusy.returns(false);
            mockRuntime.isRunning.resolves(true);
            const treeItem: RuntimeTreeItem = await RuntimeTreeItem.newRuntimeTreeItem(provider, FabricRuntimeUtil.LOCAL_FABRIC, connection);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal(`\`${FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME}  ●`);
            treeItem.tooltip.should.equal('The local development runtime is running');
        });

        it('should have the right properties for a runtime that becomes busy', async () => {
            mockRuntime.isBusy.returns(false);
            mockRuntime.isRunning.resolves(false);

            const treeItem: RuntimeTreeItem = await RuntimeTreeItem.newRuntimeTreeItem(provider, FabricRuntimeUtil.LOCAL_FABRIC, connection);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal('Local Fabric  ○ (click to start)');
            treeItem.command.should.deep.equal({
                command: ExtensionCommands.START_FABRIC,
                title: '',
                arguments: [treeItem]
            });
            treeItem.tooltip.should.equal('Creates a local development runtime using Hyperledger Fabric Docker images');
            mockRuntime.isBusy.returns(true);
            mockRuntime.getState.returns(FabricRuntimeState.STARTING);
            onBusyCallback(true);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal('Local Fabric runtime is starting... ◐');
            treeItem.tooltip.should.equal('The local development runtime is starting...');
            should.equal(treeItem.command, null);
        });

        it('should animate the label for a runtime that becomes busy', async () => {
            mockRuntime.isBusy.returns(false);
            mockRuntime.isRunning.resolves(false);

            const treeItem: RuntimeTreeItem = await RuntimeTreeItem.newRuntimeTreeItem(provider, FabricRuntimeUtil.LOCAL_FABRIC, connection);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            mockRuntime.isBusy.returns(true);
            mockRuntime.getState.returns(FabricRuntimeState.STARTING);
            onBusyCallback(true);
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
            mockRuntime.isBusy.returns(true);
            mockRuntime.getState.returns(FabricRuntimeState.STARTING);
            mockRuntime.isRunning.resolves(false);

            const treeItem: RuntimeTreeItem = await RuntimeTreeItem.newRuntimeTreeItem(provider, FabricRuntimeUtil.LOCAL_FABRIC, connection);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal('Local Fabric runtime is starting... ◐');
            treeItem.tooltip.should.equal('The local development runtime is starting...');
            should.equal(treeItem.command, null);
            mockRuntime.isBusy.returns(false);
            onBusyCallback(false);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal('Local Fabric  ○ (click to start)');
            treeItem.command.should.deep.equal({
                command: ExtensionCommands.START_FABRIC,
                title: '',
                arguments: [treeItem]
            });
            treeItem.tooltip.should.equal('Creates a local development runtime using Hyperledger Fabric Docker images');
        });

        it('should report errors animating the label for a runtime that is busy', async () => {
            mockRuntime.isBusy.returns(true);
            mockRuntime.getState.returns(FabricRuntimeState.STARTING);
            mockRuntime.isRunning.resolves(false);
            const treeItem: RuntimeTreeItem = await RuntimeTreeItem.newRuntimeTreeItem(provider, FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME, new FabricGatewayRegistryEntry({
                name: FabricRuntimeUtil.LOCAL_FABRIC,
                managedRuntime: true,
                connectionProfilePath: 'myPath',
                associatedWallet: FabricWalletUtil.LOCAL_WALLET
            }));
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
