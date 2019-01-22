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

        beforeEach(async () => {
            mySandBox = sinon.createSandbox();
            warningStub = mySandBox.stub(UserInputUtil, 'showConfirmationWarningMessage').resolves(true);
        });

        afterEach(() => {
            mySandBox.restore();
        });

        it('should test a connection can be deleted from the command', async () => {
            // reset the available connections
            await vscode.workspace.getConfiguration().update('fabric.connections', [], vscode.ConfigurationTarget.Global);

            let connections: Array<any> = [];

            const rootPath: string = path.dirname(__dirname);

            const myConnectionA: any = {
                name: 'myConnectionA',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                identities: [{
                    certificatePath: path.join(rootPath, '../../test/data/connectionOne/credentials/certificate'),
                    privateKeyPath: path.join(rootPath, '../../test/data/connectionOne/credentials/privateKey')
                }]
            };

            connections.push(myConnectionA);

            connections.push({
                name: 'myConnectionB',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
                identities: [{
                    certificatePath: path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'),
                    privateKeyPath: path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey')
                }]
            });

            await vscode.workspace.getConfiguration().update('fabric.connections', connections, vscode.ConfigurationTarget.Global);

            mySandBox.stub(vscode.window, 'showQuickPick').resolves({
                label: 'myConnectionB',
                data: FabricConnectionRegistry.instance().get('myConnectionB')
            });

            await vscode.commands.executeCommand('blockchainConnectionsExplorer.deleteConnectionEntry');

            connections = vscode.workspace.getConfiguration().get('fabric.connections');

            connections.length.should.equal(1);
            connections[0].should.deep.equal(myConnectionA);
        });

        it('should test a connection can be deleted from tree', async () => {
            // reset the available connections
            await vscode.workspace.getConfiguration().update('fabric.connections', [], vscode.ConfigurationTarget.Global);

            let connections: Array<any> = [];

            const rootPath: string = path.dirname(__dirname);

            const myConnectionA: any = {
                name: 'myConnectionA',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                identities: [{
                    certificatePath: path.join(rootPath, '../../test/data/connectionOne/credentials/certificate'),
                    privateKeyPath: path.join(rootPath, '../../test/data/connectionOne/credentials/privateKey')
                }]
            };

            connections.push(myConnectionA);

            const myConnectionB: any = {
                name: 'myConnectionB',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
                identities: [{
                    certificatePath: path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'),
                    privateKeyPath: path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey')
                }]
            };

            connections.push(myConnectionB);

            await vscode.workspace.getConfiguration().update('fabric.connections', connections, vscode.ConfigurationTarget.Global);

            const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();

            const allChildren: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren();

            const connectionToDelete: BlockchainTreeItem = allChildren[1];
            await vscode.commands.executeCommand('blockchainConnectionsExplorer.deleteConnectionEntry', connectionToDelete);

            connections = vscode.workspace.getConfiguration().get('fabric.connections');

            connections.length.should.equal(1);
            connections[0].should.deep.equal(myConnectionB);
        });

        it('should test delete connection can be cancelled', async () => {
            // reset the available connections
            await vscode.workspace.getConfiguration().update('fabric.connections', [], vscode.ConfigurationTarget.Global);

            let connections: Array<any> = [];

            const rootPath: string = path.dirname(__dirname);

            const myConnectionA: any = {
                name: 'myConnectionA',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                identities: [{
                    certificatePath: path.join(rootPath, '../../test/data/connectionOne/credentials/certificate'),
                    privateKeyPath: path.join(rootPath, '../../test/data/connectionOne/credentials/privateKey')
                }]
            };

            connections.push(myConnectionA);

            connections.push({
                name: 'myConnectionB',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
                identities: [{
                    certificatePath: path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'),
                    privateKeyPath: path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey')
                }]
            });

            await vscode.workspace.getConfiguration().update('fabric.connections', connections, vscode.ConfigurationTarget.Global);

            mySandBox.stub(vscode.window, 'showQuickPick').resolves();

            await vscode.commands.executeCommand('blockchainConnectionsExplorer.deleteConnectionEntry');

            connections = vscode.workspace.getConfiguration().get('fabric.connections');

            connections.length.should.equal(2);
        });

        it('should handle no from confirmation message', async () => {
            // reset the available connections
            await vscode.workspace.getConfiguration().update('fabric.connections', [], vscode.ConfigurationTarget.Global);

            let connections: Array<any> = [];

            const rootPath: string = path.dirname(__dirname);

            const myConnectionA: any = {
                name: 'myConnectionA',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                identities: [{
                    certificatePath: path.join(rootPath, '../../test/data/connectionOne/credentials/certificate'),
                    privateKeyPath: path.join(rootPath, '../../test/data/connectionOne/credentials/privateKey')
                }]
            };

            connections.push(myConnectionA);

            const myConnectionB: any = {
                name: 'myConnectionB',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
                identities: [{
                    certificatePath: path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'),
                    privateKeyPath: path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey')
                }]
            };

            connections.push(myConnectionB);

            await vscode.workspace.getConfiguration().update('fabric.connections', connections, vscode.ConfigurationTarget.Global);

            mySandBox.stub(vscode.window, 'showQuickPick').resolves({
                label: 'myConnectionB',
                data: FabricConnectionRegistry.instance().get('myConnectionB')
            });

            warningStub.resolves(false);

            await vscode.commands.executeCommand('blockchainConnectionsExplorer.deleteConnectionEntry');

            connections = vscode.workspace.getConfiguration().get('fabric.connections');

            connections.length.should.equal(2);
            connections[0].should.deep.equal(myConnectionA);
            connections[1].should.deep.equal(myConnectionB);
        });
    });
});
