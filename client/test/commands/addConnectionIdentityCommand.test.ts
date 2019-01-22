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

        const rootPath: string = path.dirname(__dirname);

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
            const browseEditStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'browseEdit');
            const HelperStub: sinon.SinonStub = mySandBox.stub(FabricConnectionHelper, 'isCompleted').returns(true);

            browseEditStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'));
            browseEditStub.onSecondCall().resolves(path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey'));

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
            const HelperStub: sinon.SinonStub = mySandBox.stub(FabricConnectionHelper, 'isCompleted').returns(true);
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
            const HelperStub: sinon.SinonStub = mySandBox.stub(FabricConnectionHelper, 'isCompleted').returns(true);
            mySandBox.stub(vscode.window, 'showQuickPick').resolves({
                label: 'myConnectionB',
                data: FabricConnectionRegistry.instance().get('myConnectionB')
            });
            const browseEditStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'browseEdit');

            browseEditStub.onFirstCall().resolves();

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
            const HelperStub: sinon.SinonStub = mySandBox.stub(FabricConnectionHelper, 'isCompleted').returns(true);
            mySandBox.stub(vscode.window, 'showQuickPick').resolves({
                label: 'myConnectionB',
                data: FabricConnectionRegistry.instance().get('myConnectionB')
            });
            const browseEditStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'browseEdit');

            browseEditStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'));
            browseEditStub.onSecondCall().resolves();

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
            const HelperStub: sinon.SinonStub = mySandBox.stub(FabricConnectionHelper, 'isCompleted').returns(true);
            const browseEditStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'browseEdit');

            browseEditStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'));
            browseEditStub.onSecondCall().resolves(path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey'));

            const blockchainNetworkExplorerProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();

            const allChildren: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren();
            const connectionToAddTo: BlockchainTreeItem = allChildren[1];
            await vscode.commands.executeCommand('blockchainExplorer.addConnectionIdentityEntry', connectionToAddTo);

            const connections: any[] = vscode.workspace.getConfiguration().get('fabric.connections');

            connections.length.should.equal(2);
            connections[0].should.deep.equal({
                name: 'myConnectionA',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                managedRuntime: false,
                identities: [{
                    certificatePath: path.join(rootPath, '../../test/data/connectionOne/credentials/certificate'),
                    privateKeyPath: path.join(rootPath, '../../test/data/connectionOne/credentials/privateKey')
                },
                    {
                        certificatePath: path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'),
                        privateKeyPath: path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey')
                    }]
            });
        });

        it('should show an error if connection is not complete', async () => {

            mySandBox.stub(FabricConnectionHelper, 'isCompleted').returns(false);
            const logSpy: sinon.SinonSpy = mySandBox.spy(VSCodeOutputAdapter.instance(), 'log');
            mySandBox.stub(UserInputUtil, 'showConnectionQuickPickBox').resolves({
                label: 'myConnection',
                data: {
                    connectionProfilePath: FabricConnectionHelper.CONNECTION_PROFILE_PATH_DEFAULT,
                    name: 'myConnection',
                    identities: [
                        {
                            certificatePath: FabricConnectionHelper.CERTIFICATE_PATH_DEFAULT,
                            privateKeyPath: FabricConnectionHelper.PRIVATE_KEY_PATH_DEFAULT
                        }
                    ]
                }
            });

            await vscode.commands.executeCommand('blockchainExplorer.addConnectionIdentityEntry');

            logSpy.should.have.been.calledWith(LogType.ERROR, 'Blockchain connection must be completed first!');
        });
    });
});
