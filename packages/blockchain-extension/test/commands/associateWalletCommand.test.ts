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
import * as chai from 'chai';
import * as path from 'path';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { TestUtil } from '../TestUtil';
import { GatewayDissociatedTreeItem } from '../../extension/explorer/model/GatewayDissociatedTreeItem';
import { BlockchainGatewayExplorerProvider } from '../../extension/explorer/gatewayExplorer';
import { BlockchainTreeItem } from '../../extension/explorer/model/BlockchainTreeItem';
import { ExtensionCommands } from '../../ExtensionCommands';
import { UserInputUtil } from '../../extension/commands/UserInputUtil';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { FabricWalletRegistry, FabricWalletRegistryEntry, LogType, FabricGatewayRegistry, FabricGatewayRegistryEntry, FabricEnvironmentRegistry } from 'ibm-blockchain-platform-common';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';

// tslint:disable no-unused-expression
const should: Chai.Should = chai.should();
chai.use(sinonChai);

describe('AssociateWalletCommand', () => {
    let mySandBox: sinon.SinonSandbox;

    before(async () => {
        mySandBox = sinon.createSandbox();
        await TestUtil.setupTests(mySandBox);
    });

    describe('associateWallet', () => {
        const rootPath: string = path.dirname(__dirname);
        const walletPath: string = path.join(rootPath, '../../test/data/walletDir/wallet');
        let logSpy: sinon.SinonSpy;
        let showWalletsQuickPickBoxStub: sinon.SinonStub;
        let showGatewayQuickPickBoxStub: sinon.SinonStub;

        beforeEach(async () => {
            await FabricEnvironmentRegistry.instance().clear();
            await FabricWalletRegistry.instance().clear();

            const connectionOne: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry({
                name: 'myGateway',
                associatedWallet: ''
            });

            await FabricGatewayRegistry.instance().clear();
            await FabricGatewayRegistry.instance().add(connectionOne);

            const connectionOneWallet: FabricWalletRegistryEntry = new FabricWalletRegistryEntry({
                name: 'blueWallet',
                walletPath: walletPath
            });

            await FabricWalletRegistry.instance().clear();
            await FabricWalletRegistry.instance().add(connectionOneWallet);

            logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');

            showWalletsQuickPickBoxStub = mySandBox.stub(UserInputUtil, 'showWalletsQuickPickBox');
            showGatewayQuickPickBoxStub = mySandBox.stub(UserInputUtil, 'showGatewayQuickPickBox');
        });

        afterEach(async () => {
            mySandBox.restore();
        });

        it('should test a wallet can be associated with a gateway using the tree', async () => {
            showWalletsQuickPickBoxStub.resolves({
                label: 'blueWallet',
                data: FabricWalletRegistry.instance().get('blueWallet')
            });

            const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = ExtensionUtil.getBlockchainGatewayExplorerProvider();
            const gatewayGroups: Array<BlockchainTreeItem> = await blockchainGatewayExplorerProvider.getChildren();
            const gatewayGroupChildren: Array<BlockchainTreeItem> = await blockchainGatewayExplorerProvider.getChildren(gatewayGroups[0]);
            const gatewayTreeItem: GatewayDissociatedTreeItem = gatewayGroupChildren[0] as GatewayDissociatedTreeItem;

            await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_WALLET, gatewayTreeItem);

            const result: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get('myGateway');
            result.associatedWallet.should.equal('blueWallet');

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associateWallet');
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully associated "blueWallet" wallet with "myGateway" gateway`);
        });

        it('should display an error message if no user added gateways exist', async () => {
            await FabricGatewayRegistry.instance().clear();

            await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_WALLET);

            showGatewayQuickPickBoxStub.should.not.have.been.called;

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associateWallet');
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.ERROR, `Add a gateway to associate a wallet.`);
        });

        it('should display an error message if no user added wallets exist', async () => {
            await FabricWalletRegistry.instance().clear();

            const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = ExtensionUtil.getBlockchainGatewayExplorerProvider();
            const gateways: Array<BlockchainTreeItem> = await blockchainGatewayExplorerProvider.getChildren();
            const gatewayTreeItem: GatewayDissociatedTreeItem = gateways[0] as GatewayDissociatedTreeItem;

            await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_WALLET, gatewayTreeItem);

            showWalletsQuickPickBoxStub.should.not.have.been.called;

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associateWallet');
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.ERROR, `You must first add a wallet, to then associate with this gateway`);
        });

        it('should test associating a wallet can be cancelled when asked to select a wallet', async () => {
            showWalletsQuickPickBoxStub.resolves();

            const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = ExtensionUtil.getBlockchainGatewayExplorerProvider();
            const gateways: Array<BlockchainTreeItem> = await blockchainGatewayExplorerProvider.getChildren();
            const gatewayTreeItem: GatewayDissociatedTreeItem = gateways[0] as GatewayDissociatedTreeItem;

            await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_WALLET, gatewayTreeItem);

            const result: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get('myGateway');
            result.associatedWallet.should.equal('');

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associateWallet');
            should.not.exist(logSpy.getCall(1));
        });

        it('should test a wallet can be associated with a gateway using the command', async () => {
            const gateway: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get('myGateway');
            showGatewayQuickPickBoxStub.resolves({
                label: 'myGateway',
                data: gateway
            });

            showWalletsQuickPickBoxStub.resolves({
                label: 'blueWallet',
                data: FabricWalletRegistry.instance().get('blueWallet')
            });

            await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_WALLET);

            const result: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get('myGateway');
            result.associatedWallet.should.equal('blueWallet');

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associateWallet');
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully associated "blueWallet" wallet with "myGateway" gateway`);
        });

        it('should test associating a wallet can be cancelled when asked to select a gateway', async () => {
            showGatewayQuickPickBoxStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_WALLET);

            const result: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get('myGateway');
            result.associatedWallet.should.equal('');
            showWalletsQuickPickBoxStub.should.not.have.been.called;

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associateWallet');
            should.not.exist(logSpy.getCall(1));
        });

        it('should throw an error if unable to update a gateway with the associated wallet', async () => {
            const error: Error = new Error('cannot write to file');

            mySandBox.stub(FabricGatewayRegistry.instance(), 'update').rejects(error);

            const gateway: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get('myGateway');

            showGatewayQuickPickBoxStub.resolves({
                label: 'myGateway',
                data: gateway
            });

            const wallet: FabricWalletRegistryEntry = await FabricWalletRegistry.instance().get('blueWallet');
            showWalletsQuickPickBoxStub.resolves({
                label: 'blueWallet',
                data: wallet
            });

            await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_WALLET);

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associateWallet');
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.ERROR, `Unable to associate wallet: ${error.message}`, `Unable to associate wallet: ${error.toString()}`);
            should.not.exist(logSpy.getCall(2));
        });
    });
});
