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
import * as fabricClient from 'fabric-client';
import { FabricClientConnection } from '../../src/fabric/FabricClientConnection';

import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { BlockchainTreeItem } from '../../src/explorer/model/BlockchainTreeItem';
import { ConnectionTreeItem } from '../../src/explorer/model/ConnectionTreeItem';
import { ConnectionIdentityTreeItem } from '../../src/explorer/model/ConnectionIdentityTreeItem';
import { FabricRuntimeConnection } from '../../src/fabric/FabricRuntimeConnection';
import { FabricRuntime } from '../../src/fabric/FabricRuntime';
import { FabricRuntimeManager } from '../../src/fabric/FabricRuntimeManager';
import { TestUtil } from '../TestUtil';

chai.should();
chai.use(sinonChai);
// tslint:disable-next-line no-var-requires
chai.use(require('chai-as-promised'));

// tslint:disable no-unused-expression
describe('ConnectCommand', () => {

    before(async () => {
        await TestUtil.setupTests();
    });

    describe('connect', () => {

        let mySandBox: sinon.SinonSandbox;
        let fabricClientMock: sinon.SinonStubbedInstance<fabricClient>;

        beforeEach(async () => {
            fabricClientMock = sinon.createStubInstance(fabricClient);
            mySandBox = sinon.createSandbox();
        });

        afterEach(async () => {
            await vscode.commands.executeCommand('blockchainExplorer.disconnectEntry');
            mySandBox.restore();

        });

        it('should test the a fabric can be connected to from the command', async () => {
            const rootPath = path.dirname(__dirname);

            const connections = [{
                name: 'myConnection',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                identities: [{
                    certificatePath: path.join(rootPath, '../../test/data/connectionOne/credentials/certificate'),
                    privateKeyPath: path.join(rootPath, '../../test/data/connectionOne/credentials/privateKey')
                }]
            }];

            // reset the available connections
            await vscode.workspace.getConfiguration().update('fabric.connections', connections, vscode.ConfigurationTarget.Global);

            mySandBox.stub(vscode.window, 'showQuickPick').resolves('myConnection');

            const loadFromConfigStub = mySandBox.stub(fabricClient, 'loadFromConfig').returns(fabricClientMock);

            const connectStub = mySandBox.stub(myExtension.getBlockchainNetworkExplorerProvider(), 'connect');

            await vscode.commands.executeCommand('blockchainExplorer.connectEntry');

            loadFromConfigStub.should.have.been.called;

            connectStub.should.have.been.calledOnceWithExactly(sinon.match.instanceOf(FabricClientConnection));
        });

        it('should test the a fabric can be connected to from the command with multiple identities', async () => {
            const rootPath = path.dirname(__dirname);

            const connections = [{
                name: 'myConnection',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                identities: [{
                    certificatePath: path.join(rootPath, '../../test/data/connectionOne/credentials/certificate'),
                    privateKeyPath: path.join(rootPath, '../../test/data/connectionOne/credentials/privateKey')
                },
                    {
                        certificatePath: path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'),
                        privateKeyPath: path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey')
                    }]
            }];

            // reset the available connections
            await vscode.workspace.getConfiguration().update('fabric.connections', connections, vscode.ConfigurationTarget.Global);

            const quickPickStub = mySandBox.stub(vscode.window, 'showQuickPick');
            quickPickStub.onFirstCall().resolves('myConnection');
            quickPickStub.onSecondCall().resolves('Admin@org1.example.com');

            const loadFromConfigStub = mySandBox.stub(fabricClient, 'loadFromConfig').returns(fabricClientMock);

            const connectStub = mySandBox.stub(myExtension.getBlockchainNetworkExplorerProvider(), 'connect');

            await vscode.commands.executeCommand('blockchainExplorer.connectEntry');

            loadFromConfigStub.should.have.been.called;

            connectStub.should.have.been.calledOnceWithExactly(sinon.match.instanceOf(FabricClientConnection));
        });

        it('should test that can cancel on choosing connection', async () => {
            const rootPath = path.dirname(__dirname);

            const connections = [{
                name: 'myConnection',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                identities: [{
                    certificatePath: path.join(rootPath, '../../test/data/connectionOne/credentials/certificate'),
                    privateKeyPath: path.join(rootPath, '../../test/data/connectionOne/credentials/privateKey')
                }]
            }];

            // reset the available connections
            await vscode.workspace.getConfiguration().update('fabric.connections', connections, vscode.ConfigurationTarget.Global);

            const refreshSpy = mySandBox.spy(vscode.commands, 'executeCommand');

            const quickPickStub = mySandBox.stub(vscode.window, 'showQuickPick');
            quickPickStub.onFirstCall().resolves();

            await vscode.commands.executeCommand('blockchainExplorer.connectEntry');

            refreshSpy.callCount.should.equal(1);
            refreshSpy.getCall(0).should.have.been.calledWith('blockchainExplorer.connectEntry');
        });

        it('should test that can be cancelled on choose identity', async () => {
            const rootPath = path.dirname(__dirname);

            const connections = [{
                name: 'myConnection',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                identities: [{
                    certificatePath: path.join(rootPath, '../../test/data/connectionOne/credentials/certificate'),
                    privateKeyPath: path.join(rootPath, '../../test/data/connectionOne/credentials/privateKey')
                },
                    {
                        certificatePath: path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'),
                        privateKeyPath: path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey')
                    }]
            }];

            // reset the available connections
            await vscode.workspace.getConfiguration().update('fabric.connections', connections, vscode.ConfigurationTarget.Global);

            const quickPickStub = mySandBox.stub(vscode.window, 'showQuickPick');
            quickPickStub.onFirstCall().resolves('myConnection');
            quickPickStub.onSecondCall().resolves();

            await vscode.commands.executeCommand('blockchainExplorer.connectEntry');
        });

        it('should test the a fabric with a single identity can be connected to from the tree', async () => {
            const rootPath = path.dirname(__dirname);

            const connections = [{
                name: 'myConnection',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                identities: [{
                    certificatePath: path.join(rootPath, '../../test/data/connectionOne/credentials/certificate'),
                    privateKeyPath: path.join(rootPath, '../../test/data/connectionOne/credentials/privateKey')
                }]
            }];

            // reset the available connections
            await vscode.workspace.getConfiguration().update('fabric.connections', connections, vscode.ConfigurationTarget.Global);

            const blockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
            const allChildren: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren();

            const myConnectionItem: ConnectionTreeItem = allChildren[0] as ConnectionTreeItem;

            const loadFromConfigStub = mySandBox.stub(fabricClient, 'loadFromConfig').returns(fabricClientMock);

            const connectStub = mySandBox.stub(myExtension.getBlockchainNetworkExplorerProvider(), 'connect');

            await vscode.commands.executeCommand(myConnectionItem.command.command, ...myConnectionItem.command.arguments);

            loadFromConfigStub.should.have.been.called;

            connectStub.should.have.been.calledOnceWithExactly(sinon.match.instanceOf(FabricClientConnection));
        });

        it('should test the a fabric with multiple identities can be connected to from the tree', async () => {
            const rootPath = path.dirname(__dirname);

            const connections = [{
                name: 'myConnection',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                identities: [{
                    certificatePath: path.join(rootPath, '../../test/data/connectionOne/credentials/certificate'),
                    privateKeyPath: path.join(rootPath, '../../test/data/connectionOne/credentials/privateKey')
                }, {
                    certificatePath: path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'),
                    privateKeyPath: path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey')
                }]
            }];

            // reset the available connections
            await vscode.workspace.getConfiguration().update('fabric.connections', connections, vscode.ConfigurationTarget.Global);

            const blockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
            const allChildren: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren();

            const myConnectionItem: ConnectionTreeItem = allChildren[0] as ConnectionTreeItem;
            const allIdentityChildren: ConnectionIdentityTreeItem[] = await blockchainNetworkExplorerProvider.getChildren(myConnectionItem) as ConnectionIdentityTreeItem[];
            const myIdentityItem: ConnectionIdentityTreeItem = allIdentityChildren[1] as ConnectionIdentityTreeItem;

            const loadFromConfigStub = mySandBox.stub(fabricClient, 'loadFromConfig').returns(fabricClientMock);

            const connectStub = mySandBox.stub(myExtension.getBlockchainNetworkExplorerProvider(), 'connect');

            await vscode.commands.executeCommand(myIdentityItem.command.command, ...myIdentityItem.command.arguments);

            loadFromConfigStub.should.have.been.called;

            connectStub.should.have.been.calledOnceWithExactly(sinon.match.instanceOf(FabricClientConnection));
        });

        it('should handle connection not found', async () => {
            const rootPath = path.dirname(__dirname);

            const connections = [{
                name: 'myConnection',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                identities: [{
                    certificatePath: path.join(rootPath, '../../test/data/connectionOne/credentials/certificate'),
                    privateKeyPath: path.join(rootPath, '../../test/data/connectionOne/credentials/privateKey')
                }]
            }];

            // reset the available connections
            await vscode.workspace.getConfiguration().update('fabric.connections', connections, vscode.ConfigurationTarget.Global);

            mySandBox.stub(vscode.window, 'showQuickPick').resolves('no connection');

            const errorMessageSpy = mySandBox.spy(vscode.window, 'showErrorMessage');

            await vscode.commands.executeCommand('blockchainExplorer.connectEntry');

            errorMessageSpy.should.have.been.calledWith('Could not connect as no connection found');
        });

        it('should handle identity not found', async () => {
            const rootPath = path.dirname(__dirname);

            const connections = [{
                name: 'myConnection',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                identities: [{
                    certificatePath: path.join(rootPath, '../../test/data/connectionOne/credentials/certificate'),
                    privateKeyPath: path.join(rootPath, '../../test/data/connectionOne/credentials/privateKey')
                },
                    {
                        certificatePath: path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'),
                        privateKeyPath: path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey')
                    }]
            }];

            // reset the available connections
            await vscode.workspace.getConfiguration().update('fabric.connections', connections, vscode.ConfigurationTarget.Global);

            const quickPickStub = mySandBox.stub(vscode.window, 'showQuickPick');
            quickPickStub.onFirstCall().resolves('myConnection');
            quickPickStub.onSecondCall().resolves('no identity');

            const errorMessageSpy = mySandBox.spy(vscode.window, 'showErrorMessage');

            await vscode.commands.executeCommand('blockchainExplorer.connectEntry');

            errorMessageSpy.should.have.been.calledWith('Could not connect as no identity found');
        });

        it('should handle error from conecting', async () => {
            const rootPath = path.dirname(__dirname);

            const connections = [{
                name: 'myConnection',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                identities: [{
                    certificatePath: path.join(rootPath, '../../test/data/connectionOne/credentials/certificate'),
                    privateKeyPath: path.join(rootPath, '../../test/data/connectionOne/credentials/privateKey')
                }]
            }];

            // reset the available connections
            await vscode.workspace.getConfiguration().update('fabric.connections', connections, vscode.ConfigurationTarget.Global);

            const blockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
            const allChildren: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren();

            const errorMessageSpy = mySandBox.spy(vscode.window, 'showErrorMessage');

            const loadFromConfigStub = mySandBox.stub(fabricClient, 'loadFromConfig').rejects({message: 'some error'});

            const quickPickStub = mySandBox.stub(vscode.window, 'showQuickPick');
            quickPickStub.onFirstCall().resolves('myConnection');
            quickPickStub.onSecondCall().resolves('Admin@org1.example.com');

            await vscode.commands.executeCommand('blockchainExplorer.connectEntry').should.be.rejected;

            loadFromConfigStub.should.have.been.called;

            errorMessageSpy.should.have.been.calledWith('some error');
        });

        it('should connect to a managed runtime using a quick pick', async () => {
            const connections = [{
                name: 'myRuntime',
                managedRuntime: true
            }];

            const runtimes = [{
                name: 'myRuntime',
                developmentMode: false
            }];

            // reset the available connections
            await vscode.workspace.getConfiguration().update('fabric.connections', connections, vscode.ConfigurationTarget.Global);
            await vscode.workspace.getConfiguration().update('fabric.runtimes', runtimes, vscode.ConfigurationTarget.Global);

            mySandBox.stub(vscode.window, 'showQuickPick').resolves('myRuntime');

            const loadFromConfigStub = mySandBox.stub(fabricClient, 'loadFromConfig').returns(fabricClientMock);

            const connectStub = mySandBox.stub(myExtension.getBlockchainNetworkExplorerProvider(), 'connect');

            const mockRuntime = sinon.createStubInstance(FabricRuntime);
            mySandBox.stub(FabricRuntimeManager.instance(), 'get').withArgs('myRuntime').returns(mockRuntime);

            await vscode.commands.executeCommand('blockchainExplorer.connectEntry');

            loadFromConfigStub.should.have.been.called;

            connectStub.should.have.been.calledOnceWithExactly(sinon.match.instanceOf(FabricRuntimeConnection));
        });

        it('should connect to a managed runtime from the tree', async () => {
            const connections = [{
                name: 'myRuntime',
                managedRuntime: true
            }];

            const runtimes = [{
                name: 'myRuntime',
                developmentMode: false
            }];

            // reset the available connections
            await vscode.workspace.getConfiguration().update('fabric.connections', connections, vscode.ConfigurationTarget.Global);
            await vscode.workspace.getConfiguration().update('fabric.runtimes', runtimes, vscode.ConfigurationTarget.Global);

            const blockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
            const allChildren: Array<BlockchainTreeItem> = await blockchainNetworkExplorerProvider.getChildren();

            const myConnectionItem: ConnectionTreeItem = allChildren[0] as ConnectionTreeItem;

            const loadFromConfigStub = mySandBox.stub(fabricClient, 'loadFromConfig').returns(fabricClientMock);

            const connectStub = mySandBox.stub(myExtension.getBlockchainNetworkExplorerProvider(), 'connect');

            const mockRuntime = sinon.createStubInstance(FabricRuntime);
            mySandBox.stub(FabricRuntimeManager.instance(), 'get').withArgs('myRuntime').returns(mockRuntime);

            await vscode.commands.executeCommand(myConnectionItem.command.command, ...myConnectionItem.command.arguments);

            loadFromConfigStub.should.have.been.called;

            connectStub.should.have.been.calledOnceWithExactly(sinon.match.instanceOf(FabricRuntimeConnection));
        });
    });
});
