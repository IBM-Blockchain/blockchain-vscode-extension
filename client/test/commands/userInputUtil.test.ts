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
import { PackageRegistryEntry } from '../../src/packages/PackageRegistryEntry';
import { PackageRegistry } from '../../src/packages/PackageRegistry';

chai.should();
chai.use(sinonChai);

describe('Commands Utility Function Tests', () => {

    let mySandBox: sinon.SinonSandbox;
    let quickPickStub: sinon.SinonStub;
    const runtimeRegistry: FabricRuntimeRegistry = FabricRuntimeRegistry.instance();
    const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
    const connectionRegistry: FabricConnectionRegistry = FabricConnectionRegistry.instance();

    let connectionEntryOne: FabricConnectionRegistryEntry;
    let connectionEntryTwo: FabricConnectionRegistryEntry;

    let getConnectionStub: sinon.SinonStub;

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

        const rootPath: string = path.dirname(__dirname);

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

        const fabricConnectionStub: sinon.SinonStubbedInstance<FabricClientConnection> = sinon.createStubInstance(FabricClientConnection);
        fabricConnectionStub.getAllPeerNames.returns(['myPeerOne', 'myPeerTwo']);

        fabricConnectionStub.getAllChannelsForPeer.withArgs('myPeerOne').resolves(['channelOne']);
        fabricConnectionStub.getAllChannelsForPeer.withArgs('myPeerTwo').resolves(['channelOne', 'channelTwo']);

        const chaincodeMap: Map<string, Array<string>> = new Map<string, Array<string>>();
        chaincodeMap.set('biscuit-network', ['0.0.1', '0.0.2']);
        chaincodeMap.set('cake-network', ['0.0.3']);
        fabricConnectionStub.getInstalledChaincode.withArgs('myPeerOne').resolves(chaincodeMap);
        fabricConnectionStub.getInstalledChaincode.withArgs('myPeerTwo').resolves(new Map<string, Array<string>>());

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
            const inputStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showInputBox').resolves('my answer');

            const result: string = await UserInputUtil.showInputBox('a question');
            result.should.equal('my answer');
            inputStub.should.have.been.calledWith({
                prompt: 'a question',
                ignoreFocusOut: true
            });
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
            const result: string = await UserInputUtil.showQuickPickYesNo('Do you want an ice cream?');
            result.should.equal(UserInputUtil.YES);

            quickPickStub.should.have.been.calledWith(sinon.match.any, {
                ignoreFocusOut: true,
                canPickMany: false,
                placeHolder: 'Do you want an ice cream?'
            });
        });

        it('should show no in the quickpick box', async () => {
            quickPickStub.resolves(UserInputUtil.NO);
            const result: string = await UserInputUtil.showQuickPickYesNo('Do you want an ice cream?');
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
                const result: string = await UserInputUtil.showFolderOptions('Choose how to open the project');
                result.should.equal(UserInputUtil.ADD_TO_WORKSPACE);

                quickPickStub.should.have.been.calledWith(sinon.match.any, {
                    ignoreFocusOut: true,
                    canPickMany: false,
                    placeHolder: 'Choose how to open the project'
                });
            });

            it('should show open in current window in quickpick box', async () => {
                quickPickStub.resolves(UserInputUtil.OPEN_IN_CURRENT_WINDOW);
                const result: string = await UserInputUtil.showFolderOptions('Choose how to open the project');
                result.should.equal(UserInputUtil.OPEN_IN_CURRENT_WINDOW);

                quickPickStub.should.have.been.calledWith(sinon.match.any, {
                    ignoreFocusOut: true,
                    canPickMany: false,
                    placeHolder: 'Choose how to open the project'
                });
            });

            it('should show open in new window in quickpick box', async () => {
                quickPickStub.resolves(UserInputUtil.OPEN_IN_NEW_WINDOW);
                const result: string = await UserInputUtil.showFolderOptions('Choose how to open the project');
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
                const result: string = await UserInputUtil.showPeerQuickPickBox('Choose a peer');
                result.should.equal('myPeerOne');
            });

            it('should handle no connection', async () => {
                getConnectionStub.returns(null);
                await UserInputUtil.showPeerQuickPickBox('Choose a peer').should.be.rejectedWith(`No connection to a blockchain found`);
            });
        });
    });

    describe('showSmartContractPackagesQuickPickBox', () => {
        it('show quick pick box for smart contract packages', async () => {
            const newPackage: PackageRegistryEntry = new PackageRegistryEntry();
            newPackage.chaincodeLanguage = 'javascript';
            newPackage.name = 'smartContractPackageBlue';
            newPackage.version = '0.0.1';
            newPackage.path = 'smartContractPackageBlue';

            mySandBox.stub(PackageRegistry.instance(), 'getAll').resolves([newPackage]);

            quickPickStub.resolves({label: 'smartContractPackageBlue', data: newPackage});
            const result: IBlockchainQuickPickItem<PackageRegistryEntry> = await UserInputUtil.showSmartContractPackagesQuickPickBox('Choose the smart contract package that you want to delete', false) as IBlockchainQuickPickItem<PackageRegistryEntry>;
            result.should.deep.equal({label: 'smartContractPackageBlue', data: newPackage});
            quickPickStub.should.have.been.calledWith(sinon.match.any, {
                ignoreFocusOut: false,
                canPickMany: false,
                placeHolder: 'Choose the smart contract package that you want to delete'
            });
        });

        it('show quick pick box for smart contract packages with multiple', async () => {
            const newPackage: PackageRegistryEntry = new PackageRegistryEntry();
            newPackage.chaincodeLanguage = 'javascript';
            newPackage.name = 'smartContractPackageBlue';
            newPackage.version = '0.0.1';
            newPackage.path = 'smartContractPackageBlue';

            mySandBox.stub(PackageRegistry.instance(), 'getAll').resolves([newPackage]);

            quickPickStub.resolves([{label: 'smartContractPackageBlue', data: newPackage}]);
            const result: Array<IBlockchainQuickPickItem<PackageRegistryEntry>> = await UserInputUtil.showSmartContractPackagesQuickPickBox('Choose the smart contract package that you want to delete', true) as Array<IBlockchainQuickPickItem<PackageRegistryEntry>>;
            result.should.deep.equal([{label: 'smartContractPackageBlue', data: newPackage}]);
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

            const result: string = await UserInputUtil.showSmartContractLanguagesQuickPick('Choose a language', ['javascript', 'typescript', 'go']);
            result.should.equal('javascript');

            quickPickStub.should.have.been.calledWith(sinon.match.any, {
                placeHolder: 'Choose a language',
                ignoreFocusOut: true,
                matchOnDetail: true
            });
        });
    });

    describe('showChannelQuickPickBox', () => {
        it('should show quick pick box with channels', async () => {
            quickPickStub.resolves({label: 'channelOne', data: ['myPeerOne', 'myPeerTwo']});

            const result: IBlockchainQuickPickItem<Array<string>> = await UserInputUtil.showChannelQuickPickBox('Choose a channel');
            result.should.deep.equal({label: 'channelOne', data: ['myPeerOne', 'myPeerTwo']});

            quickPickStub.should.have.been.calledWith(sinon.match.any, {
                ignoreFocusOut: false,
                canPickMany: false,
                placeHolder: 'Choose a channel'
            });
        });

        it('should handle no connection', async () => {
            getConnectionStub.returns(null);
            await UserInputUtil.showChannelQuickPickBox('Choose a channel').should.be.rejectedWith(`No connection to a blockchain found`);
        });
    });

    describe('showChaincodeAndVersionQuickPick', () => {
        it('should show the quick pick box with chaincode and version', async () => {
            quickPickStub.resolves({
                label: 'biscuit-network@0.0.1',
                data: {chaincode: 'biscuit-network', version: '0.0.1'}
            });

            const result: IBlockchainQuickPickItem<{ chaincode: string, version: string }> = await UserInputUtil.showChaincodeAndVersionQuickPick('Choose a chaincode and version', ['myPeerOne', 'myPeerTwo']);
            result.should.deep.equal({
                label: 'biscuit-network@0.0.1',
                data: {chaincode: 'biscuit-network', version: '0.0.1'}
            });

            quickPickStub.should.have.been.calledWith(sinon.match.any, {
                ignoreFocusOut: false,
                canPickMany: false,
                placeHolder: 'Choose a chaincode and version'
            });
        });

        it('should handle no connection', async () => {
            getConnectionStub.returns(null);
            await UserInputUtil.showChaincodeAndVersionQuickPick('Choose a chaincode and version', []).should.be.rejectedWith(`No connection to a blockchain found`);

        });
    });
    describe('showGeneratorOptions', () => {
        it('should show generator conflict options in quickpick box', async () => {
            quickPickStub.resolves('Overwrite file');
            const result: string = await UserInputUtil.showGeneratorOptions('Overwrite package.json?');
            result.should.equal('Overwrite file');

            quickPickStub.should.have.been.calledWith(sinon.match.any, {
                ignoreFocusOut: true,
                canPickMany: false,
                placeHolder: 'Overwrite package.json?'
            });
        });
    });

    describe('showWorkspaceQuickPickBox', () => {
        it('should show the workspace folders', async () => {
            mySandBox.stub(UserInputUtil, 'getWorkspaceFolders').returns([
                {
                    name: 'myPath1',
                    uri: {
                        path: 'path1'
                    }
                },
                {
                    name: 'myPath2',
                    uri: {
                        path: 'path2'
                    }
                }]);

            quickPickStub.resolves({
                label: 'myPath1', data: {
                    name: 'myPath1',
                    uri: {
                        path: 'path1'
                    }
                }
            });

            const result: IBlockchainQuickPickItem<vscode.WorkspaceFolder> = await UserInputUtil.showWorkspaceQuickPickBox('choose a folder');
            result.should.deep.equal({
                label: 'myPath1', data: {
                    name: 'myPath1',
                    uri: {
                        path: 'path1'
                    }
                }
            });

            quickPickStub.should.have.been.calledWith(sinon.match.any, {
                ignoreFocusOut: true,
                canPickMany: false,
                matchOnDetail: true,
                placeHolder: 'choose a folder'
            });
        });
    });

    describe('getWorkspaceFolders', () => {
        it('should get the workspace folders', () => {
            mySandBox.stub(vscode.workspace, 'workspaceFolders').value([{
                name: 'myPath1',
                uri: {
                    path: 'path1'
                }
            }]);
            const result: Array<vscode.WorkspaceFolder> = UserInputUtil.getWorkspaceFolders();

            result.should.deep.equal([{
                name: 'myPath1',
                uri: {
                    path: 'path1'
                }
            }]);
        });

        it('should throw an error if no workspace folders', () => {
            const errorSpy: sinon.SinonSpy = mySandBox.spy(vscode.window, 'showErrorMessage');
            mySandBox.stub(vscode.workspace, 'workspaceFolders').value(null);
            let errorMessage: string = '';
            try {
                UserInputUtil.getWorkspaceFolders();
            } catch (error) {
                errorMessage = error.message;
            }
            errorSpy.should.have.been.calledWith('Please open the workspace that you want to be packaged.');
            errorMessage.should.equal('Please open the workspace that you want to be packaged.');
        });
    });

    describe('getBasePackageDir', () => {
        it('should replace ~ with the users home directory', async () => {
            const packageDirOriginal: string = '~/smartContractDir';
            const packageDirNew: string = await UserInputUtil.getBasePackageDir(packageDirOriginal);
            packageDirNew.should.not.contain('~');
        });

        it('should not replace if not ~', async () => {
            const packageDirOriginal: string = '/banana/smartContractDir';
            const packageDirNew: string = await UserInputUtil.getBasePackageDir(packageDirOriginal);
            packageDirNew.should.equal(packageDirOriginal);
        });
    });
});
