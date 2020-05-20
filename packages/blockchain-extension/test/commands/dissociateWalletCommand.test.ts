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
import { TestUtil } from '../TestUtil';
import { GatewayAssociatedTreeItem } from '../../extension/explorer/model/GatewayAssociatedTreeItem';
import { BlockchainGatewayExplorerProvider } from '../../extension/explorer/gatewayExplorer';
import { BlockchainTreeItem } from '../../extension/explorer/model/BlockchainTreeItem';
import { ExtensionCommands } from '../../ExtensionCommands';
import { UserInputUtil } from '../../extension/commands/UserInputUtil';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { FabricWalletRegistry, FabricWalletRegistryEntry, LogType, FabricGatewayRegistry, FabricGatewayRegistryEntry } from 'ibm-blockchain-platform-common';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';

// tslint:disable no-unused-expression
const should: Chai.Should = chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('DissociateWalletCommand', () => {
    let mySandBox: sinon.SinonSandbox;

    before(async () => {
        mySandBox = sinon.createSandbox();
        await TestUtil.setupTests(mySandBox);
    });

    describe('dissociateWallet', () => {
        const rootPath: string = path.dirname(__dirname);
        const walletPath: string = path.join(rootPath, '../../test/data/walletDir/wallet');
        let logSpy: sinon.SinonSpy;
        let showGatewayQuickPickBoxStub: sinon.SinonStub;

        beforeEach(async () => {

            await FabricWalletRegistry.instance().clear();
            const gatewayOne: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry({
                name: 'myGateway',
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

            showGatewayQuickPickBoxStub = mySandBox.stub(UserInputUtil, 'showGatewayQuickPickBox');
        });

        afterEach(async () => {
            mySandBox.restore();
        });

        it('should test a wallet can be dissociated from a gateway using the tree', async () => {
            const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = ExtensionUtil.getBlockchainGatewayExplorerProvider();
            const gatewayGroups: Array<BlockchainTreeItem> = await blockchainGatewayExplorerProvider.getChildren();
            const groupChildren: Array<BlockchainTreeItem> = await blockchainGatewayExplorerProvider.getChildren(gatewayGroups[0]);
            // TODO: Jake FIX
            const gatewayTreeItem: GatewayAssociatedTreeItem = groupChildren[0] as GatewayAssociatedTreeItem;

            await vscode.commands.executeCommand(ExtensionCommands.DISSOCIATE_WALLET, gatewayTreeItem);

            const result: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get('myGateway');
            result.associatedWallet.should.equal('');

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'dissociateWallet');
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully dissociated wallet from "myGateway" gateway`);
        });

        it('should show an error if no user-added gateways exist', async () => {
            await FabricGatewayRegistry.instance().clear();

            await vscode.commands.executeCommand(ExtensionCommands.DISSOCIATE_WALLET);

            showGatewayQuickPickBoxStub.should.not.have.been.called;
            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'dissociateWallet');
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.ERROR, `No gateways to dissociate found. Local gateways cannot be dissociated from their wallet.`);
        });

        it('should test dissociating a wallet can be cancelled when asked to select a gateway', async () => {
            showGatewayQuickPickBoxStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.DISSOCIATE_WALLET);

            const result: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get('myGateway');
            result.associatedWallet.should.equal('blueWallet');

            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'dissociateWallet');
        });

        it('should test a wallet can be dissociated from a gateway using the command', async () => {
            const gateway: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get('myGateway');
            showGatewayQuickPickBoxStub.resolves({
                label: 'myGateway',
                data: gateway
            });

            await vscode.commands.executeCommand(ExtensionCommands.DISSOCIATE_WALLET);

            const result: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get('myGateway');
            result.associatedWallet.should.equal('');

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'dissociateWallet');
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully dissociated wallet from "myGateway" gateway`);
        });

        it('should throw an error if unable to dissociate a wallet', async () => {
            const error: Error = new Error('cannot write to file');

            mySandBox.stub(FabricGatewayRegistry.instance(), 'update').rejects(error);

            const gateway: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get('myGateway');
            showGatewayQuickPickBoxStub.resolves({
                label: 'myGateway',
                data: gateway
            });

            await vscode.commands.executeCommand(ExtensionCommands.DISSOCIATE_WALLET);

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'dissociateWallet');
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.ERROR, `Unable to dissociate wallet: ${error.message}`, `Unable to dissociate wallet: ${error.toString()}`);
            should.not.exist(logSpy.getCall(2));
        });
    });
});
