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
import { TestUtil } from '../TestUtil';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { LogType, FabricEnvironmentRegistryEntry, EnvironmentType } from 'ibm-blockchain-platform-common';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricEnvironmentTreeItem } from '../../extension/explorer/runtimeOps/disconnectedTree/FabricEnvironmentTreeItem';
import { FabricEnvironmentManager } from '../../extension/fabric/environments/FabricEnvironmentManager';
import { UserInputUtil } from '../../extension/commands/UserInputUtil';

// tslint:disable no-unused-expression
chai.should();
chai.use(sinonChai);

describe('openConsoleInBrowserCommand', () => {

    const sandbox: sinon.SinonSandbox = sinon.createSandbox();
    let logSpy: sinon.SinonStub;
    let executeStub: sinon.SinonStub;
    let vscodeOpenStub: sinon.SinonStub;
    let getConnectionStub: sinon.SinonStub;
    let getRegistryEntryStub: sinon.SinonStub;
    let envQuickPickStub: sinon.SinonStub;
    let treeItem: FabricEnvironmentTreeItem;
    let registryEntry: FabricEnvironmentRegistryEntry;
    let environmentName: string;
    let environmentUrl: string;

    before(async () => {
        await TestUtil.setupTests(sandbox);
    });

    beforeEach(async () => {
        logSpy = sandbox.stub(VSCodeBlockchainOutputAdapter.instance(), 'log');
        executeStub = sandbox.stub(vscode.commands, 'executeCommand').callThrough();
        vscodeOpenStub = executeStub.withArgs('vscode.open').resolves();
        getConnectionStub = sandbox.stub(FabricEnvironmentManager.instance(), 'getConnection').returns(undefined);
        getRegistryEntryStub = sandbox.stub(FabricEnvironmentManager.instance(), 'getEnvironmentRegistryEntry').returns(undefined);
        envQuickPickStub = sandbox.stub(UserInputUtil, 'showFabricEnvironmentQuickPickBox').resolves();
        environmentName = 'OpsEnvironment';
        environmentUrl = 'https://some.url/here';
        registryEntry = {
            name: environmentName,
            environmentType: EnvironmentType.SAAS_OPS_TOOLS_ENVIRONMENT,
            url: environmentUrl,
        };

        treeItem = {
            label: environmentName,
            environmentRegistryEntry: registryEntry,
        } as unknown as FabricEnvironmentTreeItem;
    });

    afterEach(async () => {
        sandbox.restore();
    });

    it('should open console in browser from tree', async () => {
        await vscode.commands.executeCommand(ExtensionCommands.OPEN_CONSOLE_IN_BROWSER, treeItem);

        vscodeOpenStub.should.have.been.calledOnce;
        getConnectionStub.should.have.not.been.called;
        getRegistryEntryStub.should.have.not.been.called;
        envQuickPickStub.should.have.not.been.called;
        logSpy.firstCall.should.have.been.calledWith(LogType.INFO, undefined, 'open console in browser');
        logSpy.secondCall.should.have.been.calledWith(LogType.SUCCESS, undefined, 'Successfully opened console in browser');
    });

    it('should open console in browser from connected environment', async () => {
        getConnectionStub.returns(true);
        getRegistryEntryStub.returns(registryEntry);
        await vscode.commands.executeCommand(ExtensionCommands.OPEN_CONSOLE_IN_BROWSER);

        vscodeOpenStub.should.have.been.calledOnce;
        getConnectionStub.should.have.been.calledOnce;
        getRegistryEntryStub.should.have.been.calledOnce;
        envQuickPickStub.should.have.not.been.called;
        logSpy.firstCall.should.have.been.calledWith(LogType.INFO, undefined, 'open console in browser');
        logSpy.secondCall.should.have.been.calledWith(LogType.SUCCESS, undefined, 'Successfully opened console in browser');
    });

    it('should open console in browser from command palette', async () => {
        getConnectionStub.returns(false);
        envQuickPickStub.resolves({data: registryEntry});
        await vscode.commands.executeCommand(ExtensionCommands.OPEN_CONSOLE_IN_BROWSER);

        vscodeOpenStub.should.have.been.calledOnce;
        getConnectionStub.should.have.been.calledOnce;
        getRegistryEntryStub.should.have.not.been.called;
        envQuickPickStub.should.have.been.calledOnce;
        logSpy.firstCall.should.have.been.calledWith(LogType.INFO, undefined, 'open console in browser');
        logSpy.secondCall.should.have.been.calledWith(LogType.SUCCESS, undefined, 'Successfully opened console in browser');
    });

    it('should handle user canceling before selecting environment when opening console in browser from command palette', async () => {
        getConnectionStub.returns(false);
        await vscode.commands.executeCommand(ExtensionCommands.OPEN_CONSOLE_IN_BROWSER);

        vscodeOpenStub.should.have.not.been.called;
        getConnectionStub.should.have.been.calledOnce;
        getRegistryEntryStub.should.have.not.been.called;
        envQuickPickStub.should.have.been.calledOnce;
        logSpy.should.have.been.calledOnceWith(LogType.INFO, undefined, 'open console in browser');
    });

    it('should fail when environment URL not set', async () => {
        const noUrlTreeItem: FabricEnvironmentTreeItem =
        {
            label: environmentName,
            environmentRegistryEntry: {
                name: environmentName,
                environmentType: EnvironmentType.OPS_TOOLS_ENVIRONMENT,
            }
        } as unknown as FabricEnvironmentTreeItem;
        const noUrlError: Error = new Error(`Environment ${noUrlTreeItem.environmentRegistryEntry.name} doesn't have a URL associated with it`);

        await vscode.commands.executeCommand(ExtensionCommands.OPEN_CONSOLE_IN_BROWSER, noUrlTreeItem);

        vscodeOpenStub.should.have.not.been.called;
        getConnectionStub.should.have.not.been.called;
        getRegistryEntryStub.should.have.not.been.called;
        envQuickPickStub.should.have.not.been.called;
        logSpy.firstCall.should.have.been.calledWith(LogType.INFO, undefined, 'open console in browser');
        logSpy.secondCall.should.have.been.calledWith(LogType.ERROR, `Error opening console in browser: ${noUrlError.message}`, `Error opening console in browser: ${noUrlError.toString()}`);
    });

    it('should fail when an error is thrown', async () => {
        const error: Error = new Error(`some error`);
        vscodeOpenStub.rejects(error);
        await vscode.commands.executeCommand(ExtensionCommands.OPEN_CONSOLE_IN_BROWSER, treeItem);

        vscodeOpenStub.should.have.been.called;
        getConnectionStub.should.have.not.been.called;
        getRegistryEntryStub.should.have.not.been.called;
        envQuickPickStub.should.have.not.been.called;
        logSpy.firstCall.should.have.been.calledWith(LogType.INFO, undefined, 'open console in browser');
        logSpy.secondCall.should.have.been.calledWith(LogType.ERROR, `Error opening console in browser: ${error.message}`, `Error opening console in browser: ${error.toString()}`);
    });

});
