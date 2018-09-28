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
        let mySandBox;

        const rootPath = path.dirname(__dirname);

        beforeEach(async () => {
            mySandBox = sinon.createSandbox();

            // reset the available connections
            await vscode.workspace.getConfiguration().update('fabric.connections', [], vscode.ConfigurationTarget.Global);

            const connectionOne: FabricConnectionRegistryEntry = new FabricConnectionRegistryEntry({
                name: 'myConnectionA',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                managedRuntime: false,
                identities: [{
                    certificatePath: path.join(rootPath, '../../test/data/connectionOne/credentials/certificate'),
                    privateKeyPath: path.join(rootPath, '../../test/data/connectionOne/credentials/privateKey')
                }]
            });

            const connectionTwo: FabricConnectionRegistryEntry = new FabricConnectionRegistryEntry({
                name: 'myConnectionB',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
                managedRuntime: false,
                identities: [{
                    certificatePath: path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'),
                    privateKeyPath: path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey')
                }]
            });

            await FabricConnectionRegistry.instance().clear();
            await FabricConnectionRegistry.instance().add(connectionOne);
            await FabricConnectionRegistry.instance().add(connectionTwo);
        });

        afterEach(() => {
            mySandBox.restore();
        });

        it('should test a connection identity can be added via the command', async () => {
            mySandBox.stub(vscode.window, 'showQuickPick').resolves({
                label: 'myConnectionB',
                data: FabricConnectionRegistry.instance().get('myConnectionB')
            });
            const showInputBoxStub = mySandBox.stub(vscode.window, 'showInputBox');

            showInputBoxStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'));
            showInputBoxStub.onSecondCall().resolves(path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey'));

            await vscode.commands.executeCommand('blockchainExplorer.addConnectionIdentityEntry');

            const connections: any[] = vscode.workspace.getConfiguration().get('fabric.connections');

            connections.length.should.equal(2);
            connections[1].should.deep.equal({
                name: 'myConnectionB',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
                managedRuntime: false,
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
            mySandBox.stub(vscode.window, 'showQuickPick').resolves();

            await vscode.commands.executeCommand('blockchainExplorer.addConnectionIdentityEntry');

            const connections: any[] = vscode.workspace.getConfiguration().get('fabric.connections');

            connections.length.should.equal(2);
            connections[1].should.deep.equal({
                name: 'myConnectionB',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
                managedRuntime: false,
                identities: [{
                    certificatePath: path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'),
                    privateKeyPath: path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey')
                }]
            });
        });

        it('should test a config can be cancelled on certificate path', async () => {
            mySandBox.stub(vscode.window, 'showQuickPick').resolves({
                label: 'myConnectionB',
                data: FabricConnectionRegistry.instance().get('myConnectionB')
            });
            const showInputBoxStub = mySandBox.stub(vscode.window, 'showInputBox');

            showInputBoxStub.onFirstCall().resolves();

            await vscode.commands.executeCommand('blockchainExplorer.addConnectionIdentityEntry');

            const connections: any[] = vscode.workspace.getConfiguration().get('fabric.connections');

            connections.length.should.equal(2);
            connections[1].should.deep.equal({
                name: 'myConnectionB',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
                managedRuntime: false,
                identities: [{
                    certificatePath: path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'),
                    privateKeyPath: path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey')
                }]
            });
        });

        it('should test a config can be cancelled when adding private key', async () => {
            mySandBox.stub(vscode.window, 'showQuickPick').resolves({
                label: 'myConnectionB',
                data: FabricConnectionRegistry.instance().get('myConnectionB')
            });
            const showInputBoxStub = mySandBox.stub(vscode.window, 'showInputBox');

            showInputBoxStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'));
            showInputBoxStub.onSecondCall().resolves();

            await vscode.commands.executeCommand('blockchainExplorer.addConnectionIdentityEntry');

            const connections: any[] = vscode.workspace.getConfiguration().get('fabric.connections');

            connections.length.should.equal(2);
            connections[1].should.deep.equal({
                name: 'myConnectionB',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
                managedRuntime: false,
                identities: [{
                    certificatePath: path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'),
                    privateKeyPath: path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey')
                }]
            });
        });

        it('should be able to add a identity from the tree', async () => {
            const showInputBoxStub = mySandBox.stub(vscode.window, 'showInputBox');

            showInputBoxStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'));
            showInputBoxStub.onSecondCall().resolves(path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey'));

            const blockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();

            const allChildren: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren();

            const connectionToAddTo = allChildren[1];

            await vscode.commands.executeCommand('blockchainExplorer.addConnectionIdentityEntry', connectionToAddTo);

            const connections: any[] = vscode.workspace.getConfiguration().get('fabric.connections');

            connections.length.should.equal(2);
            connections[1].should.deep.equal({
                name: 'myConnectionB',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
                managedRuntime: false,
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
    });
});
