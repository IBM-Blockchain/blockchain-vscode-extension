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

chai.should();
chai.use(sinonChai);

describe('DeleteConnectionCommand', () => {

    before(async () => {
        await TestUtil.setupTests();
    });

    describe('deleteConnection', () => {

        let mySandBox;

        beforeEach(async () => {
            mySandBox = sinon.createSandbox();
        });

        afterEach(() => {
            mySandBox.restore();
        });

        it('should test a connection can be deleted from the command', async () => {
            // reset the available connections
            await vscode.workspace.getConfiguration().update('fabric.connections', [], vscode.ConfigurationTarget.Global);

            let connections: Array<any> = [];

            const rootPath = path.dirname(__dirname);

            const myConnectionA = {
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

            mySandBox.stub(vscode.window, 'showQuickPick').resolves('myConnectionB');

            await vscode.commands.executeCommand('blockchainExplorer.deleteConnectionEntry');

            connections = vscode.workspace.getConfiguration().get('fabric.connections');

            connections.length.should.equal(1);
            connections[0].should.deep.equal(myConnectionA);
        });

        it('should test a connection can be deleted from tree', async () => {
            // reset the available connections
            await vscode.workspace.getConfiguration().update('fabric.connections', [], vscode.ConfigurationTarget.Global);

            let connections: Array<any> = [];

            const rootPath = path.dirname(__dirname);

            const myConnectionA = {
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

            const blockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();

            const allChildren: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren();

            const connectionToDelete = allChildren[1];
            await vscode.commands.executeCommand('blockchainExplorer.deleteConnectionEntry', connectionToDelete);

            connections = vscode.workspace.getConfiguration().get('fabric.connections');

            connections.length.should.equal(1);
            connections[0].should.deep.equal(myConnectionA);
        });

        it('should test delete connection can be cancelled', async () => {
            // reset the available connections
            await vscode.workspace.getConfiguration().update('fabric.connections', [], vscode.ConfigurationTarget.Global);

            let connections: Array<any> = [];

            const rootPath = path.dirname(__dirname);

            const myConnectionA = {
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

            await vscode.commands.executeCommand('blockchainExplorer.deleteConnectionEntry');

            connections = vscode.workspace.getConfiguration().get('fabric.connections');

            connections.length.should.equal(2);
        });
    });
});
