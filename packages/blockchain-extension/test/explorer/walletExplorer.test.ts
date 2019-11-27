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
import { LocalWalletTreeItem } from '../../extension/explorer/wallets/LocalWalletTreeItem';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricWallet } from 'ibm-blockchain-platform-wallet';
import { IdentityTreeItem } from '../../extension/explorer/model/IdentityTreeItem';
import { FabricWalletGeneratorFactory } from '../../extension/fabric/FabricWalletGeneratorFactory';
import { BlockchainTreeItem } from '../../extension/explorer/model/BlockchainTreeItem';
import { AdminIdentityTreeItem } from '../../extension/explorer/model/AdminIdentityTreeItem';
import { FabricCertificate, FabricRuntimeUtil, FabricWalletRegistry, FabricWalletRegistryEntry, FabricWalletUtil, IFabricWallet, LogType } from 'ibm-blockchain-platform-common';
import { LocalEnvironmentManager } from '../../extension/fabric/environments/LocalEnvironmentManager';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';

chai.use(sinonChai);
chai.should();

// tslint:disable no-unused-expression
describe('walletExplorer', () => {

    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();
    let logSpy: sinon.SinonSpy;
    let blockchainWalletExplorerProvider: BlockchainWalletExplorerProvider;
    let blueWalletEntry: FabricWalletRegistryEntry;
    let greenWalletEntry: FabricWalletRegistryEntry;
    let getIdentityNamesStub: sinon.SinonStub;
    let getIdentitiesStub: sinon.SinonStub;

    before(async () => {
        await TestUtil.setupTests(mySandBox);
        await LocalEnvironmentManager.instance().getRuntime().create();
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

        // add local fabric back in
        await LocalEnvironmentManager.instance().getRuntime().importWalletsAndIdentities();
        await FabricWalletRegistry.instance().add(blueWalletEntry);
        await FabricWalletRegistry.instance().add(greenWalletEntry);

        const greenWallet: IFabricWallet = new FabricWallet('some/path');
        const blueWallet: IFabricWallet = new FabricWallet('/some/other/path');
        getIdentityNamesStub = mySandBox.stub(FabricWallet.prototype, 'getIdentityNames');
        getIdentitiesStub = mySandBox.stub(FabricWallet.prototype, 'getIdentities');
        const getNewWalletStub: sinon.SinonStub = mySandBox.stub(FabricWalletGeneratorFactory.createFabricWalletGenerator(), 'getWallet');
        getNewWalletStub.withArgs(greenWalletEntry.name).returns(greenWallet);
        getNewWalletStub.withArgs(blueWalletEntry.name).returns(blueWallet);
        getNewWalletStub.withArgs(FabricWalletUtil.LOCAL_WALLET).returns(new FabricWallet('some/local/path'));
    });

    afterEach(async () => {
        mySandBox.restore();
    });

    it('should show wallets and identities in the BlockchainWalletExplorer view', async () => {
        getIdentityNamesStub.onCall(0).resolves([FabricRuntimeUtil.ADMIN_USER, 'yellowConga', 'orangeConga']);
        getIdentityNamesStub.onCall(1).resolves(['violetConga', 'purpleConga']);
        getIdentityNamesStub.onCall(2).resolves([]);

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

        const certTwo: string = `-----BEGIN CERTIFICATE-----
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

        getIdentitiesStub.onCall(1).resolves([
            { name: FabricRuntimeUtil.ADMIN_USER, enrollment: { identity: { certificate: certOne } } },
            { name: 'yellowConga', enrollment: { identity: { certificate: certOne } } },
            { name: 'orangeConga', enrollment: { identity: { certificate: certOne } } }
        ]);

        const getAttributesStub: sinon.SinonStub = mySandBox.stub(FabricCertificate.prototype, 'getAttributes');
        getAttributesStub.callThrough();
        getAttributesStub.onCall(0).returns({ attr1: 'hello', attr2: 'world' });
        getAttributesStub.onCall(1).returns({ attr3: 'good', attr4: 'day!' });

        getIdentitiesStub.onCall(0).resolves([
            { name: 'violetConga', enrollment: { identity: { certificate: certTwo } } },
            { name: 'purpleConga', enrollment: { identity: { certificate: certTwo } } }
        ]);

        getIdentitiesStub.onCall(2).resolves([]);

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

    it('should say that there are no wallets', async () => {
        await FabricWalletRegistry.instance().clear();
        const wallets: Array<BlockchainTreeItem> = await blockchainWalletExplorerProvider.getChildren() as Array<BlockchainTreeItem>;
        wallets.length.should.equal(1);
        wallets[0].label.should.equal(`No wallets found`);
    });

    it('should handle no identities in the local wallet', async () => {
        await FabricWalletRegistry.instance().clear();
        await LocalEnvironmentManager.instance().getRuntime().importWalletsAndIdentities();
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

        await FabricWalletRegistry.instance().clear();

        await LocalEnvironmentManager.instance().getRuntime().importWalletsAndIdentities();
        await FabricWalletRegistry.instance().add(blueWalletEntry);
        await FabricWalletRegistry.instance().add(greenWalletEntry);

        const wallets: Array<WalletTreeItem> = await blockchainWalletExplorerProvider.getChildren() as Array<WalletTreeItem>;
        const blueWallet: WalletTreeItem = blockchainWalletExplorerProvider.getTreeItem(wallets[1]) as WalletTreeItem;
        blueWallet.label.should.equal('blueWallet');
        logSpy.should.not.have.been.calledWith(LogType.ERROR);
    });

    it('should handle errors when populating the BlockchainWalletExplorer view', async () => {
        getIdentityNamesStub.rejects({ message: 'something bad has happened' });

        await blockchainWalletExplorerProvider.getChildren() as Array<WalletTreeItem>;
        logSpy.should.have.been.calledOnceWith(LogType.ERROR, 'Error displaying Fabric Wallets: something bad has happened', 'Error displaying Fabric Wallets: something bad has happened');
    });

    it('should not populate the BlockchainWalletExplorer view with wallets without wallet paths', async () => {
        getIdentityNamesStub.resolves([]);
        const purpleWallet: FabricWalletRegistryEntry = new FabricWalletRegistryEntry({
            name: 'purpleWallet',
            walletPath: undefined
        });

        await FabricWalletRegistry.instance().clear();

        await LocalEnvironmentManager.instance().getRuntime().importWalletsAndIdentities();
        await FabricWalletRegistry.instance().add(blueWalletEntry);
        await FabricWalletRegistry.instance().add(greenWalletEntry);
        await FabricWalletRegistry.instance().add(purpleWallet);

        const wallets: Array<WalletTreeItem> = await blockchainWalletExplorerProvider.getChildren() as Array<WalletTreeItem>;
        wallets.length.should.equal(3);
        wallets[1].label.should.equal(blueWalletEntry.name);
        wallets[2].label.should.equal(greenWalletEntry.name);
    });
});
