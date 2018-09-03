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

chai.should();
chai.use(sinonChai);

describe('AddConnectionIdentityCommand', () => {

    before(async () => {
        await TestUtil.setupTests();
    });

    describe('addConnectionIdentity', () => {
        let mySandBox;

        beforeEach(async () => {
            mySandBox = sinon.createSandbox();
        });

        afterEach(() => {
            mySandBox.restore();
        });

        it('should test a connection identity can be added via the command', async () => {
            // reset the available connections
            await vscode.workspace.getConfiguration().update('fabric.connections', [], vscode.ConfigurationTarget.Global);

            let connections: Array<any> = [];

            const rootPath = path.dirname(__dirname);

            connections.push({
                name: 'myConnectionA',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                identities: [{
                    certificatePath: path.join(rootPath, '../../test/data/connectionOne/credentials/certificate'),
                    privateKeyPath: path.join(rootPath, '../../test/data/connectionOne/credentials/privateKey')
                }]
            });

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
            const showInputBoxStub = mySandBox.stub(vscode.window, 'showInputBox');

            showInputBoxStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'));
            showInputBoxStub.onSecondCall().resolves(path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey'));

            await vscode.commands.executeCommand('blockchainExplorer.addConnectionIdentityEntry');

            connections = vscode.workspace.getConfiguration().get('fabric.connections');

            connections.length.should.equal(2);
            connections[1].should.deep.equal({
                name: 'myConnectionB',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
                identities: [{
                    certificatePath: path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'),
                    privateKeyPath: path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey')
                },
                    {
                        certificatePath: path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'),
                        privateKeyPath: path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey')
                    }]
            });
        });

        it('should test a config can be cancelled before choosing a connection', async () => {
            // reset the available connections
            await vscode.workspace.getConfiguration().update('fabric.connections', [], vscode.ConfigurationTarget.Global);

            let connections: Array<any> = [];

            const rootPath = path.dirname(__dirname);

            connections.push({
                name: 'myConnectionA',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                identities: [{
                    certificatePath: path.join(rootPath, '../../test/data/connectionOne/credentials/certificate'),
                    privateKeyPath: path.join(rootPath, '../../test/data/connectionOne/credentials/privateKey')
                }]
            });

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

            await vscode.commands.executeCommand('blockchainExplorer.addConnectionIdentityEntry');

            connections = vscode.workspace.getConfiguration().get('fabric.connections');

            connections.length.should.equal(2);
            connections[1].should.deep.equal({
                name: 'myConnectionB',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
                identities: [{
                    certificatePath: path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'),
                    privateKeyPath: path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey')
                }]
            });
        });

        it('should test a config can be cancelled on certificate path', async () => {
            // reset the available connections
            await vscode.workspace.getConfiguration().update('fabric.connections', [], vscode.ConfigurationTarget.Global);

            let connections: Array<any> = [];

            const rootPath = path.dirname(__dirname);

            connections.push({
                name: 'myConnectionA',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                identities: [{
                    certificatePath: path.join(rootPath, '../../test/data/connectionOne/credentials/certificate'),
                    privateKeyPath: path.join(rootPath, '../../test/data/connectionOne/credentials/privateKey')
                }]
            });

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
            const showInputBoxStub = mySandBox.stub(vscode.window, 'showInputBox');

            showInputBoxStub.onFirstCall().resolves();

            await vscode.commands.executeCommand('blockchainExplorer.addConnectionIdentityEntry');

            connections = vscode.workspace.getConfiguration().get('fabric.connections');

            connections.length.should.equal(2);
            connections[1].should.deep.equal({
                name: 'myConnectionB',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
                identities: [{
                    certificatePath: path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'),
                    privateKeyPath: path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey')
                }]
            });
        });

        it('should test a config can be cancelled when adding private key', async () => {
            // reset the available connections
            await vscode.workspace.getConfiguration().update('fabric.connections', [], vscode.ConfigurationTarget.Global);

            let connections: Array<any> = [];

            const rootPath = path.dirname(__dirname);

            connections.push({
                name: 'myConnectionA',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                identities: [{
                    certificatePath: path.join(rootPath, '../../test/data/connectionOne/credentials/certificate'),
                    privateKeyPath: path.join(rootPath, '../../test/data/connectionOne/credentials/privateKey')
                }]
            });

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
            const showInputBoxStub = mySandBox.stub(vscode.window, 'showInputBox');

            showInputBoxStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'));
            showInputBoxStub.onSecondCall().resolves();

            await vscode.commands.executeCommand('blockchainExplorer.addConnectionIdentityEntry');

            connections = vscode.workspace.getConfiguration().get('fabric.connections');

            connections.length.should.equal(2);
            connections[1].should.deep.equal({
                name: 'myConnectionB',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
                identities: [{
                    certificatePath: path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'),
                    privateKeyPath: path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey')
                }]
            });
        });

        it('should be able to add a identity from the tree', async () => {
            // reset the available connections
            await vscode.workspace.getConfiguration().update('fabric.connections', [], vscode.ConfigurationTarget.Global);

            let connections: Array<any> = [];

            const rootPath = path.dirname(__dirname);

            connections.push({
                name: 'myConnectionA',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                identities: [{
                    certificatePath: path.join(rootPath, '../../test/data/connectionOne/credentials/certificate'),
                    privateKeyPath: path.join(rootPath, '../../test/data/connectionOne/credentials/privateKey')
                }]
            });

            connections.push({
                name: 'myConnectionB',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
                identities: [{
                    certificatePath: path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'),
                    privateKeyPath: path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey')
                }]
            });

            await vscode.workspace.getConfiguration().update('fabric.connections', connections, vscode.ConfigurationTarget.Global);

            const showInputBoxStub = mySandBox.stub(vscode.window, 'showInputBox');

            showInputBoxStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'));
            showInputBoxStub.onSecondCall().resolves(path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey'));

            const blockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();

            const allChildren: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren();

            const connectionToAddTo = allChildren[1];

            await vscode.commands.executeCommand('blockchainExplorer.addConnectionIdentityEntry', connectionToAddTo);

            connections = vscode.workspace.getConfiguration().get('fabric.connections');

            connections.length.should.equal(2);
            connections[1].should.deep.equal({
                name: 'myConnectionB',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
                identities: [{
                    certificatePath: path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'),
                    privateKeyPath: path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey')
                },
                    {
                        certificatePath: path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'),
                        privateKeyPath: path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey')
                    }]
            });
        });

        it('should show an error if can\'t add the identity', async () => {
            // reset the available connections
            await vscode.workspace.getConfiguration().update('fabric.connections', [], vscode.ConfigurationTarget.Global);

            let connections: Array<any> = [];

            const rootPath = path.dirname(__dirname);

            connections.push({
                name: 'myConnectionA',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                identities: [{
                    certificatePath: path.join(rootPath, '../../test/data/connectionOne/credentials/certificate'),
                    privateKeyPath: path.join(rootPath, '../../test/data/connectionOne/credentials/privateKey')
                }]
            });

            connections.push({
                name: 'myConnectionB',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
                identities: [{
                    certificatePath: path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'),
                    privateKeyPath: path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey')
                }]
            });

            await vscode.workspace.getConfiguration().update('fabric.connections', connections, vscode.ConfigurationTarget.Global);

            mySandBox.stub(vscode.window, 'showQuickPick').resolves('doesn\t exist');
            const showInputBoxStub = mySandBox.stub(vscode.window, 'showInputBox');

            showInputBoxStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'));
            showInputBoxStub.onSecondCall().resolves(path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey'));

            const errorSpy = mySandBox.spy(vscode.window, 'showErrorMessage');

            await vscode.commands.executeCommand('blockchainExplorer.addConnectionIdentityEntry');

            errorSpy.should.have.been.calledWith('Could not add the identity');

            connections = vscode.workspace.getConfiguration().get('fabric.connections');

            connections.length.should.equal(2);
            connections[1].should.deep.equal({
                name: 'myConnectionB',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
                identities: [{
                    certificatePath: path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'),
                    privateKeyPath: path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey')
                }]
            });
        });
    });
});
