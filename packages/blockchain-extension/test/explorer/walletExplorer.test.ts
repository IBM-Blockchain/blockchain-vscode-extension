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
// tslint:disable no-var-requires
import * as vscode from 'vscode';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { BlockchainWalletExplorerProvider } from '../../extension/explorer/walletExplorer';
import { TestUtil } from '../TestUtil';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { WalletTreeItem } from '../../extension/explorer/wallets/WalletTreeItem';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricWallet } from 'ibm-blockchain-platform-wallet';
import { IdentityTreeItem } from '../../extension/explorer/model/IdentityTreeItem';
import { BlockchainTreeItem } from '../../extension/explorer/model/BlockchainTreeItem';
import { AdminIdentityTreeItem } from '../../extension/explorer/model/AdminIdentityTreeItem';
import { FabricCertificate, FabricRuntimeUtil, FabricWalletRegistry, FabricWalletRegistryEntry, IFabricWallet, LogType, FabricWalletGeneratorFactory, FabricEnvironmentRegistry, FabricEnvironmentRegistryEntry, EnvironmentType } from 'ibm-blockchain-platform-common';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';
import { WalletGroupTreeItem } from '../../extension/explorer/model/WalletGroupTreeItem';

chai.use(sinonChai);
chai.should();

// tslint:disable no-unused-expression
describe('walletExplorer', () => {

    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();
    let logSpy: sinon.SinonSpy;
    let blockchainWalletExplorerProvider: BlockchainWalletExplorerProvider;
    let blueWalletEntry: FabricWalletRegistryEntry;
    let greenWalletEntry: FabricWalletRegistryEntry;
    let getGreenWalletIdentityNamesStub: sinon.SinonStub;
    let getBlueWalletIdentityNamesStub: sinon.SinonStub;
    let getGreenWalletIdentitiesStub: sinon.SinonStub;
    let getBlueWalletIdentitiesStub: sinon.SinonStub;

    before(async () => {
        await TestUtil.setupTests(mySandBox);
        await TestUtil.setupLocalFabric();
    });

    beforeEach(async () => {

        logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
        blockchainWalletExplorerProvider = ExtensionUtil.getBlockchainWalletExplorerProvider();

        blueWalletEntry = new FabricWalletRegistryEntry({
            name: 'blueWallet',
            walletPath: '/some/path'
        });
        greenWalletEntry = new FabricWalletRegistryEntry({
            name: 'greenWallet',
            walletPath: '/some/other/path'
        });

        await FabricWalletRegistry.instance().clear();

        await TestUtil.setupLocalFabric();
        await FabricWalletRegistry.instance().add(blueWalletEntry);
        await FabricWalletRegistry.instance().add(greenWalletEntry);

        const greenWallet: IFabricWallet = new FabricWallet('some/path');
        const blueWallet: IFabricWallet = new FabricWallet('/some/other/path');
        const getNewWalletStub: sinon.SinonStub = mySandBox.stub(FabricWalletGeneratorFactory.getFabricWalletGenerator(), 'getWallet');
        getNewWalletStub.callThrough();
        getNewWalletStub.withArgs(greenWalletEntry).returns(greenWallet);
        getNewWalletStub.withArgs(blueWalletEntry).returns(blueWallet);

        getGreenWalletIdentityNamesStub = mySandBox.stub(greenWallet, 'getIdentityNames');
        getBlueWalletIdentityNamesStub = mySandBox.stub(blueWallet, 'getIdentityNames');
        getGreenWalletIdentitiesStub = mySandBox.stub(greenWallet, 'getIdentities');
        getBlueWalletIdentitiesStub = mySandBox.stub(blueWallet, 'getIdentities');
        mySandBox.stub(greenWallet, 'importIdentity').resolves();
        mySandBox.stub(blueWallet, 'importIdentity').resolves();
    });

    afterEach(async () => {
        mySandBox.restore();
    });

    it('should show wallets and identities in the BlockchainWalletExplorer view', async () => {
        getGreenWalletIdentityNamesStub.onCall(0).resolves([]);
        getBlueWalletIdentityNamesStub.resolves(['violetConga', 'purpleConga']);

        const certOne: string = `-----BEGIN CERTIFICATE-----
        MIICGTCCAb+gAwIBAgIQQE5Dc6DHnGXPOqHMG2LG7jAKBggqhkjOPQQDAjBzMQsw
        CQYDVQQGEwJVUzETMBEGA1UECBMKQ2FsaWZvcm5pYTEWMBQGA1UEBxMNU2FuIEZy
        YW5jaXNjbzEZMBcGA1UEChMQb3JnMS5leGFtcGxlLmNvbTEcMBoGA1UEAxMTY2Eu
        b3JnMS5leGFtcGxlLmNvbTAeFw0xOTExMjcxMTM0MDBaFw0yOTExMjQxMTM0MDBa
        MFsxCzAJBgNVBAYTAlVTMRMwEQYDVQQIEwpDYWxpZm9ybmlhMRYwFAYDVQQHEw1T
        YW4gRnJhbmNpc2NvMR8wHQYDVQQDDBZBZG1pbkBvcmcxLmV4YW1wbGUuY29tMFkw
        EwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE2yJR/UL+6Jfsa70tg9SO/CtwoKutVa84
        IUIm7fVB8Og0OPwA/UmBOoCk2r/91ner/otYba1sNUbao/DP34vVZ6NNMEswDgYD
        VR0PAQH/BAQDAgeAMAwGA1UdEwEB/wQCMAAwKwYDVR0jBCQwIoAgRwvaD6tNjB3i
        Kfo7fP6ItgTQxnzT7IgukY+z/6n5UWEwCgYIKoZIzj0EAwIDSAAwRQIhALa8Amos
        hlfhEnZLdyCEFaumEAIsEnexk1V5lLcwLQ/LAiB9OFexBRlSp+2gBnWhqGU1yfuQ
        UeCDyF4ZXdodV0l7ww==
        -----END CERTIFICATE-----`;

        getBlueWalletIdentitiesStub.resolves([
            { name: 'violetConga', enrollment: { identity: { certificate: certOne } } },
            { name: 'purpleConga', enrollment: { identity: { certificate: certOne } } }
        ]);

        getGreenWalletIdentitiesStub.resolves([]);

        const getAttributesStub: sinon.SinonStub = mySandBox.stub(FabricCertificate.prototype, 'getAttributes');
        getAttributesStub.callThrough();
        getAttributesStub.onCall(4).returns({ attr1: 'hello', attr2: 'world' });
        getAttributesStub.onCall(5).returns({ attr3: 'good', attr4: 'day!' });

        const allChildren: Array<BlockchainTreeItem> = await blockchainWalletExplorerProvider.getChildren() as Array<WalletTreeItem>;
        allChildren.length.should.equal(2);
        allChildren[0].should.be.an.instanceof(WalletGroupTreeItem);
        allChildren[0].label.should.equal(FabricRuntimeUtil.LOCAL_FABRIC);
        allChildren[1].should.be.an.instanceOf(WalletGroupTreeItem);
        allChildren[1].label.should.equal('Other wallets');

        const groupOne: WalletGroupTreeItem = allChildren[0] as WalletGroupTreeItem;
        groupOne.wallets.length.should.equal(2);

        const localOrderWallet: FabricWalletRegistryEntry = await FabricWalletRegistry.instance().get('Orderer', FabricRuntimeUtil.LOCAL_FABRIC);
        const localOrgOneWallet: FabricWalletRegistryEntry = await FabricWalletRegistry.instance().get('Org1', FabricRuntimeUtil.LOCAL_FABRIC);

        groupOne.wallets.should.deep.equal([localOrderWallet, localOrgOneWallet]);
        const groupOneWallets: WalletTreeItem[] = await blockchainWalletExplorerProvider.getChildren(groupOne) as WalletTreeItem[];
        groupOneWallets[0].label.should.equal(`Orderer`);
        groupOneWallets[1].label.should.equal(`Org1`);

        const localWalletIdentities: Array<IdentityTreeItem> = await blockchainWalletExplorerProvider.getChildren(groupOneWallets[1]) as Array<IdentityTreeItem>;
        localWalletIdentities.length.should.equal(2);
        localWalletIdentities[0].label.should.equal(`${FabricRuntimeUtil.ADMIN_USER} ⭑`);
        localWalletIdentities[0].should.be.an.instanceOf(AdminIdentityTreeItem);
        localWalletIdentities[0].walletName.should.equal(`Org1`);
        localWalletIdentities[1].label.should.equal('org1Admin');
        localWalletIdentities[1].should.be.an.instanceOf(IdentityTreeItem);
        localWalletIdentities[1].walletName.should.equal(`Org1`);

        const localOrdererIdentities: Array<IdentityTreeItem> = await blockchainWalletExplorerProvider.getChildren(groupOneWallets[0]) as Array<IdentityTreeItem>;
        localOrdererIdentities.length.should.equal(2);
        localOrdererIdentities[0].label.should.equal(`${FabricRuntimeUtil.ADMIN_USER} ⭑`);
        localOrdererIdentities[0].should.be.an.instanceOf(AdminIdentityTreeItem);
        localOrdererIdentities[0].walletName.should.equal(`Orderer`);
        localOrdererIdentities[1].label.should.equal('ordererAdmin');
        localOrdererIdentities[1].should.be.an.instanceOf(IdentityTreeItem);
        localOrdererIdentities[1].walletName.should.equal(`Orderer`);

        const groupTwo: WalletGroupTreeItem = allChildren[1] as WalletGroupTreeItem;
        groupTwo.wallets.length.should.equal(2);
        groupTwo.wallets.should.deep.equal([blueWalletEntry, greenWalletEntry]);
        const groupTwoWallets: WalletTreeItem[] = await blockchainWalletExplorerProvider.getChildren(groupTwo) as WalletTreeItem[];
        groupTwoWallets[0].label.should.equal(blueWalletEntry.name);
        groupTwoWallets[1].label.should.equal(greenWalletEntry.name);

        const blueWalletIdentities: Array<IdentityTreeItem> = await blockchainWalletExplorerProvider.getChildren(groupTwoWallets[0]) as Array<IdentityTreeItem>;
        blueWalletIdentities.length.should.equal(2);
        blueWalletIdentities[0].label.should.equal('violetConga');
        blueWalletIdentities[0].walletName.should.equal(blueWalletEntry.name);
        blueWalletIdentities[0].tooltip.should.deep.equal(`Attributes:\n\nattr1:hello\nattr2:world`);
        blueWalletIdentities[1].label.should.equal('purpleConga');
        blueWalletIdentities[1].walletName.should.equal(blueWalletEntry.name);
        blueWalletIdentities[1].tooltip.should.deep.equal(`Attributes:\n\nattr3:good\nattr4:day!`);

        const emptyWalletIdentites: Array<WalletTreeItem> = await blockchainWalletExplorerProvider.getChildren(groupTwoWallets[1]) as Array<WalletTreeItem>;
        emptyWalletIdentites.should.deep.equal([]);

        logSpy.should.not.have.been.calledWith(LogType.ERROR);
    });

    it('should say that there are no wallets', async () => {
        await FabricEnvironmentRegistry.instance().clear();
        await FabricWalletRegistry.instance().clear();
        const wallets: Array<BlockchainTreeItem> = await blockchainWalletExplorerProvider.getChildren();
        wallets.length.should.equal(1);
        wallets[0].label.should.equal(`No wallets found`);
    });

    it('should refresh the BlockchainWalletExplorer view when refresh is called', async () => {
        const onDidChangeTreeDataSpy: sinon.SinonSpy = mySandBox.spy(blockchainWalletExplorerProvider['_onDidChangeTreeData'], 'fire');

        await vscode.commands.executeCommand(ExtensionCommands.REFRESH_WALLETS);
        onDidChangeTreeDataSpy.should.have.been.called;
        logSpy.should.not.have.been.calledWith(LogType.ERROR);
    });

    it('should get a tree item in the BlockchainWalletExplorer view', async () => {
        getGreenWalletIdentityNamesStub.resolves([]);
        getBlueWalletIdentityNamesStub.resolves([]);

        await FabricWalletRegistry.instance().clear();
        await TestUtil.setupLocalFabric();
        await FabricWalletRegistry.instance().add(blueWalletEntry);
        await FabricWalletRegistry.instance().add(greenWalletEntry);

        const walletGroups: Array<WalletTreeItem> = await blockchainWalletExplorerProvider.getChildren() as Array<WalletTreeItem>;
        const walletGroupChildren: Array<WalletTreeItem> = await blockchainWalletExplorerProvider.getChildren(walletGroups[1]) as Array<WalletTreeItem>;
        const blueWallet: WalletTreeItem = blockchainWalletExplorerProvider.getTreeItem(walletGroupChildren[0]) as WalletTreeItem;
        blueWallet.label.should.equal('blueWallet');
        logSpy.should.not.have.been.calledWith(LogType.ERROR);
    });

    it('should display an ops tools wallet', async () => {
        await FabricWalletRegistry.instance().clear();

        const opsToolsEnv: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
        opsToolsEnv.name = 'opsToolsEnv';
        opsToolsEnv.environmentType = EnvironmentType.OPS_TOOLS_ENVIRONMENT;

        mySandBox.stub(FabricEnvironmentRegistry.instance(), 'get').resolves(opsToolsEnv);

        const opsToolsWallet: FabricWalletRegistryEntry = new FabricWalletRegistryEntry({
            name: 'myOpsToolsWallet',
            walletPath: '/some/path',
            fromEnvironment: 'opsToolsEnv'
        });

        await FabricWalletRegistry.instance().add(opsToolsWallet);

        const walletGroups: Array<WalletTreeItem> = await blockchainWalletExplorerProvider.getChildren() as Array<WalletTreeItem>;
        const walletGroupChildren: Array<WalletTreeItem> = await blockchainWalletExplorerProvider.getChildren(walletGroups[1]) as Array<WalletTreeItem>;
        const opsToolsWalletItem: WalletTreeItem  = walletGroupChildren[0];
        opsToolsWalletItem.label.should.deep.equal(opsToolsWallet.name);
    });

    it('should display a saas ops tools wallet', async () => {
        await FabricWalletRegistry.instance().clear();

        const saasEnv: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
        saasEnv.name = 'saasEnv';
        saasEnv.environmentType = EnvironmentType.SAAS_OPS_TOOLS_ENVIRONMENT;

        mySandBox.stub(FabricEnvironmentRegistry.instance(), 'get').resolves(saasEnv);

        const saasWallet: FabricWalletRegistryEntry = new FabricWalletRegistryEntry({
            name: 'myOpsToolsWallet',
            walletPath: '/some/path',
            fromEnvironment: 'opsToolsEnv'
        });

        await FabricWalletRegistry.instance().add(saasWallet);

        const walletGroups: Array<WalletTreeItem> = await blockchainWalletExplorerProvider.getChildren() as Array<WalletTreeItem>;
        const walletGroupChildren: Array<WalletTreeItem> = await blockchainWalletExplorerProvider.getChildren(walletGroups[1]) as Array<WalletTreeItem>;
        const saasWalletItem: WalletTreeItem  = walletGroupChildren[0];
        saasWalletItem.label.should.deep.equal(saasWallet.name);
    });

    it('should display a managed ansible wallet', async () => {
        await FabricWalletRegistry.instance().clear();

        const managedAnsible: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
        managedAnsible.name = 'managedAnsible';
        managedAnsible.environmentType = EnvironmentType.ANSIBLE_ENVIRONMENT;

        mySandBox.stub(FabricEnvironmentRegistry.instance(), 'get').resolves(managedAnsible);

        const managedAnsibleWallet: FabricWalletRegistryEntry = new FabricWalletRegistryEntry({
            name: 'myManagedAnsibleWallet',
            walletPath: '/some/path',
            fromEnvironment: 'managedAnsible'
        });

        await FabricWalletRegistry.instance().add(managedAnsibleWallet);

        const walletGroups: Array<WalletTreeItem> = await blockchainWalletExplorerProvider.getChildren() as Array<WalletTreeItem>;
        const walletGroupChildren: Array<WalletTreeItem> = await blockchainWalletExplorerProvider.getChildren(walletGroups[1]) as Array<WalletTreeItem>;
        const managedAnsibleWalletItem: WalletTreeItem  = walletGroupChildren[0];
        managedAnsibleWalletItem.label.should.deep.equal(managedAnsibleWallet.name);
    });

    it('should handle errors when populating the BlockchainWalletExplorer view', async () => {
        getGreenWalletIdentityNamesStub.rejects({ message: 'something bad has happened' });
        getBlueWalletIdentityNamesStub.resolves([]);

        const walletItems: Array<WalletTreeItem> = await blockchainWalletExplorerProvider.getChildren() as Array<WalletTreeItem>;
        await blockchainWalletExplorerProvider.getChildren(walletItems[1]);
        logSpy.should.have.been.calledOnceWith(LogType.ERROR, 'Error displaying Fabric Wallets: something bad has happened', 'Error displaying Fabric Wallets: something bad has happened');
    });

    it('should not populate the BlockchainWalletExplorer view with wallets without wallet paths', async () => {
        getGreenWalletIdentityNamesStub.resolves([]);
        getBlueWalletIdentityNamesStub.resolves([]);
        const purpleWallet: FabricWalletRegistryEntry = new FabricWalletRegistryEntry({
            name: 'purpleWallet',
            walletPath: undefined
        });

        await FabricWalletRegistry.instance().clear();

        await TestUtil.setupLocalFabric();
        await FabricWalletRegistry.instance().add(blueWalletEntry);
        await FabricWalletRegistry.instance().add(greenWalletEntry);
        await FabricWalletRegistry.instance().add(purpleWallet);

        const allChildren: Array<BlockchainTreeItem> = await blockchainWalletExplorerProvider.getChildren() as Array<WalletTreeItem>;
        allChildren.length.should.equal(2);
        allChildren[0].should.be.an.instanceof(WalletGroupTreeItem);
        allChildren[0].label.should.equal(FabricRuntimeUtil.LOCAL_FABRIC);
        allChildren[1].should.be.an.instanceOf(WalletGroupTreeItem);
        allChildren[1].label.should.equal('Other wallets');
        const groupOne: WalletGroupTreeItem = allChildren[0] as WalletGroupTreeItem;
        groupOne.wallets.length.should.equal(2);

        const localOrderWallet: FabricWalletRegistryEntry = await FabricWalletRegistry.instance().get('Orderer', FabricRuntimeUtil.LOCAL_FABRIC);
        const localOrgOneWallet: FabricWalletRegistryEntry = await FabricWalletRegistry.instance().get('Org1', FabricRuntimeUtil.LOCAL_FABRIC);

        groupOne.wallets.should.deep.equal([localOrderWallet, localOrgOneWallet]);
        const groupOneWallets: WalletTreeItem[] = await blockchainWalletExplorerProvider.getChildren(groupOne) as WalletTreeItem[];
        groupOneWallets[0].label.should.equal(`Orderer`);
        groupOneWallets[1].label.should.equal(`Org1`);

        const groupTwo: WalletGroupTreeItem = allChildren[1] as WalletGroupTreeItem;
        groupTwo.wallets.length.should.equal(2);
        groupTwo.wallets.should.deep.equal([blueWalletEntry, greenWalletEntry]);
        const groupTwoWallets: WalletTreeItem[] = await blockchainWalletExplorerProvider.getChildren(groupTwo) as WalletTreeItem[];
        groupTwoWallets[0].label.should.equal(blueWalletEntry.name);
        groupTwoWallets[1].label.should.equal(greenWalletEntry.name);
    });
});
