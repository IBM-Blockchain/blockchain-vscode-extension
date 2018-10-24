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

chai.use(sinonChai);
const should: Chai.Should = chai.should();

describe('userInputUtil', () => {

    let mySandBox: sinon.SinonSandbox;
    let quickPickStub: sinon.SinonStub;
    const runtimeRegistry: FabricRuntimeRegistry = FabricRuntimeRegistry.instance();
    const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
    const connectionRegistry: FabricConnectionRegistry = FabricConnectionRegistry.instance();

    let connectionEntryOne: FabricConnectionRegistryEntry;
    let connectionEntryTwo: FabricConnectionRegistryEntry;

    let getConnectionStub: sinon.SinonStub;

    const env: NodeJS.ProcessEnv = Object.assign({}, process.env);

    const mockDocument: any = {
        getText: (): any => {
        return `{
            "fabric.connections": [
                {
                    "connectionProfilePath": "/Users/jake/Documents/blockchain-vscode-extension/client/test/data/connectionOne/connection.json",
                    "name": "connectionOne",
                    "identities": [
                        {
                            "certificatePath": "/Users/jake/Documents/blockchain-vscode-extension/client/test/data/connectionOne/credentials/certificate",
                            "privateKeyPath": "/Users/jake/Documents/blockchain-vscode-extension/client/test/data/connectionOne/credentials/privateKey"
                        }
                    ]
                },
                {
                    "connectionProfilePath": "/Users/jake/Documents/blockchain-vscode-extension/client/test/data/connectionOne/connection.json",
                    "name": "connectionTwo",
                    "identities": [
                        {
                            "certificatePath": "/Users/jake/Documents/blockchain-vscode-extension/client/test/data/connectionOne/credentials/certificate",
                            "privateKeyPath": "/Users/jake/Documents/blockchain-vscode-extension/client/test/data/connectionOne/credentials/privateKey"
                        }
                    ]
                }
            ]
        }`;
    }};

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
        process.env = env;
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
        it('should hide managed runtime if argument passed', async () => {
            mySandBox.stub(connectionRegistry, 'getAll').returns([connectionEntryOne, {name: 'local_fabric', managedRuntime: true}]);
            quickPickStub.resolves();
            await UserInputUtil.showConnectionQuickPickBox('choose a connection', true);
            quickPickStub.should.have.been.calledWith([{label: connectionEntryOne.name, data: connectionEntryOne}]);
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

    describe('showSmartContractPackagesQuickPickBox', () => {
        it('show quick pick box for smart contract packages with a single pick', async () => {
            const newPackage: PackageRegistryEntry = new PackageRegistryEntry({
                name: 'smartContractPackageBlue',
                version: '0.0.1',
                path: 'smartContractPackageBlue@0.0.1.cds'
            });

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

        it('show quick pick box for smart contract packages with multiple picks', async () => {
            const newPackage: PackageRegistryEntry = new PackageRegistryEntry({
                name: 'smartContractPackageBlue',
                version: '0.0.1',
                path: 'smartContractPackageBlue@0.0.1.cds'
            });

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

        it('should show error if no installed smart contracts ', async () => {
            const errorSpy: sinon.SinonSpy = mySandBox.spy(vscode.window, 'showErrorMessage');
            mySandBox.stub(FabricConnectionManager, 'instance').returns({
                getConnection: mySandBox.stub().resolves()
            });

            await UserInputUtil.showChaincodeAndVersionQuickPick('Choose a chaincode and version', []);
            errorSpy.should.have.been.calledWith('No smart contracts are installed on peers in this channel. Install a smart contract before instantiating.');

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

    describe('getDirPath', () => {
        it('should replace ~ with the users home directory', async () => {
            const packageDirOriginal: string = '~/smartContractDir';
            const packageDirNew: string = await UserInputUtil.getDirPath(packageDirOriginal);
            packageDirNew.should.not.contain('~');
        });

        it('should not replace if not ~', async () => {
            const packageDirOriginal: string = '/banana/smartContractDir';
            const packageDirNew: string = await UserInputUtil.getDirPath(packageDirOriginal);
            packageDirNew.should.equal(packageDirOriginal);
        });
    });

    describe('browseEdit', () => {
        it('should finish if user doesnt select browse or edit', async () => {
            const placeHolder: string = 'Enter a file path to the connection profile json file';
            const result: string = await UserInputUtil.browseEdit(placeHolder, 'connection');

            quickPickStub.should.have.been.calledWith([UserInputUtil.BROWSE_LABEL, UserInputUtil.EDIT_LABEL], { placeHolder });

            should.not.exist(result);
        });

        it('should return file path from browse', async () => {
            quickPickStub.resolves(UserInputUtil.BROWSE_LABEL);
            const showOpenDialogStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showOpenDialog').resolves([{fsPath: '/some/path'}]);
            const placeHolder: string = 'Enter a file path to the connection profile json file';
            const result: string = await UserInputUtil.browseEdit(placeHolder, 'connection');

            quickPickStub.should.have.been.calledWith([UserInputUtil.BROWSE_LABEL, UserInputUtil.EDIT_LABEL], { placeHolder });
            showOpenDialogStub.should.have.been.calledWith({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                openLabel: 'Select'
            });

            result.should.equal('/some/path');

        });

        it('should show user settings for windows', async () => {
            quickPickStub.resolves(UserInputUtil.EDIT_LABEL);
            mySandBox.stub(process, 'platform').value('win32');
            mySandBox.stub(path, 'join').returns('\\c\\users\\test\\appdata\\Code\\User\\settings.json');

            const openTextDocumentStub: sinon.SinonStub = mySandBox.stub(vscode.workspace, 'openTextDocument').resolves(mockDocument);

            const showTextDocumentStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showTextDocument').resolves();

            const placeHolder: string = 'Enter a file path to the connection profile json file';
            await UserInputUtil.browseEdit(placeHolder, 'connectionOne');

            quickPickStub.should.have.been.calledWith([UserInputUtil.BROWSE_LABEL, UserInputUtil.EDIT_LABEL], { placeHolder });

            openTextDocumentStub.should.have.been.calledWith(vscode.Uri.file('\\c\\users\\test\\appdata\\Code\\User\\settings.json'));
            showTextDocumentStub.should.have.been.calledWith(mockDocument, {selection: new vscode.Range(new vscode.Position(2, 0), new vscode.Position(12, 0))});
        });

        it('should show user settings for mac', async () => {
            quickPickStub.resolves(UserInputUtil.EDIT_LABEL);
            mySandBox.stub(process, 'platform').value('darwin');
            mySandBox.stub(path, 'join').returns('/users/test/Library/Application Support/Code/User/settings.json');
            const openTextDocumentStub: sinon.SinonStub = mySandBox.stub(vscode.workspace, 'openTextDocument').resolves(mockDocument);
            process.env.HOME = '/users/test';
            const showTextDocumentStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showTextDocument').resolves();

            const placeHolder: string = 'Enter a file path to the connection profile json file';
            await UserInputUtil.browseEdit(placeHolder, 'connectionOne');

            quickPickStub.should.have.been.calledWith([UserInputUtil.BROWSE_LABEL, UserInputUtil.EDIT_LABEL], { placeHolder });

            openTextDocumentStub.should.have.been.calledWith(vscode.Uri.file('/users/test/Library/Application Support/Code/User/settings.json'));
            showTextDocumentStub.should.have.been.calledWith(mockDocument, {selection: new vscode.Range(new vscode.Position(2, 0), new vscode.Position(12, 0))});
        });

        it('should show user settings for linux', async () => {
            quickPickStub.resolves(UserInputUtil.EDIT_LABEL);
            mySandBox.stub(process, 'platform').value('linux');
            mySandBox.stub(path, 'join').returns('/users/test/.config/Code/User/settings.json');
            const openTextDocumentStub: sinon.SinonStub = mySandBox.stub(vscode.workspace, 'openTextDocument').resolves(mockDocument);
            process.env.HOME = '/users/test';
            const showTextDocumentStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showTextDocument').resolves();

            const placeHolder: string = 'Enter a file path to the connection profile json file';
            await UserInputUtil.browseEdit(placeHolder, 'connectionOne');

            quickPickStub.should.have.been.calledWith([UserInputUtil.BROWSE_LABEL, UserInputUtil.EDIT_LABEL], { placeHolder });

            openTextDocumentStub.should.have.been.calledWith(vscode.Uri.file('/users/test/.config/Code/User/settings.json'));
            showTextDocumentStub.should.have.been.calledWith(mockDocument, {selection: new vscode.Range(new vscode.Position(2, 0), new vscode.Position(12, 0))});
        });

        it('should handle any errors', async () => {
            quickPickStub.rejects({message: 'some error'});
            const errorSpy: sinon.SinonSpy = mySandBox.spy(vscode.window, 'showErrorMessage');

            const placeHolder: string = 'Enter a file path to the connection profile json file';
            const result: string = await UserInputUtil.browseEdit(placeHolder, 'connection');

            quickPickStub.should.have.been.calledWith([UserInputUtil.BROWSE_LABEL, UserInputUtil.EDIT_LABEL], { placeHolder });

            errorSpy.should.have.been.calledWith('some error');
        });

        it('should finish if cancels browse dialog', async () => {
            const showOpenDialogStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showOpenDialog').resolves();
            quickPickStub.resolves(UserInputUtil.BROWSE_LABEL);
            const placeHolder: string = 'Enter a file path to the connection profile json file';
            const result: string = await UserInputUtil.browseEdit(placeHolder, 'connection');

            quickPickStub.should.have.been.calledWith([UserInputUtil.BROWSE_LABEL, UserInputUtil.EDIT_LABEL], { placeHolder });

            should.not.exist(result);
        });
    });

    describe('openUserSettings', () => {
        it('should catch any errors when opening settings', async () => {
            mySandBox.stub(process, 'platform').value('freebsd');
            mySandBox.stub(vscode.workspace, 'openTextDocument').rejects({message: 'error opening file'});
            const errorStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showErrorMessage');

            await UserInputUtil.openUserSettings('connection');

            errorStub.should.have.been.calledWith('error opening file');
        });
    });

    describe('showConfirmationWarningMessage', () => {
        it('should return true if the user clicks yes', async () => {
            const warningStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showWarningMessage').resolves({ title: 'Yes' });
            await UserInputUtil.showConfirmationWarningMessage('hello world').should.eventually.be.true;
            warningStub.should.have.been.calledWithExactly('hello world', { title: 'Yes' }, { title: 'No' });
        });

        it('should return true if the user clicks no', async () => {
            const warningStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showWarningMessage').resolves({ title: 'No' });
            await UserInputUtil.showConfirmationWarningMessage('hello world').should.eventually.be.false;
            warningStub.should.have.been.calledWithExactly('hello world', { title: 'Yes' }, { title: 'No' });
        });

        it('should return true if the user dismisses the message', async () => {
            const warningStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showWarningMessage').resolves();
            await UserInputUtil.showConfirmationWarningMessage('hello world').should.eventually.be.false;
            warningStub.should.have.been.calledWithExactly('hello world', { title: 'Yes' }, { title: 'No' });
        });
    });

    describe('delayWorkaround', () => {
      beforeEach(() => {
          this.clock = sinon.useFakeTimers();
      });

      afterEach(() => {
        this.clock.restore();
      });

      it('should delay for the specified time', async () => {
          const isResolved: boolean = false;
          const stub: sinon.SinonStub = mySandBox.stub();
          const p: Promise<any> = UserInputUtil.delayWorkaround(2000).then(stub);
          sinon.assert.notCalled(stub);

          this.clock.tick(2300);
          await p.should.be.eventually.fulfilled;
          return sinon.assert.calledOnce(stub);
      });

    });
});
