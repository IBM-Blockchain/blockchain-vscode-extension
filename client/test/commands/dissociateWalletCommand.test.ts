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
import * as chaiAsPromised from 'chai-as-promised';
import * as path from 'path';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as myExtension from '../../src/extension';
import { TestUtil } from '../TestUtil';
import { FabricGatewayRegistryEntry } from '../../src/fabric/FabricGatewayRegistryEntry';
import { FabricGatewayRegistry } from '../../src/fabric/FabricGatewayRegistry';
import { FabricWalletRegistryEntry } from '../../src/fabric/FabricWalletRegistryEntry';
import { FabricWalletRegistry } from '../../src/fabric/FabricWalletRegistry';
import { GatewayAssociatedTreeItem } from '../../src/explorer/model/GatewayAssociatedTreeItem';
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
chai.use(chaiAsPromised);

describe('DissociateWalletCommand', () => {
    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();

    before(async () => {
        await TestUtil.setupTests(mySandBox);
        await TestUtil.storeGatewaysConfig();
        await TestUtil.storeWalletsConfig();
    });

    after(async () => {
        await TestUtil.restoreGatewaysConfig();
        await TestUtil.restoreWalletsConfig();
    });

    describe('dissociateWallet', () => {
        const rootPath: string = path.dirname(__dirname);
        const walletPath: string = path.join(rootPath, '../../test/data/walletDir/wallet');
        let logSpy: sinon.SinonSpy;
        let showGatewayQuickPickBoxStub: sinon.SinonStub;
        let fabricGatewayRegistryUpdateStub: sinon.SinonStub;
        beforeEach(async () => {

            // reset the stored gateways and wallets
            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_GATEWAYS, [], vscode.ConfigurationTarget.Global);
            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_WALLETS, [], vscode.ConfigurationTarget.Global);

            const gatewayOne: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry({
                name: 'myGateway',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                managedRuntime: false,
                associatedWallet: 'blueWallet'
            });

            await FabricGatewayRegistry.instance().clear();
            await FabricGatewayRegistry.instance().add(gatewayOne);

            const gatewayOneWallet: FabricWalletRegistryEntry = new FabricWalletRegistryEntry({
                name: 'blueWallet',
                walletPath: walletPath
            });

            await FabricWalletRegistry.instance().clear();
            await FabricWalletRegistry.instance().add(gatewayOneWallet);

            logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
            fabricGatewayRegistryUpdateStub = mySandBox.stub(FabricGatewayRegistry.instance(), 'update').resolves();
            showGatewayQuickPickBoxStub = mySandBox.stub(UserInputUtil, 'showGatewayQuickPickBox');
            mySandBox.stub(FabricRuntimeManager.instance(), 'getGatewayRegistryEntries').resolves([]);
        });

        afterEach(async () => {
            mySandBox.restore();
        });

        it('should test a wallet can be dissociated from a gateway using the tree', async () => {
            const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = myExtension.getBlockchainGatewayExplorerProvider();
            const gateways: Array<BlockchainTreeItem> = await blockchainGatewayExplorerProvider.getChildren();
            const gatewayTreeItem: GatewayAssociatedTreeItem = gateways[0] as GatewayAssociatedTreeItem;

            await vscode.commands.executeCommand(ExtensionCommands.DISSOCIATE_WALLET, gatewayTreeItem);

            fabricGatewayRegistryUpdateStub.should.have.been.calledOnceWithExactly({
                name: 'myGateway',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                managedRuntime: false,
                associatedWallet: ''
            });

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'dissociateWallet');
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully dissociated wallet from "myGateway" gateway`);
        });

        it('should show an error if no user-added gateways exist', async () => {
            await FabricGatewayRegistry.instance().clear();

            await vscode.commands.executeCommand(ExtensionCommands.DISSOCIATE_WALLET);

            showGatewayQuickPickBoxStub.should.not.have.been.called;
            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'dissociateWallet');
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.ERROR, `No gateways to dissociate found. ${FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME} cannot be dissociated from ${FabricWalletUtil.LOCAL_WALLET_DISPLAY_NAME}.`, `No gateways to dissociate found. ${FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME} cannot be dissociated from ${FabricWalletUtil.LOCAL_WALLET_DISPLAY_NAME}.`);
        });

        it('should test dissociating a wallet can be cancelled when asked to select a gateway', async () => {
            showGatewayQuickPickBoxStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.DISSOCIATE_WALLET);

            fabricGatewayRegistryUpdateStub.should.not.have.been.called;

            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'dissociateWallet');
        });

        it('should test a wallet can be dissociated from a gateway using the command', async () => {
            showGatewayQuickPickBoxStub.resolves({
                label: 'myGateway',
                data: FabricGatewayRegistry.instance().get('myGateway')
            });

            await vscode.commands.executeCommand(ExtensionCommands.DISSOCIATE_WALLET);

            fabricGatewayRegistryUpdateStub.should.have.been.calledOnceWithExactly({
                name: 'myGateway',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                managedRuntime: false,
                associatedWallet: ''
            });

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'dissociateWallet');
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully dissociated wallet from "myGateway" gateway`);
        });

        it('should throw an error if unable to dissociate a wallet', async () => {
            const error: Error = new Error('cannot write to file');
            fabricGatewayRegistryUpdateStub.throws(error);

            showGatewayQuickPickBoxStub.resolves({
                label: 'myGateway',
                data: FabricGatewayRegistry.instance().get('myGateway')
            });

            await vscode.commands.executeCommand(ExtensionCommands.DISSOCIATE_WALLET).should.have.been.rejectedWith(`Unable to dissociate wallet: ${error.message}`);

            fabricGatewayRegistryUpdateStub.should.have.been.calledOnceWithExactly({
                name: 'myGateway',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                managedRuntime: false,
                associatedWallet: ''
            });

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'dissociateWallet');
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.ERROR, `Unable to dissociate wallet: ${error.message}`, `Unable to dissociate wallet: ${error.toString()}`);
            should.not.exist(logSpy.getCall(2));
        });
    });
});
