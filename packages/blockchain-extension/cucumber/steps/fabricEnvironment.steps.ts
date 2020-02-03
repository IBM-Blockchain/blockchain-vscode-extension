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
import { LocalEnvironmentManager } from '../../extension/fabric/environments/LocalEnvironmentManager';
import { ExtensionCommands } from '../../ExtensionCommands';
import { NodeTreeItem } from '../../extension/explorer/runtimeOps/connectedTree/NodeTreeItem';
import { BlockchainEnvironmentExplorerProvider } from '../../extension/explorer/environmentExplorer';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';
import { FabricRuntimeUtil } from 'ibm-blockchain-platform-common';
import { LocalEnvironment } from '../../extension/fabric/environments/LocalEnvironment';

// tslint:disable:no-unused-expression

chai.use(sinonChai);
chai.use(chaiAsPromised);

module.exports = function(): any {
    /**
     * Given
     */

    this.Given(`the ${FabricRuntimeUtil.LOCAL_FABRIC} is running`, this.timeout, async () => {

        const runtimeManager: LocalEnvironmentManager = LocalEnvironmentManager.instance();
        const runtime: LocalEnvironment = runtimeManager.getRuntime();

        let isRunning: boolean = await runtime.isRunning();
        if (!isRunning) {
            await vscode.commands.executeCommand(ExtensionCommands.START_FABRIC);
            isRunning = await runtime.isRunning();
        }

        isRunning.should.equal(true);
    });

    this.Given("the '{string}' environment is connected", this.timeout, async (environment: string) => {
        await ExtensionUtil.sleep(3000);
        this.environmentName = environment;
        await this.fabricEnvironmentHelper.connectToEnvironment(environment);
    });

    this.Given("an environment '{string}' exists", this.timeout, async (environmentName: string) => {
        await this.fabricEnvironmentHelper.createEnvironment(environmentName);
        this.environmentName = environmentName;
    });

    this.Given('the environment is setup', this.timeout, async () => {
        const nodes: string[] = ['ca.example.com', 'orderer.example.com', 'peer0.org1.example.com'];
        const wallet: string = 'myWallet';
        let identity: string;
        for (const node of nodes) {
            if (node === 'ca.example.com') {
                identity = 'conga2';
            } else {
                identity = 'conga';
            }
            await this.fabricEnvironmentHelper.associateNodeWithIdentitiy(this.environmentName, node, identity, wallet);

        }
    });

    /**
     * When
     */

    this.When("I create an environment '{string}'", this.timeout, async (environmentName: string) => {
        await this.fabricEnvironmentHelper.createEnvironment(environmentName);
    });

    this.When("I associate identity '{string}' in wallet '{string}' with node '{string}'", this.timeout, async (identity: string, wallet: string, node: string) => {
        await this.fabricEnvironmentHelper.associateNodeWithIdentitiy(this.environmentName, node, identity, wallet);
    });

    this.When("I connect to the environment '{string}'", this.timeout, async (environment: string) => {
        await this.fabricEnvironmentHelper.connectToEnvironment(environment);
    });

    this.When("I delete node '{string}'", this.timeout, async (nodeName: string) => {
        await this.fabricEnvironmentHelper.deleteNode(nodeName, this.environmentName);
    });

    this.When("I delete an environment '{string}'", this.timeout, async (environmentName: string) => {
        await this.fabricEnvironmentHelper.deleteEnvironment(environmentName);
    });

    this.When(`I stop the ${FabricRuntimeUtil.LOCAL_FABRIC}`, this.timeout, async () => {
        const runtimeManager: LocalEnvironmentManager = LocalEnvironmentManager.instance();
        const runtime: LocalEnvironment = runtimeManager.getRuntime();

        await vscode.commands.executeCommand(ExtensionCommands.STOP_FABRIC);
        const isRunning: boolean = await runtime.isRunning();
        isRunning.should.equal(false);
    });

    this.When(`I start the ${FabricRuntimeUtil.LOCAL_FABRIC}`, this.timeout, async () => {
        const runtimeManager: LocalEnvironmentManager = LocalEnvironmentManager.instance();
        const runtime: LocalEnvironment = runtimeManager.getRuntime();

        await vscode.commands.executeCommand(ExtensionCommands.START_FABRIC);
        const isRunning: boolean = await runtime.isRunning();
        isRunning.should.equal(true);
    });

    this.When(`I teardown the ${FabricRuntimeUtil.LOCAL_FABRIC}`, this.timeout, async () => {
        const runtimeManager: LocalEnvironmentManager = LocalEnvironmentManager.instance();
        const runtime: LocalEnvironment = runtimeManager.getRuntime();

        await vscode.commands.executeCommand(ExtensionCommands.TEARDOWN_FABRIC, undefined, true, FabricRuntimeUtil.LOCAL_FABRIC);
        const isRunning: boolean = await runtime.isRunning();
        isRunning.should.equal(false);
    });

    this.When("I open the terminal for node '{string}'", this.timeout, async (nodeType: string) => {
        const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();
        const allTreeItems: any[] = await blockchainRuntimeExplorerProvider.getChildren();
        const nodeItems: NodeTreeItem[] = await blockchainRuntimeExplorerProvider.getChildren(allTreeItems[3]) as Array<NodeTreeItem>;

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
