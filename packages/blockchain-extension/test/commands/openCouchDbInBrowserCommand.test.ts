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
import Axios from 'axios';
import * as vscode from 'vscode';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { TestUtil } from '../TestUtil';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { LogType, FabricEnvironmentRegistryEntry, EnvironmentType } from 'ibm-blockchain-platform-common';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricEnvironmentTreeItem } from '../../extension/explorer/runtimeOps/disconnectedTree/FabricEnvironmentTreeItem';
import { FabricEnvironmentManager } from '../../extension/fabric/environments/FabricEnvironmentManager';
import { UserInputUtil } from '../../extension/commands/UserInputUtil';

// tslint:disable no-unused-expression
chai.should();
chai.use(sinonChai);

describe('openCouchDbInBrowser', () => {

    const sandbox: sinon.SinonSandbox = sinon.createSandbox();
    let logSpy: sinon.SinonStub;
    let executeStub: sinon.SinonStub;
    let vscodeOpenStub: sinon.SinonStub;
    let getConnectionStub: sinon.SinonStub;
    let getRegistryEntryStub: sinon.SinonStub;
    let envQuickPickStub: sinon.SinonStub;
    let axiosGetStub: sinon.SinonStub;
    let treeItem: FabricEnvironmentTreeItem;
    let registryEntry: FabricEnvironmentRegistryEntry;
    let environmentName: string;
    let environmentUrl: string;
    let couchDbUrl: string;

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
        axiosGetStub = sandbox.stub(Axios, 'get');
        environmentName = 'MicrofabEnv';
        environmentUrl = 'http://console.someip:port/';
        couchDbUrl = 'http://couchdb.someip:port/_utils/';
        registryEntry = {
            name: environmentName,
            environmentType: EnvironmentType.MICROFAB_ENVIRONMENT,
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

    it('should open CouchDB in browser from tree', async () => {
        await vscode.commands.executeCommand(ExtensionCommands.OPEN_COUCHDB_IN_BROWSER, treeItem);

        vscodeOpenStub.should.have.been.calledOnce;
        axiosGetStub.should.have.been.called.calledWithExactly(couchDbUrl);
        getConnectionStub.should.have.not.been.called;
        getRegistryEntryStub.should.have.not.been.called;
        envQuickPickStub.should.have.not.been.called;
        logSpy.firstCall.should.have.been.calledWith(LogType.INFO, undefined, 'open CouchDB in browser');
        logSpy.secondCall.should.have.been.calledWith(LogType.INFO, 'Default CouchDB login: Use username \'admin\' and password \'adminpw\'');
        logSpy.thirdCall.should.have.been.calledWith(LogType.SUCCESS, undefined, 'Successfully opened CouchDB in browser');
    });

    it('should open CouchDB in browser from connected environment', async () => {
        const localFabricRegEntry: FabricEnvironmentRegistryEntry = {
            name: 'LocalMicrofabEnv',
            environmentType: EnvironmentType.LOCAL_MICROFAB_ENVIRONMENT,
            url: 'http://console.another.ip:port',
        };
        getConnectionStub.returns(true);
        getRegistryEntryStub.returns(localFabricRegEntry);
        await vscode.commands.executeCommand(ExtensionCommands.OPEN_COUCHDB_IN_BROWSER);

        vscodeOpenStub.should.have.been.calledOnce;
        getConnectionStub.should.have.been.calledOnce;
        getRegistryEntryStub.should.have.been.calledOnce;
        envQuickPickStub.should.have.not.been.called;
        axiosGetStub.should.have.been.called.calledWithExactly('http://couchdb.another.ip:port/_utils/');
        logSpy.firstCall.should.have.been.calledWith(LogType.INFO, undefined, 'open CouchDB in browser');
        logSpy.secondCall.should.have.been.calledWith(LogType.INFO, 'Default CouchDB login: Use username \'admin\' and password \'adminpw\'');
        logSpy.thirdCall.should.have.been.calledWith(LogType.SUCCESS, undefined, 'Successfully opened CouchDB in browser');
    });

    it('should open CouchDB in browser from command palette', async () => {
        getConnectionStub.returns(false);
        envQuickPickStub.resolves({data: registryEntry});
        await vscode.commands.executeCommand(ExtensionCommands.OPEN_COUCHDB_IN_BROWSER);

        vscodeOpenStub.should.have.been.calledOnce;
        getConnectionStub.should.have.been.calledOnce;
        getRegistryEntryStub.should.have.not.been.called;
        envQuickPickStub.should.have.been.calledOnce;
        axiosGetStub.should.have.been.called.calledWithExactly(couchDbUrl);
        logSpy.firstCall.should.have.been.calledWith(LogType.INFO, undefined, 'open CouchDB in browser');
        logSpy.secondCall.should.have.been.calledWith(LogType.INFO, 'Default CouchDB login: Use username \'admin\' and password \'adminpw\'');
        logSpy.thirdCall.should.have.been.calledWith(LogType.SUCCESS, undefined, 'Successfully opened CouchDB in browser');
    });

    it('should handle user canceling before selecting environment when opening couchDB in browser from command palette', async () => {
        getConnectionStub.returns(false);
        await vscode.commands.executeCommand(ExtensionCommands.OPEN_COUCHDB_IN_BROWSER);

        vscodeOpenStub.should.have.not.been.called;
        getConnectionStub.should.have.been.calledOnce;
        getRegistryEntryStub.should.have.not.been.called;
        envQuickPickStub.should.have.been.calledOnce;
        axiosGetStub.should.have.not.been.called;
        logSpy.should.have.been.calledOnceWith(LogType.INFO, undefined, 'open CouchDB in browser');
    });

    it('should fail when environment URL not set', async () => {
        const noUrlTreeItem: FabricEnvironmentTreeItem =
        {
            label: environmentName,
            environmentRegistryEntry: {
                name: environmentName,
                environmentType: EnvironmentType.MICROFAB_ENVIRONMENT,
            }
        } as unknown as FabricEnvironmentTreeItem;
        const noUrlError: Error = new Error(`Microfab environment ${noUrlTreeItem.environmentRegistryEntry.name} doesn't have a URL associated with it`);

        await vscode.commands.executeCommand(ExtensionCommands.OPEN_COUCHDB_IN_BROWSER, noUrlTreeItem);

        vscodeOpenStub.should.have.not.been.called;
        getConnectionStub.should.have.not.been.called;
        getRegistryEntryStub.should.have.not.been.called;
        envQuickPickStub.should.have.not.been.called;
        axiosGetStub.should.have.not.been.called;
        logSpy.firstCall.should.have.been.calledWith(LogType.INFO, undefined, 'open CouchDB in browser');
        logSpy.secondCall.should.have.been.calledWith(LogType.ERROR, `Error opening CouchDB in browser: ${noUrlError.message}`, `Error opening CouchDB in browser: ${noUrlError.toString()}`);
    });

    it('should tell the user it needs microfab 0.0.8 when a 404 error is thrown from axios', async () => {
        const error: any = new Error(`a 404 error`);
        error.response = {status: 404};
        axiosGetStub.rejects(error);
        const finalError: Error = new Error (`This functionality requires microfab v0.0.8 or above: ${error.message}`);
        await vscode.commands.executeCommand(ExtensionCommands.OPEN_COUCHDB_IN_BROWSER, treeItem);

        axiosGetStub.should.have.been.called;
        vscodeOpenStub.should.have.not.been.called;
        getConnectionStub.should.have.not.been.called;
        getRegistryEntryStub.should.have.not.been.called;
        envQuickPickStub.should.have.not.been.called;
        logSpy.firstCall.should.have.been.calledWith(LogType.INFO, undefined, 'open CouchDB in browser');
        logSpy.secondCall.should.have.been.calledWith(LogType.ERROR, `Error opening CouchDB in browser: ${finalError.message}`, `Error opening CouchDB in browser: ${finalError.toString()}`);
    });

    it('should fail when an error is thrown from axios', async () => {
        const error: Error = new Error(`some axios error`);
        axiosGetStub.rejects(error);
        await vscode.commands.executeCommand(ExtensionCommands.OPEN_COUCHDB_IN_BROWSER, treeItem);

        axiosGetStub.should.have.been.called;
        vscodeOpenStub.should.have.not.been.called;
        getConnectionStub.should.have.not.been.called;
        getRegistryEntryStub.should.have.not.been.called;
        envQuickPickStub.should.have.not.been.called;
        logSpy.firstCall.should.have.been.calledWith(LogType.INFO, undefined, 'open CouchDB in browser');
        logSpy.secondCall.should.have.been.calledWith(LogType.ERROR, `Error opening CouchDB in browser: ${error.message}`, `Error opening CouchDB in browser: ${error.toString()}`);
    });

    it('should fail when an error is thrown from vscode.open', async () => {
        const error: Error = new Error(`some error`);
        vscodeOpenStub.rejects(error);
        await vscode.commands.executeCommand(ExtensionCommands.OPEN_COUCHDB_IN_BROWSER, treeItem);

        axiosGetStub.should.have.been.called;
        vscodeOpenStub.should.have.been.called;
        getConnectionStub.should.have.not.been.called;
        getRegistryEntryStub.should.have.not.been.called;
        envQuickPickStub.should.have.not.been.called;
        logSpy.firstCall.should.have.been.calledWith(LogType.INFO, undefined, 'open CouchDB in browser');
        logSpy.secondCall.should.have.been.calledWith(LogType.INFO, 'Default CouchDB login: Use username \'admin\' and password \'adminpw\'');
        logSpy.thirdCall.should.have.been.calledWith(LogType.ERROR, `Error opening CouchDB in browser: ${error.message}`, `Error opening CouchDB in browser: ${error.toString()}`);
    });

});
