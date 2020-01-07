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
import { BlockchainGatewayExplorerProvider } from '../../extension/explorer/gatewayExplorer';
import { BlockchainTreeItem } from '../../extension/explorer/model/BlockchainTreeItem';
import { UserInputUtil } from '../../extension/commands/UserInputUtil';
import { FabricEnvironmentRegistry, FabricEnvironmentRegistryEntry, FabricNode, FabricNodeType, FabricWalletRegistry, FabricWalletRegistryEntry, FabricEnvironment, FabricGatewayRegistryEntry, FabricGatewayRegistry } from 'ibm-blockchain-platform-common';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';
import { EnvironmentFactory } from '../../extension/fabric/environments/EnvironmentFactory';

chai.use(sinonChai);
chai.use(chaiAsPromised);

export class GatewayHelper {

    mySandBox: sinon.SinonSandbox;
    userInputUtilHelper: UserInputUtilHelper;

    constructor(sandbox: sinon.SinonSandbox, userInputUtilHelper: UserInputUtilHelper) {
        this.mySandBox = sandbox;
        this.userInputUtilHelper = userInputUtilHelper;
    }

    public async createGateway(name: string, fromEnvironment: boolean, environmentName?: string): Promise<void> {
        const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = ExtensionUtil.getBlockchainGatewayExplorerProvider();
        const treeItems: Array<BlockchainTreeItem> = await blockchainGatewayExplorerProvider.getChildren();

        const treeItem: any = treeItems.find((item: any) => {
            return item.gateway && item.gateway.name === name;
        });

        if (!treeItem) {
            this.userInputUtilHelper.inputBoxStub.withArgs('Enter a name for the gateway').resolves(name);
            if (!fromEnvironment) {
                this.userInputUtilHelper.showQuickPickStub.resolves(UserInputUtil.ADD_GATEWAY_FROM_CCP);
                this.userInputUtilHelper.browseStub.withArgs('Enter a file path to a connection profile file').resolves(path.join(this.userInputUtilHelper.cucumberDir, 'hlfv1', 'connection.json'));
            } else {
                this.userInputUtilHelper.showQuickPickStub.resolves(UserInputUtil.ADD_GATEWAY_FROM_ENVIRONMENT);

                const fabricEnvironmentRegistryEntry: FabricEnvironmentRegistryEntry = await FabricEnvironmentRegistry.instance().get(environmentName);
                this.userInputUtilHelper.showEnvironmentQuickPickStub.resolves({ label: environmentName, data: fabricEnvironmentRegistryEntry });

                const environment: FabricEnvironment = EnvironmentFactory.getEnvironment(fabricEnvironmentRegistryEntry);
                const nodes: FabricNode[] = await environment.getNodes();

                const peerNode: FabricNode = nodes.find((_node: FabricNode) => {
                    return _node.type === FabricNodeType.PEER;
                });

                this.userInputUtilHelper.showOrgQuickPickStub.resolves({ label: peerNode.msp_id, data: peerNode });

                const caNode: FabricNode = nodes.find((_node: FabricNode) => {
                    return _node.type === FabricNodeType.CERTIFICATE_AUTHORITY;
                });

                this.userInputUtilHelper.showNodesInEnvironmentQuickPickStub({ label: caNode.name, data: caNode });
            }

            await vscode.commands.executeCommand(ExtensionCommands.ADD_GATEWAY);
        }
    }

    public async connectToFabric(name: string, walletName: string, identityName: string = 'greenConga', expectAssociated: boolean = true): Promise<void> {
        let gatewayEntry: FabricGatewayRegistryEntry;

        gatewayEntry = await FabricGatewayRegistry.instance().get(name);

        if (!expectAssociated) {
            const walletEntry: FabricWalletRegistryEntry = await FabricWalletRegistry.instance().get(walletName, gatewayEntry.fromEnvironment);

            this.userInputUtilHelper.showWalletsQuickPickStub.resolves({
                name: walletEntry.name,
                data: walletEntry
            });
        }

        this.userInputUtilHelper.showIdentitiesQuickPickStub.withArgs('Choose an identity to connect with').resolves(identityName);

        await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_GATEWAY, gatewayEntry);
    }

    public async submitTransaction(name: string, version: string, contractLanguage: string, transaction: string, args: string, gatewayName: string, contractName?: string, transientData?: string, evaluate?: boolean): Promise<void> {

        let gatewayEntry: FabricGatewayRegistryEntry;

        try {
            gatewayEntry = await FabricGatewayRegistry.instance().get(gatewayName);
        } catch (error) {
            gatewayEntry = new FabricGatewayRegistryEntry();
            gatewayEntry.name = gatewayName;
            gatewayEntry.associatedWallet = 'Org1';
        }

        this.userInputUtilHelper.showGatewayQuickPickStub.resolves({
            label: gatewayName,
            data: gatewayEntry
        });

        if (contractLanguage === 'Go' || contractLanguage === 'Java') {
            this.userInputUtilHelper.showClientInstantiatedSmartContractsStub.resolves({
                label: `${name}@${version}`,
                data: { name: name, channel: 'mychannel', version: version }
            });

            this.userInputUtilHelper.showTransactionStub.resolves({
                label: null,
                data: { name: transaction, contract: null }
            });

        } else {
            this.userInputUtilHelper.showClientInstantiatedSmartContractsStub.resolves({
                label: `${name}@${version}`,
                data: { name: name, channel: 'mychannel', version: version }
            });

            this.userInputUtilHelper.showTransactionStub.resolves({
                label: `${name} - ${transaction}`,
                data: { name: transaction, contract: contractName }
            });

        }

        this.userInputUtilHelper.inputBoxStub.withArgs('optional: What are the arguments to the transaction, (e.g. ["arg1", "arg2"])').resolves(args);

        if (!transientData) {
            transientData = '';
        }
        this.userInputUtilHelper.inputBoxStub.withArgs('optional: What is the transient data for the transaction, e.g. {"key": "value"}', '{}').resolves(transientData);

        this.userInputUtilHelper.showQuickPickStub.withArgs('Select a peer-targeting policy for this transaction', [UserInputUtil.DEFAULT, UserInputUtil.CUSTOM]).resolves(UserInputUtil.DEFAULT);

        if (evaluate) {
            await vscode.commands.executeCommand(ExtensionCommands.EVALUATE_TRANSACTION);
        } else {
            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);
        }
    }

    public async exportConnectionProfile(gatewayName: string): Promise<void> {
        const gatewayEntry: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get(gatewayName);

        const profilePath: string = path.join(this.userInputUtilHelper.cucumberDir, 'tmp', 'profiles');
        await fs.ensureDir(profilePath);
        const profileFile: string = path.join(profilePath, `${gatewayEntry.name}_connection.json`);
        const profileUri: vscode.Uri = vscode.Uri.file(profileFile);
        this.userInputUtilHelper.showSaveDialogStub.withArgs(sinon.match.any).resolves(profileUri);

        this.userInputUtilHelper.showGatewayQuickPickStub.resolves({ label: gatewayEntry.name, data: gatewayEntry });

        this.userInputUtilHelper.getWorkspaceFoldersStub.callThrough();

        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_CONNECTION_PROFILE);
    }
}
