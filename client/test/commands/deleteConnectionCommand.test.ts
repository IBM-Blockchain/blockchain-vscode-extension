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
import * as fs from 'fs-extra';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';

import * as myExtension from '../../src/extension';
import { BlockchainTreeItem } from '../../src/explorer/model/BlockchainTreeItem';
import { TestUtil } from '../TestUtil';
import { FabricConnectionRegistry } from '../../src/fabric/FabricConnectionRegistry';
import { BlockchainNetworkExplorerProvider } from '../../src/explorer/BlockchainNetworkExplorer';
import { UserInputUtil } from '../../src/commands/UserInputUtil';

chai.should();
chai.use(sinonChai);
// tslint:disable no-unused-expression

describe('DeleteConnectionCommand', () => {

    before(async () => {
        await TestUtil.setupTests();
        await TestUtil.storeConnectionsConfig();
    });

    after(async () => {
        await TestUtil.restoreConnectionsConfig();
    });

    describe('deleteConnection', () => {

        let mySandBox: sinon.SinonSandbox;
        let warningStub: sinon.SinonStub;
        let quickPickStub: sinon.SinonStub;
        let connections: Array<any>;
        let myConnectionA: any;
        let myConnectionB: any;
        const rootPath: string = path.dirname(__dirname);

        beforeEach(async () => {
            mySandBox = sinon.createSandbox();
            warningStub = mySandBox.stub(UserInputUtil, 'showConfirmationWarningMessage').resolves(true);

            // reset the available connections
            await vscode.workspace.getConfiguration().update('fabric.connections', [], vscode.ConfigurationTarget.Global);

            connections = [];

            myConnectionA = {
                name: 'myConnectionA',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                walletPath: path.join(rootPath, '../../test/data/walletDir/wallet')
            };
            connections.push(myConnectionA);

            myConnectionB = {
                name: 'myConnectionB',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
                walletPath: path.join(rootPath, '../../test/data/walletDir/wallet')
            };
            connections.push(myConnectionB);

            await vscode.workspace.getConfiguration().update('fabric.connections', connections, vscode.ConfigurationTarget.Global);

            quickPickStub = mySandBox.stub(vscode.window, 'showQuickPick').resolves({
                label: 'myConnectionB',
                data: FabricConnectionRegistry.instance().get('myConnectionB')
            });
        });

        afterEach(() => {
            mySandBox.restore();
        });

        it('should test a connection can be deleted from the command', async () => {

            await vscode.commands.executeCommand('blockchainConnectionsExplorer.deleteConnectionEntry');

            connections = vscode.workspace.getConfiguration().get('fabric.connections');

            connections.length.should.equal(1);
            connections[0].should.deep.equal(myConnectionA);
        });

        it('should test a connection can be deleted from tree', async () => {
            const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();

            const allChildren: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren();

            const connectionToDelete: BlockchainTreeItem = allChildren[1];
            await vscode.commands.executeCommand('blockchainConnectionsExplorer.deleteConnectionEntry', connectionToDelete);

            connections = vscode.workspace.getConfiguration().get('fabric.connections');

            connections.length.should.equal(1);
            connections[0].should.deep.equal(myConnectionB);
        });

        it('should test delete connection can be cancelled', async () => {
            quickPickStub.resolves();

            await vscode.commands.executeCommand('blockchainConnectionsExplorer.deleteConnectionEntry');

            connections = vscode.workspace.getConfiguration().get('fabric.connections');

            connections.length.should.equal(2);
        });

        it('should handle no from confirmation message', async () => {
            warningStub.resolves(false);

            await vscode.commands.executeCommand('blockchainExplorer.deleteConnectionEntry');

            connections = vscode.workspace.getConfiguration().get('fabric.connections');

            connections.length.should.equal(2);
            connections[0].should.deep.equal(myConnectionA);
            connections[1].should.deep.equal(myConnectionB);
        });

        it('should delete the wallet and local connection directory if the extension owns the wallet directory', async () => {

            const myConnectionC: any = {
                name: 'myConnectionC',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
                walletPath: 'fabric-vscode/myConnectionC/wallet'
            };
            connections.push(myConnectionC);
            await vscode.workspace.getConfiguration().update('fabric.connections', connections, vscode.ConfigurationTarget.Global);

            quickPickStub.resolves({
                label: 'myConnectionC',
                data: FabricConnectionRegistry.instance().get('myConnectionC')
            });

            const getDirPathStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'getDirPath').resolves('fabric-vscode');
            const fsRemoveStub: sinon.SinonStub = mySandBox.stub(fs, 'remove').resolves();

            await vscode.commands.executeCommand('blockchainConnectionsExplorer.deleteConnectionEntry');

            connections = vscode.workspace.getConfiguration().get('fabric.connections');
            connections.length.should.equal(2);
            connections[0].should.deep.equal(myConnectionA);
            connections[1].should.deep.equal(myConnectionB);

            getDirPathStub.should.have.been.calledOnce;
            fsRemoveStub.should.have.been.calledOnceWith(path.join('fabric-vscode', 'myConnectionC'));

        });
    });
});
