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
import { TestUtil } from '../TestUtil';
import { UserInputUtil, IBlockchainQuickPickItem } from '../../src/commands/UserInputUtil';
import { FabricRuntimeRegistry } from '../../src/fabric/FabricRuntimeRegistry';
import { FabricRuntimeRegistryEntry } from '../../src/fabric/FabricRuntimeRegistryEntry';
import { FabricConnectionRegistryEntry } from '../../src/fabric/FabricConnectionRegistryEntry';
import { FabricConnectionRegistry } from '../../src/fabric/FabricConnectionRegistry';
import { FabricRuntimeManager } from '../../src/fabric/FabricRuntimeManager';
import { FabricRuntime } from '../../src/fabric/FabricRuntime';

import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { FabricConnectionManager } from '../../src/fabric/FabricConnectionManager';
import { FabricClientConnection } from '../../src/fabric/FabricClientConnection';

chai.should();
chai.use(sinonChai);

describe('Commands Utility Function Tests', () => {

    let mySandBox;
    let quickPickStub;
    const runtimeRegistry: FabricRuntimeRegistry = FabricRuntimeRegistry.instance();
    const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
    const connectionRegistry: FabricConnectionRegistry = FabricConnectionRegistry.instance();

    let connectionEntryOne;
    let connectionEntryTwo;

    let getConnectionStub;

    before(async () => {
        await TestUtil.setupTests();
        await TestUtil.storeConnectionsConfig();
        await TestUtil.storeRuntimesConfig();
    });

    after(async () => {
        await TestUtil.restoreConnectionsConfig();
        await TestUtil.restoreRuntimesConfig();
    });

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();

        const rootPath = path.dirname(__dirname);

        connectionEntryOne = new FabricConnectionRegistryEntry();
        connectionEntryOne.name = 'myConnectionA';
        connectionEntryOne.connectionProfilePath = path.join(rootPath, '../../test/data/connectionOne/connection.json');
        connectionEntryOne.identities = [{
            certificatePath: path.join(rootPath, '../../test/data/connectionOne/credentials/certificate'),
            privateKeyPath: path.join(rootPath, '../../test/data/connectionOne/credentials/privateKey')
        }];

        connectionEntryTwo = new FabricConnectionRegistryEntry();
        connectionEntryTwo.name = 'myConnectionB';
        connectionEntryTwo.connectionProfilePath = path.join(rootPath, '../../test/data/connectionTwo/connection.json');
        connectionEntryTwo.identities = [{
            certificatePath: path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'),
            privateKeyPath: path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey')
        }];

        await connectionRegistry.clear();
        await connectionRegistry.add(connectionEntryOne);
        await connectionRegistry.add(connectionEntryTwo);

        await runtimeRegistry.clear();
        await runtimeRegistry.add(new FabricRuntimeRegistryEntry({name: 'local_fabric1', developmentMode: false}));
        await runtimeRegistry.add(new FabricRuntimeRegistryEntry({name: 'local_fabric2', developmentMode: true}));

        const fabricConnectionManager: FabricConnectionManager = FabricConnectionManager.instance();

        const fabricConnectionStub = sinon.createStubInstance(FabricClientConnection);
        fabricConnectionStub.getAllPeerNames.returns(['myPeerOne', 'myPeerTwo']);

        getConnectionStub = mySandBox.stub(fabricConnectionManager, 'getConnection').returns(fabricConnectionStub);

        quickPickStub = mySandBox.stub(vscode.window, 'showQuickPick');
    });

    afterEach(async () => {
        mySandBox.restore();
        await runtimeRegistry.clear();
    });

    describe('showConnectionQuickPickBox', () => {
        it('should show connections in the quickpick box', async () => {
            quickPickStub.resolves({label: connectionEntryOne.name, data: connectionEntryOne});
            const result: IBlockchainQuickPickItem<FabricConnectionRegistryEntry> = await UserInputUtil.showConnectionQuickPickBox('choose a connection');

            result.label.should.equal('myConnectionA');
            result.data.should.deep.equal(connectionEntryOne);
            quickPickStub.should.have.been.calledWith(sinon.match.any, {
                ignoreFocusOut: false,
                canPickMany: false,
                placeHolder: 'choose a connection'
            });
        });
    });

    describe('showIdentityConnectionQuickPickBox', () => {

        it('should show identity connections in the quickpick box', async () => {
            quickPickStub.resolves({label: 'Admin@org1.example.com', data: connectionEntryOne.identities[0]});
            const result: IBlockchainQuickPickItem<any> = await UserInputUtil.showIdentityConnectionQuickPickBox('choose a connection', connectionEntryOne);

            result.label.should.equal('Admin@org1.example.com');
            result.data.should.deep.equal(connectionEntryOne.identities[0]);
            quickPickStub.should.have.been.calledWith(sinon.match.any, {
                ignoreFocusOut: false,
                canPickMany: false,
                placeHolder: 'choose a connection'
            });
        });
    });

    describe('showInputBox', () => {
        it('should show the input box', async () => {
            const inputStub = mySandBox.stub(vscode.window, 'showInputBox').resolves('my answer');

            const result = await UserInputUtil.showInputBox('a question');
            result.should.equal('my answer');
            inputStub.should.have.been.calledWith({prompt: 'a question'});
        });
    });

    describe('showRuntimeQuickPickBox', () => {
        it('should show runtimes in the quickpick box', async () => {
            quickPickStub.resolves({label: 'local_fabric2', data: runtimeManager.get('local_fabric2')});
            const result: IBlockchainQuickPickItem<FabricRuntime> = await UserInputUtil.showRuntimeQuickPickBox('choose a runtime');

            result.label.should.equal('local_fabric2');
            result.data.should.deep.equal(runtimeManager.get('local_fabric2'));
            quickPickStub.should.have.been.calledWith(sinon.match.any, {
                ignoreFocusOut: false,
                canPickMany: false,
                placeHolder: 'choose a runtime'
            });
        });
    });

    describe('showQuickPickYesNo', () => {
        it('should show yes in the quickpick box', async () => {
            quickPickStub.resolves(UserInputUtil.YES);
            const result = await UserInputUtil.showQuickPickYesNo('Do you want an ice cream?');
            result.should.equal(UserInputUtil.YES);

            quickPickStub.should.have.been.calledWith(sinon.match.any, {
                ignoreFocusOut: true,
                canPickMany: false,
                placeHolder: 'Do you want an ice cream?'
            });
        });

        it('should show no in the quickpick box', async () => {
            quickPickStub.resolves(UserInputUtil.NO);
            const result = await UserInputUtil.showQuickPickYesNo('Do you want an ice cream?');
            result.should.equal(UserInputUtil.NO);

            quickPickStub.should.have.been.calledWith(sinon.match.any, {
                ignoreFocusOut: true,
                canPickMany: false,
                placeHolder: 'Do you want an ice cream?'
            });
        });

        describe('showFolderOptions', () => {
            it('should show add to workspace in quickpick box', async () => {
                quickPickStub.resolves(UserInputUtil.ADD_TO_WORKSPACE);
                const result = await UserInputUtil.showQuickPickYesNo('Choose how to open the project');
                result.should.equal(UserInputUtil.ADD_TO_WORKSPACE);

                quickPickStub.should.have.been.calledWith(sinon.match.any, {
                    ignoreFocusOut: true,
                    canPickMany: false,
                    placeHolder: 'Choose how to open the project'
                });
            });

            it('should show open in current window in quickpick box', async () => {
                quickPickStub.resolves(UserInputUtil.OPEN_IN_CURRENT_WINDOW);
                const result = await UserInputUtil.showQuickPickYesNo('Choose how to open the project');
                result.should.equal(UserInputUtil.OPEN_IN_CURRENT_WINDOW);

                quickPickStub.should.have.been.calledWith(sinon.match.any, {
                    ignoreFocusOut: true,
                    canPickMany: false,
                    placeHolder: 'Choose how to open the project'
                });
            });

            it('should show open in new window in quickpick box', async () => {
                quickPickStub.resolves(UserInputUtil.OPEN_IN_NEW_WINDOW);
                const result = await UserInputUtil.showQuickPickYesNo('Choose how to open the project');
                result.should.equal(UserInputUtil.OPEN_IN_NEW_WINDOW);

                quickPickStub.should.have.been.calledWith(sinon.match.any, {
                    ignoreFocusOut: true,
                    canPickMany: false,
                    placeHolder: 'Choose how to open the project'
                });
            });
        });

        describe('showPeerQuickPickBox', () => {
            it('should show the peer names', async () => {
                quickPickStub.resolves('myPeerOne');
                const result = await UserInputUtil.showPeerQuickPickBox('Choose a peer');
                result.should.equal('myPeerOne');
            });

            it('should handle no connection', async () => {
                getConnectionStub.returns();
                await UserInputUtil.showPeerQuickPickBox('Choose a peer').should.be.rejectedWith(`No connection to a blockchain found`);
            });
        });
    });

    describe('showSmartContractPackagesQuickPickBox', () => {
        it('show quick pick box for smart contract packages', async () => {
            quickPickStub.resolves('smartContractPackageBlue');
            const result = await UserInputUtil.showSmartContractPackagesQuickPickBox('Choose the smart contract package that you want to delete', false);
            result.should.deep.equal('smartContractPackageBlue');
            quickPickStub.should.have.been.calledWith(sinon.match.any, {
                ignoreFocusOut: false,
                canPickMany: false,
                placeHolder: 'Choose the smart contract package that you want to delete'
            });
        });

        it('show quick pick box for smart contract packages with multiple', async () => {
            quickPickStub.resolves('smartContractPackageBlue');
            const result = await UserInputUtil.showSmartContractPackagesQuickPickBox('Choose the smart contract package that you want to delete', true);
            result.should.deep.equal('smartContractPackageBlue');
            quickPickStub.should.have.been.calledWith(sinon.match.any, {
                ignoreFocusOut: false,
                canPickMany: true,
                placeHolder: 'Choose the smart contract package that you want to delete'
            });
        });
    });

    describe('showSmartContractLanguagesQuickPick', () => {
        it('should show the quick pick box with languages', async () => {
            quickPickStub.resolves('javascript');

            const result = await UserInputUtil.showSmartContractLanguagesQuickPick('Choose a language', ['javascript', 'typescript', 'go']);
            result.should.equal('javascript');

            quickPickStub.should.have.been.calledWith(sinon.match.any, {
                placeHolder: 'Choose a language',
                ignoreFocusOut: true,
                matchOnDetail: true
            });
        });
    });
});
