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
import * as fs from 'fs-extra';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { BlockchainTreeItem } from '../../extension/explorer/model/BlockchainTreeItem';
import { TestUtil } from '../TestUtil';
import { FabricGatewayRegistry } from '../../extension/registries/FabricGatewayRegistry';
import { BlockchainGatewayExplorerProvider } from '../../extension/explorer/gatewayExplorer';
import { UserInputUtil } from '../../extension/commands/UserInputUtil';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricRuntimeManager } from '../../extension/fabric/FabricRuntimeManager';
import { SettingConfigurations } from '../../SettingConfigurations';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../../extension/logging/OutputAdapter';
import { FabricRuntimeUtil } from '../../extension/fabric/FabricRuntimeUtil';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';
import { FileSystemUtil } from '../../extension/util/FileSystemUtil';
import { FabricGatewayRegistryEntry } from '../../extension/registries/FabricGatewayRegistryEntry';

chai.should();
chai.use(sinonChai);
// tslint:disable no-unused-expression

describe('DeleteGatewayCommand', () => {
    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();
    let showConfirmationWarningMessage: sinon.SinonStub;
    before(async () => {
        await TestUtil.setupTests(mySandBox);
    });

    after(async () => {
        await TestUtil.restoreAll();
    });

    describe('deleteGateway', () => {

        let showGatewayQuickPickBoxStub: sinon.SinonStub;
        let gateways: Array<any>;
        let myGatewayA: any;
        let myGatewayB: any;
        const rootPath: string = path.dirname(__dirname);
        let logSpy: sinon.SinonSpy;

        beforeEach(async () => {
            mySandBox.restore();
            showConfirmationWarningMessage = mySandBox.stub(UserInputUtil, 'showConfirmationWarningMessage').withArgs(`This will remove the gateway(s). Do you want to continue?`).resolves(true);
            logSpy = mySandBox.stub(VSCodeBlockchainOutputAdapter.instance(), 'log');

            // reset the available gateways
            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_GATEWAYS, [], vscode.ConfigurationTarget.Global);

            gateways = [];

            myGatewayA = {
                name: 'myGatewayA'
            };
            gateways.push(myGatewayA);

            myGatewayB = {
                name: 'myGatewayB'
            };
            gateways.push(myGatewayB);

            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_GATEWAYS, gateways, vscode.ConfigurationTarget.Global);

            const gateway: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get('myGatewayB');

            showGatewayQuickPickBoxStub = mySandBox.stub(UserInputUtil, 'showGatewayQuickPickBox').resolves([{
                label: 'myGatewayB',
                data: gateway
            }]);

            mySandBox.stub(FabricRuntimeManager.instance(), 'getGatewayRegistryEntries').resolves([]);
        });

        afterEach(() => {
            mySandBox.restore();
        });

        it('should test a gateway can be deleted from the command', async () => {

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_GATEWAY);

            gateways = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_GATEWAYS);
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

            gateways = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_GATEWAYS);
            gateways.length.should.equal(0);

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `deleteGateway`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully deleted gateways`);
        });

        it('should test a gateway can be deleted from tree', async () => {
            const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = ExtensionUtil.getBlockchainGatewayExplorerProvider();

            const allChildren: Array<BlockchainTreeItem> = await blockchainGatewayExplorerProvider.getChildren();

            const gatewayToDelete: BlockchainTreeItem = allChildren[0];
            await vscode.commands.executeCommand(ExtensionCommands.DELETE_GATEWAY, gatewayToDelete);

            gateways = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_GATEWAYS);
            gateways.length.should.equal(1);
            gateways[0].should.deep.equal(myGatewayB);

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `deleteGateway`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully deleted ${myGatewayA.name} gateway`);
        });

        it('should test delete gateway can be cancelled', async () => {
            showGatewayQuickPickBoxStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_GATEWAY);

            gateways = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_GATEWAYS);
            gateways.length.should.equal(2);

            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `deleteGateway`);
        });

        it('should handle the user not selecting a gateway to delete', async () => {
            showGatewayQuickPickBoxStub.resolves([]);

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_GATEWAY);

            gateways = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_GATEWAYS);
            gateways.length.should.equal(2);

            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `deleteGateway`);
        });

        it('should show an error message if no gateways have been added', async () => {
            await FabricGatewayRegistry.instance().clear();

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_GATEWAY);

            showGatewayQuickPickBoxStub.should.not.have.been.called;
            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `deleteGateway`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.ERROR, `No gateways to delete. ${FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME} cannot be deleted.`, `No gateways to delete. ${FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME} cannot be deleted.`);
        });

        it('should handle no from confirmation message', async () => {
            showConfirmationWarningMessage.resolves(false);

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_GATEWAY);

            gateways = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_GATEWAYS);
            gateways.length.should.equal(2);
            gateways[0].should.deep.equal(myGatewayA);
            gateways[1].should.deep.equal(myGatewayB);

            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `deleteGateway`);
        });

        it('should delete the local gateway directory if the extension owns it', async () => {
            const myGatewayC: FabricGatewayRegistryEntry = {
                name: 'myGatewayC',
                associatedWallet: ''
            };
            gateways.push(myGatewayC);
            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_GATEWAYS, gateways, vscode.ConfigurationTarget.Global);

            const gatewayC: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get('myGatewayC');
            showGatewayQuickPickBoxStub.resolves([{
                label: 'myGatewayC',
                data: gatewayC
            }]);

            const getDirPathStub: sinon.SinonStub = mySandBox.stub(FileSystemUtil, 'getDirPath').returns('fabric-vscode');
            const fsRemoveStub: sinon.SinonStub = mySandBox.stub(fs, 'remove').resolves();

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_GATEWAY);
            gateways = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_GATEWAYS);
            gateways.length.should.equal(2);
            gateways[0].should.deep.equal(myGatewayA);
            gateways[1].should.deep.equal(myGatewayB);

            getDirPathStub.should.have.been.calledOnce;
            fsRemoveStub.should.have.been.calledOnceWith(path.join('fabric-vscode', 'gateways', 'myGatewayC'));

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `deleteGateway`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully deleted ${myGatewayC.name} gateway`);
        });

        it('should delete multiple local gateway directories if the extension owns it', async () => {
            const myGatewayC: any = {
                name: 'myGatewayC',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json')
            };

            const myGatewayD: any = {
                name: 'myGatewayD',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionThree/connection.json')
            };
            gateways.push(myGatewayC);
            gateways.push(myGatewayD);
            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_GATEWAYS, gateways, vscode.ConfigurationTarget.Global);

            const gatewayOne: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get('myGatewayC');
            const gatewayTwo: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get('myGatewayD');

            showGatewayQuickPickBoxStub.resolves([{
                label: 'myGatewayC',
                data: gatewayOne
            }, {
                label: 'myGatewayD',
                data: gatewayTwo
            }]);

            const getDirPathStub: sinon.SinonStub = mySandBox.stub(FileSystemUtil, 'getDirPath').returns('fabric-vscode');
            const fsRemoveStub: sinon.SinonStub = mySandBox.stub(fs, 'remove').resolves();

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_GATEWAY);
            gateways = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_GATEWAYS);
            gateways.length.should.equal(2);
            gateways[0].should.deep.equal(myGatewayA);
            gateways[1].should.deep.equal(myGatewayB);

            getDirPathStub.should.have.been.calledOnce;
            fsRemoveStub.should.have.been.calledTwice;

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `deleteGateway`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully deleted gateways`);
        });
    });
});
