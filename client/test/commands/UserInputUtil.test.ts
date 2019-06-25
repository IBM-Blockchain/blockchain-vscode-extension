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
import { PackageRegistryEntry } from '../../src/packages/PackageRegistryEntry';
import { PackageRegistry } from '../../src/packages/PackageRegistry';
import * as fs from 'fs-extra';
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../../src/logging/OutputAdapter';
import { ParsedCertificate } from '../../src/fabric/ParsedCertificate';
import { FabricWalletRegistryEntry } from '../../src/fabric/FabricWalletRegistryEntry';
import { FabricWalletRegistry } from '../../src/fabric/FabricWalletRegistry';
import { FabricWallet } from '../../src/fabric/FabricWallet';
import { FabricWalletGenerator } from '../../src/fabric/FabricWalletGenerator';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricRuntimeConnection } from '../../src/fabric/FabricRuntimeConnection';
import { FabricClientConnection } from '../../src/fabric/FabricClientConnection';
import { FabricRuntimeUtil } from '../../src/fabric/FabricRuntimeUtil';
import { FabricWalletUtil } from '../../src/fabric/FabricWalletUtil';
import { FabricRuntime } from '../../src/fabric/FabricRuntime';
import { FabricNode, FabricNodeType } from '../../src/fabric/FabricNode';
import { SettingConfigurations } from '../../SettingConfigurations';

chai.use(sinonChai);
const should: Chai.Should = chai.should();

// tslint:disable no-unused-expression
describe('UserInputUtil', () => {

    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();
    let quickPickStub: sinon.SinonStub;
    const gatewayRegistry: FabricGatewayRegistry = FabricGatewayRegistry.instance();
    const walletRegistry: FabricWalletRegistry = FabricWalletRegistry.instance();

    let gatewayEntryOne: FabricGatewayRegistryEntry;
    let gatewayEntryTwo: FabricGatewayRegistryEntry;
    let identities: string[];
    let walletEntryOne: FabricWalletRegistryEntry;
    let walletEntryTwo: FabricWalletRegistryEntry;

    let getConnectionStub: sinon.SinonStub;
    let fabricRuntimeConnectionStub: sinon.SinonStubbedInstance<FabricRuntimeConnection>;
    let fabricClientConnectionStub: sinon.SinonStubbedInstance<FabricClientConnection>;

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
            "${SettingConfigurations.FABRIC_GATEWAYS}": [
                {
                    "name": "one",
                    "connectionProfilePath": "/Users/jake/Documents/blockchain-vscode-extension/client/test/data/connectionOne/connection.json"
                },
                {
                    "name": "two",
                    "connectionProfilePath": "/Users/jake/Documents/blockchain-vscode-extension/client/test/data/connectionOne/connection.json"
                }
            ],
            "${SettingConfigurations.FABRIC_WALLETS}": [
                {
                    "name": "walletOne",
                    "walletPath": "/Users/jake/Documents/blockchain-vscode-extension/client/test/data/walletDir/wallet"
                },
                {
                    "name": "walletTwo",
                    "walletPath": "/Users/jake/Documents/blockchain-vscode-extension/client/test/data/walletDir/wallet"
                }
            ]
        }`;
        }
    };

    before(async () => {

        await TestUtil.setupTests(mySandBox);
        await TestUtil.storeGatewaysConfig();
        await TestUtil.storeRuntimesConfig();
        await TestUtil.storeWalletsConfig();
    });

    after(async () => {
        await TestUtil.restoreGatewaysConfig();
        await TestUtil.restoreRuntimesConfig();
        await TestUtil.restoreWalletsConfig();
    });

    beforeEach(async () => {

        const rootPath: string = path.dirname(__dirname);

        gatewayEntryOne = new FabricGatewayRegistryEntry();
        gatewayEntryOne.name = 'myGatewayA';
        gatewayEntryOne.connectionProfilePath = path.join(rootPath, '../../test/data/connectionOne/connection.json');
        gatewayEntryOne.associatedWallet = 'blueWallet';
        identities = [FabricRuntimeUtil.ADMIN_USER, 'Test@org1.example.com'];

        gatewayEntryTwo = new FabricGatewayRegistryEntry();
        gatewayEntryTwo.name = 'myGatewayB';
        gatewayEntryTwo.connectionProfilePath = path.join(rootPath, '../../test/data/connectionTwo/connection.json');
        gatewayEntryTwo.associatedWallet = '';

        await gatewayRegistry.clear();
        await gatewayRegistry.add(gatewayEntryOne);
        await gatewayRegistry.add(gatewayEntryTwo);

        walletEntryOne = new FabricWalletRegistryEntry({
            name: 'purpleWallet',
            walletPath: '/some/path'
        });

        walletEntryTwo = new FabricWalletRegistryEntry({
            name: 'blueWallet',
            walletPath: '/some/other/path'
        });

        await walletRegistry.clear();
        await walletRegistry.add(walletEntryOne);
        await walletRegistry.add(walletEntryTwo);

        const fabricConnectionManager: FabricConnectionManager = FabricConnectionManager.instance();
        const fabricRuntimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();

        fabricRuntimeConnectionStub = sinon.createStubInstance(FabricRuntimeConnection);
        fabricRuntimeConnectionStub.getAllPeerNames.returns(['myPeerOne', 'myPeerTwo']);

        const chaincodeMap: Map<string, Array<string>> = new Map<string, Array<string>>();
        chaincodeMap.set('biscuit-network', ['0.0.1', '0.0.2']);
        chaincodeMap.set('cake-network', ['0.0.3']);
        fabricRuntimeConnectionStub.getInstalledChaincode.withArgs('myPeerOne').resolves(chaincodeMap);
        fabricRuntimeConnectionStub.getInstalledChaincode.withArgs('myPeerTwo').resolves(new Map<string, Array<string>>());
        fabricRuntimeConnectionStub.getInstantiatedChaincode.withArgs(['myPeerOne', 'myPeerTwo'], 'channelOne').resolves([{ name: 'biscuit-network', channel: 'channelOne', version: '0.0.1' }, { name: 'cake-network', channel: 'channelOne', version: '0.0.3' }]);
        fabricRuntimeConnectionStub.getAllCertificateAuthorityNames.returns(['ca.example.cake.com', 'ca1.example.cake.com']);
        const map: Map<string, Array<string>> = new Map<string, Array<string>>();
        map.set('channelOne', ['myPeerOne', 'myPeerTwo']);
        fabricRuntimeConnectionStub.createChannelMap.resolves(map);
        const chaincodeMapTwo: Map<string, Array<string>> = new Map<string, Array<string>>();

        fabricRuntimeConnectionStub.getInstantiatedChaincode.withArgs('channelTwo').resolves(chaincodeMapTwo);

        fabricClientConnectionStub = sinon.createStubInstance(FabricClientConnection);
        fabricClientConnectionStub.createChannelMap.resolves(map);
        fabricClientConnectionStub.getInstantiatedChaincode.withArgs('channelOne').resolves([{ name: 'biscuit-network', channel: 'channelOne', version: '0.0.1' }, { name: 'cake-network', channel: 'channelOne', version: '0.0.3' }]);
        getConnectionStub = mySandBox.stub(fabricConnectionManager, 'getConnection').returns(fabricClientConnectionStub);
        mySandBox.stub(fabricRuntimeManager, 'getConnection').returns(fabricRuntimeConnectionStub);
        mySandBox.stub(fabricRuntimeManager, 'getGatewayRegistryEntries').resolves([
            new FabricGatewayRegistryEntry({
                name: FabricRuntimeUtil.LOCAL_FABRIC,
                managedRuntime: true,
                connectionProfilePath: 'connection.json',
                associatedWallet: FabricWalletUtil.LOCAL_WALLET
            })
        ]);

        quickPickStub = mySandBox.stub(vscode.window, 'showQuickPick');
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
            managedRuntime.name = FabricRuntimeUtil.LOCAL_FABRIC;
            managedRuntime.managedRuntime = true;
            managedRuntime.associatedWallet = FabricWalletUtil.LOCAL_WALLET;
            managedRuntime.connectionProfilePath = 'connection.json';

            quickPickStub.resolves();
            await UserInputUtil.showGatewayQuickPickBox('Choose a gateway', true);
            quickPickStub.should.have.been.calledWith([{ label: managedRuntime.name, data: managedRuntime }, { label: gatewayEntryOne.name, data: gatewayEntryOne }]);
        });

        it('should show any gateways with an associated wallet (associated gateway)', async () => {
            mySandBox.stub(gatewayRegistry, 'getAll').returns([gatewayEntryOne, gatewayEntryTwo]);
            quickPickStub.resolves({ label: gatewayEntryOne.name, data: gatewayEntryOne });
            const result: IBlockchainQuickPickItem<FabricGatewayRegistryEntry> = await UserInputUtil.showGatewayQuickPickBox('Choose a gateway', false, true);
            quickPickStub.should.have.been.calledWith([{ label: gatewayEntryOne.name, data: gatewayEntryOne }], {
                ignoreFocusOut: false,
                canPickMany: false,
                placeHolder: 'Choose a gateway'
            });
            result.label.should.equal('myGatewayA');
            result.data.should.deep.equal(gatewayEntryOne);
        });

        it('should show any gateways with an associated wallet (dissociated gateway)', async () => {
            mySandBox.stub(gatewayRegistry, 'getAll').returns([gatewayEntryOne, gatewayEntryTwo]);
            quickPickStub.resolves({ label: gatewayEntryTwo.name, data: gatewayEntryTwo });
            const result: IBlockchainQuickPickItem<FabricGatewayRegistryEntry> = await UserInputUtil.showGatewayQuickPickBox('Choose a gateway', false, false);
            quickPickStub.should.have.been.calledWith([{ label: gatewayEntryTwo.name, data: gatewayEntryTwo }], {
                ignoreFocusOut: false,
                canPickMany: false,
                placeHolder: 'Choose a gateway'
            });
            result.label.should.equal('myGatewayB');
            result.data.should.deep.equal(gatewayEntryTwo);
        });
    });

    describe('showIdentitiesQuickPickBox', () => {

        it('should show identity names in the quickpick box', async () => {
            quickPickStub.resolves(FabricRuntimeUtil.ADMIN_USER);
            const result: string = await UserInputUtil.showIdentitiesQuickPickBox('choose an identity to connect with', identities);

            result.should.equal(FabricRuntimeUtil.ADMIN_USER);
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
                ignoreFocusOut: true,
                value: undefined,
                valueSelection: [0, 0]
            });
        });

        it('should show the input box with a default value', async () => {
            const inputStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showInputBox').resolves('my answer');

            const result: string = await UserInputUtil.showInputBox('a question', 'a sensible answer');
            result.should.equal('my answer');
            inputStub.should.have.been.calledWith({
                prompt: 'a question',
                ignoreFocusOut: true,
                value: 'a sensible answer',
                valueSelection: [0, 0]
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

    describe('showPeersQuickPickBox', () => {
        it('should show the peer names', async () => {
            quickPickStub.resolves(['myPeerOne']);
            const result: string[] = await UserInputUtil.showPeersQuickPickBox('Choose a peer');
            quickPickStub.should.have.been.calledWith(['myPeerOne', 'myPeerTwo'],  {
                ignoreFocusOut: false,
                canPickMany: true,
                placeHolder: 'Choose a peer'
            });
            result.should.deep.equal(['myPeerOne']);
        });

        it('should not show quickPick if only one peer', async () => {
            fabricRuntimeConnectionStub.getAllPeerNames.returns(['myPeerOne']);

            const result: string[] = await UserInputUtil.showPeersQuickPickBox('Choose a peer');
            result.should.deep.equal(['myPeerOne']);
            quickPickStub.should.not.have.been.called;
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
            quickPickStub.callsFake(async (items: LanguageQuickPickItem[]) => {
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
            quickPickStub.callsFake(async (items: LanguageQuickPickItem[]) => {
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
            quickPickStub.callsFake(async (items: LanguageQuickPickItem[]) => {
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
            const map: Map<string, Array<string>> = new Map<string, Array<string>>();
            map.set('channelOne', ['myPeerOne', 'myPeerTwo']);
            map.set('channelTwo', ['myPeerOne']);
            fabricRuntimeConnectionStub.createChannelMap.resolves(map);
            quickPickStub.resolves({ label: 'channelOne', data: ['myPeerOne', 'myPeerTwo'] });

            const result: IBlockchainQuickPickItem<Array<string>> = await UserInputUtil.showChannelQuickPickBox('Choose a channel');
            result.should.deep.equal({ label: 'channelOne', data: ['myPeerOne', 'myPeerTwo'] });

            quickPickStub.should.have.been.calledWith(sinon.match.any, {
                ignoreFocusOut: false,
                canPickMany: false,
                placeHolder: 'Choose a channel'
            });
        });

        it('should not show quick pick if only one channel', async () => {
            const result: IBlockchainQuickPickItem<Array<string>> = await UserInputUtil.showChannelQuickPickBox('Choose a channel');
            result.should.deep.equal({ label: 'channelOne', data: ['myPeerOne', 'myPeerTwo'] });

            quickPickStub.should.not.have.been.called;
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

            await UserInputUtil.showChaincodeAndVersionQuickPick('Choose a chaincode and version', ['myPeerOne']);
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
            await UserInputUtil.showChaincodeAndVersionQuickPick('Choose a chaincode and version', ['myPeerOne'], 'biscuit-network', '0.0.1');

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

        it('should not duplicate installed packages', async () => {
            mySandBox.stub(PackageRegistry.instance(), 'getAll').resolves([]);
            mySandBox.stub(UserInputUtil, 'getWorkspaceFolders').returns([]);

            const chaincodeMap: Map<string, Array<string>> = new Map<string, Array<string>>();
            chaincodeMap.set('biscuit-network', ['0.0.1', '0.0.2', '0.0.3']);
            fabricRuntimeConnectionStub.getInstalledChaincode.withArgs('myPeerOne').resolves(chaincodeMap);

            const chaincodeMap2: Map<string, Array<string>> = new Map<string, Array<string>>();
            chaincodeMap2.set('biscuit-network', ['0.0.1', '0.0.3']);
            fabricRuntimeConnectionStub.getInstalledChaincode.withArgs('myPeerTwo').resolves(chaincodeMap2);

            await UserInputUtil.showChaincodeAndVersionQuickPick('Choose a chaincode and version', ['myPeerOne', 'myPeerTwo'], 'biscuit-network', '0.0.1');

            quickPickStub.getCall(0).args[0].length.should.equal(2);
            quickPickStub.getCall(0).args[0].should.deep.equal([
                {
                    label: 'biscuit-network@0.0.2',
                    description: 'Installed',
                    data: { packageEntry: { name: 'biscuit-network', version: '0.0.2', path: undefined }, workspace: undefined }
                },
                {
                    label: `biscuit-network@0.0.3`,
                    description: 'Installed',
                    data: { packageEntry: { name: 'biscuit-network', version: '0.0.3', path: undefined }, workspace: undefined }
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
        it('should replace ~ with the users home directory', () => {
            const packageDirOriginal: string = '~/smartContractDir';
            const packageDirNew: string = UserInputUtil.getDirPath(packageDirOriginal);
            packageDirNew.should.not.contain('~');
        });

        it('should not replace if not ~', () => {
            const packageDirOriginal: string = '/banana/smartContractDir';
            const packageDirNew: string = UserInputUtil.getDirPath(packageDirOriginal);
            packageDirNew.should.equal(packageDirOriginal);
        });
    });

    describe('browse', () => {
        it('should finish if user cancels selecting to browse', async () => {
            const placeHolder: string = 'Enter a file path to the connection profile file';
            const quickPickItems: string[] = [UserInputUtil.BROWSE_LABEL];
            const openDialogOptions: vscode.OpenDialogOptions = {
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                openLabel: 'Select',
                filters: undefined
            };
            const result: string = await UserInputUtil.browse(placeHolder, quickPickItems, openDialogOptions) as string;

            quickPickStub.should.have.been.calledWith([UserInputUtil.BROWSE_LABEL], { placeHolder });

            should.not.exist(result);
        });

        it('should allow folders to be chosen when selected, and not files', async () => {
            quickPickStub.resolves(UserInputUtil.BROWSE_LABEL);
            const showOpenDialogStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showOpenDialog').resolves([{ fsPath: '/some/path' }]);
            const placeHolder: string = 'Enter a file path to the wallet';
            const quickPickItems: string[] = [UserInputUtil.BROWSE_LABEL];
            const openDialogOptions: vscode.OpenDialogOptions = {
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                openLabel: 'Select',
                filters: undefined
            };
            const result: string = await UserInputUtil.browse(placeHolder, quickPickItems, openDialogOptions) as string;

            quickPickStub.should.have.been.calledWith([UserInputUtil.BROWSE_LABEL], { placeHolder });
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
            const quickPickItems: string[] = [UserInputUtil.BROWSE_LABEL];
            const openDialogOptions: vscode.OpenDialogOptions = {
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                openLabel: 'Select',
                filters: {
                    'Connection Profiles': ['json', 'yaml', 'yml']
                }
            };
            const result: string = await UserInputUtil.browse(placeHolder, quickPickItems, openDialogOptions) as string;

            quickPickStub.should.have.been.calledWith([UserInputUtil.BROWSE_LABEL], { placeHolder });
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

        it('should handle any errors', async () => {
            const logSpy: sinon.SinonSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
            quickPickStub.rejects({ message: 'some error' });

            const placeHolder: string = 'Enter a file path to the connection profile json file';
            const quickPickItems: string[] = [UserInputUtil.BROWSE_LABEL];
            const openDialogOptions: vscode.OpenDialogOptions = {
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                openLabel: 'Select',
                filters: undefined
            };

            await UserInputUtil.browse(placeHolder, quickPickItems, openDialogOptions) as string;

            quickPickStub.should.have.been.calledWith([UserInputUtil.BROWSE_LABEL], { placeHolder });

            logSpy.should.have.been.calledWith(LogType.ERROR, 'some error');
        });

        it('should finish if cancels browse dialog', async () => {
            mySandBox.stub(vscode.window, 'showOpenDialog').resolves();
            quickPickStub.resolves(UserInputUtil.BROWSE_LABEL);
            const placeHolder: string = 'Enter a file path to the connection profile json file';
            const quickPickItems: string[] = [UserInputUtil.BROWSE_LABEL];
            const openDialogOptions: vscode.OpenDialogOptions = {
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                openLabel: 'Select',
                filters: undefined
            };
            const result: string = await UserInputUtil.browse(placeHolder, quickPickItems, openDialogOptions) as string;

            quickPickStub.should.have.been.calledWith([UserInputUtil.BROWSE_LABEL], { placeHolder });

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
            const result: string = await UserInputUtil.browse(placeHolder, quickPickItems, openDialogOptions) as string;

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
            const result: string = await UserInputUtil.browse(placeHolder, quickPickItems, openDialogOptions, true) as string;

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
    });

    describe('showCertificateAuthorityQuickPickBox', () => {
        it('should get and show the certificate authority names', async () => {
            quickPickStub.resolves('ca.example.cake.com');
            const result: string = await UserInputUtil.showCertificateAuthorityQuickPickBox('Please choose a CA');

            result.should.deep.equal('ca.example.cake.com');
            quickPickStub.should.have.been.calledWith(['ca.example.cake.com', 'ca1.example.cake.com'], {
                ignoreFocusOut: false,
                canPickMany: false,
                placeHolder: 'Please choose a CA'
            });
        });

        it('should not show quick pick if only one certificate authority', async () => {
            fabricRuntimeConnectionStub.getAllCertificateAuthorityNames.returns(['ca.example.cake.com']);
            const result: string = await UserInputUtil.showCertificateAuthorityQuickPickBox('Please choose a CA');

            result.should.deep.equal('ca.example.cake.com');
            quickPickStub.should.not.have.been.called;
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
            showTextDocumentStub.should.have.been.calledOnceWithExactly(mockDocument, { selection: new vscode.Range(new vscode.Position(15, 0), new vscode.Position(17, 0)) });
        });

        it('should open user settings for mac', async () => {
            mySandBox.stub(process, 'platform').value('darwin');
            mySandBox.stub(path, 'join').returns('/users/test/Library/Application Support/Code/User/settings.json');
            process.env.HOME = '/users/test';
            const openTextDocumentStub: sinon.SinonStub = mySandBox.stub(vscode.workspace, 'openTextDocument').resolves(mockDocument);

            const showTextDocumentStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showTextDocument').resolves();

            await UserInputUtil.openUserSettings('one');

            openTextDocumentStub.should.have.been.calledWith(vscode.Uri.file('/users/test/Library/Application Support/Code/User/settings.json'));
            showTextDocumentStub.should.have.been.calledOnceWithExactly(mockDocument, { selection: new vscode.Range(new vscode.Position(15, 0), new vscode.Position(17, 0)) });
        });

        it('should open user settings for linux', async () => {
            mySandBox.stub(process, 'platform').value('linux');
            mySandBox.stub(path, 'join').returns('/users/test/.config/Code/User/settings.json');
            process.env.HOME = '/users/test';
            const openTextDocumentStub: sinon.SinonStub = mySandBox.stub(vscode.workspace, 'openTextDocument').resolves(mockDocument);

            const showTextDocumentStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showTextDocument').resolves();

            await UserInputUtil.openUserSettings('one');

            openTextDocumentStub.should.have.been.calledWith(vscode.Uri.file('/users/test/.config/Code/User/settings.json'));
            showTextDocumentStub.should.have.been.calledOnceWithExactly(mockDocument, { selection: new vscode.Range(new vscode.Position(15, 0), new vscode.Position(17, 0)) });
        });

        it('should open user settings for linux when editing a wallet', async () => {
            mySandBox.stub(process, 'platform').value('linux');
            mySandBox.stub(path, 'join').returns('/users/test/.config/Code/User/settings.json');
            process.env.HOME = '/users/test';
            const openTextDocumentStub: sinon.SinonStub = mySandBox.stub(vscode.workspace, 'openTextDocument').resolves(mockDocument);

            const showTextDocumentStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showTextDocument').resolves();

            await UserInputUtil.openUserSettings('walletTwo', true);

            openTextDocumentStub.should.have.been.calledWith(vscode.Uri.file('/users/test/.config/Code/User/settings.json'));
            showTextDocumentStub.should.have.been.calledOnceWithExactly(mockDocument, { selection: new vscode.Range(new vscode.Position(29, 0), new vscode.Position(31, 0)) });
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
            this.clock = sinon.useFakeTimers({ toFake: ['setTimeout'] });
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

    describe('showClientInstantiatedSmartContractsQuickPick', () => {

        it('should show the quick pick box for instantiated smart contracts', async () => {
            quickPickStub.resolves({
                label: 'biscuit-network@0.0.1',
                data: { name: 'biscuit-network', channel: 'EnglishChannel', version: '0.0.1' }
            });

            const result: IBlockchainQuickPickItem<{ name: string, channel: string, version: string }> = await UserInputUtil.showClientInstantiatedSmartContractsQuickPick('Please choose instantiated smart contract to test', 'channelOne');
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

            const result: IBlockchainQuickPickItem<{ name: string, channel: string, version: string }> = await UserInputUtil.showClientInstantiatedSmartContractsQuickPick('Please choose instantiated smart contract to test');
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
            fabricRuntimeConnectionStub.getInstantiatedChaincode.returns([]);
            await UserInputUtil.showClientInstantiatedSmartContractsQuickPick('Choose an instantiated smart contract to test', 'channelTwo');
            logSpy.should.have.been.calledWith(LogType.ERROR, 'Local runtime has no instantiated chaincodes');

        });
    });

    describe('showRuntimeInstantiatedSmartContractsQuickPick', () => {

        it('should show the quick pick box for instantiated smart contracts', async () => {
            quickPickStub.resolves({
                label: 'biscuit-network@0.0.1',
                data: { name: 'biscuit-network', channel: 'EnglishChannel', version: '0.0.1' }
            });

            const result: IBlockchainQuickPickItem<{ name: string, channel: string, version: string }> = await UserInputUtil.showRuntimeInstantiatedSmartContractsQuickPick('Please choose instantiated smart contract to test', 'channelOne');
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

            const result: IBlockchainQuickPickItem<{ name: string, channel: string, version: string }> = await UserInputUtil.showRuntimeInstantiatedSmartContractsQuickPick('Please choose instantiated smart contract to test');
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
            fabricRuntimeConnectionStub.getInstantiatedChaincode.returns([]);
            await UserInputUtil.showRuntimeInstantiatedSmartContractsQuickPick('Choose an instantiated smart contract to test', 'channelTwo');
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

    describe('showContractQuickPick', () => {
        it('should show a list of contracts to choose from', async () => {
            quickPickStub.resolves('myContract');
            const result: string = await UserInputUtil.showContractQuickPick('choose a contract', ['myContract', 'myOtherContract']);
            result.should.equal('myContract');
        });
    });

    describe('showTransactionQuickPick', () => {
        it('should get a list of transactions', async () => {
            quickPickStub.resolves({
                label: 'my-contract - transaction1',
                data: { name: 'transaction1', contract: 'my-contract' }
            });
            fabricClientConnectionStub.getMetadata.resolves(
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
            fabricClientConnectionStub.getMetadata.resolves(null);
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
            fabricClientConnectionStub.getMetadata.resolves(null);
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

    describe('showAddWalletOptionsQuickPick', () => {

        it('should show options to add wallet in the quick pick box', async () => {
            quickPickStub.resolves(UserInputUtil.WALLET_NEW_ID);
            const result: string = await UserInputUtil.showAddWalletOptionsQuickPick('choose option to add wallet with');

            result.should.equal(UserInputUtil.WALLET_NEW_ID);
            quickPickStub.should.have.been.calledWith(sinon.match.any, {
                matchOnDetail: true,
                placeHolder: 'choose option to add wallet with',
                ignoreFocusOut: true,
                canPickMany: false,
            });
        });
    });

    describe('showWalletsQuickPickBox', () => {

        it('should show wallets to select', async () => {
            const testFabricWallet: FabricWallet = new FabricWallet('some/local/path');
            mySandBox.stub(FabricWalletGenerator.instance(), 'createLocalWallet').resolves(testFabricWallet);

            quickPickStub.resolves({
                label: walletEntryOne.name,
                data: walletEntryOne
            });
            const result: IBlockchainQuickPickItem<FabricWalletRegistryEntry> = await UserInputUtil.showWalletsQuickPickBox('Choose a wallet', false);

            result.label.should.equal(walletEntryOne.name);
            result.data.should.deep.equal(walletEntryOne);
            quickPickStub.should.have.been.calledWith(sinon.match.any, {
                ignoreFocusOut: false,
                canPickMany: false,
                placeHolder: 'Choose a wallet'
            });
        });

        it('should allow the user to select the in house wallet', async () => {
            const testFabricWallet: FabricWallet = new FabricWallet('some/local/path');
            mySandBox.stub(FabricWalletGenerator.instance(), 'createLocalWallet').resolves(testFabricWallet);

            const localWalletEntry: FabricWalletRegistryEntry = new FabricWalletRegistryEntry({
                name: FabricWalletUtil.LOCAL_WALLET,
                walletPath: 'some/local/path',
                managedWallet: true
            });

            quickPickStub.resolves();
            await UserInputUtil.showWalletsQuickPickBox('Choose a wallet', true);
            quickPickStub.should.have.been.calledWith([
                { label: localWalletEntry.name, data: localWalletEntry },
                { label: walletEntryOne.name, data: walletEntryOne },
                { label: walletEntryTwo.name, data: walletEntryTwo }]);
        });

    });

    describe('addIdentityMethod', () => {

        it('should ask how to add an identity for a non-local wallet', async () => {
            quickPickStub.resolves(UserInputUtil.ADD_CERT_KEY_OPTION);
            const result: string = await UserInputUtil.addIdentityMethod(false);

            result.should.equal(UserInputUtil.ADD_CERT_KEY_OPTION);
            quickPickStub.should.have.been.calledWith([UserInputUtil.ADD_CERT_KEY_OPTION, UserInputUtil.ADD_JSON_ID_OPTION, UserInputUtil.ADD_ID_SECRET_OPTION], {
                placeHolder: 'Choose a method for adding an identity',
                ignoreFocusOut: true,
                canPickMany: false
            });
        });

        it('should ask how to add an identity for the local fabric wallet', async () => {
            quickPickStub.resolves(UserInputUtil.ADD_CERT_KEY_OPTION);
            const result: string = await UserInputUtil.addIdentityMethod(true);

            result.should.equal(UserInputUtil.ADD_CERT_KEY_OPTION);
            quickPickStub.should.have.been.calledWith([UserInputUtil.ADD_CERT_KEY_OPTION, UserInputUtil.ADD_JSON_ID_OPTION, UserInputUtil.ADD_LOCAL_ID_SECRET_OPTION], {
                placeHolder: 'Choose a method for adding an identity',
                ignoreFocusOut: true,
                canPickMany: false
            });
        });
    });

    describe('getCertKey', () => {

        it('should cancel adding certificate path', async () => {
            const quickPickItems: string[] = [UserInputUtil.BROWSE_LABEL];
            const openDialogOptions: vscode.OpenDialogOptions = {
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                openLabel: 'Select',
                filters: undefined
            };
            const browseStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'browse');
            browseStub.onCall(0).resolves();
            const result: { certificatePath: string, privateKeyPath: string } = await UserInputUtil.getCertKey();

            should.equal(result, undefined);
            browseStub.should.have.been.calledOnceWithExactly('Browse for a certificate file', quickPickItems, openDialogOptions);

        });

        it('should stop if certificate is invalid', async () => {
            const quickPickItems: string[] = [UserInputUtil.BROWSE_LABEL];
            const openDialogOptions: vscode.OpenDialogOptions = {
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                openLabel: 'Select',
                filters: undefined
            };
            const browseStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'browse');
            browseStub.onCall(0).resolves('/some/path');

            const error: Error = new Error('Could not validate certificate: invalid PEM');
            const validPem: sinon.SinonStub = mySandBox.stub(ParsedCertificate, 'validPEM').onFirstCall().throws(error);

            await UserInputUtil.getCertKey().should.be.rejectedWith(error);

            browseStub.should.have.been.calledOnceWithExactly('Browse for a certificate file', quickPickItems, openDialogOptions);
            validPem.should.have.been.calledOnceWithExactly('/some/path', 'certificate');
        });

        it('should cancel adding private key path', async () => {
            const quickPickItems: string[] = [UserInputUtil.BROWSE_LABEL];
            const openDialogOptions: vscode.OpenDialogOptions = {
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                openLabel: 'Select',
                filters: undefined
            };
            const browseStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'browse');
            browseStub.onCall(0).resolves('/some/path');
            browseStub.onCall(1).resolves();
            const validPem: sinon.SinonStub = mySandBox.stub(ParsedCertificate, 'validPEM').onFirstCall().returns(undefined);

            const result: { certificatePath: string, privateKeyPath: string } = await UserInputUtil.getCertKey();

            should.equal(result, undefined);
            browseStub.getCall(0).should.have.been.calledWithExactly('Browse for a certificate file', quickPickItems, openDialogOptions);
            browseStub.getCall(1).should.have.been.calledWithExactly('Browse for a private key file', quickPickItems, openDialogOptions);
            validPem.should.have.been.calledOnceWithExactly('/some/path', 'certificate');
        });

        it('should stop if private key is invalid', async () => {
            const quickPickItems: string[] = [UserInputUtil.BROWSE_LABEL];
            const openDialogOptions: vscode.OpenDialogOptions = {
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                openLabel: 'Select',
                filters: undefined
            };
            const browseStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'browse');
            browseStub.onCall(0).resolves('/some/cert');
            browseStub.onCall(1).resolves('/some/key');

            const error: Error = new Error('Could not validate private key: invalid PEM');
            const validPem: sinon.SinonStub = mySandBox.stub(ParsedCertificate, 'validPEM');
            validPem.onFirstCall().returns(undefined);
            validPem.onSecondCall().throws(error);

            await UserInputUtil.getCertKey().should.be.rejectedWith(error);

            browseStub.getCall(0).should.have.been.calledWithExactly('Browse for a certificate file', quickPickItems, openDialogOptions);
            browseStub.getCall(1).should.have.been.calledWithExactly('Browse for a private key file', quickPickItems, openDialogOptions);
            validPem.getCall(0).should.have.been.calledWithExactly('/some/cert', 'certificate');
            validPem.getCall(1).should.have.been.calledWithExactly('/some/key', 'private key');
        });

        it('should return certificate and private key paths', async () => {
            const quickPickItems: string[] = [UserInputUtil.BROWSE_LABEL];
            const openDialogOptions: vscode.OpenDialogOptions = {
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                openLabel: 'Select',
                filters: undefined
            };
            const browseStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'browse');
            browseStub.onCall(0).resolves('/some/cert');
            browseStub.onCall(1).resolves('/some/key');

            const validPem: sinon.SinonStub = mySandBox.stub(ParsedCertificate, 'validPEM').returns(undefined);

            const { certificatePath, privateKeyPath } = await UserInputUtil.getCertKey();
            certificatePath.should.equal('/some/cert');
            privateKeyPath.should.equal('/some/key');

            browseStub.getCall(0).should.have.been.calledWithExactly('Browse for a certificate file', quickPickItems, openDialogOptions);
            browseStub.getCall(1).should.have.been.calledWithExactly('Browse for a private key file', quickPickItems, openDialogOptions);
            validPem.getCall(0).should.have.been.calledWithExactly('/some/cert', 'certificate');
            validPem.getCall(1).should.have.been.calledWithExactly('/some/key', 'private key');
        });
    });

    describe('getEnrollIdSecret', () => {

        it('should cancel entering enrollment ID', async () => {
            const showInputBox: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'showInputBox');
            showInputBox.onCall(0).resolves();

            const result: { enrollmentID: string, enrollmentSecret: string } = await UserInputUtil.getEnrollIdSecret();
            should.equal(result, undefined);
            showInputBox.getCall(0).should.have.been.calledWithExactly('Enter enrollment ID');
        });

        it('should cancel entering enrollment secret', async () => {
            const showInputBox: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'showInputBox');
            showInputBox.onCall(0).resolves('some_id');
            showInputBox.onCall(1).resolves();

            const result: { enrollmentID: string, enrollmentSecret: string } = await UserInputUtil.getEnrollIdSecret();
            should.equal(result, undefined);
            showInputBox.getCall(0).should.have.been.calledWithExactly('Enter enrollment ID');
            showInputBox.getCall(1).should.have.been.calledWithExactly('Enter enrollment secret');
        });

        it('should get enrollment id and secret', async () => {
            const showInputBox: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'showInputBox');
            showInputBox.onCall(0).resolves('some_id');
            showInputBox.onCall(1).resolves('some_secret');

            const { enrollmentID, enrollmentSecret } = await UserInputUtil.getEnrollIdSecret();
            enrollmentID.should.equal('some_id');
            enrollmentSecret.should.equal('some_secret');
            showInputBox.getCall(0).should.have.been.calledWithExactly('Enter enrollment ID');
            showInputBox.getCall(1).should.have.been.calledWithExactly('Enter enrollment secret');
        });
    });

    describe('showDebugCommandList', () => {
        it('should show the list of commands', async () => {
            quickPickStub.resolves({ label: 'Submit transaction', data: ExtensionCommands.SUBMIT_TRANSACTION });

            const commands: Array<{ name: string, command: string }> = [
                {
                    name: 'Submit Transaction',
                    command: ExtensionCommands.SUBMIT_TRANSACTION
                },
                {
                    name: 'Evaluate Transaction',
                    command: ExtensionCommands.EVALUATE_TRANSACTION
                }
            ];

            const result: IBlockchainQuickPickItem<string> = await UserInputUtil.showDebugCommandList(commands, 'Choose a command to run');
            result.should.deep.equal({ label: 'Submit transaction', data: ExtensionCommands.SUBMIT_TRANSACTION });
        });
    });

    describe('showRuntimeNodeQuickPick', () => {

        const nodes: FabricNode[] = [
            FabricNode.newPeer('peer0.org1.example.com', 'peer0.org1.example.com', 'grpc://localhost:7051', 'local_fabric_wallet', 'admin', 'Org1MSP'),
            FabricNode.newCertificateAuthority('ca.org1.example.com', 'ca.org1.example.com', 'http://localhost:7054', 'ca_name', 'local_fabric_wallet', 'admin', 'Org1MSP'),
            FabricNode.newOrderer('orderer.example.com', 'orderer.example.com', 'grpc://localhost:7050', 'local_fabric_wallet', 'admin', 'OrdererMSP'),
            FabricNode.newCouchDB('couchdb', 'couchdb', 'http://localhost:5984')
        ];

        beforeEach(() => {
            const mockRuntime: sinon.SinonStubbedInstance<FabricRuntime> = sinon.createStubInstance(FabricRuntime);
            mySandBox.stub(FabricRuntimeManager.instance(), 'getRuntime').returns(mockRuntime);
            mockRuntime.getNodes.resolves(nodes);
        });

        it('should allow the user to select a node', async () => {
            quickPickStub.resolves({ data: nodes[0] });
            const node: FabricNode = await UserInputUtil.showRuntimeNodeQuickPick('Gimme a node', [FabricNodeType.PEER, FabricNodeType.ORDERER]);
            node.should.equal(nodes[0]);
            quickPickStub.should.have.been.calledOnceWithExactly([
                { label: 'peer0.org1.example.com', data: nodes[0] },
                { label: 'orderer.example.com', data: nodes[2] }
            ], {
                    ignoreFocusOut: false,
                    canPickMany: false,
                    placeHolder: 'Gimme a node'
                });
        });

        it('should return undefined if the user cancels selecting a node', async () => {
            quickPickStub.resolves(undefined);
            const node: FabricNode = await UserInputUtil.showRuntimeNodeQuickPick('Gimme a node', [FabricNodeType.PEER, FabricNodeType.ORDERER]);
            should.equal(node, undefined);
            quickPickStub.should.have.been.calledOnceWithExactly([
                { label: 'peer0.org1.example.com', data: nodes[0] },
                { label: 'orderer.example.com', data: nodes[2] }
            ], {
                    ignoreFocusOut: false,
                    canPickMany: false,
                    placeHolder: 'Gimme a node'
                });
        });

    });

    describe('failedActivationWindow', () => {

        it('should display failed to activate message', async () => {
            const showErrorMessageStub: sinon.SinonSpy = mySandBox.stub(vscode.window, 'showErrorMessage').resolves();
            await UserInputUtil.failedActivationWindow('some error');
            showErrorMessageStub.should.have.been.calledOnceWithExactly('Failed to activate extension: some error', 'Retry activation');
        });

        it('should reload window if selected', async () => {
            const executeCommandStub: sinon.SinonStub = mySandBox.stub(vscode.commands, 'executeCommand').resolves();
            const showErrorMessageStub: sinon.SinonSpy = mySandBox.stub(vscode.window, 'showErrorMessage').resolves('Retry activation');
            await UserInputUtil.failedActivationWindow('some error');
            showErrorMessageStub.should.have.been.calledOnceWithExactly('Failed to activate extension: some error', 'Retry activation');
            executeCommandStub.should.have.been.calledOnceWithExactly('workbench.action.reloadWindow');
        });
    });

});
