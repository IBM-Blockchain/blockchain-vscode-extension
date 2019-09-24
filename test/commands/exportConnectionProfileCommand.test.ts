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
import { ExtensionUtil } from '../../src/util/ExtensionUtil';
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';
import { BlockchainTreeItem } from '../../src/explorer/model/BlockchainTreeItem';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { TestUtil } from '../TestUtil';
import { LogType } from '../../src/logging/OutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';
import * as fs from 'fs-extra';
import { Reporter } from '../../src/util/Reporter';
import * as os from 'os';
import { BlockchainGatewayExplorerProvider } from '../../src/explorer/gatewayExplorer';
import { FabricGatewayRegistryEntry } from '../../src/fabric/FabricGatewayRegistryEntry';
import { FabricGatewayRegistry } from '../../src/fabric/FabricGatewayRegistry';
import { GatewayTreeItem } from '../../src/explorer/model/GatewayTreeItem';
import { FabricGatewayHelper } from '../../src/fabric/FabricGatewayHelper';

// tslint:disable no-unused-expression
describe('exportConnectionProfileCommand', () => {

    const sandbox: sinon.SinonSandbox = sinon.createSandbox();
    const fakeTargetPath: string = path.join('/', 'a', 'fake', 'path');
    let workspaceFolderStub: sinon.SinonStub;
    let workspaceFolder: any;
    let gatewayTreeItem: GatewayTreeItem;
    let logSpy: sinon.SinonSpy;
    let copyStub: sinon.SinonStub;
    let showSaveDialogStub: sinon.SinonStub;
    let homeDirStub: sinon.SinonStub;
    let sendTelemetryEventStub: sinon.SinonStub;

    let gatewayRegistryEntry: FabricGatewayRegistryEntry;
    let showGatewayQuickPickStub: sinon.SinonStub;

    const connectionProfilePath: string = path.join('tmp', 'doggo.json');

    before(async () => {
        await TestUtil.setupTests(sandbox);
    });

    after(async () => {
        await TestUtil.restoreAll();
    });

    beforeEach(async () => {
        await ExtensionUtil.activateExtension();

        gatewayRegistryEntry = new FabricGatewayRegistryEntry();
        gatewayRegistryEntry.name = 'myGateway';

        const gatewayRegistry: FabricGatewayRegistry = FabricGatewayRegistry.instance();
        await gatewayRegistry.clear();
        await gatewayRegistry.add(gatewayRegistryEntry);

        sandbox.stub(FabricGatewayHelper, 'getConnectionProfilePath').resolves(connectionProfilePath);

        const provider: BlockchainGatewayExplorerProvider = ExtensionUtil.getBlockchainGatewayExplorerProvider();
        const allChildren: BlockchainTreeItem[] = await provider.getChildren();

        gatewayTreeItem = allChildren[1] as GatewayTreeItem;

        workspaceFolder = {
            name: 'myFolder',
            uri: vscode.Uri.file('myPath')
        };
        workspaceFolderStub = sandbox.stub(UserInputUtil, 'getWorkspaceFolders').returns([workspaceFolder]);
        logSpy = sandbox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');

        copyStub = sandbox.stub(fs, 'copy').resolves();
        showSaveDialogStub = sandbox.stub(vscode.window, 'showSaveDialog').resolves(vscode.Uri.file(fakeTargetPath));
        homeDirStub = sandbox.stub(os, 'homedir');
        homeDirStub.returns('homedir');
        sendTelemetryEventStub = sandbox.stub(Reporter.instance(), 'sendTelemetryEvent');

        showGatewayQuickPickStub = sandbox.stub(UserInputUtil, 'showGatewayQuickPickBox').resolves({ label: 'myGateway', data: gatewayRegistryEntry });
    });

    afterEach(async () => {
        sandbox.restore();
    });

    it('should export the connection profile by right clicking on a peer in the runtime ops tree', async () => {
        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_CONNECTION_PROFILE, gatewayTreeItem);
        copyStub.should.have.been.called.calledOnceWithExactly(connectionProfilePath, fakeTargetPath);
        logSpy.should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully exported connection profile to ${fakeTargetPath}`);
        sendTelemetryEventStub.should.have.been.calledOnceWithExactly('exportConnectionProfileCommand');
    });

    it('should export the connection profile when called from the command palette', async () => {
        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_CONNECTION_PROFILE);
        copyStub.should.have.been.called.calledOnceWithExactly(connectionProfilePath, fakeTargetPath);
        logSpy.should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully exported connection profile to ${fakeTargetPath}`);
        sendTelemetryEventStub.should.have.been.calledOnceWithExactly('exportConnectionProfileCommand');
    });

    it('should handle no open workspace folders', async () => {
        workspaceFolderStub.returns([]);
        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_CONNECTION_PROFILE);
        copyStub.should.have.been.called.calledOnceWithExactly(connectionProfilePath, fakeTargetPath);
        logSpy.should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully exported connection profile to ${fakeTargetPath}`);
    });

    it('should handle cancel choosing gateway', async () => {
        showGatewayQuickPickStub.resolves();
        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_CONNECTION_PROFILE);
        copyStub.should.not.have.been.called;
    });

    it('should handle cancel choosing location to export the connection profile to', async () => {
        showSaveDialogStub.resolves();

        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_CONNECTION_PROFILE);
        copyStub.should.not.have.been.called;
    });

    it('should not print the successSpy if there was an error copying the connection profile', async () => {
        const error: Error = new Error('such error');
        copyStub.rejects(error);
        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_CONNECTION_PROFILE);

        logSpy.callCount.should.equal(2);
        logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'exportConnectionProfileCommand');
        logSpy.getCall(1).should.have.been.calledWithExactly(LogType.ERROR, `Issue exporting connection profile: ${error.message}`, `Issue exporting connection profile: ${error.toString()}`);
        sendTelemetryEventStub.should.not.have.been.called;
    });
});
