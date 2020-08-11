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
import * as fs from 'fs-extra';
import { TestUtil } from '../TestUtil';
import { UserInputUtil } from '../../extension/commands/UserInputUtil';
import { ExtensionCommands } from '../../ExtensionCommands';
import { EnvironmentType, FabricEnvironmentRegistry, FabricEnvironmentRegistryEntry, FabricRuntimeUtil, LogType} from 'ibm-blockchain-platform-common';
import { SettingConfigurations } from '../../configurations';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';

chai.should();
chai.use(sinonChai);
// tslint:disable no-unused-expression

describe('DeleteExtensionDirectoryCommand', () => {
    let mySandBox: sinon.SinonSandbox;
    before(async () => {
        mySandBox = sinon.createSandbox();
        await TestUtil.setupTests(mySandBox);
    });

    describe('DeleteExtensionDirectory', () => {

        let myEnvironmentA: FabricEnvironmentRegistryEntry;
        let myEnvironmentB: FabricEnvironmentRegistryEntry;
        let environments: Array<FabricEnvironmentRegistryEntry>;

        let removeStub: sinon.SinonStub;
        let commandStub: sinon.SinonStub;
        let reloadStub: sinon.SinonStub;
        let confirmationWarningStub: sinon.SinonStub;
        let tearDownStub: sinon.SinonStub;
        let logSpy: sinon.SinonSpy;
        let getAllSpy: sinon.SinonSpy;

        beforeEach(async () => {
            mySandBox.restore();
            await FabricEnvironmentRegistry.instance().clear();

            const settings: any = {};
            settings[FabricRuntimeUtil.LOCAL_FABRIC] = {
                ports: {
                    startPort: 17050,
                    endPort: 17070
                }
            };
            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, settings, vscode.ConfigurationTarget.Global);

            environments = [];

            myEnvironmentA = new FabricEnvironmentRegistryEntry({
                name: 'myEnvironmentA',
                environmentType: EnvironmentType.LOCAL_ENVIRONMENT,
            });

            await FabricEnvironmentRegistry.instance().add(myEnvironmentA);

            myEnvironmentB = new FabricEnvironmentRegistryEntry({
                name: 'myEnvironmentB',
                environmentType: EnvironmentType.OPS_TOOLS_ENVIRONMENT,
            });

            removeStub = mySandBox.stub(fs, 'remove');
            commandStub = mySandBox.stub(vscode.commands, 'executeCommand').callThrough();
            reloadStub = commandStub.withArgs('workbench.action.reloadWindow').resolves();
            tearDownStub = commandStub.withArgs(ExtensionCommands.TEARDOWN_FABRIC).resolves();
            confirmationWarningStub = mySandBox.stub(UserInputUtil, 'showConfirmationWarningMessage').withArgs(`This will delete the extension directory. Do you want to continue?`).resolves(true);
            logSpy = mySandBox.stub(VSCodeBlockchainOutputAdapter.instance(), 'log');
            getAllSpy = mySandBox.spy(FabricEnvironmentRegistry.instance(), 'getAll');

            await FabricEnvironmentRegistry.instance().add(myEnvironmentB);
            await TestUtil.setupLocalFabric();
        });

        afterEach(() => {
            mySandBox.restore();
        });

        it('should test the extension directory can be deleted from the command', async () => {
            await vscode.commands.executeCommand(ExtensionCommands.DELETE_DIRECTORY);
            removeStub.resolves();
            reloadStub.should.have.been.calledOnce;
            tearDownStub.should.have.been.called;
            confirmationWarningStub.should.have.been.calledOnce;
            removeStub.should.have.been.calledOnce;
            environments = await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(1);
            getAllSpy.should.have.been.calledWithExactly(true);
        });

        it('should handle an error in tearing down an environment', async () => {
            const error: Error = new Error('some error');
            tearDownStub.rejects(error);

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_DIRECTORY);
            confirmationWarningStub.should.have.been.calledOnce;
            removeStub.should.have.not.been.called;
            reloadStub.should.have.not.been.called;
            getAllSpy.should.have.been.called;
            logSpy.should.have.been.calledWithExactly(LogType.ERROR, `Error deleting directory: ${error.message}`, `Error deleting directory: ${error.toString()}`);
        });

        it('should handle an error in deleting the extension directory', async () => {
            const error: Error = new Error('some error');
            removeStub.rejects(error);

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_DIRECTORY);
            confirmationWarningStub.should.have.been.calledOnce;
            tearDownStub.should.have.been.called;
            reloadStub.should.have.not.been.called;
            getAllSpy.should.have.been.called;
            logSpy.should.have.been.calledWithExactly(LogType.ERROR, `Error deleting directory: ${error.message}`, `Error deleting directory: ${error.toString()}`);
        });

        it('should test the extension directory delete command can be cancelled', async () => {
            confirmationWarningStub.withArgs(`This will delete the extension directory. Do you want to continue?`).resolves(false);
            await vscode.commands.executeCommand(ExtensionCommands.DELETE_DIRECTORY);
            confirmationWarningStub.should.have.been.called;
            reloadStub.should.not.have.been.called;
            tearDownStub.should.not.have.been.called;
            tearDownStub.should.have.not.been.called;
            removeStub.should.not.have.been.called;
            getAllSpy.should.not.have.been.called;
            logSpy.should.have.not.been.called;
        });
    });
});
