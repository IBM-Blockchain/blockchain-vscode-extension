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
import { UserInputUtil, IBlockchainQuickPickItem, LanguageQuickPickItem, LanguageType } from '../../src/commands/UserInputUtil';
import { FabricGatewayRegistryEntry } from '../../src/fabric/FabricGatewayRegistryEntry';
import { FabricGatewayRegistry } from '../../src/fabric/FabricGatewayRegistry';
import { FabricRuntimeManager } from '../../src/fabric/FabricRuntimeManager';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { FabricConnectionManager } from '../../src/fabric/FabricConnectionManager';
import { FabricClientConnection } from '../../src/fabric/FabricClientConnection';
import { PackageRegistryEntry } from '../../src/packages/PackageRegistryEntry';
import { PackageRegistry } from '../../src/packages/PackageRegistry';
import * as fs from 'fs-extra';
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../../src/logging/OutputAdapter';
import { ParsedCertificate } from '../../src/fabric/ParsedCertificate';

chai.use(sinonChai);
const should: Chai.Should = chai.should();

// tslint:disable no-unused-expression

describe('userInputUtil', () => {

    let mySandBox: sinon.SinonSandbox;
    let quickPickStub: sinon.SinonStub;
    const gatewayRegistry: FabricGatewayRegistry = FabricGatewayRegistry.instance();

    let gatewayEntryOne: FabricGatewayRegistryEntry;
    let gatewayEntryTwo: FabricGatewayRegistryEntry;
    let identities: string[];

    let getConnectionStub: sinon.SinonStub;
    let fabricConnectionStub: sinon.SinonStubbedInstance<FabricClientConnection>;
    let getLocalFabricConnectionStub: sinon.SinonStub;

    const env: NodeJS.ProcessEnv = Object.assign({}, process.env);

    const mockDocument: any = {
        getText: (): any => {
            return `{
            "fabric.connections": [
                {
                    "connectionProfilePath": "/Users/jake/Documents/blockchain-vscode-extension/client/test/data/connectionOne/connection.json",
                    "name": "one",
                    "walletPath": "/Users/jake/Documents/blockchain-vscode-extension/client/test/data/walletDir/wallet"
                },
                {
                    "connectionProfilePath": "/Users/jake/Documents/blockchain-vscode-extension/client/test/data/connectionOne/connection.json",
                    "name": "two",
                    "walletPath": "/Users/jake/Documents/blockchain-vscode-extension/client/test/data/walletDir/wallet"
                }
            ],
            "fabric.gateways": [
                {
                    "connectionProfilePath": "/Users/jake/Documents/blockchain-vscode-extension/client/test/data/connectionOne/connection.json",
                    "name": "one",
                    "walletPath": "/Users/jake/Documents/blockchain-vscode-extension/client/test/data/walletDir/wallet"
                },
                {
                    "connectionProfilePath": "/Users/jake/Documents/blockchain-vscode-extension/client/test/data/connectionOne/connection.json",
                    "name": "two",
                    "walletPath": "/Users/jake/Documents/blockchain-vscode-extension/client/test/data/walletDir/wallet"
                }
            ]
        }`;
        }
    };

    before(async () => {

        await TestUtil.setupTests();
        await TestUtil.storeGatewaysConfig();
        // await TestUtil.storeRuntimesConfig();
    });

    after(async () => {
        await TestUtil.restoreGatewaysConfig();
        // await TestUtil.restoreRuntimesConfig();
    });

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();

        const rootPath: string = path.dirname(__dirname);

        gatewayEntryOne = new FabricGatewayRegistryEntry();
        gatewayEntryOne.name = 'myGatewayA';
        gatewayEntryOne.connectionProfilePath = path.join(rootPath, '../../test/data/connectionOne/connection.json');
        gatewayEntryOne.walletPath = path.join(rootPath, '../../test/data/connectionOne/wallet');
        identities = ['Admin@org1.example.com', 'Test@org1.example.com'];

        gatewayEntryTwo = new FabricGatewayRegistryEntry();
        gatewayEntryTwo.name = 'myGatewayB';
        gatewayEntryTwo.connectionProfilePath = path.join(rootPath, '../../test/data/connectionTwo/connection.json');

        await gatewayRegistry.clear();
        await gatewayRegistry.add(gatewayEntryOne);
        await gatewayRegistry.add(gatewayEntryTwo);

        const fabricConnectionManager: FabricConnectionManager = FabricConnectionManager.instance();
        const fabricRuntimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();

        fabricConnectionStub = sinon.createStubInstance(FabricClientConnection);
        fabricConnectionStub.getAllPeerNames.returns(['myPeerOne', 'myPeerTwo']);

        fabricConnectionStub.getAllChannelsForPeer.withArgs('myPeerOne').resolves(['channelOne']);
        fabricConnectionStub.getAllChannelsForPeer.withArgs('myPeerTwo').resolves(['channelOne', 'channelTwo']);

        const chaincodeMap: Map<string, Array<string>> = new Map<string, Array<string>>();
        chaincodeMap.set('biscuit-network', ['0.0.1', '0.0.2']);
        chaincodeMap.set('cake-network', ['0.0.3']);
        fabricConnectionStub.getInstalledChaincode.withArgs('myPeerOne').resolves(chaincodeMap);
        fabricConnectionStub.getInstalledChaincode.withArgs('myPeerTwo').resolves(new Map<string, Array<string>>());
        fabricConnectionStub.getInstantiatedChaincode.withArgs('channelOne').resolves([{ name: 'biscuit-network', channel: 'channelOne', version: '0.0.1' }, { name: 'cake-network', channel: 'channelOne', version: '0.0.3' }]);
        fabricConnectionStub.getCertificateAuthorityName.resolves('ca.example.cake.com');

        const chaincodeMapTwo: Map<string, Array<string>> = new Map<string, Array<string>>();

        fabricConnectionStub.getInstantiatedChaincode.withArgs('channelTwo').resolves(chaincodeMapTwo);

        getConnectionStub = mySandBox.stub(fabricConnectionManager, 'getConnection').returns(fabricConnectionStub);
        getLocalFabricConnectionStub = mySandBox.stub(fabricRuntimeManager, 'getConnection').returns(fabricConnectionStub);

        quickPickStub = mySandBox.stub(vscode.window, 'showQuickPick');

        FabricRuntimeManager.instance().exists().should.be.true;
    });

    afterEach(async () => {
        mySandBox.restore();
        process.env = env;
    });

    describe('showGatewayQuickPickBox', () => {
        it('should show connections in the quickpick box', async () => {
            quickPickStub.resolves({ label: gatewayEntryOne.name, data: gatewayEntryOne });
            const result: IBlockchainQuickPickItem<FabricGatewayRegistryEntry> = await UserInputUtil.showGatewayQuickPickBox('Choose a gateway');

            result.label.should.equal('myGatewayA');
            result.data.should.deep.equal(gatewayEntryOne);
            quickPickStub.should.have.been.calledWith(sinon.match.any, {
                ignoreFocusOut: false,
                canPickMany: false,
                placeHolder: 'Choose a gateway'
            });
        });

        it('should show managed runtime if argument passed', async () => {
            mySandBox.stub(gatewayRegistry, 'getAll').returns([gatewayEntryOne]);

            const managedRuntime: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
            managedRuntime.name = 'local_fabric';
            managedRuntime.managedRuntime = true;

            quickPickStub.resolves();
            await UserInputUtil.showGatewayQuickPickBox('Choose a gateway', true);
            quickPickStub.should.have.been.calledWith([{ label: managedRuntime.name, data: managedRuntime }, { label: gatewayEntryOne.name, data: gatewayEntryOne }]);
        });
    });

    describe('showIdentitiesQuickPickBox', () => {

        it('should show identity names in the quickpick box', async () => {
            quickPickStub.resolves('Admin@org1.example.com');
            const result: string = await UserInputUtil.showIdentitiesQuickPickBox('choose an identity to connect with', identities);

            result.should.equal('Admin@org1.example.com');
            quickPickStub.should.have.been.calledWith(sinon.match.any, {
                ignoreFocusOut: true,
                canPickMany: false,
                placeHolder: 'choose an identity to connect with'
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

    });

    describe('showSmartContractPackagesQuickPickBox', () => {
        it('show quick pick box for smart contract packages with a single pick', async () => {
            const newPackage: PackageRegistryEntry = new PackageRegistryEntry({
                name: 'smartContractPackageBlue',
                version: '0.0.1',
                path: 'smartContractPackageBlue@0.0.1.cds'
            });

            mySandBox.stub(PackageRegistry.instance(), 'getAll').resolves([newPackage]);

            quickPickStub.resolves({ label: 'smartContractPackageBlue', data: newPackage });
            const result: IBlockchainQuickPickItem<PackageRegistryEntry> = await UserInputUtil.showSmartContractPackagesQuickPickBox('Choose the smart contract package that you want to delete', false) as IBlockchainQuickPickItem<PackageRegistryEntry>;
            result.should.deep.equal({ label: 'smartContractPackageBlue', data: newPackage });
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

            quickPickStub.resolves([{ label: 'smartContractPackageBlue', data: newPackage }]);
            const result: Array<IBlockchainQuickPickItem<PackageRegistryEntry>> = await UserInputUtil.showSmartContractPackagesQuickPickBox('Choose the smart contract package that you want to delete', true) as Array<IBlockchainQuickPickItem<PackageRegistryEntry>>;
            result.should.deep.equal([{ label: 'smartContractPackageBlue', data: newPackage }]);
            quickPickStub.should.have.been.calledWith(sinon.match.any, {
                ignoreFocusOut: false,
                canPickMany: true,
                placeHolder: 'Choose the smart contract package that you want to delete'
            });
        });
    });

    describe('showLanguagesQuickPick', () => {

        it('should return undefined if the user cancels the quick pick box', async () => {
            quickPickStub.resolves(undefined);
            const chosenItem: LanguageQuickPickItem = await UserInputUtil.showLanguagesQuickPick('Choose a language', ['go', 'java'], ['javascript', 'typescript']);
            should.equal(chosenItem, undefined);
            quickPickStub.should.have.been.calledWith(sinon.match.any, {
                placeHolder: 'Choose a language',
                ignoreFocusOut: true,
                matchOnDetail: true
            });
        });

        it('should display a list of chaincode languages', async () => {
            quickPickStub.callsFake(async (items: LanguageQuickPickItem[], options: vscode.QuickPickOptions) => {
                return items[0];
            });
            const chosenItem: LanguageQuickPickItem = await UserInputUtil.showLanguagesQuickPick('Choose a language', ['java', 'go'], []);
            chosenItem.label.should.equal('go');
            chosenItem.description.should.equal('Low-level programming model');
            chosenItem.type.should.equal(LanguageType.CHAINCODE);
            quickPickStub.should.have.been.calledWith(sinon.match.any, {
                placeHolder: 'Choose a language',
                ignoreFocusOut: true,
                matchOnDetail: true
            });
        });

        it('should display a list of contract languages', async () => {
            quickPickStub.callsFake(async (items: LanguageQuickPickItem[], options: vscode.QuickPickOptions) => {
                return items[0];
            });
            const chosenItem: LanguageQuickPickItem = await UserInputUtil.showLanguagesQuickPick('Choose a language', [], ['typescript', 'javascript']);
            chosenItem.label.should.equal('javascript');
            chosenItem.type.should.equal(LanguageType.CONTRACT);
            quickPickStub.should.have.been.calledWith(sinon.match.any, {
                placeHolder: 'Choose a language',
                ignoreFocusOut: true,
                matchOnDetail: true
            });
        });

        it('should display a list of contract and chaincode languages', async () => {
            quickPickStub.callsFake(async (items: LanguageQuickPickItem[], options: vscode.QuickPickOptions) => {
                return items[0];
            });
            const chosenItem: LanguageQuickPickItem = await UserInputUtil.showLanguagesQuickPick('Choose a language', ['java', 'go'], ['typescript', 'javascript']);
            chosenItem.label.should.equal('javascript');
            chosenItem.type.should.equal(LanguageType.CONTRACT);
            quickPickStub.should.have.been.calledWith(sinon.match.any, {
                placeHolder: 'Choose a language',
                ignoreFocusOut: true,
                matchOnDetail: true
            });
        });
    });

    describe('showChannelQuickPickBox', () => {
        it('should show quick pick box with channels', async () => {
            quickPickStub.resolves({ label: 'channelOne', data: ['myPeerOne', 'myPeerTwo'] });

            const result: IBlockchainQuickPickItem<Set<string>> = await UserInputUtil.showChannelQuickPickBox('Choose a channel');
            result.should.deep.equal({ label: 'channelOne', data: ['myPeerOne', 'myPeerTwo'] });

            quickPickStub.should.have.been.calledWith(sinon.match.any, {
                ignoreFocusOut: false,
                canPickMany: false,
                placeHolder: 'Choose a channel'
            });
        });
    });

    describe('showChaincodeAndVersionQuickPick', () => {

        it('should show chaincode and version quick pick', async () => {
            const packagedOne: PackageRegistryEntry = new PackageRegistryEntry({
                name: 'biscuit-network',
                version: '0.0.2',
                path: 'biscuit-network@0.0.2.cds'
            });
            const packagedTwo: PackageRegistryEntry = new PackageRegistryEntry({
                name: 'biscuit-network',
                version: '0.0.3',
                path: 'biscuit-network@0.0.3.cds'
            });
            const packagedThree: PackageRegistryEntry = new PackageRegistryEntry({
                name: 'jaffa-network',
                version: '0.0.1',
                path: 'jaffa-network@0.0.1.cds'
            });
            const pathOne: string = path.join('some', 'path');
            const pathTwo: string = path.join('another', 'one');

            const uriOne: vscode.Uri = vscode.Uri.file(pathOne);
            const uriTwo: vscode.Uri = vscode.Uri.file(pathTwo);
            mySandBox.stub(UserInputUtil, 'getWorkspaceFolders').returns([
                { name: 'project_1', uri: uriOne },
                { name: 'biscuit-network', uri: uriTwo }
            ]);

            mySandBox.stub(PackageRegistry.instance(), 'getAll').resolves([packagedOne, packagedTwo, packagedThree]);

            await UserInputUtil.showChaincodeAndVersionQuickPick('Choose a chaincode and version', new Set(['myPeerOne']));
            quickPickStub.getCall(0).args[0].should.deep.equal([
                {
                    label: 'jaffa-network@0.0.1',
                    description: 'Packaged',
                    data: {
                        packageEntry: {
                            name: 'jaffa-network',
                            path: 'jaffa-network@0.0.1.cds',
                            version: '0.0.1'
                        },
                        workspace: undefined
                    }
                },
                {
                    label: 'project_1',
                    description: 'Open Project',
                    data: {
                        packageEntry: undefined,
                        workspace: {
                            name: 'project_1', uri: uriOne
                        }
                    }
                },
                {
                    label: 'biscuit-network',
                    description: 'Open Project',
                    data: {
                        packageEntry: undefined,
                        workspace: {
                            name: 'biscuit-network', uri: uriTwo
                        }
                    }
                }
            ]);
        });

        it('should only show packages with the same name (used for an upgrade)', async () => {
            const packagedOne: PackageRegistryEntry = new PackageRegistryEntry({
                name: 'biscuit-network',
                version: '0.0.2',
                path: 'biscuit-network@0.0.2.cds'
            });
            const packagedTwo: PackageRegistryEntry = new PackageRegistryEntry({
                name: 'biscuit-network',
                version: '0.0.3',
                path: 'biscuit-network@0.0.3.cds'
            });

            const pathOne: string = path.join('some', 'path');
            const pathTwo: string = path.join('another', 'one');
            const uriOne: vscode.Uri = vscode.Uri.file(pathOne);
            const uriTwo: vscode.Uri = vscode.Uri.file(pathTwo);

            const workspaceOne: any = { name: 'project_1', uri: uriOne };
            const workspaceTwo: any = { name: 'biscuit-network', uri: uriTwo };
            mySandBox.stub(UserInputUtil, 'getWorkspaceFolders').returns([
                workspaceOne,
                workspaceTwo
            ]);

            const joinStub: sinon.SinonStub = mySandBox.stub(path, 'join');
            joinStub.withArgs(pathOne, 'package.json').returns(path.join(pathOne, 'package.json'));
            joinStub.withArgs(pathTwo, 'package.json').returns(path.join(pathTwo, 'package.json'));

            const readFileStub: sinon.SinonStub = mySandBox.stub(fs, 'readFile');
            readFileStub.withArgs(path.join(pathOne, 'package.json'), 'utf8').resolves('{"name": "project_1", "version": "0.0.1"}');
            readFileStub.withArgs(path.join(pathTwo, 'package.json'), 'utf8').resolves('{"name": "biscuit-network", "version": "0.0.3"}');

            mySandBox.stub(PackageRegistry.instance(), 'getAll').resolves([packagedOne, packagedTwo]);
            await UserInputUtil.showChaincodeAndVersionQuickPick('Choose a chaincode and version', new Set(['myPeerOne']), 'biscuit-network', '0.0.1');

            quickPickStub.getCall(0).args[0].should.deep.equal([
                {
                    label: `${packagedOne.name}@${packagedOne.version}`,
                    description: 'Installed',
                    data: { packageEntry: { name: packagedOne.name, version: packagedOne.version, path: undefined }, workspace: undefined }
                },
                {
                    label: `${packagedTwo.name}@${packagedTwo.version}`,
                    description: 'Packaged',
                    data: { packageEntry: { name: packagedTwo.name, version: packagedTwo.version, path: packagedTwo.path }, workspace: undefined }
                },
                {
                    label: `${workspaceOne.name}`,
                    description: 'Open Project',
                    data: { packageEntry: undefined, workspace: { name: workspaceOne.name, uri: workspaceOne.uri } }
                },
                {
                    label: `${workspaceTwo.name}`,
                    description: 'Open Project',
                    data: { packageEntry: undefined, workspace: { name: workspaceTwo.name, uri: workspaceTwo.uri } }
                }
            ]);
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
            mySandBox.stub(vscode.workspace, 'workspaceFolders').value(null);

            const result: Array<vscode.WorkspaceFolder> = UserInputUtil.getWorkspaceFolders();

            result.should.deep.equal([]);
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
            const placeHolder: string = 'Enter a file path to the connection profile file';
            const quickPickItems: string[] = [UserInputUtil.BROWSE_LABEL, UserInputUtil.EDIT_LABEL];
            const openDialogOptions: vscode.OpenDialogOptions = {
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                openLabel: 'Select',
                filters: undefined
            };
            const result: string = await UserInputUtil.browseEdit(placeHolder, quickPickItems, openDialogOptions, 'connection') as string;

            quickPickStub.should.have.been.calledWith([UserInputUtil.BROWSE_LABEL, UserInputUtil.EDIT_LABEL], { placeHolder });

            should.not.exist(result);
        });

        it('should not show the edit option for certificate/privateKey file paths', async () => {
            quickPickStub.resolves(UserInputUtil.BROWSE_LABEL);
            const showOpenDialogStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showOpenDialog').resolves([{ fsPath: '/some/path' }]);
            const placeHolder: string = 'Enter a file path to the certificate file';
            const quickPickItems: string[] = [UserInputUtil.BROWSE_LABEL, UserInputUtil.EDIT_LABEL];
            const openDialogOptions: vscode.OpenDialogOptions = {
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                openLabel: 'Select',
                filters: undefined
            };
            const result: string = await UserInputUtil.browseEdit(placeHolder, quickPickItems, openDialogOptions, 'connection') as string;

            quickPickStub.should.have.been.calledWith([UserInputUtil.BROWSE_LABEL], { placeHolder });
            showOpenDialogStub.should.have.been.calledWith({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                openLabel: 'Select',
                filters: undefined
            });

            result.should.equal('/some/path');
        });

        it('should allow folders to be chosen when selected, and not files', async () => {
            quickPickStub.resolves(UserInputUtil.BROWSE_LABEL);
            const showOpenDialogStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showOpenDialog').resolves([{ fsPath: '/some/path' }]);
            const placeHolder: string = 'Enter a file path to the wallet';
            const quickPickItems: string[] = [UserInputUtil.BROWSE_LABEL, UserInputUtil.EDIT_LABEL];
            const openDialogOptions: vscode.OpenDialogOptions = {
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                openLabel: 'Select',
                filters: undefined
            };
            const result: string = await UserInputUtil.browseEdit(placeHolder, quickPickItems, openDialogOptions, 'connection') as string;

            quickPickStub.should.have.been.calledWith([UserInputUtil.BROWSE_LABEL, UserInputUtil.EDIT_LABEL], { placeHolder });
            showOpenDialogStub.should.have.been.calledWith({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                openLabel: 'Select',
                filters: undefined
            });

            result.should.equal('/some/path');
        });

        it('should return file path from browse', async () => {
            quickPickStub.resolves(UserInputUtil.BROWSE_LABEL);
            const showOpenDialogStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showOpenDialog').resolves([{ fsPath: '/some/path' }]);
            const placeHolder: string = 'Enter a file path to the connection profile file';
            const quickPickItems: string[] = [UserInputUtil.BROWSE_LABEL, UserInputUtil.EDIT_LABEL];
            const openDialogOptions: vscode.OpenDialogOptions = {
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                openLabel: 'Select',
                filters: {
                    'Connection Profiles' : ['json', 'yaml', 'yml']
                }
            };
            const result: string = await UserInputUtil.browseEdit(placeHolder, quickPickItems, openDialogOptions, 'connection') as string;

            quickPickStub.should.have.been.calledWith([UserInputUtil.BROWSE_LABEL, UserInputUtil.EDIT_LABEL], { placeHolder });
            showOpenDialogStub.should.have.been.calledWith({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                openLabel: 'Select',
                filters: {
                    'Connection Profiles': ['json', 'yaml', 'yml']
                }
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
            const quickPickItems: string[] = [UserInputUtil.BROWSE_LABEL, UserInputUtil.EDIT_LABEL];
            const openDialogOptions: vscode.OpenDialogOptions = {
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                openLabel: 'Select',
                filters: undefined
            };
            const result: string = await UserInputUtil.browseEdit(placeHolder, quickPickItems, openDialogOptions, 'one') as string;

            quickPickStub.should.have.been.calledWith([UserInputUtil.BROWSE_LABEL, UserInputUtil.EDIT_LABEL], { placeHolder });

            openTextDocumentStub.should.have.been.calledWith(vscode.Uri.file('\\c\\users\\test\\appdata\\Code\\User\\settings.json'));
            showTextDocumentStub.should.have.been.calledWith(mockDocument, { selection: new vscode.Range(new vscode.Position(14, 0), new vscode.Position(19, 0)) });
        });

        it('should show user settings for mac', async () => {
            quickPickStub.resolves(UserInputUtil.EDIT_LABEL);
            mySandBox.stub(process, 'platform').value('darwin');
            mySandBox.stub(path, 'join').returns('/users/test/Library/Application Support/Code/User/settings.json');
            const openTextDocumentStub: sinon.SinonStub = mySandBox.stub(vscode.workspace, 'openTextDocument').resolves(mockDocument);
            process.env.HOME = '/users/test';
            const showTextDocumentStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showTextDocument').resolves();

            const placeHolder: string = 'Enter a file path to the connection profile json file';
            const quickPickItems: string[] = [UserInputUtil.BROWSE_LABEL, UserInputUtil.EDIT_LABEL];
            const openDialogOptions: vscode.OpenDialogOptions = {
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                openLabel: 'Select',
                filters: undefined
            };
            const result: string = await UserInputUtil.browseEdit(placeHolder, quickPickItems, openDialogOptions, 'one') as string;

            quickPickStub.should.have.been.calledWith([UserInputUtil.BROWSE_LABEL, UserInputUtil.EDIT_LABEL], { placeHolder });

            openTextDocumentStub.should.have.been.calledWith(vscode.Uri.file('/users/test/Library/Application Support/Code/User/settings.json'));
            showTextDocumentStub.should.have.been.calledWith(mockDocument, { selection: new vscode.Range(new vscode.Position(14, 0), new vscode.Position(19, 0)) });
        });

        it('should show user settings for linux', async () => {
            quickPickStub.resolves(UserInputUtil.EDIT_LABEL);
            mySandBox.stub(process, 'platform').value('linux');
            mySandBox.stub(path, 'join').returns('/users/test/.config/Code/User/settings.json');
            const openTextDocumentStub: sinon.SinonStub = mySandBox.stub(vscode.workspace, 'openTextDocument').resolves(mockDocument);
            process.env.HOME = '/users/test';
            const showTextDocumentStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showTextDocument').resolves();

            const placeHolder: string = 'Enter a file path to the connection profile json file';
            const quickPickItems: string[] = [UserInputUtil.BROWSE_LABEL, UserInputUtil.EDIT_LABEL];
            const openDialogOptions: vscode.OpenDialogOptions = {
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                openLabel: 'Select',
                filters: undefined
            };
            const result: string = await UserInputUtil.browseEdit(placeHolder, quickPickItems, openDialogOptions, 'one') as string;

            quickPickStub.should.have.been.calledWith([UserInputUtil.BROWSE_LABEL, UserInputUtil.EDIT_LABEL], { placeHolder });

            openTextDocumentStub.should.have.been.calledWith(vscode.Uri.file('/users/test/.config/Code/User/settings.json'));
            showTextDocumentStub.should.have.been.calledWith(mockDocument, { selection: new vscode.Range(new vscode.Position(14, 0), new vscode.Position(19, 0)) });
        });

        it('should handle any errors', async () => {
            const logSpy: sinon.SinonSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
            quickPickStub.rejects({ message: 'some error' });

            const placeHolder: string = 'Enter a file path to the connection profile json file';
            const quickPickItems: string[] = [UserInputUtil.BROWSE_LABEL, UserInputUtil.EDIT_LABEL];
            const openDialogOptions: vscode.OpenDialogOptions = {
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                openLabel: 'Select',
                filters: undefined
            };
            const result: string = await UserInputUtil.browseEdit(placeHolder, quickPickItems, openDialogOptions, 'connection') as string;

            quickPickStub.should.have.been.calledWith([UserInputUtil.BROWSE_LABEL, UserInputUtil.EDIT_LABEL], { placeHolder });

            logSpy.should.have.been.calledWith(LogType.ERROR, 'some error');
        });

        it('should finish if cancels browse dialog', async () => {
            const showOpenDialogStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showOpenDialog').resolves();
            quickPickStub.resolves(UserInputUtil.BROWSE_LABEL);
            const placeHolder: string = 'Enter a file path to the connection profile json file';
            const quickPickItems: string[] = [UserInputUtil.BROWSE_LABEL, UserInputUtil.EDIT_LABEL];
            const openDialogOptions: vscode.OpenDialogOptions = {
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                openLabel: 'Select',
                filters: undefined
            };
            const result: string = await UserInputUtil.browseEdit(placeHolder, quickPickItems, openDialogOptions, 'connection') as string;

            quickPickStub.should.have.been.calledWith([UserInputUtil.BROWSE_LABEL, UserInputUtil.EDIT_LABEL], { placeHolder });

            should.not.exist(result);
        });

        it('should only present browse options', async () => {
            quickPickStub.resolves(UserInputUtil.BROWSE_LABEL);
            const showOpenDialogStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showOpenDialog').resolves([{ fsPath: '/some/path' }]);
            const placeHolder: string = 'Enter a file path to the connection profile file';
            const quickPickItems: string[] = [UserInputUtil.BROWSE_LABEL];
            const openDialogOptions: vscode.OpenDialogOptions = {
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                openLabel: 'Save',
                filters: undefined
            };
            const result: string = await UserInputUtil.browseEdit(placeHolder, quickPickItems, openDialogOptions, 'connection') as string;

            quickPickStub.should.have.been.calledWith([UserInputUtil.BROWSE_LABEL], { placeHolder });
            showOpenDialogStub.should.have.been.calledWith({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                openLabel: 'Save',
                filters: undefined
            });

            result.should.equal('/some/path');
        });

        it('should return a uri', async () => {
            quickPickStub.resolves(UserInputUtil.BROWSE_LABEL);
            const showOpenDialogStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showOpenDialog').resolves([{ fsPath: '/some/path' }]);
            const placeHolder: string = 'Enter a file path to the connection profile file';
            const quickPickItems: string[] = [UserInputUtil.BROWSE_LABEL];
            const openDialogOptions: vscode.OpenDialogOptions = {
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                openLabel: 'Save',
                filters: undefined
            };
            const result: string = await UserInputUtil.browseEdit(placeHolder, quickPickItems, openDialogOptions, 'connection', true) as string;

            quickPickStub.should.have.been.calledWith([UserInputUtil.BROWSE_LABEL], { placeHolder });
            showOpenDialogStub.should.have.been.calledWith({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                openLabel: 'Save',
                filters: undefined
            });

            result.should.deep.equal({ fsPath: '/some/path' });
        });

        it('should open user settings if Edit is selected', async () => {
            const openUserSettingsStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'openUserSettings');
            quickPickStub.resolves(UserInputUtil.EDIT_LABEL);
            const showOpenDialogSpy: sinon.SinonSpy = mySandBox.spy(vscode.window, 'showOpenDialog');
            const placeHolder: string = 'Enter a file path to the connection profile file';
            const quickPickItems: string[] = [UserInputUtil.BROWSE_LABEL, UserInputUtil.EDIT_LABEL];
            const openDialogOptions: vscode.OpenDialogOptions = {
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                openLabel: 'Open',
                filters: undefined
            };
            await UserInputUtil.browseEdit(placeHolder, quickPickItems, openDialogOptions, 'connection', true) as string;

            quickPickStub.should.have.been.calledWith([UserInputUtil.BROWSE_LABEL, UserInputUtil.EDIT_LABEL], { placeHolder });
            showOpenDialogSpy.should.not.have.been.called;

            openUserSettingsStub.should.have.been.calledOnceWithExactly('connection');
        });
    });

    describe('showCertificateAuthorityQuickPickBox', () => {
        it('should get and show the certificate authority names', async () => {
            quickPickStub.resolves('ca.example.cake.com');
            const result: string = await UserInputUtil.showCertificateAuthorityQuickPickBox('Please chose a CA');

            result.should.deep.equal('ca.example.cake.com');
            quickPickStub.should.have.been.calledWith(sinon.match.any, {
                ignoreFocusOut: false,
                canPickMany: false,
                placeHolder: 'Please chose a CA'
            });
        });
    });

    describe('openUserSettings', () => {
        it('should catch any errors when opening settings', async () => {
            mySandBox.stub(process, 'platform').value('freebsd');
            mySandBox.stub(vscode.workspace, 'openTextDocument').rejects({ message: 'error opening file' });
            const logSpy: sinon.SinonSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');

            await UserInputUtil.openUserSettings('one');

            logSpy.should.have.been.calledWith(LogType.ERROR, 'error opening file');
        });

        it('should throw an error if gateway cannot be found in user settings', async () => {

            mySandBox.stub(process, 'platform').value('linux');
            mySandBox.stub(path, 'join').returns('/users/test/.config/Code/User/settings.json');
            const openTextDocumentStub: sinon.SinonStub = mySandBox.stub(vscode.workspace, 'openTextDocument').resolves(mockDocument);
            process.env.HOME = '/users/test';
            const showTextDocumentStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showTextDocument').resolves();

            await UserInputUtil.openUserSettings('three');

            openTextDocumentStub.should.have.been.calledWith(vscode.Uri.file('/users/test/.config/Code/User/settings.json'));
            showTextDocumentStub.should.have.been.calledOnceWithExactly(mockDocument);

        });

        it('should open user settings for windows', async () => {
            mySandBox.stub(process, 'platform').value('win32');
            mySandBox.stub(path, 'join').returns('\\c\\users\\test\\appdata\\Code\\User\\settings.json');
            const openTextDocumentStub: sinon.SinonStub = mySandBox.stub(vscode.workspace, 'openTextDocument').resolves(mockDocument);

            const showTextDocumentStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showTextDocument').resolves();

            await UserInputUtil.openUserSettings('one');

            openTextDocumentStub.should.have.been.calledWith(vscode.Uri.file('\\c\\users\\test\\appdata\\Code\\User\\settings.json'));
            showTextDocumentStub.should.have.been.calledOnceWithExactly(mockDocument, { selection: new vscode.Range(new vscode.Position(14, 0), new vscode.Position(19, 0)) });
        });

        it('should open user settings for mac', async () => {
            mySandBox.stub(process, 'platform').value('darwin');
            mySandBox.stub(path, 'join').returns('/users/test/Library/Application Support/Code/User/settings.json');
            process.env.HOME = '/users/test';
            const openTextDocumentStub: sinon.SinonStub = mySandBox.stub(vscode.workspace, 'openTextDocument').resolves(mockDocument);

            const showTextDocumentStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showTextDocument').resolves();

            await UserInputUtil.openUserSettings('one');

            openTextDocumentStub.should.have.been.calledWith(vscode.Uri.file('/users/test/Library/Application Support/Code/User/settings.json'));
            showTextDocumentStub.should.have.been.calledOnceWithExactly(mockDocument, { selection: new vscode.Range(new vscode.Position(14, 0), new vscode.Position(19, 0)) });
        });

        it('should open user settings for linux', async () => {
            mySandBox.stub(process, 'platform').value('linux');
            mySandBox.stub(path, 'join').returns('/users/test/.config/Code/User/settings.json');
            process.env.HOME = '/users/test';
            const openTextDocumentStub: sinon.SinonStub = mySandBox.stub(vscode.workspace, 'openTextDocument').resolves(mockDocument);

            const showTextDocumentStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showTextDocument').resolves();

            await UserInputUtil.openUserSettings('one');

            openTextDocumentStub.should.have.been.calledWith(vscode.Uri.file('/users/test/.config/Code/User/settings.json'));
            showTextDocumentStub.should.have.been.calledOnceWithExactly(mockDocument, { selection: new vscode.Range(new vscode.Position(14, 0), new vscode.Position(19, 0)) });
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
            this.clock = sinon.useFakeTimers({toFake: ['setTimeout']});
        });

        afterEach(() => {
            this.clock.restore();
        });

        it('should delay for the specified time', async () => {
            const stub: sinon.SinonStub = mySandBox.stub();
            const p: Promise<any> = UserInputUtil.delayWorkaround(2000).then(stub);
            sinon.assert.notCalled(stub);

            this.clock.tick(2300);
            await p.should.be.eventually.fulfilled;
            sinon.assert.calledOnce(stub);
        });
    });

    describe('showInstantiatedSmartContractsQuickPick', () => {

        it('should show the quick pick box for instantiated smart contracts', async () => {
            quickPickStub.resolves({
                label: 'biscuit-network@0.0.1',
                data: { name: 'biscuit-network', channel: 'EnglishChannel', version: '0.0.1' }
            });

            const result: IBlockchainQuickPickItem<{ name: string, channel: string, version: string }> = await UserInputUtil.showInstantiatedSmartContractsQuickPick('Please choose instantiated smart contract to test', 'channelOne');
            result.should.deep.equal({
                label: 'biscuit-network@0.0.1',
                data: { name: 'biscuit-network', channel: 'EnglishChannel', version: '0.0.1' }
            });

            quickPickStub.should.have.been.calledWith(sinon.match.any, {
                ignoreFocusOut: true,
                canPickMany: false,
                placeHolder: 'Please choose instantiated smart contract to test'
            });
        });

        it('should show the quick pick box for instantiated smart contracts for all channels', async () => {
            quickPickStub.resolves({
                label: 'biscuit-network@0.0.1',
                data: { name: 'biscuit-network', channel: 'channelOne', version: '0.0.1' }
            });

            const result: IBlockchainQuickPickItem<{ name: string, channel: string, version: string }> = await UserInputUtil.showInstantiatedSmartContractsQuickPick('Please choose instantiated smart contract to test');
            result.should.deep.equal({
                label: 'biscuit-network@0.0.1',
                data: { name: 'biscuit-network', channel: 'channelOne', version: '0.0.1' }
            });

            quickPickStub.should.have.been.calledWith([
                {
                    label: 'biscuit-network@0.0.1',
                    data: {
                        name: 'biscuit-network',
                        channel: 'channelOne',
                        version: '0.0.1'
                    }
                },
                {
                    label: 'cake-network@0.0.3',
                    data: {
                        name: 'cake-network',
                        channel: 'channelOne',
                        version: '0.0.3'
                    }
                }], {
                    ignoreFocusOut: true,
                    canPickMany: false,
                    placeHolder: 'Please choose instantiated smart contract to test'
                });
        });

        it('should handle no instantiated chaincodes in connection', async () => {
            const logSpy: sinon.SinonSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
            fabricConnectionStub.getInstantiatedChaincode.returns([]);
            await UserInputUtil.showInstantiatedSmartContractsQuickPick('Choose an instantiated smart contract to test', 'channelTwo');
            logSpy.should.have.been.calledWith(LogType.ERROR, 'Local runtime has no instantiated chaincodes');

        });
    });

    describe('showTestFileOverwriteQuickPick', () => {
        it('should show yes in the showTestFileOverwriteQuickPick box', async () => {
            quickPickStub.resolves(UserInputUtil.YES);
            const result: string = await UserInputUtil.showTestFileOverwriteQuickPick('Would you like a twix?');
            result.should.equal(UserInputUtil.YES);

            quickPickStub.should.have.been.calledWith(sinon.match.any, {
                ignoreFocusOut: false,
                canPickMany: false,
                placeHolder: 'Would you like a twix?'
            });
        });

        it('should show no in the showTestFileOverwriteQuickPick box', async () => {
            quickPickStub.resolves(UserInputUtil.NO);
            const result: string = await UserInputUtil.showTestFileOverwriteQuickPick('Is it lunchtime yet?');
            result.should.equal(UserInputUtil.NO);

            quickPickStub.should.have.been.calledWith(sinon.match.any, {
                ignoreFocusOut: false,
                canPickMany: false,
                placeHolder: 'Is it lunchtime yet?'
            });
        });

        it('should show generate copy in the showTestFileOverwriteQuickPick box', async () => {
            quickPickStub.resolves(UserInputUtil.GENERATE_NEW_TEST_FILE);
            const result: string = await UserInputUtil.showTestFileOverwriteQuickPick('What should I do next?');
            result.should.equal(UserInputUtil.GENERATE_NEW_TEST_FILE);

            quickPickStub.should.have.been.calledWith(sinon.match.any, {
                ignoreFocusOut: false,
                canPickMany: false,
                placeHolder: 'What should I do next?'
            });
        });
    });

    describe('showTransactionQuickPick', () => {
        it('should get a list of transactions', async () => {
            quickPickStub.resolves({
                label: 'my-contract - transaction1',
                data: { name: 'transaction1', contract: 'my-contract' }
            });
            fabricConnectionStub.getMetadata.resolves(
                {
                    contracts: {
                        'my-contract': {
                            name: 'my-contract',
                            transactions: [
                                {
                                    name: 'instantiate'
                                },
                                {
                                    name: 'transaction1'
                                }
                            ],
                        },
                        'my-other-contract': {
                            name: 'my-other-contract',
                            transactions: [
                                {
                                    name: 'upgrade'
                                },
                                {
                                    name: 'transaction1'
                                }
                            ],
                        },
                        '': {
                            name: '',
                            transactions: [
                                {
                                    name: 'init'
                                },
                                {
                                    name: 'invoke'
                                }
                            ],
                        }
                    }
                }
            );

            const result: IBlockchainQuickPickItem<{ name: string, contract: string }> = await UserInputUtil.showTransactionQuickPick('choose a transaction', 'mySmartContract', 'myChannel');

            result.should.deep.equal({
                label: 'my-contract - transaction1',
                data: { name: 'transaction1', contract: 'my-contract' }
            });

            const quickPickArray: Array<IBlockchainQuickPickItem<{ name: string, contract: string }>> = [
                {
                    label: 'my-contract - instantiate',
                    data: {
                        name: 'instantiate',
                        contract: 'my-contract'
                    }
                },
                {
                    label: 'my-contract - transaction1',
                    data: {
                        name: 'transaction1',
                        contract: 'my-contract'
                    }
                },
                {
                    label: 'my-other-contract - upgrade',
                    data: {
                        name: 'upgrade',
                        contract: 'my-other-contract'
                    }
                },
                {
                    label: 'my-other-contract - transaction1',
                    data: {
                        name: 'transaction1',
                        contract: 'my-other-contract'
                    }
                },
                {
                    label: 'init',
                    data: {
                        name: 'init',
                        contract: ''
                    }
                },
                {
                    label: 'invoke',
                    data: {
                        name: 'invoke',
                        contract: ''
                    }
                }
            ];

            quickPickStub.should.have.been.calledWith(quickPickArray, {
                ignoreFocusOut: false,
                canPickMany: false,
                placeHolder: 'choose a transaction'
            });
        });

        it('should handle no connection', async () => {
            const logSpy: sinon.SinonSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
            getConnectionStub.returns(null);
            await UserInputUtil.showTransactionQuickPick('Choose a transaction', 'mySmartContract', 'myChannel');
            logSpy.should.have.been.calledWith(LogType.ERROR, `No connection to a blockchain found`);
        });

        it('should ask for a function name if there is no metadata', async () => {
            fabricConnectionStub.getMetadata.resolves(null);
            mySandBox.stub(vscode.window, 'showInputBox').resolves('suchFunc');
            const result: IBlockchainQuickPickItem<{ name: string, contract: string }> = await UserInputUtil.showTransactionQuickPick('Choose a transaction', 'mySmartContract', 'myChannel');
            result.should.deep.equal({
                data: {
                    contract: null,
                    name: 'suchFunc'
                },
                label: null
            });
        });

        it('should handle cancelling the function name prompt if there is no metadata', async () => {
            fabricConnectionStub.getMetadata.resolves(null);
            mySandBox.stub(vscode.window, 'showInputBox').resolves();
            const result: IBlockchainQuickPickItem<{ name: string, contract: string }> = await UserInputUtil.showTransactionQuickPick('Choose a transaction', 'mySmartContract', 'myChannel');
            should.equal(result, undefined);
        });
    });

    describe('showInstallableSmartContractsQuickPick', () => {
        it('should show installable contracts', async () => {
            const packageOne: PackageRegistryEntry = new PackageRegistryEntry({
                name: 'new-network',
                version: '0.0.1',
                path: 'new-network@0.0.1.cds'
            });
            const packageTwo: PackageRegistryEntry = new PackageRegistryEntry({
                name: 'biscuit-network',
                version: '0.0.1',
                path: 'biscuit-network@0.0.1.cds'
            });
            const packageThree: PackageRegistryEntry = new PackageRegistryEntry({
                name: 'biscuit-network',
                version: '0.0.2',
                path: 'biscuit-network@0.0.1.cds'
            });
            const packageFour: PackageRegistryEntry = new PackageRegistryEntry({
                name: 'cake-network',
                version: '0.0.3',
                path: 'cake-network@0.0.3.cds'
            });
            const packageFive: PackageRegistryEntry = new PackageRegistryEntry({
                name: 'cake-network',
                version: '0.0.2',
                path: 'cake-network@0.0.2.cds'
            });

            const pathOne: string = path.join('some', 'path');
            const pathTwo: string = path.join('another', 'one');
            const uriOne: vscode.Uri = vscode.Uri.file(pathOne);
            const uriTwo: vscode.Uri = vscode.Uri.file(pathTwo);

            const workspaceOne: any = { name: 'project_1', uri: uriOne };
            const workspaceTwo: any = { name: 'biscuit-network', uri: uriTwo };
            mySandBox.stub(UserInputUtil, 'getWorkspaceFolders').returns([
                workspaceOne,
                workspaceTwo
            ]);

            mySandBox.stub(PackageRegistry.instance(), 'getAll').resolves([packageOne, packageTwo, packageThree, packageFour, packageFive]);
            await UserInputUtil.showInstallableSmartContractsQuickPick('Choose which package to install on the peer', new Set(['myPeerOne']));

            quickPickStub.getCall(0).args[0].should.deep.equal([
                {
                    label: `new-network@0.0.1`,
                    description: 'Packaged',
                    data: {
                        packageEntry:
                        {
                            name: 'new-network',
                            version: '0.0.1',
                            path: 'new-network@0.0.1.cds'
                        },
                        workspace: undefined
                    }
                },
                {
                    label: `cake-network@0.0.2`,
                    description: 'Packaged',
                    data: {
                        packageEntry:
                        {
                            name: 'cake-network',
                            version: '0.0.2',
                            path: 'cake-network@0.0.2.cds'
                        },
                        workspace: undefined
                    }
                },
                {
                    label: `${workspaceOne.name}`,
                    description: 'Open Project',
                    data: { packageEntry: undefined, workspace: { name: workspaceOne.name, uri: workspaceOne.uri } }
                },
                {
                    label: `${workspaceTwo.name}`,
                    description: 'Open Project',
                    data: { packageEntry: undefined, workspace: { name: workspaceTwo.name, uri: workspaceTwo.uri } }
                }
            ]);
        });

    });

    describe('openNewProject', () => {
        it('should add project to workspace', async () => {
            const updateWorkspaceFoldersStub: sinon.SinonStub = mySandBox.stub(vscode.workspace, 'updateWorkspaceFolders').returns(true);
            const uri: vscode.Uri = vscode.Uri.file('test');
            await UserInputUtil.openNewProject(UserInputUtil.ADD_TO_WORKSPACE, uri);
            updateWorkspaceFoldersStub.should.have.been.calledOnceWithExactly(sinon.match.any, 0, { uri: uri });
        });

        it('should add workspace with custom workspace name', async () => {
            const updateWorkspaceFoldersStub: sinon.SinonStub = mySandBox.stub(vscode.workspace, 'updateWorkspaceFolders').returns(true);
            const uri: vscode.Uri = vscode.Uri.file('test');
            await UserInputUtil.openNewProject(UserInputUtil.ADD_TO_WORKSPACE, uri, 'some-custom-name');
            updateWorkspaceFoldersStub.should.have.been.calledOnceWithExactly(sinon.match.any, 0, { uri: uri, name: 'some-custom-name' });
        });

        it('should open project in current window', async () => {
            const executeCommand: sinon.SinonStub = mySandBox.stub(vscode.commands, 'executeCommand').resolves();
            const uri: vscode.Uri = vscode.Uri.file('test');

            await UserInputUtil.openNewProject(UserInputUtil.OPEN_IN_CURRENT_WINDOW, uri);

            executeCommand.should.have.been.calledOnceWithExactly('vscode.openFolder', uri, false);

        });

        it('should open project in new window', async () => {
            const executeCommand: sinon.SinonStub = mySandBox.stub(vscode.commands, 'executeCommand').resolves();
            const uri: vscode.Uri = vscode.Uri.file('test');

            await UserInputUtil.openNewProject(UserInputUtil.OPEN_IN_NEW_WINDOW, uri);

            executeCommand.should.have.been.calledOnceWithExactly('vscode.openFolder', uri, true);
        });

    });

    describe('showAddIdentityOptionsQuickPick', () => {

        it('should show options to add identity in the quick pick box', async () => {
            quickPickStub.resolves(UserInputUtil.CERT_KEY);
            const result: string = await UserInputUtil.showAddIdentityOptionsQuickPick('choose option to add identity with');

            result.should.equal(UserInputUtil.CERT_KEY);
            quickPickStub.should.have.been.calledWith(sinon.match.any, {
                matchOnDetail: true,
                placeHolder: 'choose option to add identity with',
                ignoreFocusOut : true,
                canPickMany: false,
            });
        });
    });

    describe('addIdentityMethod', () => {

        it('should ask how to add an identity', async () => {
            quickPickStub.resolves(UserInputUtil.ADD_CERT_KEY_OPTION);
            const result: string = await UserInputUtil.addIdentityMethod();

            result.should.equal(UserInputUtil.ADD_CERT_KEY_OPTION);
            quickPickStub.should.have.been.calledWith([UserInputUtil.ADD_CERT_KEY_OPTION, UserInputUtil.ADD_ID_SECRET_OPTION], {
                placeHolder: 'Choose a method for adding an identity',
                ignoreFocusOut: true,
                canPickMany: false
            });
        });
    });

    describe('getCertKey', () => {

        it('should cancel adding certificate path', async () => {
            const quickPickItems: string[] = [UserInputUtil.BROWSE_LABEL, UserInputUtil.EDIT_LABEL];
            const openDialogOptions: vscode.OpenDialogOptions = {
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                openLabel: 'Select',
                filters: undefined
            };
            const browseEditStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'browseEdit');
            browseEditStub.onCall(0).resolves();
            const result: {certificatePath: string, privateKeyPath: string} = await UserInputUtil.getCertKey('myGateway');

            should.equal(result, undefined);
            browseEditStub.should.have.been.calledOnceWithExactly('Browse for a certificate file', quickPickItems, openDialogOptions, 'myGateway');

        });

        it('should stop if certificate is invalid', async () => {
            const quickPickItems: string[] = [UserInputUtil.BROWSE_LABEL, UserInputUtil.EDIT_LABEL];
            const openDialogOptions: vscode.OpenDialogOptions = {
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                openLabel: 'Select',
                filters: undefined
            };
            const browseEditStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'browseEdit');
            browseEditStub.onCall(0).resolves('/some/path');

            const error: Error = new Error('Could not validate certificate: invalid PEM');
            const validPem: sinon.SinonStub = mySandBox.stub(ParsedCertificate, 'validPEM').onFirstCall().throws(error);

            await UserInputUtil.getCertKey('myGateway').should.be.rejectedWith(error);

            browseEditStub.should.have.been.calledOnceWithExactly('Browse for a certificate file', quickPickItems, openDialogOptions, 'myGateway');
            validPem.should.have.been.calledOnceWithExactly('/some/path', 'certificate');
        });

        it('should cancel adding private key path', async () => {
            const quickPickItems: string[] = [UserInputUtil.BROWSE_LABEL, UserInputUtil.EDIT_LABEL];
            const openDialogOptions: vscode.OpenDialogOptions = {
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                openLabel: 'Select',
                filters: undefined
            };
            const browseEditStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'browseEdit');
            browseEditStub.onCall(0).resolves('/some/path');
            browseEditStub.onCall(1).resolves();
            const validPem: sinon.SinonStub = mySandBox.stub(ParsedCertificate, 'validPEM').onFirstCall().returns(undefined);

            const result: {certificatePath: string, privateKeyPath: string} = await UserInputUtil.getCertKey('myGateway');

            should.equal(result, undefined);
            browseEditStub.getCall(0).should.have.been.calledWithExactly('Browse for a certificate file', quickPickItems, openDialogOptions, 'myGateway');
            browseEditStub.getCall(1).should.have.been.calledWithExactly('Browse for a private key file', quickPickItems, openDialogOptions, 'myGateway');
            validPem.should.have.been.calledOnceWithExactly('/some/path', 'certificate');
        });

        it('should stop if private key is invalid', async () => {
            const quickPickItems: string[] = [UserInputUtil.BROWSE_LABEL, UserInputUtil.EDIT_LABEL];
            const openDialogOptions: vscode.OpenDialogOptions = {
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                openLabel: 'Select',
                filters: undefined
            };
            const browseEditStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'browseEdit');
            browseEditStub.onCall(0).resolves('/some/cert');
            browseEditStub.onCall(1).resolves('/some/key');

            const error: Error = new Error('Could not validate private key: invalid PEM');
            const validPem: sinon.SinonStub = mySandBox.stub(ParsedCertificate, 'validPEM');
            validPem.onFirstCall().returns(undefined);
            validPem.onSecondCall().throws(error);

            await UserInputUtil.getCertKey('myGateway').should.be.rejectedWith(error);

            browseEditStub.getCall(0).should.have.been.calledWithExactly('Browse for a certificate file', quickPickItems, openDialogOptions, 'myGateway');
            browseEditStub.getCall(1).should.have.been.calledWithExactly('Browse for a private key file', quickPickItems, openDialogOptions, 'myGateway');
            validPem.getCall(0).should.have.been.calledWithExactly('/some/cert', 'certificate');
            validPem.getCall(1).should.have.been.calledWithExactly('/some/key', 'private key');
        });

        it('should return certificate and private key paths', async () => {
            const quickPickItems: string[] = [UserInputUtil.BROWSE_LABEL, UserInputUtil.EDIT_LABEL];
            const openDialogOptions: vscode.OpenDialogOptions = {
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                openLabel: 'Select',
                filters: undefined
            };
            const browseEditStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'browseEdit');
            browseEditStub.onCall(0).resolves('/some/cert');
            browseEditStub.onCall(1).resolves('/some/key');

            const validPem: sinon.SinonStub = mySandBox.stub(ParsedCertificate, 'validPEM').returns(undefined);

            const {certificatePath, privateKeyPath } = await UserInputUtil.getCertKey('myGateway');
            certificatePath.should.equal('/some/cert');
            privateKeyPath.should.equal('/some/key');

            browseEditStub.getCall(0).should.have.been.calledWithExactly('Browse for a certificate file', quickPickItems, openDialogOptions, 'myGateway');
            browseEditStub.getCall(1).should.have.been.calledWithExactly('Browse for a private key file', quickPickItems, openDialogOptions, 'myGateway');
            validPem.getCall(0).should.have.been.calledWithExactly('/some/cert', 'certificate');
            validPem.getCall(1).should.have.been.calledWithExactly('/some/key', 'private key');
        });
    });

    describe('getEnrollIdSecret', () => {

        it('should cancel entering enrollment ID', async () => {
            const showInputBox: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'showInputBox');
            showInputBox.onCall(0).resolves();

            const result: {enrollmentID: string, enrollmentSecret: string} = await UserInputUtil.getEnrollIdSecret();
            should.equal(result, undefined);
            showInputBox.getCall(0).should.have.been.calledWithExactly('Enter enrollment ID');
        });

        it('should cancel entering enrollment secret', async () => {
            const showInputBox: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'showInputBox');
            showInputBox.onCall(0).resolves('some_id');
            showInputBox.onCall(1).resolves();

            const result: {enrollmentID: string, enrollmentSecret: string} = await UserInputUtil.getEnrollIdSecret();
            should.equal(result, undefined);
            showInputBox.getCall(0).should.have.been.calledWithExactly('Enter enrollment ID');
            showInputBox.getCall(1).should.have.been.calledWithExactly('Enter enrollment secret');
        });

        it('should get enrollment id and secret', async () => {
            const showInputBox: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'showInputBox');
            showInputBox.onCall(0).resolves('some_id');
            showInputBox.onCall(1).resolves('some_secret');

            const {enrollmentID, enrollmentSecret} = await UserInputUtil.getEnrollIdSecret();
            enrollmentID.should.equal('some_id');
            enrollmentSecret.should.equal('some_secret');
            showInputBox.getCall(0).should.have.been.calledWithExactly('Enter enrollment ID');
            showInputBox.getCall(1).should.have.been.calledWithExactly('Enter enrollment secret');
        });

    });
});
