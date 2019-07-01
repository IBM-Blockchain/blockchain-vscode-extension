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
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as vscode from 'vscode';
import * as myExtension from '../../src/extension';
import { FabricRuntimeManager } from '../../src/fabric/FabricRuntimeManager';
import { FabricRuntime } from '../../src/fabric/FabricRuntime';
import { ExtensionCommands } from '../../ExtensionCommands';
import { NodeTreeItem } from '../../src/explorer/runtimeOps/NodeTreeItem';
import { BlockchainEnvironmentExplorerProvider } from '../../src/explorer/runtimeOpsExplorer';
import { FabricRuntimeUtil } from '../../src/fabric/FabricRuntimeUtil';
import { FabricEnvironmentRegistryEntry } from '../../src/fabric/FabricEnvironmentRegistryEntry';
import { FabricWalletUtil } from '../../src/fabric/FabricWalletUtil';
import { FabricEnvironmentRegistry } from '../../src/fabric/FabricEnvironmentRegistry';

// tslint:disable:no-unused-expression

chai.use(sinonChai);
chai.use(chaiAsPromised);

module.exports = function(): any {
    /**
     * Given
     */

    this.Given('the Local Fabric is running', this.timeout, async () => {

        const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
        const runtime: FabricRuntime = runtimeManager.getRuntime();

        let isRunning: boolean = await runtime.isRunning();
        if (!isRunning) {
            await vscode.commands.executeCommand(ExtensionCommands.START_FABRIC);
            isRunning = await runtime.isRunning();
        }

        isRunning.should.equal(true);
    });

    this.Given("the '{string}' environment is connected", this.timeout, async (environment: string) => {
        let registryEntry: FabricEnvironmentRegistryEntry;
        if (environment === 'Local Fabric') {
            registryEntry = new FabricEnvironmentRegistryEntry();
            registryEntry.name = FabricRuntimeUtil.LOCAL_FABRIC;
            registryEntry.managedRuntime = true;
            registryEntry.associatedWallet = FabricWalletUtil.LOCAL_WALLET;
        } else {
            registryEntry = FabricEnvironmentRegistry.instance().get(environment);
        }

        await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT, registryEntry);
    });

    /**
     * When
     */

    this.When('I stop the Local Fabric', this.timeout, async () => {
        const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
        const runtime: FabricRuntime = runtimeManager.getRuntime();

        await vscode.commands.executeCommand(ExtensionCommands.STOP_FABRIC);
        const isRunning: boolean = await runtime.isRunning();
        isRunning.should.equal(false);
    });

    this.When('I start the Local Fabric', this.timeout, async () => {
        const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
        const runtime: FabricRuntime = runtimeManager.getRuntime();

        await vscode.commands.executeCommand(ExtensionCommands.START_FABRIC);
        const isRunning: boolean = await runtime.isRunning();
        isRunning.should.equal(true);
    });

    this.When('I tear down the Local Fabric', this.timeout, async () => {
        const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
        const runtime: FabricRuntime = runtimeManager.getRuntime();

        await vscode.commands.executeCommand(ExtensionCommands.TEARDOWN_FABRIC, true);
        const isRunning: boolean = await runtime.isRunning();
        isRunning.should.equal(false);
    });

    this.When("I open the terminal for node '{string}'", this.timeout, async (nodeType: string) => {
        const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = myExtension.getBlockchainEnvironmentExplorerProvider();
        const allTreeItems: any[] = await blockchainRuntimeExplorerProvider.getChildren();
        const nodeItems: NodeTreeItem[] = await blockchainRuntimeExplorerProvider.getChildren(allTreeItems[2]) as Array<NodeTreeItem>;

        const treeItem: NodeTreeItem = nodeItems.find((nodeItem: NodeTreeItem) => nodeItem.node.type === nodeType);
        treeItem.should.not.be.null;
        this.treeItem = treeItem;
        await vscode.commands.executeCommand(ExtensionCommands.OPEN_NEW_TERMINAL, treeItem);
    });

    /**
     * Then
     */

    this.Then('there should be a terminal open', this.timeout, () => {
        const terminal: vscode.Terminal = vscode.window.terminals.find((item: vscode.Terminal) => item.name === `Fabric runtime - ${this.treeItem.label}`);
        terminal.should.not.be.null;
    });
};
