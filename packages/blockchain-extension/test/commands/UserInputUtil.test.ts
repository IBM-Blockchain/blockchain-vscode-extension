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
import { UserInputUtil, IBlockchainQuickPickItem, LanguageQuickPickItem, LanguageType } from '../../extension/commands/UserInputUtil';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { FabricGatewayConnectionManager } from '../../extension/fabric/FabricGatewayConnectionManager';
import { PackageRegistryEntry } from '../../extension/registries/PackageRegistryEntry';
import { PackageRegistry } from '../../extension/registries/PackageRegistry';
import * as fs from 'fs-extra';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { FabricGatewayConnection } from 'ibm-blockchain-platform-gateway-v1';
import { FabricWallet } from 'ibm-blockchain-platform-wallet';
import { FabricWalletGenerator } from 'ibm-blockchain-platform-wallet';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricEnvironmentConnection } from 'ibm-blockchain-platform-environment-v1';
import { FabricCertificate, FabricEnvironmentRegistry, FabricRuntimeUtil, FabricWalletRegistry, FabricWalletRegistryEntry, FabricNode, FabricNodeType, FabricEnvironmentRegistryEntry, LogType, EnvironmentType, FabricGatewayRegistry, FabricGatewayRegistryEntry, FabricEnvironment } from 'ibm-blockchain-platform-common';
import { FabricEnvironmentManager } from '../../extension/fabric/environments/FabricEnvironmentManager';

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
    let environmentEntryOne: FabricEnvironmentRegistryEntry;
    let environmentEntryTwo: FabricEnvironmentRegistryEntry;

    let getConnectionStub: sinon.SinonStub;
    let fabricRuntimeConnectionStub: sinon.SinonStubbedInstance<FabricEnvironmentConnection>;
    let fabricClientConnectionStub: sinon.SinonStubbedInstance<FabricGatewayConnection>;

    let environmentStub: sinon.SinonStub;
    let logSpy: sinon.SinonSpy;

    const env: NodeJS.ProcessEnv = Object.assign({}, process.env);

    before(async () => {
        await TestUtil.setupTests(mySandBox);
    });

    beforeEach(async () => {
        logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');

        environmentEntryOne = new FabricEnvironmentRegistryEntry({
            name: 'myFabric'
        });

        await FabricEnvironmentRegistry.instance().clear();
        await FabricEnvironmentRegistry.instance().add(environmentEntryOne);

        environmentEntryTwo = new FabricEnvironmentRegistryEntry({
            name: 'otherFabric'
        });

        await FabricEnvironmentRegistry.instance().add(environmentEntryTwo);

        await TestUtil.setupLocalFabric();

        gatewayEntryOne = new FabricGatewayRegistryEntry();
        gatewayEntryOne.name = 'myGatewayA';
        gatewayEntryOne.associatedWallet = 'blueWallet';
        identities = [FabricRuntimeUtil.ADMIN_USER, 'Test@org1.example.com'];

        gatewayEntryTwo = new FabricGatewayRegistryEntry();
        gatewayEntryTwo.name = 'myGatewayB';
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

        const fabricConnectionManager: FabricGatewayConnectionManager = FabricGatewayConnectionManager.instance();

        fabricRuntimeConnectionStub = mySandBox.createStubInstance(FabricEnvironmentConnection);
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

        fabricClientConnectionStub = mySandBox.createStubInstance(FabricGatewayConnection);
        fabricClientConnectionStub.createChannelMap.resolves(map);
        fabricClientConnectionStub.getInstantiatedChaincode.withArgs('channelOne').resolves([{ name: 'biscuit-network', channel: 'channelOne', version: '0.0.1' }, { name: 'cake-network', channel: 'channelOne', version: '0.0.3' }]);
        getConnectionStub = mySandBox.stub(fabricConnectionManager, 'getConnection').returns(fabricClientConnectionStub);
        environmentStub = mySandBox.stub(FabricEnvironmentManager.instance(), 'getConnection').returns(fabricRuntimeConnectionStub);

        quickPickStub = mySandBox.stub(vscode.window, 'showQuickPick');
    });

    afterEach(async () => {
        mySandBox.restore();
        process.env = env;
    });

    describe('showEnvironmentQuickPickBox', () => {

        it('should show only remote environments', async () => {
            quickPickStub.resolves({ label: environmentEntryOne.name, data: environmentEntryOne });

            const result: IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry> = await UserInputUtil.showFabricEnvironmentQuickPickBox('choose an environment', false, true) as IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>;

            result.data.name.should.equal(environmentEntryOne.name);

            quickPickStub.should.have.been.calledWith([{ label: environmentEntryOne.name, data: environmentEntryOne }, { label: environmentEntryTwo.name, data: environmentEntryTwo }], {
                ignoreFocusOut: true,
                canPickMany: false,
                placeHolder: 'choose an environment'
            });
        });

        it('should show multiple environments', async () => {
            quickPickStub.resolves([{ label: environmentEntryOne.name, data: environmentEntryOne }, { label: environmentEntryTwo.name, data: environmentEntryTwo }]);

            const results: IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>[] = await UserInputUtil.showFabricEnvironmentQuickPickBox('choose an environment', true, false) as IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>[];

            results[0].data.name.should.equal(environmentEntryOne.name);
            results[1].data.name.should.equal(environmentEntryTwo.name);

            quickPickStub.should.have.been.calledWith([{ label: environmentEntryOne.name, data: environmentEntryOne }, { label: environmentEntryTwo.name, data: environmentEntryTwo }], {
                ignoreFocusOut: true,
                canPickMany: true,
                placeHolder: 'choose an environment'
            });
        });

        it('should show all environments', async () => {
            const localFabricEntry: FabricEnvironmentRegistryEntry = await FabricEnvironmentRegistry.instance().get(FabricRuntimeUtil.LOCAL_FABRIC);

            quickPickStub.resolves({ label: environmentEntryOne.name, data: environmentEntryOne });

            const result: IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry> = await UserInputUtil.showFabricEnvironmentQuickPickBox('choose an environment', false, false, true) as IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>;

            result.data.name.should.equal(environmentEntryOne.name);

            quickPickStub.should.have.been.calledWith([{ label: FabricRuntimeUtil.LOCAL_FABRIC, data: localFabricEntry }, { label: environmentEntryOne.name, data: environmentEntryOne }, { label: environmentEntryTwo.name, data: environmentEntryTwo }], {
                ignoreFocusOut: true,
                canPickMany: false,
                placeHolder: 'choose an environment'
            });
        });

        it('should throw error if no environments', async () => {
            await FabricEnvironmentRegistry.instance().clear();

            await UserInputUtil.showFabricEnvironmentQuickPickBox('choose an environment', false, true).should.eventually.rejectedWith('Error when choosing environment, no environments found to choose from.');

            quickPickStub.should.not.have.been.called;
        });

        it('should not show quick pick if only one', async () => {
            const localFabricEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
            localFabricEntry.name = FabricRuntimeUtil.LOCAL_FABRIC;
            localFabricEntry.managedRuntime = true;
            localFabricEntry.environmentType = EnvironmentType.ANSIBLE_ENVIRONMENT;

            await FabricEnvironmentRegistry.instance().clear();

            await TestUtil.setupLocalFabric();

            const result: IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry> = await UserInputUtil.showFabricEnvironmentQuickPickBox('choose an environment', false, true, true) as IBlockchainQuickPickItem<FabricEnvironmentRegistryEntry>;
            result.data.name.should.equal(localFabricEntry.name);

            quickPickStub.should.not.have.been.called;
        });
    });

    describe('addMoreNodes', () => {
        it('should show add more nodes quick pick', async () => {
            quickPickStub.resolves(UserInputUtil.ADD_MORE_NODES);

            const result: string = await UserInputUtil.addMoreNodes('do you want to add more nodes?');

            result.should.equal(UserInputUtil.ADD_MORE_NODES);

            quickPickStub.should.have.been.calledWith([UserInputUtil.ADD_MORE_NODES, UserInputUtil.DONE_ADDING_NODES], {
                ignoreFocusOut: true,
                canPickMany: false,
                placeHolder: 'do you want to add more nodes?'
            });
        });
    });

    describe('showGatewayQuickPickBox', () => {
        it('should show connections in the quickpick box', async () => {
            quickPickStub.resolves({ label: gatewayEntryOne.name, data: gatewayEntryOne });
            const result: IBlockchainQuickPickItem<FabricGatewayRegistryEntry> = await UserInputUtil.showGatewayQuickPickBox('Choose a gateway', false) as IBlockchainQuickPickItem<FabricGatewayRegistryEntry>;

            result.label.should.equal('myGatewayA');
            result.data.should.deep.equal(gatewayEntryOne);
            quickPickStub.should.have.been.calledWith(sinon.match.any, {
                ignoreFocusOut: true,
                canPickMany: false,
                placeHolder: 'Choose a gateway'
            });
        });

        it('should show multiple connections in the quickpick box', async () => {
            quickPickStub.resolves([
                {
                    label: gatewayEntryOne.name,
                    data: gatewayEntryOne
                }, {
                    label: gatewayEntryTwo.name,
                    data: gatewayEntryTwo
                }]);
            const results: IBlockchainQuickPickItem<FabricGatewayRegistryEntry>[] = await UserInputUtil.showGatewayQuickPickBox('Choose a gateway', true) as IBlockchainQuickPickItem<FabricGatewayRegistryEntry>[];

            results[0].label.should.equal('myGatewayA');
            results[0].data.should.deep.equal(gatewayEntryOne);
            results[1].label.should.equal('myGatewayB');
            results[1].data.should.deep.equal(gatewayEntryTwo);
            quickPickStub.should.have.been.calledWith(sinon.match.any, {
                ignoreFocusOut: true,
                canPickMany: true,
                placeHolder: 'Choose a gateway'
            });
        });

        it('should show managed runtime if argument passed', async () => {
            const managedGateway: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get(`${FabricRuntimeUtil.LOCAL_FABRIC} - Org1`);

            quickPickStub.resolves();
            await UserInputUtil.showGatewayQuickPickBox('Choose a gateway', false, true);
            quickPickStub.should.have.been.calledWith([{ label: managedGateway.displayName, data: managedGateway }, { label: gatewayEntryOne.name, data: gatewayEntryOne }, { label: gatewayEntryTwo.name, data: gatewayEntryTwo }]);
        });

        it('should show any gateways with an associated wallet (associated gateway)', async () => {
            mySandBox.stub(gatewayRegistry, 'getAll').returns([gatewayEntryOne, gatewayEntryTwo]);
            quickPickStub.resolves({ label: gatewayEntryOne.name, data: gatewayEntryOne });
            const result: IBlockchainQuickPickItem<FabricGatewayRegistryEntry> = await UserInputUtil.showGatewayQuickPickBox('Choose a gateway', false, false, true) as IBlockchainQuickPickItem<FabricGatewayRegistryEntry>;
            quickPickStub.should.have.been.calledWith([{ label: gatewayEntryOne.name, data: gatewayEntryOne }], {
                ignoreFocusOut: true,
                canPickMany: false,
                placeHolder: 'Choose a gateway'
            });
            result.label.should.equal('myGatewayA');
            result.data.should.deep.equal(gatewayEntryOne);
        });

        it('should show any gateways with an associated wallet (dissociated gateway)', async () => {
            mySandBox.stub(gatewayRegistry, 'getAll').returns([gatewayEntryOne, gatewayEntryTwo]);
            quickPickStub.resolves({ label: gatewayEntryTwo.name, data: gatewayEntryTwo });
            const result: IBlockchainQuickPickItem<FabricGatewayRegistryEntry> = await UserInputUtil.showGatewayQuickPickBox('Choose a gateway', false, false, false) as IBlockchainQuickPickItem<FabricGatewayRegistryEntry>;
            quickPickStub.should.have.been.calledWith([{ label: gatewayEntryTwo.name, data: gatewayEntryTwo }], {
                ignoreFocusOut: true,
                canPickMany: false,
                placeHolder: 'Choose a gateway'
            });
            result.label.should.equal('myGatewayB');
            result.data.should.deep.equal(gatewayEntryTwo);
        });

        it('should filter any gateways using the fromEnvironment property', async () => {
            const managedGateway: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get(`${FabricRuntimeUtil.LOCAL_FABRIC} - Org1`);

            mySandBox.stub(gatewayRegistry, 'getAll').returns([managedGateway, gatewayEntryOne, gatewayEntryTwo]);
            quickPickStub.resolves({ label: managedGateway.name, data: managedGateway });
            const result: IBlockchainQuickPickItem<FabricGatewayRegistryEntry> = await UserInputUtil.showGatewayQuickPickBox('Choose a gateway', false, true, undefined, FabricRuntimeUtil.LOCAL_FABRIC) as IBlockchainQuickPickItem<FabricGatewayRegistryEntry>;
            quickPickStub.should.have.been.calledWith([{ label: managedGateway.name, data: managedGateway }], {
                ignoreFocusOut: true,
                canPickMany: false,
                placeHolder: 'Choose a gateway'
            });
            result.label.should.equal(`${FabricRuntimeUtil.LOCAL_FABRIC} - Org1`);
            result.data.should.deep.equal(managedGateway);
        });

        it('should throw an error if there are no gateways', async () => {
            await FabricGatewayRegistry.instance().clear();

            await UserInputUtil.showGatewayQuickPickBox('Choose a gateway', true, false).should.be.rejectedWith(`Error when choosing gateway, no gateway found to choose from.`);

            quickPickStub.should.not.have.been.calledWith(sinon.match.any, {
                ignoreFocusOut: true,
                canPickMany: true,
                placeHolder: 'Choose a gateway'
            });
        });
    });

    describe('showIdentitiesQuickPickBox', () => {

        it('should show identity names in the quickpick box', async () => {
            quickPickStub.resolves(FabricRuntimeUtil.ADMIN_USER);
            const result: string = await UserInputUtil.showIdentitiesQuickPickBox('choose an identity to connect with', false, identities) as string;

            result.should.equal(FabricRuntimeUtil.ADMIN_USER);
            quickPickStub.should.have.been.calledWith([FabricRuntimeUtil.ADMIN_USER, 'Test@org1.example.com'], {
                ignoreFocusOut: true,
                canPickMany: false,
                placeHolder: 'choose an identity to connect with'
            });
        });

        it('should show multiple identity names in the quickpick box', async () => {
            identities = [FabricRuntimeUtil.ADMIN_USER, 'bob', 'jack'];
            quickPickStub.resolves([FabricRuntimeUtil.ADMIN_USER, 'bob', 'jack']);
            const result: string[] = await UserInputUtil.showIdentitiesQuickPickBox('choose identity', true, identities) as string[];

            result.length.should.equal(3);
            result[0].should.equal(FabricRuntimeUtil.ADMIN_USER);
            result[1].should.equal('bob');
            result[2].should.equal('jack');
            quickPickStub.should.have.been.calledWith([FabricRuntimeUtil.ADMIN_USER, 'bob', 'jack'], {
                ignoreFocusOut: true,
                canPickMany: true,
                placeHolder: 'choose identity'
            });
        });

        it('should show identity names and add identity in the quickpick box', async () => {
            quickPickStub.resolves(FabricRuntimeUtil.ADMIN_USER);
            const result: string = await UserInputUtil.showIdentitiesQuickPickBox('choose an identity to connect with', false, identities, true) as string;

            result.should.equal(FabricRuntimeUtil.ADMIN_USER);
            quickPickStub.should.have.been.calledWith([FabricRuntimeUtil.ADMIN_USER, 'Test@org1.example.com', UserInputUtil.ADD_IDENTITY], {
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

    describe('showQuickPickCA', () => {
        it('should show list of CAs', async () => {
            const caList: string[] = ['ca1', 'ca2', 'ca3'];
            quickPickStub.resolves('ca1');
            const result: string = await UserInputUtil.showQuickPickCA(caList);
            result.should.equal('ca1');

            quickPickStub.should.have.been.calledWith(caList, {
                ignoreFocusOut: true,
                canPickMany: false,
                placeHolder: 'Choose your desired CA from the list'
            });
        });

        it('should cancel CA selection', async () => {
            const caList: string[] = ['ca1', 'ca2', 'ca3'];
            quickPickStub.resolves();
            const result: string = await UserInputUtil.showQuickPickCA(caList);
            should.equal(result, undefined);

            quickPickStub.should.have.been.calledWith(caList, {
                ignoreFocusOut: true,
                canPickMany: false,
                placeHolder: 'Choose your desired CA from the list'
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
            quickPickStub.should.have.been.calledWith(['myPeerOne', 'myPeerTwo'], {
                ignoreFocusOut: true,
                canPickMany: true,
                placeHolder: 'Choose a peer'
            });
            result.should.deep.equal(['myPeerOne']);
        });

        it('should show the peer names passed in', async () => {
            quickPickStub.resolves(['peerThree']);
            const result: string[] = await UserInputUtil.showPeersQuickPickBox('Choose a peer', ['peerThree', 'peerFour']);
            quickPickStub.should.have.been.calledWith(['peerThree', 'peerFour'], {
                ignoreFocusOut: true,
                canPickMany: true,
                placeHolder: 'Choose a peer'
            });
            result.should.deep.equal(['peerThree']);
        });

        it('should not show quickPick if only one peer', async () => {
            fabricRuntimeConnectionStub.getAllPeerNames.returns(['myPeerOne']);

            const result: string[] = await UserInputUtil.showPeersQuickPickBox('Choose a peer');
            result.should.deep.equal(['myPeerOne']);
            quickPickStub.should.not.have.been.called;
        });

        it('should give error if no connection', async () => {
            environmentStub.returns(undefined);

            const result: string[] = await UserInputUtil.showPeersQuickPickBox('Choose a peer');
            should.not.exist(result);
            quickPickStub.should.not.have.been.called;
            logSpy.should.have.been.calledWith(LogType.ERROR, undefined, 'No connection to a blockchain found');
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
                ignoreFocusOut: true,
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
                ignoreFocusOut: true,
                canPickMany: true,
                placeHolder: 'Choose the smart contract package that you want to delete'
            });
        });

        it('should show error and return when there are no open packages', async () => {
            await PackageRegistry.instance().clear();
            const result: Array<IBlockchainQuickPickItem<PackageRegistryEntry>> = await UserInputUtil.showSmartContractPackagesQuickPickBox('Choose the smart contract package that you want to delete', true) as Array<IBlockchainQuickPickItem<PackageRegistryEntry>>;
            should.equal(result, undefined);
            quickPickStub.should.not.have.been.called;
            logSpy.should.have.been.calledWith(LogType.ERROR, 'There are no open packages.');
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

            quickPickStub.should.have.been.calledWith([{ label: 'channelOne', data: ['myPeerOne', 'myPeerTwo'] }, { label: 'channelTwo', data: ['myPeerOne'] }], {
                ignoreFocusOut: true,
                canPickMany: false,
                placeHolder: 'Choose a channel'
            });
        });

        it('should use the channel map passed in', async () => {
            const map: Map<string, Array<string>> = new Map<string, Array<string>>();
            map.set('channelThree', ['myPeerOne', 'myPeerTwo']);
            map.set('channelFour', ['myPeerOne']);
            fabricRuntimeConnectionStub.createChannelMap.resolves(map);
            quickPickStub.resolves({ label: 'channelThree', data: ['myPeerOne', 'myPeerTwo'] });

            const result: IBlockchainQuickPickItem<Array<string>> = await UserInputUtil.showChannelQuickPickBox('Choose a channel', map);
            result.should.deep.equal({ label: 'channelThree', data: ['myPeerOne', 'myPeerTwo'] });

            fabricRuntimeConnectionStub.createChannelMap.should.not.have.been.called;

            quickPickStub.should.have.been.calledWith([{ label: 'channelThree', data: ['myPeerOne', 'myPeerTwo'] }, { label: 'channelFour', data: ['myPeerOne'] }], {
                ignoreFocusOut: true,
                canPickMany: false,
                placeHolder: 'Choose a channel'
            });
        });

        it('should not show quick pick if only one channel', async () => {
            const result: IBlockchainQuickPickItem<Array<string>> = await UserInputUtil.showChannelQuickPickBox('Choose a channel');
            result.should.deep.equal({ label: 'channelOne', data: ['myPeerOne', 'myPeerTwo'] });

            quickPickStub.should.not.have.been.called;
        });

        it('should give error if no connection', async () => {
            environmentStub.returns(undefined);

            const result: IBlockchainQuickPickItem<Array<string>> = await UserInputUtil.showChannelQuickPickBox('Choose a channel');
            should.not.exist(result);

            logSpy.should.have.been.calledWith(LogType.ERROR, undefined, 'No connection to a blockchain found');
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

            await UserInputUtil.showChaincodeAndVersionQuickPick('Choose a chaincode and version', 'channelOne', ['myPeerOne', 'myPeerTwo']);
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
            await UserInputUtil.showChaincodeAndVersionQuickPick('Choose a chaincode and version', 'channelOne', ['myPeerOne', 'myPeerTwo'], 'biscuit-network', '0.0.1');

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

            await UserInputUtil.showChaincodeAndVersionQuickPick('Choose a chaincode and version', 'channelOne', ['myPeerOne', 'myPeerTwo'], 'biscuit-network', '0.0.1');

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

        it('should give error if no connection', async () => {
            environmentStub.returns(undefined);

            const result: IBlockchainQuickPickItem<{ packageEntry: PackageRegistryEntry, workspace: vscode.WorkspaceFolder }> = await UserInputUtil.showChaincodeAndVersionQuickPick('Choose a chaincode and version', 'myChannel', ['myPeerOne']);

            should.not.exist(result);

            logSpy.should.have.been.calledWith(LogType.ERROR, undefined, 'No connection to a blockchain found');
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
        it('should show the workspace folders and their path as a description', async () => {
            mySandBox.stub(UserInputUtil, 'getWorkspaceFolders').returns([
                {
                    name: 'myPath1',
                    uri: {
                        path: 'path1',
                        fsPath: 'pathHere'
                    }
                },
                {
                    name: 'myPath2',
                    uri: {
                        path: 'path2',
                        fsPath: 'pathHere'
                    }
                }]);

            quickPickStub.resolves({
                label: 'myPath1', data: {
                    name: 'myPath1',
                    uri: {
                        path: 'path1',
                        fsPath: 'pathHere'
                    }
                }
            });

            const result: IBlockchainQuickPickItem<vscode.WorkspaceFolder> = await UserInputUtil.showWorkspaceQuickPickBox('choose a folder');
            result.should.deep.equal({
                label: 'myPath1', data: {
                    name: 'myPath1',
                    uri: {
                        path: 'path1',
                        fsPath: 'pathHere'
                    }
                }
            });

            quickPickStub.should.have.been.calledWith([{
                label: 'myPath1', data: {
                    name: 'myPath1',
                    uri: {
                        path: 'path1',
                        fsPath: 'pathHere'
                    }
                }, description: 'pathHere'
            }, {
                label: 'myPath2', data: {
                    name: 'myPath2',
                    uri: {
                        path: 'path2',
                        fsPath: 'pathHere'
                    }
                }, description: 'pathHere'
            }], {
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
                    path: 'path1',
                    fsPath: 'pathHere'
                }
            }]);
            const result: Array<vscode.WorkspaceFolder> = UserInputUtil.getWorkspaceFolders();

            result.should.deep.equal([{
                name: 'myPath1',
                uri: {
                    path: 'path1',
                    fsPath: 'pathHere'
                }
            }]);
        });

        it('should throw an error if no workspace folders', () => {
            mySandBox.stub(vscode.workspace, 'workspaceFolders').value(null);

            const result: Array<vscode.WorkspaceFolder> = UserInputUtil.getWorkspaceFolders();

            result.should.deep.equal([]);
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
            quickPickStub.resolves(UserInputUtil.BROWSE_LABEL);

            mySandBox.stub(vscode.window, 'showOpenDialog').rejects({message: 'some error'});

            const placeHolder: string = 'Enter a file path to the connection profile json file';
            const quickPickItems: string[] = [UserInputUtil.BROWSE_LABEL];
            const openDialogOptions: vscode.OpenDialogOptions = {
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                openLabel: 'Select',
                filters: undefined
            };

            await UserInputUtil.browse(placeHolder, quickPickItems, openDialogOptions);

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

        it('should return a uri and all selected if select many is set', async () => {
            quickPickStub.resolves(UserInputUtil.BROWSE_LABEL);
            const showOpenDialogStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showOpenDialog').resolves([{ fsPath: '/some/path' }, { fsPath: '/some/otherPath' }]);
            const placeHolder: string = 'Select all files to import';
            const quickPickItems: string[] = [UserInputUtil.BROWSE_LABEL];
            const openDialogOptions: vscode.OpenDialogOptions = {
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: true,
                openLabel: 'Select',
                filters: undefined
            };
            const result: string = await UserInputUtil.browse(placeHolder, quickPickItems, openDialogOptions, true) as string;

            quickPickStub.should.have.been.calledWith([UserInputUtil.BROWSE_LABEL], { placeHolder });
            showOpenDialogStub.should.have.been.calledWith({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: true,
                openLabel: 'Select',
                filters: undefined
            });

            result.should.deep.equal([{ fsPath: '/some/path' }, { fsPath: '/some/otherPath' }]);
        });
    });

    describe('showCertificateAuthorityQuickPickBox', () => {
        it('should get and show the certificate authority names', async () => {
            quickPickStub.resolves('ca.example.cake.com');
            const result: string = await UserInputUtil.showCertificateAuthorityQuickPickBox('Please choose a CA');

            result.should.deep.equal('ca.example.cake.com');
            quickPickStub.should.have.been.calledWith(['ca.example.cake.com', 'ca1.example.cake.com'], {
                ignoreFocusOut: true,
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

        it('should give error if no connection', async () => {
            environmentStub.returns(undefined);
            const result: string = await UserInputUtil.showCertificateAuthorityQuickPickBox('Please choose a CA');
            should.not.exist(result);
            logSpy.should.have.been.calledWith(LogType.ERROR, undefined, 'No connection to a blockchain found');
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
            fabricRuntimeConnectionStub.getInstantiatedChaincode.returns([]);
            await UserInputUtil.showRuntimeInstantiatedSmartContractsQuickPick('Choose an instantiated smart contract to test', 'channelTwo');
            logSpy.should.have.been.calledWith(LogType.ERROR, 'Local runtime has no instantiated chaincodes');
        });

        it('should handle no instantiated chaincodes in connection', async () => {
            environmentStub.returns(undefined);
            await UserInputUtil.showRuntimeInstantiatedSmartContractsQuickPick('Choose an instantiated smart contract to test', 'channelTwo');
            logSpy.should.have.been.calledWith(LogType.ERROR, undefined, 'No connection to a blockchain found');
        });
    });

    describe('showTestFileOverwriteQuickPick', () => {
        it('should show yes in the showTestFileOverwriteQuickPick box', async () => {
            quickPickStub.resolves(UserInputUtil.YES);
            const result: string = await UserInputUtil.showTestFileOverwriteQuickPick('Would you like a twix?');
            result.should.equal(UserInputUtil.YES);

            quickPickStub.should.have.been.calledWith(sinon.match.any, {
                ignoreFocusOut: true,
                canPickMany: false,
                placeHolder: 'Would you like a twix?'
            });
        });

        it('should show no in the showTestFileOverwriteQuickPick box', async () => {
            quickPickStub.resolves(UserInputUtil.NO);
            const result: string = await UserInputUtil.showTestFileOverwriteQuickPick('Is it lunchtime yet?');
            result.should.equal(UserInputUtil.NO);

            quickPickStub.should.have.been.calledWith(sinon.match.any, {
                ignoreFocusOut: true,
                canPickMany: false,
                placeHolder: 'Is it lunchtime yet?'
            });
        });

        it('should show generate copy in the showTestFileOverwriteQuickPick box', async () => {
            quickPickStub.resolves(UserInputUtil.GENERATE_NEW_TEST_FILE);
            const result: string = await UserInputUtil.showTestFileOverwriteQuickPick('What should I do next?');
            result.should.equal(UserInputUtil.GENERATE_NEW_TEST_FILE);

            quickPickStub.should.have.been.calledWith(sinon.match.any, {
                ignoreFocusOut: true,
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
            const registryEntry: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
            registryEntry.name = 'myFabric';
            mySandBox.stub(FabricGatewayConnectionManager.instance(), 'getGatewayRegistryEntry').returns(registryEntry);
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
                ignoreFocusOut: true,
                canPickMany: false,
                placeHolder: 'choose a transaction'
            });
        });

        it('should handle no connection', async () => {
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

        it('should give error if no connection', async () => {
            environmentStub.returns(undefined);
            await UserInputUtil.showInstallableSmartContractsQuickPick('Choose which package to install on the peer', new Set(['myPeerOne']));
            logSpy.should.have.been.calledWith(LogType.ERROR, undefined, 'No connection to a blockchain found');
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
            const result: string = await UserInputUtil.showAddWalletOptionsQuickPick('choose option to add wallet with', true);

            result.should.equal(UserInputUtil.WALLET_NEW_ID);
            quickPickStub.should.have.been.calledWith([UserInputUtil.IMPORT_WALLET, UserInputUtil.WALLET_NEW_ID], {
                matchOnDetail: true,
                placeHolder: 'choose option to add wallet with',
                ignoreFocusOut: true,
                canPickMany: false,
            });
        });

        it('should show options to add wallet in the quick pick box when not adding identity', async () => {
            quickPickStub.resolves(UserInputUtil.WALLET);
            const result: string = await UserInputUtil.showAddWalletOptionsQuickPick('choose option to add wallet with', false);

            result.should.equal(UserInputUtil.WALLET);
            quickPickStub.should.have.been.calledWith([UserInputUtil.IMPORT_WALLET, UserInputUtil.WALLET], {
                matchOnDetail: true,
                placeHolder: 'choose option to add wallet with',
                ignoreFocusOut: true,
                canPickMany: false,
            });
        });
    });

    describe('showWalletsQuickPickBox', () => {
        it('should show wallets to select', async () => {
            quickPickStub.resolves({
                label: walletEntryOne.name,
                data: walletEntryOne
            });
            const result: IBlockchainQuickPickItem<FabricWalletRegistryEntry> = await UserInputUtil.showWalletsQuickPickBox('Choose a wallet', false, false) as IBlockchainQuickPickItem<FabricWalletRegistryEntry>;

            result.label.should.equal(walletEntryOne.name);
            result.data.should.deep.equal(walletEntryOne);
            quickPickStub.should.have.been.calledWith(sinon.match.any, {
                ignoreFocusOut: true,
                canPickMany: false,
                placeHolder: 'Choose a wallet'
            });
        });

        it('should show multiple wallets to select', async () => {
            quickPickStub.resolves([
                {
                    label: walletEntryOne.name,
                    data: walletEntryOne
                }, {
                    label: walletEntryTwo.name,
                    data: walletEntryTwo
                }]);
            const results: IBlockchainQuickPickItem<FabricWalletRegistryEntry>[] = await UserInputUtil.showWalletsQuickPickBox('Choose a wallet', true, false) as IBlockchainQuickPickItem<FabricWalletRegistryEntry>[];

            results[0].label.should.equal(walletEntryOne.name);
            results[0].data.should.deep.equal(walletEntryOne);
            results[1].label.should.equal(walletEntryTwo.name);
            results[1].data.should.deep.equal(walletEntryTwo);
            quickPickStub.should.have.been.calledWith(sinon.match.any, {
                ignoreFocusOut: true,
                canPickMany: true,
                placeHolder: 'Choose a wallet'
            });
        });

        it('should allow the user to select the local wallet', async () => {
            const localWalletEntry: FabricWalletRegistryEntry = await FabricWalletRegistry.instance().get('Org1', FabricRuntimeUtil.LOCAL_FABRIC);

            const ordererWalletEntry: FabricWalletRegistryEntry = await FabricWalletRegistry.instance().get('Orderer', FabricRuntimeUtil.LOCAL_FABRIC);

            quickPickStub.resolves();
            await UserInputUtil.showWalletsQuickPickBox('Choose a wallet', false, true);
            quickPickStub.should.have.been.calledWith([
                { label: `${FabricRuntimeUtil.LOCAL_FABRIC} - Org1 Wallet`, data: localWalletEntry },
                { label: `${FabricRuntimeUtil.LOCAL_FABRIC} - Orderer Wallet`, data: ordererWalletEntry },
                { label: walletEntryTwo.name, data: walletEntryTwo },
                { label: walletEntryOne.name, data: walletEntryOne }]);
        });

        it('should show wallets to select and show create wallet', async () => {
            const testFabricWallet: FabricWallet = new FabricWallet('some/local/path');
            const walletStub: sinon.SinonStub = mySandBox.stub(FabricWalletGenerator.instance(), 'getWallet');
            walletStub.callThrough();
            walletStub.withArgs(walletEntryOne).resolves(testFabricWallet);

            quickPickStub.resolves({
                label: walletEntryOne.name,
                data: walletEntryOne
            });
            const result: IBlockchainQuickPickItem<FabricWalletRegistryEntry> = await UserInputUtil.showWalletsQuickPickBox('Choose a wallet', false, false, true) as IBlockchainQuickPickItem<FabricWalletRegistryEntry>;

            result.label.should.equal(walletEntryOne.name);
            result.data.should.deep.equal(walletEntryOne);

            const items: any = [{ label: walletEntryTwo.name, data: walletEntryTwo }, { label: walletEntryOne.name, data: walletEntryOne }, { label: '+ Add new wallet', data: undefined }];
            quickPickStub.should.have.been.calledWith(items, {
                ignoreFocusOut: true,
                canPickMany: false,
                placeHolder: 'Choose a wallet'
            });
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

            const loadFileFromDiskStub: sinon.SinonStub = mySandBox.stub(FabricCertificate, 'loadFileFromDisk').returns('someCert');
            const error: Error = new Error('Invalid certificate: invalid body');
            const validateCertificateStub: sinon.SinonStub = mySandBox.stub(FabricCertificate, 'validateCertificate').throws(error);

            await UserInputUtil.getCertKey().should.be.rejectedWith(error);

            browseStub.should.have.been.calledOnceWithExactly('Browse for a certificate file', quickPickItems, openDialogOptions);
            loadFileFromDiskStub.should.have.been.calledOnceWithExactly('/some/path');
            validateCertificateStub.should.have.been.calledOnceWithExactly('someCert');
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

            const loadFileFromDiskStub: sinon.SinonStub = mySandBox.stub(FabricCertificate, 'loadFileFromDisk').returns('someCert');
            const validateCertificateStub: sinon.SinonStub = mySandBox.stub(FabricCertificate, 'validateCertificate').returns(undefined);

            const result: { certificatePath: string, privateKeyPath: string } = await UserInputUtil.getCertKey();

            should.equal(result, undefined);
            browseStub.getCall(0).should.have.been.calledWithExactly('Browse for a certificate file', quickPickItems, openDialogOptions);
            browseStub.getCall(1).should.have.been.calledWithExactly('Browse for a private key file', quickPickItems, openDialogOptions);
            loadFileFromDiskStub.should.have.been.calledOnceWithExactly('/some/path');
            validateCertificateStub.should.have.been.calledOnceWithExactly('someCert');
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

            const loadFileFromDiskStub: sinon.SinonStub = mySandBox.stub(FabricCertificate, 'loadFileFromDisk');
            loadFileFromDiskStub.onCall(0).returns('someCert');
            loadFileFromDiskStub.onCall(1).returns('someKey');
            const validateCertificateStub: sinon.SinonStub = mySandBox.stub(FabricCertificate, 'validateCertificate').returns(undefined);
            const error: Error = new Error('Invalid private key');
            const validatePrivateKeyStub: sinon.SinonStub = mySandBox.stub(FabricCertificate, 'validatePrivateKey').throws(error);

            await UserInputUtil.getCertKey().should.be.rejectedWith('Invalid private key');

            browseStub.getCall(0).should.have.been.calledWithExactly('Browse for a certificate file', quickPickItems, openDialogOptions);
            browseStub.getCall(1).should.have.been.calledWithExactly('Browse for a private key file', quickPickItems, openDialogOptions);
            loadFileFromDiskStub.should.have.been.calledTwice;
            validateCertificateStub.should.have.been.calledOnceWithExactly('someCert');
            validatePrivateKeyStub.should.have.been.calledOnceWithExactly('someKey');

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

            const loadFileFromDiskStub: sinon.SinonStub = mySandBox.stub(FabricCertificate, 'loadFileFromDisk');
            loadFileFromDiskStub.onCall(0).returns('someCert');
            loadFileFromDiskStub.onCall(1).returns('someKey');
            const validateCertificateStub: sinon.SinonStub = mySandBox.stub(FabricCertificate, 'validateCertificate').returns(undefined);
            const validatePrivateKeyStub: sinon.SinonStub = mySandBox.stub(FabricCertificate, 'validatePrivateKey').returns(undefined);

            const { certificatePath, privateKeyPath } = await UserInputUtil.getCertKey();
            certificatePath.should.equal('/some/cert');
            privateKeyPath.should.equal('/some/key');

            browseStub.getCall(0).should.have.been.calledWithExactly('Browse for a certificate file', quickPickItems, openDialogOptions);
            browseStub.getCall(1).should.have.been.calledWithExactly('Browse for a private key file', quickPickItems, openDialogOptions);
            loadFileFromDiskStub.should.have.been.calledTwice;
            validateCertificateStub.should.have.been.calledOnceWithExactly('someCert');
            validatePrivateKeyStub.should.have.been.calledOnceWithExactly('someKey');
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

    describe('showFabricNodeQuickPick', () => {

        let peerNode: FabricNode;
        let caNode: FabricNode;
        let ordererNode: FabricNode;
        let ordererNode1: FabricNode;
        let couchdbNode: FabricNode;

        let nodes: FabricNode[] = [];
        let getNodesStub: sinon.SinonStub;

        beforeEach(() => {
            peerNode = FabricNode.newPeer('peer0.org1.example.com', 'peer0.org1.example.com', 'grpc://localhost:7051', 'Org1', 'admin', 'Org1MSP');
            caNode = FabricNode.newCertificateAuthority('ca.org1.example.com', 'ca.org1.example.com', 'http://localhost:7054', 'ca_name', 'Org1', 'admin', 'Org1MSP', 'admin', 'adminpw');
            ordererNode = FabricNode.newOrderer('orderer.example.com', 'orderer.example.com', 'grpc://localhost:7050', 'Org1', 'admin', 'OrdererMSP', undefined);
            ordererNode1 = FabricNode.newOrderer('orderer1.example.com', 'orderer1.example.com', 'grpc://localhost:7050', 'Org1', 'admin', 'OrdererMSP', undefined);
            couchdbNode = FabricNode.newCouchDB('couchdb', 'couchdb', 'http://localhost:5984');

            nodes = [];
            nodes.push(peerNode, caNode, ordererNode, ordererNode1, couchdbNode);

            getNodesStub = mySandBox.stub(FabricEnvironment.prototype, 'getNodes').returns(nodes);
        });

        it('should allow the user to select a node', async () => {
            quickPickStub.resolves({ data: nodes[0] });
            const node: IBlockchainQuickPickItem<FabricNode> = await UserInputUtil.showFabricNodeQuickPick('Gimme a node', new FabricEnvironmentRegistryEntry({name: FabricRuntimeUtil.LOCAL_FABRIC}), [FabricNodeType.PEER, FabricNodeType.ORDERER]) as IBlockchainQuickPickItem<FabricNode>;
            node.data.should.equal(nodes[0]);
            quickPickStub.should.have.been.calledOnceWithExactly([
                { label: 'peer0.org1.example.com', data: nodes[0] },
                { label: 'orderer.example.com', data: nodes[2] },
                { label: 'orderer1.example.com', data: nodes[3] }
            ], {
                ignoreFocusOut: true,
                canPickMany: false,
                placeHolder: 'Gimme a node'
            });
        });

        it('should show all nodes if type not specified', async () => {
            quickPickStub.resolves({ data: nodes[0] });
            const node: IBlockchainQuickPickItem<FabricNode> = await UserInputUtil.showFabricNodeQuickPick('Gimme a node', new FabricEnvironmentRegistryEntry({name: FabricRuntimeUtil.LOCAL_FABRIC}), [] ) as IBlockchainQuickPickItem<FabricNode>;
            node.data.should.equal(nodes[0]);
            quickPickStub.should.have.been.calledOnceWithExactly([
                { label: 'peer0.org1.example.com', data: nodes[0] },
                { label: 'ca.org1.example.com', data: nodes[1] },
                { label: 'orderer.example.com', data: nodes[2] },
                { label: 'orderer1.example.com', data: nodes[3] },
                { label: 'couchdb', data: nodes[4] }
            ], {
                ignoreFocusOut: true,
                canPickMany: false,
                placeHolder: 'Gimme a node'
            });
        });

        it('should allow the user to select a node with associated identity', async () => {
            quickPickStub.resolves({ data: nodes[0] });
            const node: IBlockchainQuickPickItem<FabricNode> = await UserInputUtil.showFabricNodeQuickPick('Gimme a node', new FabricEnvironmentRegistryEntry({name: FabricRuntimeUtil.LOCAL_FABRIC}), [FabricNodeType.PEER, FabricNodeType.ORDERER], true) as IBlockchainQuickPickItem<FabricNode>;
            node.data.should.equal(nodes[0]);
            quickPickStub.should.have.been.calledOnceWithExactly([
                { label: 'peer0.org1.example.com', data: nodes[0], description: `Associated with identity: ${nodes[0].identity} in wallet: ${nodes[0].wallet}` },
                { label: 'orderer.example.com', data: nodes[2], description: `Associated with identity: ${nodes[0].identity} in wallet: ${nodes[2].wallet}` },
                { label: 'orderer1.example.com', data: nodes[3], description: `Associated with identity: ${nodes[0].identity} in wallet: ${nodes[3].wallet}` },
            ], {
                ignoreFocusOut: true,
                canPickMany: false,
                placeHolder: 'Gimme a node'
            });
        });

        it('should not show quick pick if only one node', async () => {
            nodes = [peerNode];
            getNodesStub.resolves(nodes);
            const node: IBlockchainQuickPickItem<FabricNode> = await UserInputUtil.showFabricNodeQuickPick('Gimme a node', new FabricEnvironmentRegistryEntry({name: FabricRuntimeUtil.LOCAL_FABRIC}), [FabricNodeType.PEER]) as IBlockchainQuickPickItem<FabricNode>;
            node.data.should.equal(peerNode);
            quickPickStub.should.not.have.been.called;
        });

        it('should not show quick pick if only one node can pick many', async () => {
            nodes = [peerNode];
            getNodesStub.resolves(nodes);
            const chosenNodes: IBlockchainQuickPickItem<FabricNode>[] = await UserInputUtil.showFabricNodeQuickPick('Gimme a node', new FabricEnvironmentRegistryEntry({name: FabricRuntimeUtil.LOCAL_FABRIC}), [FabricNodeType.PEER], false, true) as IBlockchainQuickPickItem<FabricNode>[];
            chosenNodes.length.should.equal(1);
            chosenNodes[0].data.should.deep.equal(peerNode);
            quickPickStub.should.not.have.been.called;
        });

        it('should return undefined if the user cancels selecting a node', async () => {
            quickPickStub.resolves(undefined);
            const node: IBlockchainQuickPickItem<FabricNode> = await UserInputUtil.showFabricNodeQuickPick('Gimme a node', new FabricEnvironmentRegistryEntry({name: FabricRuntimeUtil.LOCAL_FABRIC}), [FabricNodeType.PEER, FabricNodeType.ORDERER]) as IBlockchainQuickPickItem<FabricNode>;
            should.equal(node, undefined);
            quickPickStub.should.have.been.calledOnceWithExactly([
                { label: 'peer0.org1.example.com', data: nodes[0] },
                { label: 'orderer.example.com', data: nodes[2] },
                { label: 'orderer1.example.com', data: nodes[3] }
            ], {
                ignoreFocusOut: true,
                canPickMany: false,
                placeHolder: 'Gimme a node'
            });
        });

        it('should show cluster name', async () => {
            ordererNode.cluster_name = 'myCluster';
            ordererNode1.cluster_name = 'myCluster';
            quickPickStub.resolves({ data: nodes[0] });
            const node: IBlockchainQuickPickItem<FabricNode> = await UserInputUtil.showFabricNodeQuickPick('Gimme a node', new FabricEnvironmentRegistryEntry({name: FabricRuntimeUtil.LOCAL_FABRIC}), [FabricNodeType.PEER, FabricNodeType.ORDERER]) as IBlockchainQuickPickItem<FabricNode>;
            node.data.should.equal(nodes[0]);
            quickPickStub.should.have.been.calledOnceWithExactly([
                { label: 'peer0.org1.example.com', data: nodes[0] },
                { label: 'myCluster', data: nodes[2] }
            ], {
                ignoreFocusOut: true,
                canPickMany: false,
                placeHolder: 'Gimme a node'
            });
        });

        it('should show cluster name with associated identity', async () => {
            ordererNode.cluster_name = 'myCluster';
            ordererNode1.cluster_name = 'myCluster';
            quickPickStub.resolves({ data: nodes[0] });
            const node: IBlockchainQuickPickItem<FabricNode> = await UserInputUtil.showFabricNodeQuickPick('Gimme a node', new FabricEnvironmentRegistryEntry({name: FabricRuntimeUtil.LOCAL_FABRIC}), [FabricNodeType.PEER, FabricNodeType.ORDERER], true) as IBlockchainQuickPickItem<FabricNode>;
            node.data.should.equal(nodes[0]);
            quickPickStub.should.have.been.calledOnceWithExactly([
                { label: 'peer0.org1.example.com', data: nodes[0], description: `Associated with identity: ${nodes[0].identity} in wallet: ${nodes[0].wallet}` },
                { label: 'myCluster', data: nodes[2], description: `Associated with identity: ${nodes[2].identity} in wallet: ${nodes[2].wallet}` }
            ], {
                ignoreFocusOut: true,
                canPickMany: false,
                placeHolder: 'Gimme a node'
            });
        });

        it('should handle no nodes found', async () => {
            nodes = [];
            getNodesStub.resolves(nodes);
            await UserInputUtil.showFabricNodeQuickPick('Gimme a node', new FabricEnvironmentRegistryEntry({name: FabricRuntimeUtil.LOCAL_FABRIC}), [FabricNodeType.PEER, FabricNodeType.CERTIFICATE_AUTHORITY]).should.eventually.be.rejectedWith('No nodes found to choose from');

            quickPickStub.should.not.have.been.called;
        });
    });

    describe('showOrgQuickPick', () => {

        let peerNode: FabricNode;
        let peerNode1: FabricNode;
        let peerNode2: FabricNode;
        let caNode: FabricNode;
        let ordererNode: FabricNode;

        let getNodesStub: sinon.SinonStub;

        let nodes: FabricNode[] = [];

        beforeEach(() => {
            peerNode = FabricNode.newPeer('peer0.org1.example.com', 'peer0.org1.example.com', 'grpc://localhost:7051', 'Org1', 'admin', 'Org1MSP');
            peerNode1 = FabricNode.newPeer('peer1.org1.example.com', 'peer1.org1.example.com', 'grpc://localhost:7051', 'Org1', 'admin', 'Org1MSP');
            peerNode2 = FabricNode.newPeer('peer0.org2.example.com', 'peer0.org2.example.com', 'grpc://localhost:7051', 'Org1', 'admin', 'Org2MSP');
            caNode = FabricNode.newCertificateAuthority('ca.org1.example.com', 'ca.org1.example.com', 'http://localhost:7054', 'ca_name', 'Org1', 'admin', 'Org1MSP', 'admin', 'adminpw');
            ordererNode = FabricNode.newOrderer('orderer.example.com', 'orderer.example.com', 'grpc://localhost:7050', 'Org1', 'admin', 'OrdererMSP', undefined);

            nodes = [];
            nodes.push(peerNode, peerNode1, peerNode2, caNode, ordererNode);

            getNodesStub = mySandBox.stub(FabricEnvironment.prototype, 'getNodes').returns(nodes);
        });
        it('should allow the user to select an org', async () => {
            quickPickStub.resolves({ label: 'Org1MSP', data: nodes[0] });

            const result: IBlockchainQuickPickItem<FabricNode> = await UserInputUtil.showOrgQuickPick('choose an org', new FabricEnvironmentRegistryEntry({name: 'myEnv'}));
            result.should.deep.equal({ label: 'Org1MSP', data: nodes[0] });

            quickPickStub.should.have.been.calledWith([{ label: 'Org1MSP', data: peerNode }, { label: 'Org2MSP', data: peerNode2 }]);
        });

        it('should throw an error if no orgs', async () => {
            nodes = [];
            nodes.push(caNode, ordererNode);
            getNodesStub.resolves(nodes);

            await UserInputUtil.showOrgQuickPick('choose an org', new FabricEnvironmentRegistryEntry({name: 'myEnv'})).should.eventually.be.rejectedWith('No organisations found');
        });

        it('should not show quickpick if only one node', async () => {
            nodes = [];
            nodes.push(peerNode);

            getNodesStub.resolves(nodes);

            const result: IBlockchainQuickPickItem<FabricNode> = await UserInputUtil.showOrgQuickPick('choose an org', new FabricEnvironmentRegistryEntry({name: 'myEnv'}));
            result.should.deep.equal({ label: 'Org1MSP', data: nodes[0] });

            quickPickStub.should.not.have.been.called;

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

    describe('showQuickPick', () => {
        it('should be able to pick an item', async () => {
            const items: string[] = ['itemOne', 'itemTwo'];
            quickPickStub.resolves('itemOne');

            const prompt: string = 'choose an item';

            const result: string = await UserInputUtil.showQuickPick(prompt, items) as string;
            result.should.equal('itemOne');

            quickPickStub.should.have.been.calledWith(items, {ignoreFocusOut: true, canPickMany: false, placeHolder: prompt});
        });

        it('should be able to pick multiple items', async () => {
            const items: string[] = ['itemOne', 'itemTwo'];
            quickPickStub.resolves(items);

            const prompt: string = 'choose an item';

            const result: string[] = await UserInputUtil.showQuickPick(prompt, items, true) as string[];
            result.should.deep.equal(items);

            quickPickStub.should.have.been.calledWith(items, {ignoreFocusOut: true, canPickMany: true, placeHolder: prompt});
        });
    });

    describe('showQuickPickItem', () => {
        it('should be able to pick an item', async () => {
            const items: IBlockchainQuickPickItem<string>[] = [{label: 'itemOne', data: 'itemData', description: 'my data'}, { label: 'itemTwo', data: 'itemDataTwo', description: 'my data two'}];
            quickPickStub.resolves(items[0]);

            const prompt: string = 'choose an item';

            const result: IBlockchainQuickPickItem<string> = await UserInputUtil.showQuickPickItem(prompt, items) as IBlockchainQuickPickItem<string>;
            result.should.equal(items[0]);

            quickPickStub.should.have.been.calledWith(items, {ignoreFocusOut: true, canPickMany: false, placeHolder: prompt});
        });

        it('should be able to pick multiple items', async () => {
            const items: IBlockchainQuickPickItem<string>[] = [{label: 'itemOne', data: 'itemData', description: 'my data'}, { label: 'itemTwo', data: 'itemDataTwo', description: 'my data two'}];
            quickPickStub.resolves(items);

            const prompt: string = 'choose an item';

            const result: IBlockchainQuickPickItem<string>[] = await UserInputUtil.showQuickPickItem(prompt, items, true) as IBlockchainQuickPickItem<string>[];
            result.should.equal(items);

            quickPickStub.should.have.been.calledWith(items, {ignoreFocusOut: true, canPickMany: true, placeHolder: prompt});
        });
    });

    describe('getWorkspaceFolders', () => {

        it(' getWorkspaceFolders should not show package chooser when only one folder to package', async () => {

            const pathOne: string = path.join('some', 'path');
            const uriOne: vscode.Uri = vscode.Uri.file(pathOne);
            const folders: Array<any> = [{ name: 'project_1', uri: uriOne }];
            const showWorkspaceQuickPickBoxStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'showWorkspaceQuickPickBox');
            mySandBox.stub(UserInputUtil, 'getWorkspaceFolders').returns(folders);
            showWorkspaceQuickPickBoxStub.withArgs('Choose a workspace folder to package').resolves({ data: folders[0] });

            const result: vscode.WorkspaceFolder = await UserInputUtil.chooseWorkspace(true);
            result.should.equal(folders[0]);
            showWorkspaceQuickPickBoxStub.should.not.have.been.called;
        });

        it('getWorkspaceFolders should show package chooser when only one folder to create automated tests for', async () => {

            const pathOne: string = path.join('some', 'path');
            const uriOne: vscode.Uri = vscode.Uri.file(pathOne);
            const folders: Array<any> = [{ name: 'project_1', uri: uriOne }];
            mySandBox.stub(UserInputUtil, 'getWorkspaceFolders').returns(folders);
            const showWorkspaceQuickPickBoxStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'showWorkspaceQuickPickBox');
            showWorkspaceQuickPickBoxStub.withArgs('Choose a workspace folder to create functional tests for').resolves({ data: folders[0] });

            const result: vscode.WorkspaceFolder = await UserInputUtil.chooseWorkspace(false);
            result.should.equal(folders[0]);
            showWorkspaceQuickPickBoxStub.should.have.been.calledOnce;
        });

        it('getWorkspaceFolders should always show package chooser when two or more folders open', async () => {

            const pathOne: string = path.join('some', 'path');
            const uriOne: vscode.Uri = vscode.Uri.file(pathOne);
            const pathTwo: string = path.join('another', 'one');
            const uriTwo: vscode.Uri = vscode.Uri.file(pathTwo);
            const folders: Array<any> = [
                { name: 'project_1', uri: uriOne },
                { name: 'biscuit-network', uri: uriTwo }
            ];
            mySandBox.stub(UserInputUtil, 'getWorkspaceFolders').returns(folders);
            const showWorkspaceQuickPickBoxStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'showWorkspaceQuickPickBox');
            showWorkspaceQuickPickBoxStub.withArgs('Choose a workspace folder to package').resolves({ data: folders[0] });
            showWorkspaceQuickPickBoxStub.withArgs('Choose a workspace folder to create functional tests for').resolves({ data: folders[1] });

            let result: vscode.WorkspaceFolder = await UserInputUtil.chooseWorkspace(true);
            result.should.equal(folders[0]);
            showWorkspaceQuickPickBoxStub.should.have.been.calledOnce;

            result = await UserInputUtil.chooseWorkspace(false);
            result.should.equal(folders[1]);
            showWorkspaceQuickPickBoxStub.should.have.been.calledTwice;
        });

        it('getWorkspaceFolders should handle not choosing folder', async () => {

            const pathOne: string = path.join('some', 'path');
            const uriOne: vscode.Uri = vscode.Uri.file(pathOne);
            const pathTwo: string = path.join('another', 'one');
            const uriTwo: vscode.Uri = vscode.Uri.file(pathTwo);
            const folders: Array<any> = [
                { name: 'project_1', uri: uriOne },
                { name: 'biscuit-network', uri: uriTwo }
            ];
            mySandBox.stub(UserInputUtil, 'getWorkspaceFolders').returns(folders);
            const showWorkspaceQuickPickBoxStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'showWorkspaceQuickPickBox');
            showWorkspaceQuickPickBoxStub.resolves();

            let result: vscode.WorkspaceFolder = await UserInputUtil.chooseWorkspace(true);
            showWorkspaceQuickPickBoxStub.should.have.been.calledOnce;
            should.equal(result, undefined);

            result = await UserInputUtil.chooseWorkspace(false);
            showWorkspaceQuickPickBoxStub.should.have.been.calledTwice;
            should.equal(result, undefined);
        });

        it('should handle error from get workspace folders', async () => {

            mySandBox.stub(UserInputUtil, 'getWorkspaceFolders').returns([]);
            const showWorkspaceQuickPickBoxStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'showWorkspaceQuickPickBox');
            showWorkspaceQuickPickBoxStub.resolves();

            const errorPackage: Error = new Error('Issue determining available smart contracts. Please open the smart contract you want to package.');
            const errorTests: Error = new Error('Issue determining available smart contracts. Please open the smart contract you want to create functional tests for.');

            let result: vscode.WorkspaceFolder;
            let errorCount: number = 0;
            try {
                result = await UserInputUtil.chooseWorkspace(true);
            } catch (err) {
                should.equal(result, undefined);
                should.equal(err.message, errorPackage.message);
                errorCount++;
            }

            try {
                result = await UserInputUtil.chooseWorkspace(false);
            } catch (err) {
                should.equal(result, undefined);
                should.equal(err.message, errorTests.message);
                errorCount++;
            }
            showWorkspaceQuickPickBoxStub.should.not.have.been;
            should.equal(errorCount, 2);
        });
    });

    describe('showChannelPeersQuickPick', () => {

        it('should be able to pick a channel peer', async () => {
            const channelPeers: {name: string, mspID: string}[] = [{name: 'peerOne', mspID: 'Org1MSP'}, {name: 'peerTwo', mspID: 'Org2MSP'}];
            quickPickStub.resolves([{label: channelPeers[0].name, description: channelPeers[0].mspID, data: channelPeers[0].name}]);

            const result: IBlockchainQuickPickItem<string>[] = await UserInputUtil.showChannelPeersQuickPick(channelPeers);
            result.should.deep.equal([{label: channelPeers[0].name, description: channelPeers[0].mspID, data: channelPeers[0].name}]);

            quickPickStub.should.have.been.calledWith([
                {label: channelPeers[0].name, description: channelPeers[0].mspID, data: channelPeers[0].name},
                {label: channelPeers[1].name, description: channelPeers[1].mspID, data: channelPeers[1].name}
            ], {
                ignoreFocusOut: true,
                canPickMany: true,
                placeHolder: `Select the peers to send the transaction to`
            });
        });

        it('should be able to pick multiple channel peers', async () => {
            const channelPeers: {name: string, mspID: string}[] = [{name: 'peerOne', mspID: 'Org1MSP'}, {name: 'peerTwo', mspID: 'Org2MSP'}];
            quickPickStub.resolves([
                {label: channelPeers[0].name, description: channelPeers[0].mspID, data: channelPeers[0].name},
                {label: channelPeers[1].name, description: channelPeers[1].mspID, data: channelPeers[1].name}
            ]);

            const result: IBlockchainQuickPickItem<string>[] = await UserInputUtil.showChannelPeersQuickPick(channelPeers);
            result.should.deep.equal([
                {label: channelPeers[0].name, description: channelPeers[0].mspID, data: channelPeers[0].name},
                {label: channelPeers[1].name, description: channelPeers[1].mspID, data: channelPeers[1].name}
            ]);

            quickPickStub.should.have.been.calledWith([
                {label: channelPeers[0].name, description: channelPeers[0].mspID, data: channelPeers[0].name},
                {label: channelPeers[1].name, description: channelPeers[1].mspID, data: channelPeers[1].name}
            ], {
                ignoreFocusOut: true,
                canPickMany: true,
                placeHolder: `Select the peers to send the transaction to`
            });
        });

    });
});
