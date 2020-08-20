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
import * as path from 'path';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { BlockchainTreeItem } from '../../extension/explorer/model/BlockchainTreeItem';
import { UserInputUtil } from '../../extension/commands/UserInputUtil';
import { TestUtil } from '../TestUtil';
import { ExtensionCommands } from '../../ExtensionCommands';
import * as fs from 'fs-extra';
import { Reporter } from '../../extension/util/Reporter';
import * as os from 'os';
import { BlockchainGatewayExplorerProvider } from '../../extension/explorer/gatewayExplorer';
import { GatewayTreeItem } from '../../extension/explorer/model/GatewayTreeItem';
import { FabricGatewayHelper } from '../../extension/fabric/FabricGatewayHelper';
import { FabricGatewayConnectionManager } from '../../extension/fabric/FabricGatewayConnectionManager';
import { ConnectionProfileUtil, LogType, FabricGatewayRegistry, FabricGatewayRegistryEntry} from 'ibm-blockchain-platform-common';

// tslint:disable no-unused-expression
describe('exportConnectionProfileCommand', () => {

    let sandbox: sinon.SinonSandbox;
    const fakeTargetPath: string = path.join('/', 'a', 'fake', 'path');
    let workspaceFolderStub: sinon.SinonStub;
    let workspaceFolder: any;
    let gatewayTreeItem: GatewayTreeItem;
    let logSpy: sinon.SinonSpy;
    let readProfileStub: sinon.SinonStub;
    let connectionProfile: any;
    let writeFileStub: sinon.SinonStub;
    let showSaveDialogStub: sinon.SinonStub;
    let homeDirStub: sinon.SinonStub;
    let sendTelemetryEventStub: sinon.SinonStub;
    let getConnectionProfilePathStub: sinon.SinonStub;

    let gatewayRegistryEntry: FabricGatewayRegistryEntry;
    let showGatewayQuickPickStub: sinon.SinonStub;

    before(async () => {
        sandbox = sinon.createSandbox();
        await TestUtil.setupTests(sandbox);
    });

    beforeEach(async () => {
        gatewayRegistryEntry = new FabricGatewayRegistryEntry();
        gatewayRegistryEntry.name = 'myGateway';

        const gatewayRegistry: FabricGatewayRegistry = FabricGatewayRegistry.instance();
        await gatewayRegistry.clear();
        await gatewayRegistry.add(gatewayRegistryEntry);

        const provider: BlockchainGatewayExplorerProvider = ExtensionUtil.getBlockchainGatewayExplorerProvider();
        const allChildren: BlockchainTreeItem[] = await provider.getChildren();
        const groupChildren: BlockchainTreeItem[] = await provider.getChildren(allChildren[0]);
        gatewayTreeItem = groupChildren[0] as GatewayTreeItem;

        workspaceFolder = {
            name: 'myFolder',
            uri: vscode.Uri.file('myPath')
        };
        workspaceFolderStub = sandbox.stub(UserInputUtil, 'getWorkspaceFolders').returns([workspaceFolder]);
        logSpy = sandbox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');

        writeFileStub = sandbox.stub(fs, 'writeFile');

        showSaveDialogStub = sandbox.stub(vscode.window, 'showSaveDialog').resolves(vscode.Uri.file(fakeTargetPath));
        homeDirStub = sandbox.stub(os, 'homedir');
        homeDirStub.returns('homedir');
        readProfileStub = sandbox.stub(ConnectionProfileUtil, 'readConnectionProfile');

        getConnectionProfilePathStub = sandbox.stub(FabricGatewayHelper, 'getConnectionProfilePath');
        getConnectionProfilePathStub.resolves(path.join('myPath', 'connection.json'));
        connectionProfile = { name: 'myProfile', wallet: 'myWallet' };
        readProfileStub.resolves(connectionProfile);
        sendTelemetryEventStub = sandbox.stub(Reporter.instance(), 'sendTelemetryEvent');

        showGatewayQuickPickStub = sandbox.stub(UserInputUtil, 'showGatewayQuickPickBox').resolves({ label: 'myGateway', data: gatewayRegistryEntry });
    });

    afterEach(async () => {
        sandbox.restore();
    });

    it('should export the connection profile by right clicking on a peer in the runtime ops tree', async () => {
        // TODO: Jake FIX
        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_CONNECTION_PROFILE, gatewayTreeItem);
        delete connectionProfile.wallet;
        showGatewayQuickPickStub.should.not.have.been.calledOnceWithExactly('Choose a gateway to export a connection profile from', false, true);
        writeFileStub.should.have.been.called.calledOnceWithExactly(fakeTargetPath, JSON.stringify(connectionProfile, null, 4));
        logSpy.should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully exported connection profile to ${fakeTargetPath}`);
        sendTelemetryEventStub.should.have.been.calledOnceWithExactly('exportConnectionProfileCommand');
    });

    it('should apply Pascal case when exporting a connection', async () => {
        const pathJoinSpy: sinon.SinonSpy = sandbox.spy(path, 'join');
        const gatewayRegistryEntryPascal: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
        gatewayRegistryEntryPascal.name = '1 my -gateway2';
        sandbox.stub(FabricGatewayConnectionManager.instance(), 'getGatewayRegistryEntry').resolves(gatewayRegistryEntryPascal);
        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_CONNECTION_PROFILE, gatewayTreeItem, true);
        delete connectionProfile.wallet;
        writeFileStub.should.have.been.called.calledOnceWithExactly(fakeTargetPath, JSON.stringify(connectionProfile, null, 4));
        logSpy.should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully exported connection profile to ${fakeTargetPath}`);
        sendTelemetryEventStub.should.have.been.calledOnceWithExactly('exportConnectionProfileCommand');
        pathJoinSpy.should.have.been.calledWithExactly('/myPath', '1MyGateway2Connection.json');
    });

    it('should export the connection profile when called from the command palette', async () => {
        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_CONNECTION_PROFILE);
        delete connectionProfile.wallet;
        showGatewayQuickPickStub.should.have.been.calledOnceWithExactly('Choose a gateway to export a connection profile from', false, true);
        writeFileStub.should.have.been.called.calledOnceWithExactly(fakeTargetPath, JSON.stringify(connectionProfile, null, 4));
        logSpy.should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully exported connection profile to ${fakeTargetPath}`);
        sendTelemetryEventStub.should.have.been.calledOnceWithExactly('exportConnectionProfileCommand');
    });

    it('should handle yaml file', async () => {
        getConnectionProfilePathStub.resolves(path.join('myPath', 'connection.yml'));
        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_CONNECTION_PROFILE, gatewayTreeItem);
        delete connectionProfile.wallet;
        showGatewayQuickPickStub.should.not.have.been.calledOnceWithExactly('Choose a gateway to export a connection profile from', false, true);
        writeFileStub.should.have.been.called.calledOnceWithExactly(fakeTargetPath, yaml.dump(connectionProfile));
        logSpy.should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully exported connection profile to ${fakeTargetPath}`);
        sendTelemetryEventStub.should.have.been.calledOnceWithExactly('exportConnectionProfileCommand');
    });

    it('should handle no open workspace folders', async () => {
        workspaceFolderStub.returns([]);
        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_CONNECTION_PROFILE);
        delete connectionProfile.wallet;
        showGatewayQuickPickStub.should.have.been.calledOnceWithExactly('Choose a gateway to export a connection profile from', false, true);
        writeFileStub.should.have.been.called.calledOnceWithExactly(fakeTargetPath, JSON.stringify(connectionProfile, null, 4));
        logSpy.should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully exported connection profile to ${fakeTargetPath}`);
    });

    it('should handle cancel choosing gateway', async () => {
        showGatewayQuickPickStub.resolves();
        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_CONNECTION_PROFILE);
        showGatewayQuickPickStub.should.have.been.calledOnceWithExactly('Choose a gateway to export a connection profile from', false, true);
        writeFileStub.should.not.have.been.called;
    });

    it('should handle cancel choosing location to export the connection profile to', async () => {
        showSaveDialogStub.resolves();

        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_CONNECTION_PROFILE);
        showGatewayQuickPickStub.should.have.been.calledOnceWithExactly('Choose a gateway to export a connection profile from', false, true);
        writeFileStub.should.not.have.been.called;
    });

    it('should not print the successSpy if there was an error copying the connection profile', async () => {
        const error: Error = new Error('such error');
        writeFileStub.rejects(error);
        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_CONNECTION_PROFILE);
        showGatewayQuickPickStub.should.have.been.calledOnceWithExactly('Choose a gateway to export a connection profile from', false, true);
        logSpy.callCount.should.equal(2);
        logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'exportConnectionProfileCommand');
        logSpy.getCall(1).should.have.been.calledWithExactly(LogType.ERROR, `Issue exporting connection profile: ${error.message}`, `Issue exporting connection profile: ${error.toString()}`);
        sendTelemetryEventStub.should.not.have.been.called;
    });

    it('should handle exporting the connection profile of a connected gateway', async () => {
        sandbox.stub(FabricGatewayConnectionManager.instance(), 'getGatewayRegistryEntry').resolves(gatewayRegistryEntry);
        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_CONNECTION_PROFILE_CONNECTED);
        delete connectionProfile.wallet;
        showGatewayQuickPickStub.should.not.have.been.calledOnceWithExactly('Choose a gateway to export a connection profile from', false, true);
        writeFileStub.should.have.been.called.calledOnceWithExactly(fakeTargetPath, JSON.stringify(connectionProfile, null, 4));
        logSpy.should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully exported connection profile to ${fakeTargetPath}`);
        sendTelemetryEventStub.should.have.been.calledOnceWithExactly('exportConnectionProfileCommand');
    });
});
