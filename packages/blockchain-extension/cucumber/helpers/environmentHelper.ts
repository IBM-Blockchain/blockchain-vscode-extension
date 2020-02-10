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
import { UserInputUtilHelper } from './userInputUtilHelper';
import { ExtensionCommands } from '../../ExtensionCommands';
import { BlockchainTreeItem } from '../../extension/explorer/model/BlockchainTreeItem';
import { BlockchainEnvironmentExplorerProvider } from '../../extension/explorer/environmentExplorer';
import { UserInputUtil, IBlockchainQuickPickItem } from '../../extension/commands/UserInputUtil';
import { FabricEnvironmentRegistry, FabricEnvironmentRegistryEntry, FabricNode, FabricWalletRegistry, FabricWalletRegistryEntry, FabricEnvironment } from 'ibm-blockchain-platform-common';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';
import { EnvironmentFactory } from '../../extension/fabric/environments/EnvironmentFactory';
import { ModuleUtilHelper } from './moduleUtilHelper';

chai.use(sinonChai);
chai.use(chaiAsPromised);

export class EnvironmentHelper {

    mySandBox: sinon.SinonSandbox;
    userInputUtilHelper: UserInputUtilHelper;
    moduleUtilHelper: ModuleUtilHelper;

    constructor(sandbox: sinon.SinonSandbox, userInputUtilHelper: UserInputUtilHelper, moduleUtilHelper: ModuleUtilHelper) {
        this.mySandBox = sandbox;
        this.userInputUtilHelper = userInputUtilHelper;
        this.moduleUtilHelper = moduleUtilHelper;
    }

    public async createEnvironment(name: string): Promise<IBlockchainQuickPickItem<FabricNode>[]> {
        let treeItem: any;
        const blockchainEnvironmentExplorerProvider: BlockchainEnvironmentExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();
        // need to make sure its not showing the setup tree

        if (!process.env.OPSTOOLS_FABRIC || blockchainEnvironmentExplorerProvider) {
            const treeItems: Array<BlockchainTreeItem> = await blockchainEnvironmentExplorerProvider.getChildren();
            treeItem = treeItems.find((item: any) => {
                return item.label === name;
            });
        }

        if (!treeItem) {

            this.userInputUtilHelper.inputBoxStub.withArgs('Enter a name for the environment').resolves(name);
            if (process.env.OPSTOOLS_FABRIC) {
                // Connect to OpsTools and create environment without nodes
                this.userInputUtilHelper.showQuickPickStub.withArgs('Choose a method to import nodes to an environment').resolves(UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);
                this.userInputUtilHelper.inputBoxStub.withArgs('Enter the url of the ops tools you want to connect to').resolves(process.env.MAP_OPSTOOLS_URL);
                this.userInputUtilHelper.inputBoxStub.withArgs('Enter the api key of the ops tools you want to connect to').resolves(process.env.MAP_OPSTOOLS_KEY);
                this.userInputUtilHelper.inputBoxStub.withArgs('Enter the api secret of the ops tools you want to connect to').resolves(process.env.MAP_OPSTOOLS_SECRET);
                this.userInputUtilHelper.showQuickPickStub.withArgs('Unable to perform certificate verification. Please choose how to proceed', [UserInputUtil.ADD_CA_CERT_CHAIN, UserInputUtil.CONNECT_NO_CA_CERT_CHAIN]).resolves(UserInputUtil.CONNECT_NO_CA_CERT_CHAIN);
                this.userInputUtilHelper.opsToolsNodeQuickPickStub.resolves([]);
            } else if (process.env.ANSIBLE_FABRIC) {
                this.userInputUtilHelper.showQuickPickStub.withArgs('Choose a method to import nodes to an environment', [UserInputUtil.ADD_ENVIRONMENT_FROM_NODES, UserInputUtil.ADD_ENVIRONMENT_FROM_DIR, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS]).resolves(UserInputUtil.ADD_ENVIRONMENT_FROM_DIR);
                this.userInputUtilHelper.openFileBrowserStub.resolves(vscode.Uri.file(path.join(__dirname,  '..', '..', '..', 'cucumber', 'ansible')));
            } else {
                this.userInputUtilHelper.showQuickPickStub.withArgs('Choose a method to import nodes to an environment', [UserInputUtil.ADD_ENVIRONMENT_FROM_NODES, UserInputUtil.ADD_ENVIRONMENT_FROM_DIR, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS]).resolves(UserInputUtil.ADD_ENVIRONMENT_FROM_NODES);

                const caUri: vscode.Uri = vscode.Uri.file(path.join(__dirname, '../../../cucumber/hlfv1/nodes/ca.example.com.json'));
                const ordererUri: vscode.Uri = vscode.Uri.file(path.join(__dirname, '../../../cucumber/hlfv1/nodes/orderer.example.com.json'));
                const peerUri: vscode.Uri = vscode.Uri.file(path.join(__dirname, '../../../cucumber/hlfv1/nodes/peer0.org1.example.com.json'));
                const nodes: vscode.Uri[] = [caUri, ordererUri, peerUri];
                this.userInputUtilHelper.browseStub.withArgs('Select all the Fabric node (JSON) files you want to import').resolves(nodes);

                this.userInputUtilHelper.addMoreNodesStub.resolves(UserInputUtil.DONE_ADDING_NODES);
            }

            await vscode.commands.executeCommand(ExtensionCommands.ADD_ENVIRONMENT);
            if (process.env.OPSTOOLS_FABRIC) {
                this.userInputUtilHelper.opsToolsNodeQuickPickStub.called.should.equal(true);
                this.moduleUtilHelper.setPasswordStub.called.should.equal(true);
                this.moduleUtilHelper.getPasswordStub.called.should.equal(true);
                return this.userInputUtilHelper.opsToolsNodeQuickPickStub.getCall(0).args[0];
            }
            return [];
        }
    }

    public async deleteNode(nodeName: string, environmentName: string): Promise<void> {
        this.userInputUtilHelper.showConfirmationWarningMessageStub.resolves(true);
        const fabricEnvironmentRegistryEntry: FabricEnvironmentRegistryEntry = await FabricEnvironmentRegistry.instance().get(environmentName);
        this.userInputUtilHelper.showEnvironmentQuickPickStub.resolves({ label: environmentName, data: fabricEnvironmentRegistryEntry });

        const environment: FabricEnvironment = EnvironmentFactory.getEnvironment(fabricEnvironmentRegistryEntry);
        const nodes: FabricNode[] = await environment.getNodes();

        const node: FabricNode = nodes.find((_node: FabricNode) => {
            return _node.name === nodeName;
        });

        this.userInputUtilHelper.showNodesInEnvironmentQuickPickStub.resolves([{ label: nodeName, data: node }]);

        await vscode.commands.executeCommand(ExtensionCommands.DELETE_NODE);
    }

    public async deleteEnvironment(environmentName: string): Promise<void> {
        this.userInputUtilHelper.showConfirmationWarningMessageStub.resolves(true);
        const fabricEnvironmentRegistryEntry: FabricEnvironmentRegistryEntry = await FabricEnvironmentRegistry.instance().get(environmentName);
        this.userInputUtilHelper.showEnvironmentQuickPickStub.resolves([{ label: environmentName, data: fabricEnvironmentRegistryEntry }]);
        await vscode.commands.executeCommand(ExtensionCommands.DELETE_ENVIRONMENT);
    }

    public async associateNodeWithIdentitiy(environmentName: string, nodeName: string, identityName: string, walletName: string, mspId: string = 'Org1MSP', ): Promise<void> {
        const walletReigstryEntry: FabricWalletRegistryEntry = await FabricWalletRegistry.instance().get(walletName, environmentName);
        this.userInputUtilHelper.showWalletsQuickPickStub.resolves({ label: walletName, data: walletReigstryEntry });
        this.userInputUtilHelper.showIdentitiesQuickPickStub.resolves(identityName);
        this.userInputUtilHelper.showQuickPickStub.resolves('Use ID and secret to enroll a new identity');
        this.userInputUtilHelper.showYesNoQuickPick.withArgs('Do you want to associate the same identity with another node?').resolves(UserInputUtil.NO);
        this.userInputUtilHelper.inputBoxStub.withArgs('Provide a name for the identity').resolves(identityName);
        this.userInputUtilHelper.inputBoxStub.withArgs('Enter MSPID').resolves(mspId);

        const nodePath: string = path.join(__dirname, `../../../cucumber/tmp/environments/${environmentName}/nodes/${nodeName}.json`);
        const node: FabricNode = await fs.readJson(nodePath);

        if (node.identity && node.wallet) {
            // already setup
            return;
        }

        const environmentRegistryEntry: FabricEnvironmentRegistryEntry = await FabricEnvironmentRegistry.instance().get(environmentName);

        await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_IDENTITY_NODE, environmentRegistryEntry, node);
    }

    public async connectToEnvironment(environment: string): Promise<void> {
        const registryEntry: FabricEnvironmentRegistryEntry = await FabricEnvironmentRegistry.instance().get(environment);
        await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT, registryEntry);
    }

    public async editNodeFilters(nodesToImport: IBlockchainQuickPickItem<FabricNode>[], environmentName: string): Promise<void> {
        this.userInputUtilHelper.opsToolsNodeQuickPickStub.resolves(nodesToImport);
        await vscode.commands.executeCommand(ExtensionCommands.EDIT_NODE_FILTERS, undefined, false, UserInputUtil.ADD_ENVIRONMENT_FROM_OPS_TOOLS);

        const environmentRegistryEntry: FabricEnvironmentRegistryEntry = await FabricEnvironmentRegistry.instance().get(environmentName);
        const environment: FabricEnvironment = EnvironmentFactory.getEnvironment(environmentRegistryEntry);
        const nodes: FabricNode[] = await environment.getNodes();
        nodes.length.should.equal(nodesToImport.length);
    }
}
