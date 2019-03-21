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
import * as myExtension from '../../src/extension';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { BlockchainWalletExplorerProvider } from '../../src/explorer/walletExplorer';
import { TestUtil } from '../TestUtil';
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../../src/logging/OutputAdapter';
import { WalletTreeItem } from '../../src/explorer/wallets/WalletTreeItem';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricWalletRegistryEntry } from '../../src/fabric/FabricWalletRegistryEntry';
import { FabricWallet } from '../../src/fabric/FabricWallet';
import { IdentityTreeItem } from '../../src/explorer/model/IdentityTreeItem';
import { FabricWalletGeneratorFactory } from '../../src/fabric/FabricWalletGeneratorFactory';

chai.use(sinonChai);
chai.should();

// tslint:disable no-unused-expression

describe('walletExplorer', () => {

    let mySandBox: sinon.SinonSandbox;
    let logSpy: sinon.SinonSpy;
    let blockchainWalletExplorerProvider: BlockchainWalletExplorerProvider;
    let blueWalletEntry: FabricWalletRegistryEntry;
    let greenWalletEntry: FabricWalletRegistryEntry;
    let getIdentityNamesStub: sinon.SinonStub;
    let getLocalWalletIdentityNamesStub: sinon.SinonStub;

    before(async () => {
        await TestUtil.setupTests();
        await TestUtil.storeWalletsConfig();
    });

    after(async () => {
        await TestUtil.restoreWalletsConfig();
    });

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
        logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
        blockchainWalletExplorerProvider = myExtension.getBlockchainWalletExplorerProvider();

        blueWalletEntry = new FabricWalletRegistryEntry({
            name: 'blueWallet',
            walletPath: '/some/path'
        });
        greenWalletEntry = new FabricWalletRegistryEntry({
            name: 'greenWallet',
            walletPath: '/some/other/path'
        });
        const testFabricWallet: FabricWallet = new FabricWallet('some/path');
        getIdentityNamesStub = mySandBox.stub(testFabricWallet, 'getIdentityNames');
        mySandBox.stub(FabricWalletGeneratorFactory.createFabricWalletGenerator(), 'getNewWallet').returns(testFabricWallet);
        const localWallet: FabricWallet = new FabricWallet('/some/local/path');
        getLocalWalletIdentityNamesStub = mySandBox.stub(localWallet, 'getIdentityNames').resolves(['yellowConga', 'orangeConga']);
        mySandBox.stub(FabricWalletGeneratorFactory.createFabricWalletGenerator(), 'createLocalWallet').resolves(localWallet);
        await vscode.workspace.getConfiguration().update('fabric.wallets', [], vscode.ConfigurationTarget.Global);
    });

    afterEach(async () => {
        mySandBox.restore();
    });

    it('should show wallets and identities in the BlockchainWalletExplorer view', async () => {
        getIdentityNamesStub.resolves(['violetConga', 'purpleConga']);
        getIdentityNamesStub.onCall(1).resolves([]);
        await vscode.workspace.getConfiguration().update('fabric.wallets', [blueWalletEntry, greenWalletEntry], vscode.ConfigurationTarget.Global);

        const wallets: Array<WalletTreeItem> = await blockchainWalletExplorerProvider.getChildren() as Array<WalletTreeItem>;
        wallets.length.should.equal(3);
        wallets[0].label.should.equal('local_wallet');
        wallets[1].label.should.equal(blueWalletEntry.name);
        wallets[2].label.should.equal(greenWalletEntry.name);
        wallets[2].identities.should.deep.equal([]);

        const blueWalletIdentities: Array<IdentityTreeItem> = await blockchainWalletExplorerProvider.getChildren(wallets[1]) as Array<IdentityTreeItem>;
        blueWalletIdentities.length.should.equal(2);
        blueWalletIdentities[0].label.should.equal('violetConga');
        blueWalletIdentities[1].label.should.equal('purpleConga');
        logSpy.should.not.have.been.calledWith(LogType.ERROR);

        const localWalletIdentities: Array<IdentityTreeItem> = await blockchainWalletExplorerProvider.getChildren(wallets[0]) as Array<IdentityTreeItem>;
        localWalletIdentities.length.should.equal(2);
        localWalletIdentities[0].label.should.equal('yellowConga');
        localWalletIdentities[1].label.should.equal('orangeConga');
        logSpy.should.not.have.been.calledWith(LogType.ERROR);
    });

    it('should handle no identities in the local wallet', async () => {
        getLocalWalletIdentityNamesStub.resolves([]);
        const wallets: Array<WalletTreeItem> = await blockchainWalletExplorerProvider.getChildren() as Array<WalletTreeItem>;

        wallets.length.should.equal(1);
        wallets[0].label.should.equal('local_wallet');
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
        await vscode.workspace.getConfiguration().update('fabric.wallets', [blueWalletEntry, greenWalletEntry], vscode.ConfigurationTarget.Global);

        const wallets: Array<WalletTreeItem> = await blockchainWalletExplorerProvider.getChildren() as Array<WalletTreeItem>;
        const blueWallet: WalletTreeItem = blockchainWalletExplorerProvider.getTreeItem(wallets[1]) as WalletTreeItem;
        blueWallet.label.should.equal('blueWallet');
        logSpy.should.not.have.been.calledWith(LogType.ERROR);
    });

    it('should handle errors when populating the BlockchainWalletExplorer view', async () => {
        getLocalWalletIdentityNamesStub.rejects( { message: 'something bad has happened' } );

        await blockchainWalletExplorerProvider.getChildren() as Array<WalletTreeItem>;
        logSpy.should.have.been.calledOnceWith(LogType.ERROR, 'Error displaying Fabric Wallets: something bad has happened', 'Error displaying Fabric Wallets: something bad has happened');
    });

    it('should not populate the BlockchainWalletExplorer view with wallets without wallet paths', async () => {
        getIdentityNamesStub.resolves([]);
        const purpleWallet: FabricWalletRegistryEntry = new FabricWalletRegistryEntry({
            name: 'purpleWallet',
            walletPath: undefined
        });
        await vscode.workspace.getConfiguration().update('fabric.wallets', [blueWalletEntry, greenWalletEntry, purpleWallet], vscode.ConfigurationTarget.Global);

        const wallets: Array<WalletTreeItem> = await blockchainWalletExplorerProvider.getChildren() as Array<WalletTreeItem>;
        wallets.length.should.equal(3);
        wallets[1].label.should.equal(blueWalletEntry.name);
        wallets[2].label.should.equal(greenWalletEntry.name);
    });

});
