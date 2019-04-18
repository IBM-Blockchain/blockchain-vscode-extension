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
import { FabricGatewayRegistry } from '../../src/fabric/FabricGatewayRegistry';
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

// tslint:disable no-unused-expression
describe('exportConnectionProfileCommand', () => {

    let sandbox: sinon.SinonSandbox;
    const connectionRegistry: FabricGatewayRegistry = FabricGatewayRegistry.instance();
    const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
    let runtime: FabricRuntime;
    let workspaceFolderStub: sinon.SinonStub;
    let workspaceFolder: any;
    let nodes: NodesTreeItem;
    let peerTreeItem: PeerTreeItem;
    let logSpy: sinon.SinonSpy;

    before(async () => {
        await TestUtil.setupTests();
        await TestUtil.storeGatewaysConfig();
        await TestUtil.storeRuntimesConfig();
    });

    after(async () => {
        await TestUtil.restoreGatewaysConfig();
        await TestUtil.restoreRuntimesConfig();
    });

    beforeEach(async () => {
        sandbox = sinon.createSandbox();
        await ExtensionUtil.activateExtension();
        await connectionRegistry.clear();
        await runtimeManager.add();
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
    });

    afterEach(async () => {
        sandbox.restore();
    });

    it('should export the connection profile by right clicking on a peer in the runtime ops tree', async () => {
        const exportStub: sinon.SinonStub = sandbox.stub(runtime, 'exportConnectionProfile').resolves();
        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_CONNECTION_PROFILE, peerTreeItem);
        exportStub.should.have.been.called.calledOnceWith(VSCodeBlockchainOutputAdapter.instance(), workspaceFolder.uri.fsPath);
        logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully exported connection profile to ' + path.join(workspaceFolder.uri.fsPath, runtime.getName()));
    });

    it('should export the connection profile when called from the command palette', async () => {
        const exportStub: sinon.SinonStub = sandbox.stub(runtime, 'exportConnectionProfile').resolves();
        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_CONNECTION_PROFILE);
        exportStub.should.have.been.called.calledOnceWith(VSCodeBlockchainOutputAdapter.instance(), workspaceFolder.uri.fsPath);
        logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully exported connection profile to ' + path.join(workspaceFolder.uri.fsPath, runtime.getName()));
    });

    it('should export the connection profile and ask which project if more than one is open in workspace', async () => {
        workspaceFolder = {
            name: 'myFolder',
            uri: vscode.Uri.file('myPath')
        };

        const workspaceFolder2: any = {
            name: 'myFolder2',
            uri: vscode.Uri.file('myPath2')
        };

        workspaceFolderStub.returns([workspaceFolder, workspaceFolder2]);
        sandbox.stub(UserInputUtil, 'showWorkspaceQuickPickBox').resolves({ label: workspaceFolder2.name, data: workspaceFolder2 });

        const exportStub: sinon.SinonStub = sandbox.stub(runtime, 'exportConnectionProfile').resolves();
        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_CONNECTION_PROFILE);
        exportStub.should.have.been.called.calledOnceWith(VSCodeBlockchainOutputAdapter.instance(), workspaceFolder2.uri.fsPath);
        logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully exported connection profile to ' + path.join(workspaceFolder2.uri.fsPath, runtime.getName()));
    });

    it('should handle undefined workspace folders', async () => {

        workspaceFolderStub.returns(null);
        const exportStub: sinon.SinonStub = sandbox.stub(runtime, 'exportConnectionProfile').resolves();
        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_CONNECTION_PROFILE);
        exportStub.should.not.have.been.called;
        logSpy.should.have.been.calledWith(LogType.ERROR, 'A folder must be open to export connection profile to');
    });

    it('should handle empty workspace folders', async () => {
        workspaceFolderStub.returns([]);
        const exportStub: sinon.SinonStub = sandbox.stub(runtime, 'exportConnectionProfile').resolves();
        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_CONNECTION_PROFILE);
        exportStub.should.not.have.been.called;
        logSpy.should.have.been.calledWith(LogType.ERROR, 'A folder must be open to export connection profile to');
    });

    it('should handle cancel choosing folders', async () => {
        workspaceFolder = {
            name: 'myFolder',
            uri: vscode.Uri.file('myPath')
        };

        const workspaceFolder2: any = {
            name: 'myFolder2',
            uri: vscode.Uri.file('myPath2')
        };

        workspaceFolderStub.returns([workspaceFolder, workspaceFolder2]);
        sandbox.stub(UserInputUtil, 'showWorkspaceQuickPickBox').resolves();

        const exportStub: sinon.SinonStub = sandbox.stub(runtime, 'exportConnectionProfile').resolves();
        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_CONNECTION_PROFILE);
        exportStub.should.not.have.been.called;
    });

    it('should not print the successSpy if there was an error', async () => {

        const exportStub: sinon.SinonStub = sandbox.stub(runtime, 'exportConnectionProfile').rejects({ message: 'something bad happened' });
        await vscode.commands.executeCommand(ExtensionCommands.EXPORT_CONNECTION_PROFILE);
        exportStub.should.have.been.called.calledOnceWith(VSCodeBlockchainOutputAdapter.instance(), workspaceFolder.uri.fsPath);

        logSpy.should.have.been.calledWith(LogType.ERROR, 'Issue exporting connection profile, see output channel for more information');
        logSpy.should.not.have.been.calledWith(LogType.SUCCESS);
    });
});
