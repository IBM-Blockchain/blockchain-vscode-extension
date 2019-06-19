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
import * as myExtension from '../../src/extension';
import { FabricRuntimeManager } from '../../src/fabric/FabricRuntimeManager';
import { ExtensionUtil } from '../../src/util/ExtensionUtil';
import { FabricRuntime } from '../../src/fabric/FabricRuntime';
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';
import { BlockchainRuntimeExplorerProvider } from '../../src/explorer/runtimeOpsExplorer';
import { BlockchainTreeItem } from '../../src/explorer/model/BlockchainTreeItem';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { TestUtil } from '../TestUtil';
import { NodesTreeItem } from '../../src/explorer/runtimeOps/NodesTreeItem';
import { LogType } from '../../src/logging/OutputAdapter';
import { PeerTreeItem } from '../../src/explorer/runtimeOps/PeerTreeItem';
import { ExtensionCommands } from '../../ExtensionCommands';
import * as fs from 'fs-extra';
import { Reporter } from '../../src/util/Reporter';
import * as os from 'os';

// tslint:disable no-unused-expression
describe('exportConnectionProfileCommand', () => {

    const sandbox: sinon.SinonSandbox = sinon.createSandbox();
    const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
    const fakeTargetPath: string = path.join('/', 'a', 'fake', 'path');
    let runtime: FabricRuntime;
    let workspaceFolderStub: sinon.SinonStub;
    let workspaceFolder: any;
    let nodes: NodesTreeItem;
    let peerTreeItem: PeerTreeItem;
    let logSpy: sinon.SinonSpy;
    let copyStub: sinon.SinonStub;
    let showSaveDialogStub: sinon.SinonStub;
    let homeDirStub: sinon.SinonStub;
    let sendTelemetryEventStub: sinon.SinonStub;

    before(async () => {
        await TestUtil.setupTests(sandbox);
        await TestUtil.storeGatewaysConfig();
        await TestUtil.storeRuntimesConfig();
    });

    after(async () => {
        await TestUtil.restoreGatewaysConfig();
        await TestUtil.restoreRuntimesConfig();
    });

    beforeEach(async () => {
        await ExtensionUtil.activateExtension();
        await runtimeManager.initialize();
        runtime = runtimeManager.getRuntime();
        sandbox.stub(runtime, 'isRunning').resolves(true);
        const provider: BlockchainRuntimeExplorerProvider = myExtension.getBlockchainRuntimeExplorerProvider();
        const allChildren: BlockchainTreeItem[] = await provider.getChildren();
        nodes = allChildren[2] as NodesTreeItem;
        const peers: BlockchainTreeItem[] = await provider.getChildren(nodes);
        peerTreeItem = peers[0] as PeerTreeItem;
        workspaceFolder = {
            name: 'myFolder',
            uri: vscode.Uri.file('myPath')
        };
        workspaceFolderStub = sandbox.stub(UserInputUtil, 'getWorkspaceFolders').returns([workspaceFolder]);
        logSpy = sandbox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
        sandbox.stub(FabricRuntimeManager.instance(), 'getGatewayRegistryEntries').resolves([
            {
                name: 'local_fabric',
                managedRuntime: true,
                connectionProfilePath: '/tmp/doggo.json'
            }
        ]);
        copyStub = sandbox.stub(fs, 'copy').resolves();
        showSaveDialogStub = sandbox.stub(vscode.window, 'showSaveDialog').resolves(vscode.Uri.file(fakeTargetPath));
        homeDirStub = sandbox.stub(os, 'homedir');
        homeDirStub.returns('homedir');
        sendTelemetryEventStub = sandbox.stub(Reporter.instance(), 'sendTelemetryEvent');
    });

    afterEach(async () => {
        sandbox.restore();
    });

    it('should export the connection profile by right clicking on a peer in the runtime ops tree', async () => {
        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_CONNECTION_PROFILE, peerTreeItem);
        copyStub.should.have.been.called.calledOnceWithExactly('/tmp/doggo.json', fakeTargetPath);
        logSpy.should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully exported connection profile to ${fakeTargetPath}`);
        sendTelemetryEventStub.should.have.been.calledOnceWithExactly('exportConnectionProfileCommand');
    });

    it('should export the connection profile when called from the command palette', async () => {
        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_CONNECTION_PROFILE);
        copyStub.should.have.been.called.calledOnceWithExactly('/tmp/doggo.json', fakeTargetPath);
        logSpy.should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully exported connection profile to ${fakeTargetPath}`);
        sendTelemetryEventStub.should.have.been.calledOnceWithExactly('exportConnectionProfileCommand');
    });

    it('should handle no open workspace folders', async () => {
        workspaceFolderStub.returns([]);
        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_CONNECTION_PROFILE);
        copyStub.should.have.been.called.calledOnceWithExactly('/tmp/doggo.json', fakeTargetPath);
        logSpy.should.have.been.calledWithExactly(LogType.SUCCESS, `Successfully exported connection profile to ${fakeTargetPath}`);
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
