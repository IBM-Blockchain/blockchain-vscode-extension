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
import { BlockchainTreeItem } from '../../src/explorer/model/BlockchainTreeItem';
import { TestUtil } from '../TestUtil';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { ExtensionCommands } from '../../ExtensionCommands';
import { SettingConfigurations } from '../../SettingConfigurations';
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../../src/logging/OutputAdapter';
import { FabricRuntimeUtil } from '../../src/fabric/FabricRuntimeUtil';
import { BlockchainEnvironmentExplorerProvider } from '../../src/explorer/environmentExplorer';
import { FabricEnvironmentRegistry } from '../../src/fabric/FabricEnvironmentRegistry';
import { ExtensionUtil } from '../../src/util/ExtensionUtil';

chai.should();
chai.use(sinonChai);
// tslint:disable no-unused-expression

describe('DeleteEnvironmentCommand', () => {
    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();
    let showConfirmationWarningMessage: sinon.SinonStub;
    before(async () => {
        await TestUtil.setupTests(mySandBox);
        await TestUtil.storeEnvironmentsConfig();
    });

    after(async () => {
        await TestUtil.restoreEnvironmentsConfig();
    });

    describe('deleteEnvironment', () => {

        let quickPickStub: sinon.SinonStub;
        let environments: Array<any>;
        let myEnvironmentA: any;
        let myEnvironmentB: any;
        let logSpy: sinon.SinonSpy;

        beforeEach(async () => {
            mySandBox.restore();
            showConfirmationWarningMessage = mySandBox.stub(UserInputUtil, 'showConfirmationWarningMessage').withArgs(`This will remove the environment. Do you want to continue?`).resolves(true);
            logSpy = mySandBox.stub(VSCodeBlockchainOutputAdapter.instance(), 'log');

            // reset the available environments
            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_ENVIRONMENTS, [], vscode.ConfigurationTarget.Global);

            environments = [];

            myEnvironmentA = {
                name: 'myenvironmentA',
            };
            environments.push(myEnvironmentA);

            myEnvironmentB = {
                name: 'myEnvironmentB'
            };
            environments.push(myEnvironmentB);

            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_ENVIRONMENTS, environments, vscode.ConfigurationTarget.Global);

            quickPickStub = mySandBox.stub(vscode.window, 'showQuickPick').resolves({
                label: 'myEnvironmentB',
                data: FabricEnvironmentRegistry.instance().get('myEnvironmentB')
            });
        });

        afterEach(() => {
            mySandBox.restore();
        });

        it('should test a environment can be deleted from the command', async () => {

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_ENVIRONMENT);

            environments = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_ENVIRONMENTS);
            environments.length.should.equal(1);
            environments[0].should.deep.equal(myEnvironmentA);

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `delete environment`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully deleted ${myEnvironmentB.name} environment`);
        });

        it('should test a environment can be deleted from tree', async () => {
            const blockchainEnvironmentExplorerProvider: BlockchainEnvironmentExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();

            const allChildren: Array<BlockchainTreeItem> = await blockchainEnvironmentExplorerProvider.getChildren();

            const environmentToDelete: BlockchainTreeItem = allChildren[1];
            await vscode.commands.executeCommand(ExtensionCommands.DELETE_ENVIRONMENT, environmentToDelete);

            environments = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_ENVIRONMENTS);
            environments.length.should.equal(1);
            environments[0].should.deep.equal(myEnvironmentB);

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `delete environment`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully deleted ${myEnvironmentA.name} environment`);
        });

        it('should test delete environment can be cancelled', async () => {
            quickPickStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_ENVIRONMENT);

            environments = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_ENVIRONMENTS);
            environments.length.should.equal(2);

            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `delete environment`);
        });

        it('should show an error message if no environments have been added', async () => {
            await FabricEnvironmentRegistry.instance().clear();

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_ENVIRONMENT);

            quickPickStub.should.not.have.been.called;
            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `delete environment`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.ERROR, `No environments to delete. ${FabricRuntimeUtil.LOCAL_FABRIC} cannot be deleted.`);
        });

        it('should handle no from confirmation message', async () => {
            showConfirmationWarningMessage.resolves(false);

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_ENVIRONMENT);

            environments = vscode.workspace.getConfiguration().get(SettingConfigurations.FABRIC_ENVIRONMENTS);
            environments.length.should.equal(2);
            environments[0].should.deep.equal(myEnvironmentA);
            environments[1].should.deep.equal(myEnvironmentB);

            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `delete environment`);
        });
    });
});
