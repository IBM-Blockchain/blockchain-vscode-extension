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

import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { RuntimeTreeItem } from '../../../extension/explorer/runtimeOps/disconnectedTree/RuntimeTreeItem';
import { ExtensionUtil } from '../../../extension/util/ExtensionUtil';
import { TestUtil } from '../../TestUtil';
import { ExtensionCommands } from '../../../ExtensionCommands';
import { VSCodeBlockchainOutputAdapter } from '../../../extension/logging/VSCodeBlockchainOutputAdapter';
import { FabricEnvironmentRegistry, FabricEnvironmentRegistryEntry, FabricRuntimeUtil, LogType, EnvironmentType } from 'ibm-blockchain-platform-common';
import { BlockchainEnvironmentExplorerProvider } from '../../../extension/explorer/environmentExplorer';
import { FabricRuntimeState } from '../../../extension/fabric/FabricRuntimeState';
import { LocalMicroEnvironment } from '../../../extension/fabric/environments/LocalMicroEnvironment';
import { LocalMicroEnvironmentManager } from '../../../extension/fabric/environments/LocalMicroEnvironmentManager';
import { UserInputUtil } from '../../../extension/commands/UserInputUtil';
describe('RuntimeTreeItem', () => {

    const environmentRegistry: FabricEnvironmentRegistry = FabricEnvironmentRegistry.instance();

    const sandbox: sinon.SinonSandbox = sinon.createSandbox();
    let clock: sinon.SinonFakeTimers;
    let provider: BlockchainEnvironmentExplorerProvider;
    let environmentRegistryEntry: FabricEnvironmentRegistryEntry;
    let localRuntime: LocalMicroEnvironment;
    let isBusyStub: sinon.SinonStub;
    let isRunningStub: sinon.SinonStub;
    let getStateStub: sinon.SinonStub;
    let onBusyCallback: any;
    let command: vscode.Command;

    before(async () => {
        await TestUtil.setupTests(sandbox);
    });

    beforeEach(async () => {
        await ExtensionUtil.activateExtension();
        await environmentRegistry.clear();

        environmentRegistryEntry = new FabricEnvironmentRegistryEntry();
        environmentRegistryEntry.name = FabricRuntimeUtil.LOCAL_FABRIC;
        environmentRegistryEntry.managedRuntime = true;
        environmentRegistryEntry.environmentType = EnvironmentType.LOCAL_ENVIRONMENT;

        provider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();
        const runtimeManager: LocalMicroEnvironmentManager = LocalMicroEnvironmentManager.instance();
        localRuntime = new LocalMicroEnvironment(FabricRuntimeUtil.LOCAL_FABRIC, 8080, 1, UserInputUtil.V2_0);
        // mockRuntime = sandbox.createStubInstance(LocalEnvironment);
        isBusyStub = sandbox.stub(localRuntime, 'isBusy');
        isRunningStub = sandbox.stub(localRuntime, 'isRunning');
        getStateStub = sandbox.stub(localRuntime, 'getState');

        sandbox.stub(localRuntime, 'on').callsFake((name: string, callback: any) => {
            name.should.equal('busy');
            onBusyCallback = callback;
        });

        sandbox.stub(runtimeManager, 'getRuntime').returns(localRuntime);
        clock = sinon.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });

        command = {
            command: ExtensionCommands.CONNECT_TO_ENVIRONMENT,
            title: ''
        };
    });

    afterEach(async () => {
        clock.runToLast();
        clock.restore();
        sandbox.restore();
        await environmentRegistry.clear();
    });

    describe('#constructor', () => {

        it('should have the right properties for a runtime that is not running', async () => {
            isBusyStub.returns(false);
            isRunningStub.resolves(false);
            const treeItem: RuntimeTreeItem = await RuntimeTreeItem.newRuntimeTreeItem(provider, FabricRuntimeUtil.LOCAL_FABRIC, environmentRegistryEntry, command, localRuntime);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal(`${FabricRuntimeUtil.LOCAL_FABRIC}  ○ (click to start)`);
            treeItem.command.should.deep.equal(command);
            treeItem.tooltip.should.equal('Creates a local development runtime using Hyperledger Fabric Docker images');
        });

        it('should have the right properties for a runtime that is busy starting', async () => {
            isBusyStub.returns(true);
            isRunningStub.resolves(false);
            getStateStub.returns(FabricRuntimeState.STARTING);

            const treeItem: RuntimeTreeItem = await RuntimeTreeItem.newRuntimeTreeItem(provider, FabricRuntimeUtil.LOCAL_FABRIC, environmentRegistryEntry, command, localRuntime);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal(`${FabricRuntimeUtil.LOCAL_FABRIC} runtime is starting... ◐`);
            treeItem.tooltip.should.equal('The local development runtime is starting...');
            treeItem.command.should.deep.equal(command);
        });

        it('should have the right properties for a runtime that is busy stopping', async () => {
            isBusyStub.returns(true);
            isRunningStub.resolves(false);
            getStateStub.returns(FabricRuntimeState.STOPPING);

            const treeItem: RuntimeTreeItem = await RuntimeTreeItem.newRuntimeTreeItem(provider, FabricRuntimeUtil.LOCAL_FABRIC, environmentRegistryEntry, command, localRuntime);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal(`${FabricRuntimeUtil.LOCAL_FABRIC} runtime is stopping... ◐`);
            treeItem.tooltip.should.equal('The local development runtime is stopping...');
            treeItem.command.should.deep.equal(command);
        });

        it('should have the right properties for a runtime that is busy restarting', async () => {
            isBusyStub.returns(true);
            isRunningStub.resolves(false);
            getStateStub.returns(FabricRuntimeState.RESTARTING);

            const treeItem: RuntimeTreeItem = await RuntimeTreeItem.newRuntimeTreeItem(provider, FabricRuntimeUtil.LOCAL_FABRIC, environmentRegistryEntry, command, localRuntime);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal(`${FabricRuntimeUtil.LOCAL_FABRIC} runtime is restarting... ◐`);
            treeItem.tooltip.should.equal('The local development runtime is restarting...');
            treeItem.command.should.deep.equal(command);
        });

        it('should animate the label for a runtime that is busy', async () => {
            isBusyStub.returns(true);
            isRunningStub.resolves(false);
            getStateStub.returns(FabricRuntimeState.STARTING);

            const treeItem: RuntimeTreeItem = await RuntimeTreeItem.newRuntimeTreeItem(provider, FabricRuntimeUtil.LOCAL_FABRIC, environmentRegistryEntry, command, localRuntime);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            const states: string[] = ['◐', '◓', '◑', '◒', '◐'];
            for (const state of states) {
                treeItem.label.should.equal(`${FabricRuntimeUtil.LOCAL_FABRIC} runtime is starting... ${state}`);
                clock.tick(500);
                await new Promise((resolve: any): any => {
                    setTimeout(resolve, 0);
                });
            }

            treeItem.command.should.deep.equal(command);
        });

        it('should have the right properties for a runtime that is running', async () => {
            isBusyStub.returns(false);
            isRunningStub.resolves(true);
            const treeItem: RuntimeTreeItem = await RuntimeTreeItem.newRuntimeTreeItem(provider, FabricRuntimeUtil.LOCAL_FABRIC, environmentRegistryEntry, command, localRuntime);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal(`${FabricRuntimeUtil.LOCAL_FABRIC}  ●`);
            treeItem.tooltip.should.equal('The local development runtime is running');
            treeItem.command.should.deep.equal(command);
        });

        it('should have the right properties for a runtime that becomes busy', async () => {
            isBusyStub.returns(false);
            isRunningStub.resolves(false);

            const treeItem: RuntimeTreeItem = await RuntimeTreeItem.newRuntimeTreeItem(provider, FabricRuntimeUtil.LOCAL_FABRIC, environmentRegistryEntry, command, localRuntime);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal(`${FabricRuntimeUtil.LOCAL_FABRIC}  ○ (click to start)`);
            treeItem.command.should.deep.equal({
                command: ExtensionCommands.CONNECT_TO_ENVIRONMENT,
                title: ''
            });
            treeItem.tooltip.should.equal('Creates a local development runtime using Hyperledger Fabric Docker images');
            isBusyStub.returns(true);
            getStateStub.returns(FabricRuntimeState.STARTING);
            onBusyCallback(true);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal(`${FabricRuntimeUtil.LOCAL_FABRIC} runtime is starting... ◐`);
            treeItem.tooltip.should.equal('The local development runtime is starting...');
            treeItem.command.should.deep.equal(command);
        });

        it('should animate the label for a runtime that becomes busy', async () => {
            isBusyStub.returns(false);
            isRunningStub.resolves(false);

            const treeItem: RuntimeTreeItem = await RuntimeTreeItem.newRuntimeTreeItem(provider, FabricRuntimeUtil.LOCAL_FABRIC, environmentRegistryEntry, command, localRuntime);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            isBusyStub.returns(true);
            getStateStub.returns(FabricRuntimeState.STARTING);
            onBusyCallback(true);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            const states: string[] = ['◐', '◓', '◑', '◒', '◐'];
            for (const state of states) {
                treeItem.label.should.equal(`${FabricRuntimeUtil.LOCAL_FABRIC} runtime is starting... ${state}`);
                clock.tick(500);
                await new Promise((resolve: any): any => {
                    setTimeout(resolve, 0);
                });
            }

            treeItem.command.should.deep.equal(command);
        });

        it('should have the right properties for a runtime that stops being busy', async () => {
            isBusyStub.returns(true);
            getStateStub.returns(FabricRuntimeState.STARTING);
            isRunningStub.resolves(false);

            const treeItem: RuntimeTreeItem = await RuntimeTreeItem.newRuntimeTreeItem(provider, FabricRuntimeUtil.LOCAL_FABRIC, environmentRegistryEntry, command, localRuntime);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal(`${FabricRuntimeUtil.LOCAL_FABRIC} runtime is starting... ◐`);
            treeItem.tooltip.should.equal('The local development runtime is starting...');
            isBusyStub.returns(false);
            onBusyCallback(false);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal(`${FabricRuntimeUtil.LOCAL_FABRIC}  ○ (click to start)`);
            treeItem.command.should.deep.equal(command);
            treeItem.tooltip.should.equal('Creates a local development runtime using Hyperledger Fabric Docker images');
        });

        it('should report errors animating the label for a runtime that is busy', async () => {
            isBusyStub.returns(true);
            getStateStub.returns(FabricRuntimeState.STARTING);
            isRunningStub.resolves(false);
            const treeItem: RuntimeTreeItem = await RuntimeTreeItem.newRuntimeTreeItem(provider, FabricRuntimeUtil.LOCAL_FABRIC, environmentRegistryEntry, command, localRuntime);
            sandbox.stub(treeItem, 'refresh').throws(new Error('such error'));
            const logSpy: sinon.SinonSpy = sandbox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            const states: string[] = ['◐', '◓', '◑', '◒', '◐'];
            for (const state of states) {
                treeItem.label.should.equal(`${FabricRuntimeUtil.LOCAL_FABRIC} runtime is starting... ${state}`);
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
