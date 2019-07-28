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
const {Certificate} = require('@fidm/x509');
import * as vscode from 'vscode';
import * as myExtension from '../../src/extension';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { BlockchainWalletExplorerProvider } from '../../src/explorer/walletExplorer';
import { TestUtil } from '../TestUtil';
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../../src/logging/OutputAdapter';
import { WalletTreeItem } from '../../src/explorer/wallets/WalletTreeItem';
import { LocalWalletTreeItem } from '../../src/explorer/wallets/LocalWalletTreeItem';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricWalletRegistryEntry } from '../../src/fabric/FabricWalletRegistryEntry';
import { FabricWallet } from '../../src/fabric/FabricWallet';
import { IdentityTreeItem } from '../../src/explorer/model/IdentityTreeItem';
import { FabricWalletGeneratorFactory } from '../../src/fabric/FabricWalletGeneratorFactory';
import { BlockchainTreeItem } from '../../src/explorer/model/BlockchainTreeItem';
import { AdminIdentityTreeItem } from '../../src/explorer/model/AdminIdentityTreeItem';
import { FabricRuntimeUtil } from '../../src/fabric/FabricRuntimeUtil';
import { FabricWalletUtil } from '../../src/fabric/FabricWalletUtil';
import { FabricRuntimeManager } from '../../src/fabric/FabricRuntimeManager';
import { FabricRuntime } from '../../src/fabric/FabricRuntime';
import { FabricIdentity } from '../../src/fabric/FabricIdentity';
import { SettingConfigurations } from '../../SettingConfigurations';
import { FabricCertificate } from '../../src/fabric/FabricCertificate';
import { IFabricWallet } from '../../src/fabric/IFabricWallet';

chai.use(sinonChai);
chai.should();

// tslint:disable no-unused-expression

describe('walletExplorer', () => {

    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();
    let logSpy: sinon.SinonSpy;
    let blockchainWalletExplorerProvider: BlockchainWalletExplorerProvider;
    let runtimeWalletEntry: FabricWalletRegistryEntry;
    let blueWalletEntry: FabricWalletRegistryEntry;
    let greenWalletEntry: FabricWalletRegistryEntry;
    let getIdentityNamesStub: sinon.SinonStub;
    let getIdentitiesStub: sinon.SinonStub;

    before(async () => {
        await TestUtil.setupTests(mySandBox);
        await TestUtil.storeWalletsConfig();
    });

    after(async () => {
        await TestUtil.restoreWalletsConfig();
    });

    beforeEach(async () => {
        logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
        blockchainWalletExplorerProvider = myExtension.getBlockchainWalletExplorerProvider();
        runtimeWalletEntry = new FabricWalletRegistryEntry({
            name: FabricWalletUtil.LOCAL_WALLET,
            walletPath: '/some/local/path',
            managedWallet: true
        });
        mySandBox.stub(FabricRuntimeManager.instance(), 'getWalletRegistryEntries').resolves([runtimeWalletEntry]);
        const mockRuntime: sinon.SinonStubbedInstance<FabricRuntime> = sinon.createStubInstance(FabricRuntime);
        mockRuntime.getIdentities.resolves([new FabricIdentity('admin', 'such cert', 'much key', 'Org1MSP')]);
        mySandBox.stub(FabricRuntimeManager.instance(), 'getRuntime').returns(mockRuntime);
        blueWalletEntry = new FabricWalletRegistryEntry({
            name: 'blueWallet',
            walletPath: '/some/path'
        });
        greenWalletEntry = new FabricWalletRegistryEntry({
            name: 'greenWallet',
            walletPath: '/some/other/path'
        });
        const testFabricWallet: IFabricWallet = new FabricWallet('some/path');
        getIdentityNamesStub = mySandBox.stub(testFabricWallet, 'getIdentityNames');
        getIdentitiesStub = mySandBox.stub(testFabricWallet, 'getIdentities');
        const getNewWalletStub: sinon.SinonStub = mySandBox.stub(FabricWalletGeneratorFactory.createFabricWalletGenerator(), 'getNewWallet');
        getNewWalletStub.withArgs('/some/path').returns(testFabricWallet);
        getNewWalletStub.withArgs('/some/other/path').returns(testFabricWallet);
        getNewWalletStub.withArgs('/some/local/path').returns(testFabricWallet);

        await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_WALLETS, [], vscode.ConfigurationTarget.Global);
    });

    afterEach(async () => {
        mySandBox.restore();
    });

    it('should show wallets and identities in the BlockchainWalletExplorer view', async () => {
        getIdentityNamesStub.onCall(0).resolves([FabricRuntimeUtil.ADMIN_USER, 'yellowConga', 'orangeConga']);
        getIdentityNamesStub.onCall(1).resolves(['violetConga', 'purpleConga']);
        getIdentityNamesStub.onCall(2).resolves([]);

        const certObjOne: any = {extensions: []};
        const certObjTwo: any = {extensions: [
            {
                id: '1.8.7.6.5.4.3.2.1'
            },
            {
                id: '1.2.3.4.5.6.7.8.1'
            }
        ]};

        const certOne: string = `-----BEGIN CERTIFICATE-----
        certOne
        -----END CERTIFICATE-----
        `;

        const certTwo: string = `-----BEGIN CERTIFICATE-----
        certTwo
        -----END CERTIFICATE-----
        `;

        const fromPEMStub: sinon.SinonStub = mySandBox.stub(Certificate, 'fromPEM');
        fromPEMStub.withArgs(certOne).returns(certObjOne);
        fromPEMStub.withArgs(certTwo).returns(certObjTwo);

        getIdentitiesStub.onCall(1).resolves([
            {name: FabricRuntimeUtil.ADMIN_USER, enrollment: {identity: {certificate: certOne}}},
            {name: 'yellowConga', enrollment: {identity: {certificate: certOne}}},
            {name: 'orangeConga', enrollment: {identity: {certificate: certOne}}}
        ]);

        const getAttributesStub: sinon.SinonStub = mySandBox.stub(FabricCertificate.prototype, 'getAttributes');
        getAttributesStub.callThrough();
        getAttributesStub.onCall(0).returns({attr1: 'hello', attr2: 'world'});
        getAttributesStub.onCall(1).returns({attr3: 'good', attr4: 'day!'});

        getIdentitiesStub.onCall(0).resolves([
            {name: 'violetConga', enrollment: {identity: {certificate: certTwo}}},
            {name: 'purpleConga', enrollment: {identity: {certificate: certTwo}}}
        ]);

        getIdentitiesStub.onCall(2).resolves([]);

        await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_WALLETS, [blueWalletEntry, greenWalletEntry], vscode.ConfigurationTarget.Global);

        const wallets: Array<BlockchainTreeItem> = await blockchainWalletExplorerProvider.getChildren() as Array<BlockchainTreeItem>;
        wallets.length.should.equal(3);
        wallets[0].label.should.equal(FabricWalletUtil.LOCAL_WALLET_DISPLAY_NAME);
        wallets[1].label.should.equal(blueWalletEntry.name);
        wallets[2].label.should.equal(greenWalletEntry.name);

        const blueWalletIdentities: Array<IdentityTreeItem> = await blockchainWalletExplorerProvider.getChildren(wallets[1]) as Array<IdentityTreeItem>;
        blueWalletIdentities.length.should.equal(2);
        blueWalletIdentities[0].label.should.equal('violetConga');
        blueWalletIdentities[0].walletName.should.equal(blueWalletEntry.name);
        blueWalletIdentities[0].tooltip.should.deep.equal(`Attributes:\n\nattr1:hello\nattr2:world`);
        blueWalletIdentities[1].label.should.equal('purpleConga');
        blueWalletIdentities[1].walletName.should.equal(blueWalletEntry.name);
        blueWalletIdentities[1].tooltip.should.deep.equal(`Attributes:\n\nattr3:good\nattr4:day!`);

        const localWalletIdentities: Array<IdentityTreeItem> = await blockchainWalletExplorerProvider.getChildren(wallets[0]) as Array<IdentityTreeItem>;
        localWalletIdentities.length.should.equal(3);
        localWalletIdentities[0].label.should.equal(`${FabricRuntimeUtil.ADMIN_USER} ⭑`);
        localWalletIdentities[0].should.be.an.instanceOf(AdminIdentityTreeItem);
        localWalletIdentities[0].walletName.should.equal(FabricWalletUtil.LOCAL_WALLET_DISPLAY_NAME);
        localWalletIdentities[1].label.should.equal('yellowConga');
        localWalletIdentities[1].should.be.an.instanceOf(IdentityTreeItem);
        localWalletIdentities[1].walletName.should.equal(FabricWalletUtil.LOCAL_WALLET_DISPLAY_NAME);
        localWalletIdentities[2].label.should.equal('orangeConga');
        localWalletIdentities[2].should.be.an.instanceOf(IdentityTreeItem);
        localWalletIdentities[2].walletName.should.equal(FabricWalletUtil.LOCAL_WALLET_DISPLAY_NAME);

        const emptyWalletIdentites: Array<WalletTreeItem> = await blockchainWalletExplorerProvider.getChildren(wallets[2]) as Array<WalletTreeItem>;
        emptyWalletIdentites.should.deep.equal([]);

        logSpy.should.not.have.been.calledWith(LogType.ERROR);
    });

    it('should handle no identities in the local wallet', async () => {
        getIdentityNamesStub.onCall(0).resolves([]);
        const wallets: Array<LocalWalletTreeItem> = await blockchainWalletExplorerProvider.getChildren() as Array<LocalWalletTreeItem>;

        wallets.length.should.equal(1);
        wallets[0].label.should.equal(FabricWalletUtil.LOCAL_WALLET_DISPLAY_NAME);
        wallets[0].identities.should.deep.equal([]);
        logSpy.should.not.have.been.calledWith(LogType.ERROR);
    });

    it('should refresh the BlockchainWalletExplorer view when refresh is called', async () => {
        const onDidChangeTreeDataSpy: sinon.SinonSpy = mySandBox.spy(blockchainWalletExplorerProvider['_onDidChangeTreeData'], 'fire');

        await vscode.commands.executeCommand(ExtensionCommands.REFRESH_WALLETS);
        onDidChangeTreeDataSpy.should.have.been.called;
        logSpy.should.not.have.been.calledWith(LogType.ERROR);
    });

    it('should get a tree item in the BlockchainWalletExplorer view', async () => {
        getIdentityNamesStub.resolves([]);
        await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_WALLETS, [blueWalletEntry, greenWalletEntry], vscode.ConfigurationTarget.Global);

        const wallets: Array<WalletTreeItem> = await blockchainWalletExplorerProvider.getChildren() as Array<WalletTreeItem>;
        const blueWallet: WalletTreeItem = blockchainWalletExplorerProvider.getTreeItem(wallets[1]) as WalletTreeItem;
        blueWallet.label.should.equal('blueWallet');
        logSpy.should.not.have.been.calledWith(LogType.ERROR);
    });

    it('should handle errors when populating the BlockchainWalletExplorer view', async () => {
        getIdentityNamesStub.rejects( { message: 'something bad has happened' } );

        await blockchainWalletExplorerProvider.getChildren() as Array<WalletTreeItem>;
        logSpy.should.have.been.calledOnceWith(LogType.ERROR, 'Error displaying Fabric Wallets: something bad has happened', 'Error displaying Fabric Wallets: something bad has happened');
    });

    it('should not populate the BlockchainWalletExplorer view with wallets without wallet paths', async () => {
        getIdentityNamesStub.resolves([]);
        const purpleWallet: FabricWalletRegistryEntry = new FabricWalletRegistryEntry({
            name: 'purpleWallet',
            walletPath: undefined
        });
        await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_WALLETS, [blueWalletEntry, greenWalletEntry, purpleWallet], vscode.ConfigurationTarget.Global);

        const wallets: Array<WalletTreeItem> = await blockchainWalletExplorerProvider.getChildren() as Array<WalletTreeItem>;
        wallets.length.should.equal(3);
        wallets[1].label.should.equal(blueWalletEntry.name);
        wallets[2].label.should.equal(greenWalletEntry.name);
    });

});
