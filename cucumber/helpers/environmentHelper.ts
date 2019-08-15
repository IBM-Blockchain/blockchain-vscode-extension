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
import * as sinon from 'sinon';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as myExtension from '../../src/extension';
import { UserInputUtilHelper } from './userInputUtilHelper';
import { ExtensionCommands } from '../../ExtensionCommands';
import { BlockchainTreeItem } from '../../src/explorer/model/BlockchainTreeItem';
import { BlockchainEnvironmentExplorerProvider } from '../../src/explorer/environmentExplorer';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { FabricEnvironmentRegistryEntry } from '../../src/fabric/FabricEnvironmentRegistryEntry';
import { FabricRuntimeUtil } from '../../src/fabric/FabricRuntimeUtil';
import { FabricWalletUtil } from '../../src/fabric/FabricWalletUtil';
import { FabricEnvironmentRegistry } from '../../src/fabric/FabricEnvironmentRegistry';
import { FabricWalletRegistryEntry } from '../../src/fabric/FabricWalletRegistryEntry';
import { FabricNode } from '../../src/fabric/FabricNode';
import { FabricWalletRegistry } from '../../src/fabric/FabricWalletRegistry';

chai.use(sinonChai);
chai.use(chaiAsPromised);

export class EnvironmentHelper {

    mySandBox: sinon.SinonSandbox;
    userInputUtilHelper: UserInputUtilHelper;

    constructor(sandbox: sinon.SinonSandbox, userInputUtilHelper: UserInputUtilHelper) {
        this.mySandBox = sandbox;
        this.userInputUtilHelper = userInputUtilHelper;
    }

    public async createEnvironment(name: string): Promise<void> {
        const blockchainEnvironmentExplorerProvider: BlockchainEnvironmentExplorerProvider = myExtension.getBlockchainEnvironmentExplorerProvider();
        // need to make sure its not showing the setup tree
        blockchainEnvironmentExplorerProvider['fabricEnvironmentToSetUp'] = undefined;
        const treeItems: Array<BlockchainTreeItem> = await blockchainEnvironmentExplorerProvider.getChildren();

        const treeItem: any = treeItems.find((item: any) => {
            return item.label === name;
        });

        if (!treeItem) {
            this.userInputUtilHelper.inputBoxStub.withArgs('Enter a name for the environment').resolves(name);

            const caUri: vscode.Uri = vscode.Uri.file(path.join(__dirname, '../../../cucumber/hlfv1/nodes/ca.example.com.json'));
            const ordererUri: vscode.Uri = vscode.Uri.file(path.join(__dirname, '../../../cucumber/hlfv1/nodes/orderer.example.com.json'));
            const peerUri: vscode.Uri = vscode.Uri.file(path.join(__dirname, '../../../cucumber/hlfv1/nodes/peer0.org1.example.com.json'));
            const nodes: vscode.Uri[] = [caUri, ordererUri, peerUri];
            this.userInputUtilHelper.browseStub.withArgs('Select all the Fabric node files you want to import').resolves(nodes);

            this.userInputUtilHelper.addMoreNodesStub.resolves(UserInputUtil.DONE_ADDING_NODES);

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);
        }
    }

    public async deleteEnvironment(environmentName: string): Promise<void> {
        this.userInputUtilHelper.showConfirmationWarningMessageStub.resolves('yes');
        const fabricEnvironmentRegistryEntry: FabricEnvironmentRegistryEntry = FabricEnvironmentRegistry.instance().get(environmentName);
        this.userInputUtilHelper.showEnvironmentQuickPickStub.resolves({ label: environmentName, data: fabricEnvironmentRegistryEntry });
        await vscode.commands.executeCommand(ExtensionCommands.DELETE_ENVIRONMENT);
    }

    public async associateNodeWithIdentitiy(environmentName: string, nodeName: string, identityName: string, walletName: string): Promise<void> {
        const walletReigstryEntry: FabricWalletRegistryEntry = FabricWalletRegistry.instance().get(walletName);
        this.userInputUtilHelper.showWalletsQuickPickStub.resolves({ label: walletName, data: walletReigstryEntry });
        this.userInputUtilHelper.showIdentitiesQuickPickStub.resolves(identityName);
        this.userInputUtilHelper.showQuickPickStub.resolves('Use ID and secret to enroll a new identity');
        this.userInputUtilHelper.inputBoxStub.withArgs('Provide a name for the identity').resolves(identityName);
        this.userInputUtilHelper.inputBoxStub.withArgs('Enter MSPID').resolves('Org1MSP');

        const nodePath: string = path.join(__dirname, `../../../cucumber/tmp/environments/${environmentName}/nodes/${nodeName}.json`);
        const node: FabricNode = await fs.readJson(nodePath);

        if (node.identity && node.wallet) {
            // already setup
            return;
        }

        const environmentRegistryEntry: FabricEnvironmentRegistryEntry = FabricEnvironmentRegistry.instance().get(environmentName);

        await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_IDENTITY_NODE, environmentRegistryEntry, node);
    }

    public async connectToEnvironment(environment: string): Promise<void> {
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
    }
}
