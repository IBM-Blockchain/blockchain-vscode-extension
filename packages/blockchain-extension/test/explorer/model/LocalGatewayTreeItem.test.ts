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
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as path from 'path';
import { LocalGatewayTreeItem } from '../../../extension/explorer/model/LocalGatewayTreeItem';
import { BlockchainGatewayExplorerProvider } from '../../../extension/explorer/gatewayExplorer';
import { ExtensionUtil } from '../../../extension/util/ExtensionUtil';
import { TestUtil } from '../../TestUtil';
import { VSCodeBlockchainOutputAdapter } from '../../../extension/logging/VSCodeBlockchainOutputAdapter';
import { FabricRuntimeUtil, LogType, FabricGatewayRegistry, FabricGatewayRegistryEntry, FabricEnvironmentRegistry, EnvironmentType } from 'ibm-blockchain-platform-common';
import { ExtensionCommands } from '../../../ExtensionCommands';
import { LocalEnvironment } from '../../../extension/fabric/environments/LocalEnvironment';
import { ManagedAnsibleEnvironment } from '../../../extension/fabric/environments/ManagedAnsibleEnvironment';
import { ManagedAnsibleEnvironmentManager } from '../../../extension/fabric/environments/ManagedAnsibleEnvironmentManager';

const should: Chai.Should = chai.should();
chai.use(sinonChai);

describe('LocalGatewayTreeItem', () => {

    const gatewayRegistry: FabricGatewayRegistry = FabricGatewayRegistry.instance();

    let gateway: FabricGatewayRegistryEntry;

    let localRuntime: LocalEnvironment;
    let onBusyCallback: any;

    let isBusyStub: sinon.SinonStub;
    let isRunningStub: sinon.SinonStub;

    const sandbox: sinon.SinonSandbox = sinon.createSandbox();
    let clock: sinon.SinonFakeTimers;
    let provider: BlockchainGatewayExplorerProvider;

    before(async () => {
        await TestUtil.setupTests(sandbox);
    });

    beforeEach(async () => {
        await ExtensionUtil.activateExtension();
        await gatewayRegistry.clear();
        await FabricEnvironmentRegistry.instance().clear();
        await TestUtil.setupLocalFabric();
        localRuntime = new LocalEnvironment(FabricRuntimeUtil.LOCAL_FABRIC, undefined, 1);

        gateway = new FabricGatewayRegistryEntry();
        gateway.name = `${FabricRuntimeUtil.LOCAL_FABRIC} - Org1`;
        gateway.associatedWallet = 'Org1';
        gateway.displayName = `Org1`;
        gateway.fromEnvironment = FabricRuntimeUtil.LOCAL_FABRIC;

        provider = ExtensionUtil.getBlockchainGatewayExplorerProvider();

        isBusyStub = sandbox.stub(localRuntime, 'isBusy');
        isRunningStub = sandbox.stub(localRuntime, 'isRunning');
        sandbox.stub(localRuntime, 'getName').returns(FabricRuntimeUtil.LOCAL_FABRIC);
        sandbox.stub(localRuntime, 'on').callsFake((name: string, callback: any) => {
            name.should.equal('busy');
            onBusyCallback = callback;
        });

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
            isBusyStub.returns(false);
            isRunningStub.resolves(false);
            const treeItem: LocalGatewayTreeItem = await LocalGatewayTreeItem.newLocalGatewayTreeItem(provider, `${FabricRuntimeUtil.LOCAL_FABRIC} - Org1`, gateway, vscode.TreeItemCollapsibleState.None, localRuntime);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal(`${FabricRuntimeUtil.LOCAL_FABRIC} - Org1  ○`);
            treeItem.tooltip.should.equal(`${FabricRuntimeUtil.LOCAL_FABRIC} - Org1 is not running
ⓘ Associated wallet:
${FabricRuntimeUtil.LOCAL_FABRIC} - Org1 Wallet`);
            treeItem.command.should.deep.equal({
                command: ExtensionCommands.CONNECT_TO_GATEWAY,
                title: '',
                arguments: [gateway]
            });
        });

        it('should have the right properties for a runtime that is busy', async () => {
            isBusyStub.returns(true);
            isRunningStub.resolves(false);

            const treeItem: LocalGatewayTreeItem = await LocalGatewayTreeItem.newLocalGatewayTreeItem(provider, `${FabricRuntimeUtil.LOCAL_FABRIC} - Org1`, gateway, vscode.TreeItemCollapsibleState.None, localRuntime);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal(`${FabricRuntimeUtil.LOCAL_FABRIC} - Org1  ◐`);
            treeItem.tooltip.should.equal(`${FabricRuntimeUtil.LOCAL_FABRIC} - Org1  ◐
ⓘ Associated wallet:
${FabricRuntimeUtil.LOCAL_FABRIC} - Org1 Wallet`);
            should.equal(treeItem.command, null);
        });

        it('should animate the label for a runtime that is busy', async () => {
            isBusyStub.returns(true);
            isRunningStub.resolves(false);

            const treeItem: LocalGatewayTreeItem = await LocalGatewayTreeItem.newLocalGatewayTreeItem(provider, `${FabricRuntimeUtil.LOCAL_FABRIC} - Org1`, gateway, vscode.TreeItemCollapsibleState.None, localRuntime);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            const states: string[] = ['◐', '◓', '◑', '◒', '◐'];
            for (const state of states) {
                treeItem.label.should.equal(`${FabricRuntimeUtil.LOCAL_FABRIC} - Org1  ${state}`);
                treeItem.tooltip.should.equal(`${FabricRuntimeUtil.LOCAL_FABRIC} - Org1  ${state}
ⓘ Associated wallet:
${FabricRuntimeUtil.LOCAL_FABRIC} - Org1 Wallet`);
                should.equal(treeItem.command, null);

                clock.tick(500);
                await new Promise((resolve: any): any => {
                    setTimeout(resolve, 0);
                });
            }
        });

        it('should have the right properties for a runtime that is running', async () => {
            isBusyStub.returns(false);
            isRunningStub.resolves(true);
            const treeItem: LocalGatewayTreeItem = await LocalGatewayTreeItem.newLocalGatewayTreeItem(provider, `${FabricRuntimeUtil.LOCAL_FABRIC} - Org1`, gateway, vscode.TreeItemCollapsibleState.None, localRuntime);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal(`${FabricRuntimeUtil.LOCAL_FABRIC} - Org1  ●`);
            treeItem.tooltip.should.equal(`${FabricRuntimeUtil.LOCAL_FABRIC} - Org1 is running
ⓘ Associated wallet:
${FabricRuntimeUtil.LOCAL_FABRIC} - Org1 Wallet`);
            treeItem.command.should.deep.equal({
                command: ExtensionCommands.CONNECT_TO_GATEWAY,
                title: '',
                arguments: [gateway]
            });
        });

        it('should have the right properties for a runtime that becomes busy', async () => {
            isBusyStub.returns(false);
            isRunningStub.resolves(false);

            const treeItem: LocalGatewayTreeItem = await LocalGatewayTreeItem.newLocalGatewayTreeItem(provider, `${FabricRuntimeUtil.LOCAL_FABRIC} - Org1`, gateway, vscode.TreeItemCollapsibleState.None, localRuntime);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal(`${FabricRuntimeUtil.LOCAL_FABRIC} - Org1  ○`);
            treeItem.tooltip.should.equal(`${FabricRuntimeUtil.LOCAL_FABRIC} - Org1 is not running
ⓘ Associated wallet:
${FabricRuntimeUtil.LOCAL_FABRIC} - Org1 Wallet`);
            treeItem.command.should.deep.equal({
                command: ExtensionCommands.CONNECT_TO_GATEWAY,
                title: '',
                arguments: [gateway]
            });
            isBusyStub.returns(true);
            onBusyCallback(true);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal(`${FabricRuntimeUtil.LOCAL_FABRIC} - Org1  ◐`);
            treeItem.tooltip.should.equal(`${FabricRuntimeUtil.LOCAL_FABRIC} - Org1  ◐
ⓘ Associated wallet:
${FabricRuntimeUtil.LOCAL_FABRIC} - Org1 Wallet`);
            should.equal(treeItem.command, null);
        });

        it('should animate the label for a runtime that becomes busy', async () => {
            isBusyStub.returns(false);
            isRunningStub.resolves(false);

            const treeItem: LocalGatewayTreeItem = await LocalGatewayTreeItem.newLocalGatewayTreeItem(provider, `${FabricRuntimeUtil.LOCAL_FABRIC} - Org1`, gateway, vscode.TreeItemCollapsibleState.None, localRuntime);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            isBusyStub.returns(true);
            onBusyCallback(true);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            const states: string[] = ['◐', '◓', '◑', '◒', '◐'];
            for (const state of states) {
                treeItem.label.should.equal(`${FabricRuntimeUtil.LOCAL_FABRIC} - Org1  ${state}`);
                treeItem.tooltip.should.equal(`${FabricRuntimeUtil.LOCAL_FABRIC} - Org1  ${state}
ⓘ Associated wallet:
${FabricRuntimeUtil.LOCAL_FABRIC} - Org1 Wallet`);
                should.equal(treeItem.command, null);
                clock.tick(500);
                await new Promise((resolve: any): any => {
                    setTimeout(resolve, 0);
                });
            }
        });

        it('should have the right properties for a runtime that stops being busy', async () => {
            isBusyStub.returns(true);
            isRunningStub.resolves(false);

            const treeItem: LocalGatewayTreeItem = await LocalGatewayTreeItem.newLocalGatewayTreeItem(provider, `${FabricRuntimeUtil.LOCAL_FABRIC} - Org1`, gateway, vscode.TreeItemCollapsibleState.None, localRuntime);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal(`${FabricRuntimeUtil.LOCAL_FABRIC} - Org1  ◐`);
            treeItem.tooltip.should.equal(`${FabricRuntimeUtil.LOCAL_FABRIC} - Org1  ◐
ⓘ Associated wallet:
${FabricRuntimeUtil.LOCAL_FABRIC} - Org1 Wallet`);
            should.equal(treeItem.command, null);
            isBusyStub.returns(false);
            onBusyCallback(false);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            treeItem.label.should.equal(`${FabricRuntimeUtil.LOCAL_FABRIC} - Org1  ○`);
            treeItem.tooltip.should.equal(`${FabricRuntimeUtil.LOCAL_FABRIC} - Org1 is not running
ⓘ Associated wallet:
${FabricRuntimeUtil.LOCAL_FABRIC} - Org1 Wallet`);
            treeItem.command.should.deep.equal({
                command: ExtensionCommands.CONNECT_TO_GATEWAY,
                title: '',
                arguments: [gateway]
            });
        });

        it('should report errors animating the label for a runtime that is busy', async () => {
            isBusyStub.returns(true);
            isRunningStub.resolves(false);
            const treeItem: LocalGatewayTreeItem = await LocalGatewayTreeItem.newLocalGatewayTreeItem(provider, `${FabricRuntimeUtil.LOCAL_FABRIC} - Org1`, new FabricGatewayRegistryEntry({
                name: FabricRuntimeUtil.LOCAL_FABRIC,
                associatedWallet: 'Org1',
                fromEnvironment: FabricRuntimeUtil.LOCAL_FABRIC
            }), vscode.TreeItemCollapsibleState.None, localRuntime);
            sandbox.stub(treeItem, 'refresh').throws(new Error('such error'));
            const logSpy: sinon.SinonSpy = sandbox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            const states: string[] = ['◐', '◓', '◑', '◒', '◐'];
            for (const state of states) {
                treeItem.label.should.equal(`${FabricRuntimeUtil.LOCAL_FABRIC} - Org1  ${state}`);
                treeItem.tooltip.should.equal(`${FabricRuntimeUtil.LOCAL_FABRIC} - Org1  ${state}
ⓘ Associated wallet:
${FabricRuntimeUtil.LOCAL_FABRIC} - Org1 Wallet`);
                should.equal(treeItem.command, null);
                clock.tick(500);
                await new Promise((resolve: any): any => {
                    setTimeout(resolve, 0);
                });
                logSpy.should.have.been.calledOnceWithExactly(LogType.ERROR, 'such error', 'Error: such error');
                logSpy.resetHistory();
            }
        });

        it('should animate the label for a managed ansible runtime that is busy', async () => {
            const managedEnvironment: ManagedAnsibleEnvironment = ManagedAnsibleEnvironmentManager.instance().ensureRuntime('managedEnvironment', path.join(__dirname, '..', '..', 'data', 'managedAnsible'));
            sandbox.stub(managedEnvironment, 'isBusy').returns(true);
            sandbox.stub(managedEnvironment, 'isRunning').resolves(false);

            await FabricEnvironmentRegistry.instance().add({name: 'managedEnvironment', environmentType: EnvironmentType.ANSIBLE_ENVIRONMENT, managedRuntime: true, environmentDirectory: path.join(__dirname, '..', '..', 'data', 'managedAnsible')});

            const managedGateway: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
            managedGateway.name = `managedEnvironment - Org1`;
            managedGateway.associatedWallet = 'Org1';
            managedGateway.displayName = `Org1`;
            managedGateway.fromEnvironment = `managedEnvironment`;
            const treeItem: LocalGatewayTreeItem = await LocalGatewayTreeItem.newLocalGatewayTreeItem(provider, `managedEnvironment - Org1`, managedGateway, vscode.TreeItemCollapsibleState.None, managedEnvironment);
            await new Promise((resolve: any): any => {
                setTimeout(resolve, 0);
            });
            const states: string[] = ['◐', '◓', '◑', '◒', '◐'];
            for (const state of states) {
                treeItem.label.should.equal(`managedEnvironment - Org1  ${state}`);
                treeItem.tooltip.should.equal(`managedEnvironment - Org1  ${state}
ⓘ Associated wallet:
managedEnvironment - Org1 Wallet`);
                should.equal(treeItem.command, null);

                clock.tick(500);
                await new Promise((resolve: any): any => {
                    setTimeout(resolve, 0);
                });
            }
        });

    });

});
