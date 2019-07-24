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
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as myExtension from '../../src/extension';
import { UserInputUtilHelper } from './userInputUtilHelper';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricGatewayRegistryEntry } from '../../src/fabric/FabricGatewayRegistryEntry';
import { FabricGatewayRegistry } from '../../src/fabric/FabricGatewayRegistry';
import { FabricRuntimeManager } from '../../src/fabric/FabricRuntimeManager';
import { FabricWalletRegistryEntry } from '../../src/fabric/FabricWalletRegistryEntry';
import { FabricWalletRegistry } from '../../src/fabric/FabricWalletRegistry';
import { FabricWalletUtil } from '../../src/fabric/FabricWalletUtil';
import { WalletAndIdentityHelper } from './walletAndIdentityHelper';
import { BlockchainGatewayExplorerProvider } from '../../src/explorer/gatewayExplorer';
import { BlockchainTreeItem } from '../../src/explorer/model/BlockchainTreeItem';

chai.use(sinonChai);
chai.use(chaiAsPromised);

export class GatewayHelper {

    mySandBox: sinon.SinonSandbox;
    userInputUtilHelper: UserInputUtilHelper;

    constructor(sandbox: sinon.SinonSandbox, userInputUtilHelper: UserInputUtilHelper) {
        this.mySandBox = sandbox;
        this.userInputUtilHelper = userInputUtilHelper;
    }

    public async createGateway(name: string): Promise<void> {
        const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = myExtension.getBlockchainGatewayExplorerProvider();
        const treeItems: Array<BlockchainTreeItem> = await blockchainGatewayExplorerProvider.getChildren();

        const treeItem: any = treeItems.find((item: any) => {
            return item.label === name;
        });

        if (!treeItem) {
            this.userInputUtilHelper.inputBoxStub.withArgs('Enter a name for the gateway').resolves(name);
            this.userInputUtilHelper.browseStub.withArgs('Enter a file path to a connection profile file').resolves(path.join(__dirname, '../../../cucumber/hlfv1/connection.json'));

            await vscode.commands.executeCommand(ExtensionCommands.ADD_GATEWAY);
        }
    }

    public async connectToFabric(name: string, walletName: string, identityName: string = 'greenConga', expectAssociated: boolean = true): Promise<void> {
        let gatewayEntry: FabricGatewayRegistryEntry;

        try {
            gatewayEntry = FabricGatewayRegistry.instance().get(name);
        } catch (error) {
            const gatewayEntries: FabricGatewayRegistryEntry[] = await FabricRuntimeManager.instance().getGatewayRegistryEntries();
            gatewayEntry = gatewayEntries[0];
        }

        if (!expectAssociated) {
            let walletEntry: FabricWalletRegistryEntry;

            try {
                walletEntry = FabricWalletRegistry.instance().get(walletName);
            } catch (error) {
                walletEntry = new FabricWalletRegistryEntry();
                walletEntry.name = FabricWalletUtil.LOCAL_WALLET;
                walletEntry.walletPath = WalletAndIdentityHelper.localWalletPath;
                walletEntry.managedWallet = true;
            }

            this.userInputUtilHelper.showWalletsQuickPickStub.resolves({
                name: walletEntry.name,
                data: walletEntry
            });
        }

        this.userInputUtilHelper.showIdentitiesQuickPickStub.withArgs('Choose an identity to connect with').resolves(identityName);

        await vscode.commands.executeCommand(ExtensionCommands.CONNECT, gatewayEntry);
    }

    public async submitTransaction(name: string, version: string, contractLanguage: string, transaction: string, args: string, gatewayName: string, contractName?: string, transientData?: string, evaluate?: boolean): Promise<void> {

        let gatewayEntry: FabricGatewayRegistryEntry;

        try {
            gatewayEntry = FabricGatewayRegistry.instance().get(gatewayName);
        } catch (error) {
            gatewayEntry = new FabricGatewayRegistryEntry();
            gatewayEntry.name = gatewayName;
            gatewayEntry.managedRuntime = true;
            gatewayEntry.associatedWallet = FabricWalletUtil.LOCAL_WALLET;
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

        if (evaluate) {
            await vscode.commands.executeCommand(ExtensionCommands.EVALUATE_TRANSACTION);
        } else {
            await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);
        }
    }
}
