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
import * as myExtension from '../../src/extension';
import { TestUtil } from '../TestUtil';
import { FabricGatewayRegistryEntry } from '../../src/fabric/FabricGatewayRegistryEntry';
import { FabricGatewayRegistry } from '../../src/fabric/FabricGatewayRegistry';
import { FabricWalletRegistryEntry } from '../../src/fabric/FabricWalletRegistryEntry';
import { FabricWalletRegistry } from '../../src/fabric/FabricWalletRegistry';
import { GatewayDissociatedTreeItem } from '../../src/explorer/model/GatewayDissociatedTreeItem';
import { BlockchainGatewayExplorerProvider } from '../../src/explorer/gatewayExplorer';
import { BlockchainTreeItem } from '../../src/explorer/model/BlockchainTreeItem';
import { ExtensionCommands } from '../../ExtensionCommands';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../../src/logging/OutputAdapter';
import { FabricRuntimeManager } from '../../src/fabric/FabricRuntimeManager';
import { SettingConfigurations } from '../../SettingConfigurations';
import { FabricRuntimeUtil } from '../../src/fabric/FabricRuntimeUtil';
import { FabricWalletUtil } from '../../src/fabric/FabricWalletUtil';

// tslint:disable no-unused-expression
const should: Chai.Should = chai.should();
chai.use(sinonChai);

describe('AssociateWalletCommand', () => {

    before(async () => {
        await TestUtil.setupTests();
        await TestUtil.storeGatewaysConfig();
        await TestUtil.storeWalletsConfig();
    });

    after(async () => {
        await TestUtil.restoreGatewaysConfig();
        await TestUtil.restoreWalletsConfig();
    });

    describe('associateWallet', () => {
        let mySandBox: sinon.SinonSandbox;
        const rootPath: string = path.dirname(__dirname);
        const walletPath: string = path.join(rootPath, '../../test/data/walletDir/wallet');
        let logSpy: sinon.SinonSpy;
        let showWalletsQuickPickBoxStub: sinon.SinonStub;
        let showGatewayQuickPickBoxStub: sinon.SinonStub;
        let fabricGatewayRegistryUpdateStub: sinon.SinonStub;
        beforeEach(async () => {
            mySandBox = sinon.createSandbox();

            // reset the stored gateways and wallets
            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_GATEWAYS, [], vscode.ConfigurationTarget.Global);
            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_WALLETS, [], vscode.ConfigurationTarget.Global);

            const connectionOne: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry({
                name: 'myGateway',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                managedRuntime: false,
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
            fabricGatewayRegistryUpdateStub = mySandBox.stub(FabricGatewayRegistry.instance(), 'update').resolves();
            showWalletsQuickPickBoxStub = mySandBox.stub(UserInputUtil, 'showWalletsQuickPickBox');
            showGatewayQuickPickBoxStub = mySandBox.stub(UserInputUtil, 'showGatewayQuickPickBox');

            mySandBox.stub(FabricRuntimeManager.instance(), 'getGatewayRegistryEntries').resolves([]);
        });

        afterEach(async () => {
            mySandBox.restore();
        });

        it('should test a wallet can be associated with a gateway using the tree', async () => {
            showWalletsQuickPickBoxStub.resolves({
                label: 'blueWallet',
                data: FabricWalletRegistry.instance().get('blueWallet')
            });

            const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = myExtension.getBlockchainGatewayExplorerProvider();
            const gateways: Array<BlockchainTreeItem> = await blockchainGatewayExplorerProvider.getChildren();
            const gatewayTreeItem: GatewayDissociatedTreeItem = gateways[0] as GatewayDissociatedTreeItem;

            await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_WALLET, gatewayTreeItem);

            fabricGatewayRegistryUpdateStub.should.have.been.calledOnceWithExactly({
                name: 'myGateway',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                managedRuntime: false,
                associatedWallet: 'blueWallet'
            });

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associateWallet');
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully associated "blueWallet" wallet with "myGateway" gateway`);
        });

        it('should display an error message if no user added gateways exist', async () => {
            await FabricGatewayRegistry.instance().clear();

            await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_WALLET);

            showGatewayQuickPickBoxStub.should.not.have.been.called;

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associateWallet');
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.ERROR, `Add a gateway to associate a wallet. ${FabricRuntimeUtil.LOCAL_FABRIC} is associated with ${FabricWalletUtil.LOCAL_WALLET}.`, `Add a gateway to associate a wallet. ${FabricRuntimeUtil.LOCAL_FABRIC} is associated with ${FabricWalletUtil.LOCAL_WALLET}.`);
        });

        it('should display an error message if no user added wallets exist', async () => {
            await FabricWalletRegistry.instance().clear();

            const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = myExtension.getBlockchainGatewayExplorerProvider();
            const gateways: Array<BlockchainTreeItem> = await blockchainGatewayExplorerProvider.getChildren();
            const gatewayTreeItem: GatewayDissociatedTreeItem = gateways[0] as GatewayDissociatedTreeItem;

            await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_WALLET, gatewayTreeItem);

            showWalletsQuickPickBoxStub.should.not.have.been.called;

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associateWallet');
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.ERROR, `You must first add a wallet, to then associate with this gateway`);
        });

        it('should test associating a wallet can be cancelled when asked to select a wallet', async () => {
            showWalletsQuickPickBoxStub.resolves();

            const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = myExtension.getBlockchainGatewayExplorerProvider();
            const gateways: Array<BlockchainTreeItem> = await blockchainGatewayExplorerProvider.getChildren();
            const gatewayTreeItem: GatewayDissociatedTreeItem = gateways[0] as GatewayDissociatedTreeItem;

            await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_WALLET, gatewayTreeItem);

            fabricGatewayRegistryUpdateStub.should.not.have.been.called;

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associateWallet');
            should.not.exist(logSpy.getCall(1));
        });

        it('should test a wallet can be associated with a gateway using the command', async () => {
            showGatewayQuickPickBoxStub.resolves({
                label: 'myGateway',
                data: FabricGatewayRegistry.instance().get('myGateway')
            });

            showWalletsQuickPickBoxStub.resolves({
                label: 'blueWallet',
                data: FabricWalletRegistry.instance().get('blueWallet')
            });

            await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_WALLET);

            fabricGatewayRegistryUpdateStub.should.have.been.calledOnceWithExactly({
                name: 'myGateway',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                managedRuntime: false,
                associatedWallet: 'blueWallet'
            });

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associateWallet');
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully associated "blueWallet" wallet with "myGateway" gateway`);
        });

        it('should test associating a wallet can be cancelled when asked to select a gateway', async () => {
            showGatewayQuickPickBoxStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_WALLET);

            fabricGatewayRegistryUpdateStub.should.not.have.been.called;
            showWalletsQuickPickBoxStub.should.not.have.been.called;

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associateWallet');
            should.not.exist(logSpy.getCall(1));
        });

        it('should throw an error if unable to update a gateway with the associated wallet', async () => {
            const error: Error = new Error('cannot write to file');
            fabricGatewayRegistryUpdateStub.throws(error);

            showGatewayQuickPickBoxStub.resolves({
                label: 'myGateway',
                data: FabricGatewayRegistry.instance().get('myGateway')
            });

            showWalletsQuickPickBoxStub.resolves({
                label: 'blueWallet',
                data: FabricWalletRegistry.instance().get('blueWallet')
            });

            await vscode.commands.executeCommand(ExtensionCommands.ASSOCIATE_WALLET).should.have.rejectedWith(`Unable to associate wallet: ${error.message}`);

            fabricGatewayRegistryUpdateStub.should.have.been.calledOnceWithExactly({
                name: 'myGateway',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                managedRuntime: false,
                associatedWallet: 'blueWallet'
            });

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'associateWallet');
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.ERROR, `Unable to associate wallet: ${error.message}`, `Unable to associate wallet: ${error.toString()}`);
            should.not.exist(logSpy.getCall(2));
        });
    });
});
