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
import * as vscode from 'vscode';
import * as myExtension from '../src/extension';
import * as path from 'path';

import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { ExtensionUtil } from '../src/util/ExtensionUtil';
import { DependencyManager } from '../src/dependencies/DependencyManager';
import { VSCodeOutputAdapter } from '../src/logging/VSCodeOutputAdapter';
import { TemporaryCommandRegistry } from '../src/dependencies/TemporaryCommandRegistry';
import { TestUtil } from './TestUtil';
import { FabricRuntimeManager } from '../src/fabric/FabricRuntimeManager';

chai.should();
chai.use(sinonChai);

// tslint:disable no-unused-expression
describe('Extension Tests', () => {

    let mySandBox;
    const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();

    before(async () => {
        await TestUtil.setupTests();
    });

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
        if (runtimeManager.exists('local_fabric')) {
            await runtimeManager.delete('local_fabric');
        }
    });

    afterEach(async () => {
        mySandBox.restore();
        if (runtimeManager.exists('local_fabric')) {
            await runtimeManager.delete('local_fabric');
        }
    });

    it('should check all the commands are registered', async () => {
        const allCommands = await vscode.commands.getCommands();

        const blockchainCommands = allCommands.filter((command) => {
            return command.startsWith('blockchain');
        });

        blockchainCommands.should.deep.equal([
            'blockchainExplorer.refreshEntry',
            'blockchainExplorer.connectEntry',
            'blockchainExplorer.disconnectEntry',
            'blockchainExplorer.addConnectionEntry',
            'blockchainExplorer.deleteConnectionEntry',
            'blockchainExplorer.addConnectionIdentityEntry',
            'blockchain.createSmartContractProjectEntry',
            'blockchainAPackageExplorer.refreshEntry',
            'blockchainExplorer.startFabricRuntime'
        ]);
    });

    it('should check the activation events are correct', async () => {
        const packageJSON: any = ExtensionUtil.getPackageJSON();
        const activationEvents: string[] = packageJSON.activationEvents;

        activationEvents.should.deep.equal([
            'onView:blockchainExplorer',
            'onCommand:blockchainExplorer.addConnectionEntry',
            'onCommand:blockchainExplorer.deleteConnectionEntry',
            'onCommand:blockchainExplorer.addConnectionIdentityEntry',
            'onCommand:blockchainExplorer.connectEntry',
            'onCommand:blockchainExplorer.disconnectEntry',
            'onCommand:blockchainExplorer.refreshEntry',
            'onCommand:blockchain.createSmartContractProjectEntry',
            'onCommand:blockchainAPackageExplorer.refreshEntry',
            'onCommand:blockchainAPackageExplorer.packageSmartContractProject',
            'onCommand:blockchainExplorer.startFabricRuntime'
        ]);
    });

    it('should refresh the tree when a connection is added', async () => {
        await vscode.workspace.getConfiguration().update('fabric.connections', [], vscode.ConfigurationTarget.Global);

        const treeDataProvider = myExtension.getBlockchainNetworkExplorerProvider();

        const treeSpy = mySandBox.spy(treeDataProvider['_onDidChangeTreeData'], 'fire');

        const rootPath = path.dirname(__dirname);

        const myConnection = {
            name: 'myConnection',
            connectionProfilePath: path.join(rootPath, '../test/data/connectionTwo/connection.json'),
            identities: [{
                certificatePath: path.join(rootPath, '../test/data/connectionTwo/credentials/certificate'),
                privateKeyPath: path.join(rootPath, '../test/data/connectionTwo/credentials/privateKey')
            }]
        };

        await vscode.workspace.getConfiguration().update('fabric.connections', [myConnection], vscode.ConfigurationTarget.Global);

        treeSpy.should.have.been.called;
    });

    it('should refresh the tree when a runtime is added', async () => {
        await vscode.workspace.getConfiguration().update('fabric.runtimes', [], vscode.ConfigurationTarget.Global);

        const treeDataProvider = myExtension.getBlockchainNetworkExplorerProvider();

        const treeSpy = mySandBox.spy(treeDataProvider['_onDidChangeTreeData'], 'fire');

        const myRuntime = {
            name: 'myRuntime',
            developmentMode: false
        };

        await vscode.workspace.getConfiguration().update('fabric.runtimes', [myRuntime], vscode.ConfigurationTarget.Global);

        treeSpy.should.have.been.called;
    });

    it('should install native dependencies on first activation', async () => {
        const dependencyManager = DependencyManager.instance();
        mySandBox.stub(vscode.commands, 'registerCommand');
        mySandBox.stub(dependencyManager, 'hasNativeDependenciesInstalled').returns(false);
        const installStub = mySandBox.stub(dependencyManager, 'installNativeDependencies').resolves();
        const tempRegistryExecuteStub = mySandBox.stub(TemporaryCommandRegistry.instance(), 'executeStoredCommands');

        const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();
        await myExtension.activate(context);
        installStub.should.have.been.called;
        tempRegistryExecuteStub.should.have.been.called;
    });

    it('should not install native dependencies if already installed', async () => {
        const dependencyManager = DependencyManager.instance();
        mySandBox.stub(vscode.commands, 'registerCommand');
        mySandBox.stub(dependencyManager, 'hasNativeDependenciesInstalled').returns(true);
        const installStub = mySandBox.stub(dependencyManager, 'installNativeDependencies').resolves();

        const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();
        await myExtension.activate(context);
        installStub.should.not.have.been.called;
    });

    it('should handle any errors when installing dependencies', async () => {
        const dependencyManager = DependencyManager.instance();

        const showErrorStub = mySandBox.stub(vscode.window, 'showErrorMessage').resolves();
        mySandBox.stub(vscode.commands, 'registerCommand');
        mySandBox.stub(dependencyManager, 'hasNativeDependenciesInstalled').returns(false);
        mySandBox.stub(dependencyManager, 'installNativeDependencies').rejects({message: 'some error'});

        const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();
        await myExtension.activate(context);

        showErrorStub.should.have.been.calledWith('Failed to activate extension', 'open output view');
    });

    it('should handle any errors when installing dependencies and show output log', async () => {
        const dependencyManager = DependencyManager.instance();

        const showErrorStub = mySandBox.stub(vscode.window, 'showErrorMessage').resolves('open output view');
        const outputAdapterSpy = mySandBox.spy(VSCodeOutputAdapter.instance(), 'show');
        mySandBox.stub(vscode.commands, 'registerCommand');
        mySandBox.stub(dependencyManager, 'hasNativeDependenciesInstalled').returns(false);
        mySandBox.stub(dependencyManager, 'installNativeDependencies').rejects({message: 'some error'});

        const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();
        await myExtension.activate(context);

        showErrorStub.should.have.been.calledWith('Failed to activate extension', 'open output view');

        outputAdapterSpy.should.have.been.called;
    });

    it('should deactivate extension', async () => {
        myExtension.deactivate();

        await vscode.commands.executeCommand('blockchain.refreshEntry').should.be.rejectedWith(`command 'blockchain.refreshEntry' not found`);
    });

    it('should create a new local_fabric if one does not exist', async () => {
        const addSpy = mySandBox.spy(runtimeManager, 'add');
        const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();
        await myExtension.activate(context);
        addSpy.should.have.been.calledOnceWithExactly('local_fabric');
    });

    it('should not create a new local_fabric if one already exists', async () => {
        await runtimeManager.add('local_fabric');
        const addSpy = mySandBox.spy(runtimeManager, 'add');
        const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();
        await myExtension.activate(context);
        addSpy.should.not.have.been.called;
    });

});
