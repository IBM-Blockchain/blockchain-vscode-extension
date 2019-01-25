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
import * as myExtension from '../../src/extension';
import { FabricConnectionRegistry } from '../../src/fabric/FabricConnectionRegistry';
import { FabricRuntimeRegistry } from '../../src/fabric/FabricRuntimeRegistry';
import { FabricRuntimeManager } from '../../src/fabric/FabricRuntimeManager';
import { ExtensionUtil } from '../../src/util/ExtensionUtil';
import { FabricRuntime } from '../../src/fabric/FabricRuntime';
import { VSCodeOutputAdapter } from '../../src/logging/VSCodeOutputAdapter';
import { BlockchainNetworkExplorerProvider } from '../../src/explorer/BlockchainNetworkExplorer';
import { BlockchainTreeItem } from '../../src/explorer/model/BlockchainTreeItem';
import { RuntimeTreeItem } from '../../src/explorer/model/RuntimeTreeItem';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { TestUtil } from '../TestUtil';

import * as path from 'path';
import * as sinon from 'sinon';
import { LogType } from '../../src/logging/OutputAdapter';

// tslint:disable no-unused-expression
describe('exportConnectionDetailsCommand', () => {

    let sandbox: sinon.SinonSandbox;
    const connectionRegistry: FabricConnectionRegistry = FabricConnectionRegistry.instance();
    const runtimeRegistry: FabricRuntimeRegistry = FabricRuntimeRegistry.instance();
    const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
    let runtime: FabricRuntime;
    let runtimeTreeItem: RuntimeTreeItem;
    let workspaceFolderStub: sinon.SinonStub;
    let workspaceFolder: any;
    let successSpy: sinon.SinonSpy;

    before(async () => {
        await TestUtil.setupTests();
        await TestUtil.storeConnectionsConfig();
        await TestUtil.storeRuntimesConfig();
    });

    after(async () => {
        await TestUtil.restoreConnectionsConfig();
        await TestUtil.restoreRuntimesConfig();
    });

    beforeEach(async () => {
        sandbox = sinon.createSandbox();
        await ExtensionUtil.activateExtension();
        await connectionRegistry.clear();
        await runtimeRegistry.clear();
        await runtimeManager.clear();
        await runtimeManager.add('local_fabric');
        runtime = runtimeManager.get('local_fabric');
        const provider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();
        const children: BlockchainTreeItem[] = await provider.getChildren();
        runtimeTreeItem = children.find((child: BlockchainTreeItem) => child instanceof RuntimeTreeItem) as RuntimeTreeItem;
        workspaceFolder = {
            name: 'myFolder',
            uri: vscode.Uri.file('myPath')
        };
        workspaceFolderStub = sandbox.stub(UserInputUtil, 'getWorkspaceFolders').returns([workspaceFolder]);
        successSpy = sandbox.spy(vscode.window, 'showInformationMessage');
    });

    afterEach(async () => {
        sandbox.restore();
    });

    xit('should export the connection details by right clicking on the tree', async () => {
        const exportStub: sinon.SinonStub = sandbox.stub(runtime, 'exportConnectionDetails').resolves();
        await vscode.commands.executeCommand('blockchainConnectionsExplorer.exportConnectionDetailsEntry', runtimeTreeItem);
        exportStub.should.have.been.called.calledOnceWith(VSCodeOutputAdapter.instance(), workspaceFolder.uri.fsPath);
        successSpy.should.have.been.calledWith('Successfully exported connection details to ' + path.join(workspaceFolder.uri.fsPath, runtime.getName()));
    });

    it('should export the connection details', async () => {
        const exportStub: sinon.SinonStub = sandbox.stub(runtime, 'exportConnectionDetails').resolves();
        await vscode.commands.executeCommand('blockchainConnectionsExplorer.exportConnectionDetailsEntry');
        exportStub.should.have.been.called.calledOnceWith(VSCodeOutputAdapter.instance(), workspaceFolder.uri.fsPath);
        successSpy.should.have.been.calledWith('Successfully exported connection details to ' + path.join(workspaceFolder.uri.fsPath, runtime.getName()));
    });

    it('should export the connection details ask which project if more than one', async () => {
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

        const exportStub: sinon.SinonStub = sandbox.stub(runtime, 'exportConnectionDetails').resolves();
        await vscode.commands.executeCommand('blockchainConnectionsExplorer.exportConnectionDetailsEntry');
        exportStub.should.have.been.called.calledOnceWith(VSCodeOutputAdapter.instance(), workspaceFolder2.uri.fsPath);
        successSpy.should.have.been.calledWith('Successfully exported connection details to ' + path.join(workspaceFolder2.uri.fsPath, runtime.getName()));
    });

    it('should handle undefined workspace folders', async () => {
        const outputSpy: sinon.SinonSpy = sandbox.spy(VSCodeOutputAdapter.instance(), 'log');

        workspaceFolderStub.returns(null);
        const exportStub: sinon.SinonStub = sandbox.stub(runtime, 'exportConnectionDetails').resolves();
        await vscode.commands.executeCommand('blockchainConnectionsExplorer.exportConnectionDetailsEntry');
        exportStub.should.not.have.been.called;
        outputSpy.should.have.been.calledWith(LogType.ERROR, 'A folder must be open to export connection details to');
    });

    it('should handle empty workspace folders', async () => {
        const outputSpy: sinon.SinonSpy = sandbox.spy(VSCodeOutputAdapter.instance(), 'log');

        workspaceFolderStub.returns([]);
        const exportStub: sinon.SinonStub = sandbox.stub(runtime, 'exportConnectionDetails').resolves();
        await vscode.commands.executeCommand('blockchainConnectionsExplorer.exportConnectionDetailsEntry');
        exportStub.should.not.have.been.called;
        outputSpy.should.have.been.calledWith(LogType.ERROR, 'A folder must be open to export connection details to');
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

        const exportStub: sinon.SinonStub = sandbox.stub(runtime, 'exportConnectionDetails').resolves();
        await vscode.commands.executeCommand('blockchainConnectionsExplorer.exportConnectionDetailsEntry');
        exportStub.should.not.have.been.called;
    });

    it('should not print the successSpy if there was an error', async () => {
        const errorSpy: sinon.SinonSpy = sandbox.spy(vscode.window, 'showErrorMessage');

        const exportStub: sinon.SinonStub = sandbox.stub(runtime, 'exportConnectionDetails').rejects({message: 'something bad happened'});
        await vscode.commands.executeCommand('blockchainConnectionsExplorer.exportConnectionDetailsEntry', runtimeTreeItem);
        exportStub.should.have.been.called.calledOnceWith(VSCodeOutputAdapter.instance(), workspaceFolder.uri.fsPath);

        errorSpy.should.have.been.calledWith('Issue exporting connection details, see output channel for more information');
        successSpy.should.not.have.been.called;
    });
});
