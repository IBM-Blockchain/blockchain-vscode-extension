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
import { FabricConnectionRegistryEntry } from '../../src/fabric/FabricConnectionRegistryEntry';
import { FabricConnectionRegistry } from '../../src/fabric/FabricConnectionRegistry';
import { FabricConnectionHelper } from '../../src/fabric/FabricConnectionHelper';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { BlockchainNetworkExplorerProvider } from '../../src/explorer/BlockchainNetworkExplorer';
import { VSCodeOutputAdapter } from '../../src/logging/VSCodeOutputAdapter';
import { LogType } from '../../src/logging/OutputAdapter';
import { ConnectionTreeItem} from '../../src/explorer/model/ConnectionTreeItem';

chai.should();
chai.use(sinonChai);

describe('AddConnectionIdentityCommand', () => {

    before(async () => {
        await TestUtil.setupTests();
        await TestUtil.storeConnectionsConfig();
    });

    after(async () => {
        await TestUtil.restoreConnectionsConfig();
    });

    describe('addConnectionIdentity', () => {
        let mySandBox: sinon.SinonSandbox;
        let browseEditStub: sinon.SinonStub;
        let HelperStub: sinon.SinonStub;
        let inputBoxStub: sinon.SinonStub;
        let identityName: string;
        const rootPath: string = path.dirname(__dirname);
        const walletPath: string = path.join(rootPath, '../../test/data/walletDir/wallet');

        beforeEach(async () => {
            mySandBox = sinon.createSandbox();

            // reset the available connections
            await vscode.workspace.getConfiguration().update('fabric.connections', [], vscode.ConfigurationTarget.Global);

            const connectionOne: FabricConnectionRegistryEntry = new FabricConnectionRegistryEntry({
                name: 'myConnectionA',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                managedRuntime: false,
                walletPath: walletPath
            });

            const connectionTwo: FabricConnectionRegistryEntry = new FabricConnectionRegistryEntry({
                name: 'myConnectionB',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
                managedRuntime: false,
                walletPath: walletPath
            });

            await FabricConnectionRegistry.instance().clear();
            await FabricConnectionRegistry.instance().add(connectionOne);
            await FabricConnectionRegistry.instance().add(connectionTwo);

            browseEditStub = mySandBox.stub(UserInputUtil, 'browseEdit');
            HelperStub = mySandBox.stub(FabricConnectionHelper, 'isCompleted').returns(true);
            inputBoxStub = mySandBox.stub(UserInputUtil, 'showInputBox');
        });

        afterEach(async () => {
            mySandBox.restore();
            await TestUtil.deleteTestFiles(path.join(walletPath, identityName));
        });

        it('should test a connection identity can be added via the command', async () => {
            identityName = 'greenConga';
            mySandBox.stub(vscode.window, 'showQuickPick').resolves({
                label: 'myConnectionB',
                data: FabricConnectionRegistry.instance().get('myConnectionB')
            });

            inputBoxStub.resolves(identityName);
            browseEditStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'));
            browseEditStub.onSecondCall().resolves(path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey'));

            await vscode.commands.executeCommand('blockchainConnectionsExplorer.addConnectionIdentityEntry');

            const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
            const allChildren: BlockchainTreeItem[] = await blockchainNetworkExplorerProvider.getChildren();
            const connectionTreeItem: ConnectionTreeItem = allChildren[2] as ConnectionTreeItem;
            connectionTreeItem.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Expanded);
            const identities: BlockchainTreeItem[] = await blockchainNetworkExplorerProvider.getChildren(connectionTreeItem);
            identities.length.should.equal(3);
            identities[2].label.should.equal(identityName);
            identities[2].command.command.should.equal('blockchainConnectionsExplorer.connectEntry');
        });

        it('should test a config can be cancelled before choosing a connection', async () => {
            mySandBox.stub(vscode.window, 'showQuickPick').resolves();

            await vscode.commands.executeCommand('blockchainConnectionsExplorer.addConnectionIdentityEntry');

            const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
            const allChildren: BlockchainTreeItem[] = await blockchainNetworkExplorerProvider.getChildren();
            const connectionTreeItem: ConnectionTreeItem = allChildren[2] as ConnectionTreeItem;
            connectionTreeItem.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Expanded);
            const identities: BlockchainTreeItem[] = await blockchainNetworkExplorerProvider.getChildren(connectionTreeItem);
            identities.length.should.equal(2);
        });

        it('should test a config can be cancelled on giving identity name', async () => {
            mySandBox.stub(vscode.window, 'showQuickPick').resolves({
                label: 'myConnectionB',
                data: FabricConnectionRegistry.instance().get('myConnectionB')
            });
            inputBoxStub.resolves();

            await vscode.commands.executeCommand('blockchainConnectionsExplorer.addConnectionIdentityEntry');

            const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
            const allChildren: BlockchainTreeItem[] = await blockchainNetworkExplorerProvider.getChildren();
            const connectionTreeItem: ConnectionTreeItem = allChildren[2] as ConnectionTreeItem;
            connectionTreeItem.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Expanded);
            const identities: BlockchainTreeItem[] = await blockchainNetworkExplorerProvider.getChildren(connectionTreeItem);
            identities.length.should.equal(2);
        });

        it('should test a config can be cancelled on certificate path', async () => {
            mySandBox.stub(vscode.window, 'showQuickPick').resolves({
                label: 'myConnectionB',
                data: FabricConnectionRegistry.instance().get('myConnectionB')
            });

            inputBoxStub.resolves('blueConga');
            browseEditStub.onFirstCall().resolves();

            await vscode.commands.executeCommand('blockchainConnectionsExplorer.addConnectionIdentityEntry');

            const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
            const allChildren: BlockchainTreeItem[] = await blockchainNetworkExplorerProvider.getChildren();
            const connectionTreeItem: ConnectionTreeItem = allChildren[2] as ConnectionTreeItem;
            connectionTreeItem.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Expanded);
            const identities: BlockchainTreeItem[] = await blockchainNetworkExplorerProvider.getChildren(connectionTreeItem);
            identities.length.should.equal(2);
        });

        it('should test a config can be cancelled when adding private key', async () => {
            mySandBox.stub(vscode.window, 'showQuickPick').resolves({
                label: 'myConnectionB',
                data: FabricConnectionRegistry.instance().get('myConnectionB')
            });

            inputBoxStub.resolves('violetConga');
            browseEditStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'));
            browseEditStub.onSecondCall().resolves();

            await vscode.commands.executeCommand('blockchainConnectionsExplorer.addConnectionIdentityEntry');

            const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
            const allChildren: BlockchainTreeItem[] = await blockchainNetworkExplorerProvider.getChildren();
            const connectionTreeItem: ConnectionTreeItem = allChildren[2] as ConnectionTreeItem;
            connectionTreeItem.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Expanded);
            const identities: BlockchainTreeItem[] = await blockchainNetworkExplorerProvider.getChildren(connectionTreeItem);
            identities.length.should.equal(2);
        });

        it('should be able to add a identity from the tree', async () => {
            identityName = 'blackConga';
            inputBoxStub.resolves(identityName);
            browseEditStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'));
            browseEditStub.onSecondCall().resolves(path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey'));

            const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();

            const allChildren: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren();
            const connectionToAddTo: ConnectionTreeItem = allChildren[1] as ConnectionTreeItem;
            await vscode.commands.executeCommand('blockchainConnectionsExplorer.addConnectionIdentityEntry', connectionToAddTo);

            connectionToAddTo.collapsibleState.should.equal(vscode.TreeItemCollapsibleState.Expanded);
            const identities: BlockchainTreeItem[] = await blockchainNetworkExplorerProvider.getChildren(connectionToAddTo);
            identities.length.should.equal(3);
            identities[2].label.should.equal(identityName);
            identities[2].command.command.should.equal('blockchainConnectionsExplorer.connectEntry');
        });

        it('should show an error if connection is not complete', async () => {
            HelperStub.returns(false);
            const logSpy: sinon.SinonSpy = mySandBox.spy(VSCodeOutputAdapter.instance(), 'log');
            mySandBox.stub(UserInputUtil, 'showConnectionQuickPickBox').resolves({
                label: 'myConnection',
                data: {
                    connectionProfilePath: FabricConnectionHelper.CONNECTION_PROFILE_PATH_DEFAULT,
                    name: 'myConnection',
                    walletPath: FabricConnectionHelper.WALLET_PATH_DEFAULT
                }
            });

            await vscode.commands.executeCommand('blockchainConnectionsExplorer.addConnectionIdentityEntry');

            logSpy.should.have.been.calledWith(LogType.ERROR, 'Blockchain connection must be completed first!');
        });
    });
});
