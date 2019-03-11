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
import * as path from 'path';
import * as myExtension from '../../src/extension';

import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { BlockchainTreeItem } from '../../src/explorer/model/BlockchainTreeItem';
import { TestUtil } from '../TestUtil';
import { FabricGatewayRegistryEntry } from '../../src/fabric/FabricGatewayRegistryEntry';
import { FabricGatewayRegistry } from '../../src/fabric/FabricGatewayRegistry';
import { FabricGatewayHelper } from '../../src/fabric/FabricGatewayHelper';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { BlockchainGatewayExplorerProvider } from '../../src/explorer/gatewayExplorer';
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../../src/logging/OutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';
import { GatewayTreeItem } from '../../src/explorer/model/GatewayTreeItem';
import { FabricWalletRegistry } from '../../src/fabric/FabricWalletRegistry';
import { FabricWalletRegistryEntry } from '../../src/fabric/FabricWalletRegistryEntry';

chai.should();
chai.use(sinonChai);

describe('AddGatewayIdentityCommand', () => {

    before(async () => {
        await TestUtil.setupTests();
        await TestUtil.storeGatewaysConfig();
        await TestUtil.storeWalletsConfig();
    });

    after(async () => {
        await TestUtil.restoreGatewaysConfig();
        await TestUtil.restoreWalletsConfig();
    });

    describe('addGatewayIdentity', () => {
        let mySandBox: sinon.SinonSandbox;
        let browseEditStub: sinon.SinonStub;
        let HelperStub: sinon.SinonStub;
        let inputBoxStub: sinon.SinonStub;
        let identityName: string;
        const rootPath: string = path.dirname(__dirname);
        const walletPath: string = path.join(rootPath, '../../test/data/walletDir/wallet');

        beforeEach(async () => {
            mySandBox = sinon.createSandbox();

            // reset the stored gateways and wallets
            await vscode.workspace.getConfiguration().update('fabric.gateways', [], vscode.ConfigurationTarget.Global);
            await vscode.workspace.getConfiguration().update('fabric.wallets', [], vscode.ConfigurationTarget.Global);

            const connectionOne: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry({
                name: 'myGatewayA',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                managedRuntime: false,
                walletPath: walletPath
            });

            const connectionTwo: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry({
                name: 'myGatewayB',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
                managedRuntime: false,
                walletPath: walletPath
            });

            await FabricGatewayRegistry.instance().clear();
            await FabricGatewayRegistry.instance().add(connectionOne);
            await FabricGatewayRegistry.instance().add(connectionTwo);

            const connectionOneWallet: FabricWalletRegistryEntry = new FabricWalletRegistryEntry({
                name: connectionOne.name,
                walletPath: walletPath
            });
            const connectionTwoWallet: FabricWalletRegistryEntry = new FabricWalletRegistryEntry({
                name: connectionTwo.name,
                walletPath: walletPath
            });

            await FabricWalletRegistry.instance().clear();
            await FabricWalletRegistry.instance().add(connectionOneWallet);
            await FabricWalletRegistry.instance().add(connectionTwoWallet);

            browseEditStub = mySandBox.stub(UserInputUtil, 'browseEdit');
            HelperStub = mySandBox.stub(FabricGatewayHelper, 'isCompleted').returns(true);
            inputBoxStub = mySandBox.stub(UserInputUtil, 'showInputBox');
        });

        afterEach(async () => {
            mySandBox.restore();
            await TestUtil.deleteTestFiles(path.join(walletPath, identityName));
        });

        it('should test a connection identity can be added via the command', async () => {
            identityName = 'greenConga';
            mySandBox.stub(vscode.window, 'showQuickPick').resolves({
                label: 'myGatewayB',
                data: FabricGatewayRegistry.instance().get('myGatewayB')
            });

            inputBoxStub.onFirstCall().resolves(identityName);
            inputBoxStub.onSecondCall().resolves('myMSPID');
            browseEditStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'));
            browseEditStub.onSecondCall().resolves(path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey'));

            await vscode.commands.executeCommand(ExtensionCommands.ADD_GATEWAY_IDENTITY);

            const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = myExtension.getBlockchainGatewayExplorerProvider();
            const allChildren: BlockchainTreeItem[] = await blockchainGatewayExplorerProvider.getChildren();
            const gatewayTreeItem: GatewayTreeItem = allChildren[2] as GatewayTreeItem;
            gatewayTreeItem.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Expanded);
            const identities: BlockchainTreeItem[] = await blockchainGatewayExplorerProvider.getChildren(gatewayTreeItem);
            identities.length.should.equal(3);
            identities[2].label.should.equal(identityName);
            identities[2].command.command.should.equal(ExtensionCommands.CONNECT);
        });

        it('should test a config can be cancelled before choosing a connection', async () => {
            mySandBox.stub(vscode.window, 'showQuickPick').resolves();

            await vscode.commands.executeCommand(ExtensionCommands.ADD_GATEWAY_IDENTITY);

            const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = myExtension.getBlockchainGatewayExplorerProvider();
            const allChildren: BlockchainTreeItem[] = await blockchainGatewayExplorerProvider.getChildren();
            const gatewayTreeItem: GatewayTreeItem = allChildren[2] as GatewayTreeItem;
            gatewayTreeItem.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Expanded);
            const identities: BlockchainTreeItem[] = await blockchainGatewayExplorerProvider.getChildren(gatewayTreeItem);
            identities.length.should.equal(2);
        });

        it('should test a config can be cancelled on giving identity name', async () => {
            mySandBox.stub(vscode.window, 'showQuickPick').resolves({
                label: 'myGatewayB',
                data: FabricGatewayRegistry.instance().get('myGatewayB')
            });
            inputBoxStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.ADD_GATEWAY_IDENTITY);

            const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = myExtension.getBlockchainGatewayExplorerProvider();
            const allChildren: BlockchainTreeItem[] = await blockchainGatewayExplorerProvider.getChildren();
            const gatewayTreeItem: GatewayTreeItem = allChildren[2] as GatewayTreeItem;
            gatewayTreeItem.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Expanded);
            const identities: BlockchainTreeItem[] = await blockchainGatewayExplorerProvider.getChildren(gatewayTreeItem);
            identities.length.should.equal(2);
        });

        it('should test a config can be cancelled on certificate path', async () => {
            mySandBox.stub(vscode.window, 'showQuickPick').resolves({
                label: 'myGatewayB',
                data: FabricGatewayRegistry.instance().get('myGatewayB')
            });

            inputBoxStub.onFirstCall().resolves('blueConga');
            inputBoxStub.onSecondCall().resolves('myMSPID');
            browseEditStub.onFirstCall().resolves();

            await vscode.commands.executeCommand(ExtensionCommands.ADD_GATEWAY_IDENTITY);

            const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = myExtension.getBlockchainGatewayExplorerProvider();
            const allChildren: BlockchainTreeItem[] = await blockchainGatewayExplorerProvider.getChildren();
            const gatewayTreeItem: GatewayTreeItem = allChildren[2] as GatewayTreeItem;
            gatewayTreeItem.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Expanded);
            const identities: BlockchainTreeItem[] = await blockchainGatewayExplorerProvider.getChildren(gatewayTreeItem);
            identities.length.should.equal(2);
        });

        it('should test a config can be cancelled when adding private key', async () => {
            mySandBox.stub(vscode.window, 'showQuickPick').resolves({
                label: 'myGatewayB',
                data: FabricGatewayRegistry.instance().get('myGatewayB')
            });

            inputBoxStub.onFirstCall().resolves('violetConga');
            inputBoxStub.onSecondCall().resolves('myMSPID');
            browseEditStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'));
            browseEditStub.onSecondCall().resolves();

            await vscode.commands.executeCommand(ExtensionCommands.ADD_GATEWAY_IDENTITY);

            const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = myExtension.getBlockchainGatewayExplorerProvider();
            const allChildren: BlockchainTreeItem[] = await blockchainGatewayExplorerProvider.getChildren();
            const gatewayTreeItem: GatewayTreeItem = allChildren[2] as GatewayTreeItem;
            gatewayTreeItem.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Expanded);
            const identities: BlockchainTreeItem[] = await blockchainGatewayExplorerProvider.getChildren(gatewayTreeItem);
            identities.length.should.equal(2);
        });

        it('should be able to add a identity from the tree', async () => {
            identityName = 'blackConga';
            inputBoxStub.onFirstCall().resolves(identityName);
            inputBoxStub.onSecondCall().resolves('myMSPID');

            browseEditStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'));
            browseEditStub.onSecondCall().resolves(path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey'));

            const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = myExtension.getBlockchainGatewayExplorerProvider();

            const allChildren: Array<BlockchainTreeItem> = await blockchainGatewayExplorerProvider.getChildren();
            const connectionToAddTo: GatewayTreeItem = allChildren[1] as GatewayTreeItem;
            await vscode.commands.executeCommand(ExtensionCommands.ADD_GATEWAY_IDENTITY, connectionToAddTo);

            connectionToAddTo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Expanded);
            const identities: BlockchainTreeItem[] = await blockchainGatewayExplorerProvider.getChildren(connectionToAddTo);
            identities.length.should.equal(3);
            identities[2].label.should.equal(identityName);
            identities[2].command.command.should.equal(ExtensionCommands.CONNECT);
        });

        it('should show an error if connection is not complete', async () => {
            HelperStub.returns(false);
            const logSpy: sinon.SinonSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
            mySandBox.stub(UserInputUtil, 'showGatewayQuickPickBox').resolves({
                label: 'myGateway',
                data: {
                    connectionProfilePath: FabricGatewayHelper.CONNECTION_PROFILE_PATH_DEFAULT,
                    name: 'myConnection',
                    walletPath: FabricGatewayHelper.WALLET_PATH_DEFAULT
                }
            });

            await vscode.commands.executeCommand(ExtensionCommands.ADD_GATEWAY_IDENTITY);

            logSpy.should.have.been.calledWith(LogType.ERROR, 'Blockchain gateway must be completed first!');
        });

        it('should test a can be cancelled when enter mspid', async () => {
            identityName = 'greenConga';
            mySandBox.stub(vscode.window, 'showQuickPick').resolves({
                label: 'myGatewayB',
                data: FabricGatewayRegistry.instance().get('myGatewayB')
            });

            inputBoxStub.onFirstCall().resolves(identityName);
            inputBoxStub.onSecondCall().resolves();

            browseEditStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'));
            browseEditStub.onSecondCall().resolves(path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey'));

            await vscode.commands.executeCommand(ExtensionCommands.ADD_GATEWAY_IDENTITY);

            const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = myExtension.getBlockchainGatewayExplorerProvider();
            const allChildren: BlockchainTreeItem[] = await blockchainGatewayExplorerProvider.getChildren();
            const gatewayTreeItem: GatewayTreeItem = allChildren[2] as GatewayTreeItem;
            gatewayTreeItem.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Expanded);
            const identities: BlockchainTreeItem[] = await blockchainGatewayExplorerProvider.getChildren(gatewayTreeItem);
            identities.length.should.equal(2);
        });
    });
});
