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
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { BlockchainTreeItem } from '../../extension/explorer/model/BlockchainTreeItem';
import { TestUtil } from '../TestUtil';
import { BlockchainGatewayExplorerProvider } from '../../extension/explorer/gatewayExplorer';
import { UserInputUtil } from '../../extension/commands/UserInputUtil';
import { ExtensionCommands } from '../../ExtensionCommands';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { LogType, FabricGatewayRegistry, FabricGatewayRegistryEntry, FabricEnvironmentRegistry } from 'ibm-blockchain-platform-common';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';

chai.should();
chai.use(sinonChai);
// tslint:disable no-unused-expression

describe('DeleteGatewayCommand', () => {
    let mySandBox: sinon.SinonSandbox;
    let showConfirmationWarningMessage: sinon.SinonStub;
    before(async () => {
        mySandBox = sinon.createSandbox();
        await TestUtil.setupTests(mySandBox);
    });

    describe('deleteGateway', () => {

        let showGatewayQuickPickBoxStub: sinon.SinonStub;
        let gateways: Array<FabricGatewayRegistryEntry>;
        let myGatewayA: any;
        let myGatewayB: any;
        let logSpy: sinon.SinonSpy;

        beforeEach(async () => {
            mySandBox.restore();
            showConfirmationWarningMessage = mySandBox.stub(UserInputUtil, 'showConfirmationWarningMessage').withArgs(`This will remove the gateway(s). Do you want to continue?`).resolves(true);
            logSpy = mySandBox.stub(VSCodeBlockchainOutputAdapter.instance(), 'log');

            // reset the available gateways
            await FabricEnvironmentRegistry.instance().clear();
            await FabricGatewayRegistry.instance().clear();

            myGatewayA = new FabricGatewayRegistryEntry();
            myGatewayA.name = 'myGatewayA';

            await FabricGatewayRegistry.instance().add(myGatewayA);

            myGatewayB = new FabricGatewayRegistryEntry();
            myGatewayB.name = 'myGatewayB';

            await FabricGatewayRegistry.instance().add(myGatewayB);

            const gateway: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get('myGatewayB');
            showGatewayQuickPickBoxStub = mySandBox.stub(UserInputUtil, 'showGatewayQuickPickBox').resolves([{
                label: 'myGatewayB',
                data: gateway
            }]);
        });

        afterEach(() => {
            mySandBox.restore();
        });

        it('should test a gateway can be deleted from the command', async () => {

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_GATEWAY);

            gateways = await FabricGatewayRegistry.instance().getAll();
            gateways.length.should.equal(1);
            gateways[0].should.deep.equal(myGatewayA);

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `deleteGateway`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully deleted ${myGatewayB.name} gateway`);
        });

        it('should test multiple gateways can be deleted from the command', async () => {

            const gatewayA: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get('myGatewayA');
            const gatewayB: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get('myGatewayB');

            showGatewayQuickPickBoxStub.resolves([{
                label: 'myGatewayA',
                data: gatewayA
            }, {
                label: 'myGatewayB',
                data: gatewayB
            }]);

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_GATEWAY);

            gateways = await FabricGatewayRegistry.instance().getAll();
            gateways.length.should.equal(0);

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `deleteGateway`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully deleted gateways`);
        });

        it('should test a gateway can be deleted from tree', async () => {
            const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = ExtensionUtil.getBlockchainGatewayExplorerProvider();

            const allChildren: Array<BlockchainTreeItem> = await blockchainGatewayExplorerProvider.getChildren();
            const groupChildren: Array<BlockchainTreeItem> = await blockchainGatewayExplorerProvider.getChildren(allChildren[0]);
            const gatewayToDelete: BlockchainTreeItem = groupChildren[0];
            await vscode.commands.executeCommand(ExtensionCommands.DELETE_GATEWAY, gatewayToDelete);

            gateways = await FabricGatewayRegistry.instance().getAll();
            gateways.length.should.equal(1);
            gateways[0].should.deep.equal(myGatewayB);

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `deleteGateway`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully deleted ${myGatewayA.name} gateway`);
        });

        it('should test delete gateway can be cancelled', async () => {
            showGatewayQuickPickBoxStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_GATEWAY);

            gateways = await FabricGatewayRegistry.instance().getAll();
            gateways.length.should.equal(2);

            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `deleteGateway`);
        });

        it('should handle the user not selecting a gateway to delete', async () => {
            showGatewayQuickPickBoxStub.resolves([]);

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_GATEWAY);

            gateways = await FabricGatewayRegistry.instance().getAll();
            gateways.length.should.equal(2);

            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `deleteGateway`);
        });

        it('should show an error message if no gateways have been added', async () => {
            await FabricGatewayRegistry.instance().clear();

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_GATEWAY);

            showGatewayQuickPickBoxStub.should.not.have.been.called;
            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `deleteGateway`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.ERROR, `No gateways to delete. Local gateways cannot be deleted.`);
        });

        it('should handle no from confirmation message', async () => {
            showConfirmationWarningMessage.resolves(false);

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_GATEWAY);

            gateways = await FabricGatewayRegistry.instance().getAll();
            gateways.length.should.equal(2);
            gateways[0].should.deep.equal(myGatewayA);
            gateways[1].should.deep.equal(myGatewayB);

            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `deleteGateway`);
        });

        it('should delete the local gateway directory if the extension owns it', async () => {
            const myGatewayC: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
            myGatewayC.name = 'myGatewayC';

            await FabricGatewayRegistry.instance().add(myGatewayC);

            showGatewayQuickPickBoxStub.resolves([{
                label: 'myGatewayC',
                data: myGatewayC
            }]);

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_GATEWAY);
            gateways = await FabricGatewayRegistry.instance().getAll();
            gateways.length.should.equal(2);
            gateways[0].should.deep.equal(myGatewayA);
            gateways[1].should.deep.equal(myGatewayB);

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `deleteGateway`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully deleted ${myGatewayC.name} gateway`);
        });

        it('should delete multiple local gateway directories if the extension owns it', async () => {
            const myGatewayC: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
            myGatewayC.name = 'myGatewayC';

            const myGatewayD: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
            myGatewayD.name = 'myGatewayD';

            await FabricGatewayRegistry.instance().add(myGatewayC);
            await FabricGatewayRegistry.instance().add(myGatewayD);

            showGatewayQuickPickBoxStub.resolves([{
                label: 'myGatewayC',
                data: myGatewayC
            }, {
                label: 'myGatewayD',
                data: myGatewayD
            }]);

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_GATEWAY);
            gateways = await FabricGatewayRegistry.instance().getAll();
            gateways.length.should.equal(2);
            gateways[0].should.deep.equal(myGatewayA);
            gateways[1].should.deep.equal(myGatewayB);

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `deleteGateway`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully deleted gateways`);
        });
    });
});
