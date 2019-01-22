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
import * as ejs from 'ejs';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { ExtensionUtil } from '../src/util/ExtensionUtil';
import { DependencyManager } from '../src/dependencies/DependencyManager';
import { VSCodeOutputAdapter } from '../src/logging/VSCodeOutputAdapter';
import { TemporaryCommandRegistry } from '../src/dependencies/TemporaryCommandRegistry';
import { TestUtil } from './TestUtil';
import { FabricRuntimeManager } from '../src/fabric/FabricRuntimeManager';
import { Reporter } from '../src/util/Reporter';
import { BlockchainNetworkExplorerProvider } from '../src/explorer/BlockchainNetworkExplorer';
import { HomeView } from '../src/webview/HomeView';
import { RepositoryRegistry } from '../src/repositories/RepositoryRegistry';
import { SampleView } from '../src/webview/SampleView';

const should: Chai.Should = chai.should();
chai.use(sinonChai);

// tslint:disable no-unused-expression
describe('Extension Tests', () => {
    let mySandBox: sinon.SinonSandbox;
    const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
    before(async () => {
        await TestUtil.storeShowHomeOnStart();
        await vscode.workspace.getConfiguration().update('extension.home.showOnStartup', false, vscode.ConfigurationTarget.Global);
        await TestUtil.setupTests();
        await TestUtil.storeConnectionsConfig();
        await TestUtil.storeRuntimesConfig();
        await TestUtil.storeShowHomeOnStart();
    });

    after(async () => {
        await TestUtil.restoreShowHomeOnStart();
        await TestUtil.restoreConnectionsConfig();
        await TestUtil.restoreRuntimesConfig();
        await TestUtil.restoreShowHomeOnStart();
    });

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
        if (runtimeManager.exists('local_fabric')) {
            await runtimeManager.delete('local_fabric');
        }
        await vscode.workspace.getConfiguration().update('fabric.connections', [], vscode.ConfigurationTarget.Global);
    });

    afterEach(async () => {
        mySandBox.restore();
        if (runtimeManager.exists('local_fabric')) {
            await runtimeManager.delete('local_fabric');
        }
    });

    it('should check all the commands are registered', async () => {
        const allCommands: Array<string> = await vscode.commands.getCommands();

        const blockchainCommands: Array<string> = allCommands.filter((command: string) => {
            return command.startsWith('blockchain');
        });

        blockchainCommands.should.deep.equal([
            'blockchainAPackageExplorer.focus',
            'blockchainExplorer.focus',
            'blockchainExplorer.refreshEntry',
            'blockchainExplorer.connectEntry',
            'blockchainExplorer.disconnectEntry',
            'blockchainExplorer.addConnectionEntry',
            'blockchainExplorer.deleteConnectionEntry',
            'blockchainExplorer.addConnectionIdentityEntry',
            'blockchain.createSmartContractProjectEntry',
            'blockchainAPackageExplorer.packageSmartContractProjectEntry',
            'blockchainAPackageExplorer.refreshEntry',
            'blockchainExplorer.startFabricRuntime',
            'blockchainExplorer.stopFabricRuntime',
            'blockchainExplorer.restartFabricRuntime',
            'blockchainExplorer.teardownFabricRuntime',
            'blockchainExplorer.toggleFabricRuntimeDevMode',
            'blockchainExplorer.openFabricRuntimeTerminal',
            'blockchainExplorer.exportConnectionDetailsEntry',
            'blockchainAPackageExplorer.deleteSmartContractPackageEntry',
            'blockchainAPackageExplorer.exportSmartContractPackageEntry',
            'blockchainExplorer.installSmartContractEntry',
            'blockchainExplorer.instantiateSmartContractEntry',
            'blockchainExplorer.editConnectionEntry',
            'blockchainExplorer.testSmartContractEntry',
            'blockchainExplorer.submitTransactionEntry',
            'blockchainExplorer.upgradeSmartContractEntry'
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
            'onCommand:blockchainExplorer.installSmartContractEntry',
            'onCommand:blockchainExplorer.instantiateSmartContractEntry',
            'onCommand:blockchainAPackageExplorer.refreshEntry',
            'onCommand:blockchainAPackageExplorer.packageSmartContractProjectEntry',
            'onCommand:blockchainAPackageExplorer.deleteSmartContractPackageEntry',
            'onCommand:blockchainAPackageExplorer.exportSmartContractPackageEntry',
            'onCommand:blockchainExplorer.startFabricRuntime',
            'onCommand:blockchainExplorer.stopFabricRuntime',
            'onCommand:blockchainExplorer.restartFabricRuntime',
            'onCommand:blockchainExplorer.teardownFabricRuntime',
            'onCommand:blockchainExplorer.toggleFabricRuntimeDevMode',
            'onCommand:blockchainExplorer.openFabricRuntimeTerminal',
            'onCommand:blockchainExplorer.exportConnectionDetailsEntry',
            'onCommand:blockchainExplorer.editConnectionEntry',
            'onCommand:blockchainExplorer.testSmartContractEntry',
            'onCommand:blockchainExplorer.submitTransactionEntry',
            'onCommand:blockchainExplorer.upgradeSmartContractEntry',
            'onDebug'
        ]);
    });

    it('should refresh the tree when a connection is added', async () => {
        await vscode.workspace.getConfiguration().update('fabric.connections', [], vscode.ConfigurationTarget.Global);

        const treeDataProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();

        const treeSpy: sinon.SinonSpy = mySandBox.spy(treeDataProvider['_onDidChangeTreeData'], 'fire');

        const rootPath: string = path.dirname(__dirname);

        const myConnection: any = {
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

        const treeDataProvider: BlockchainNetworkExplorerProvider = myExtension.getBlockchainNetworkExplorerProvider();

        const treeSpy: sinon.SinonSpy = mySandBox.spy(treeDataProvider['_onDidChangeTreeData'], 'fire');

        const myRuntime: any = {
            name: 'myRuntime',
            developmentMode: false
        };

        await vscode.workspace.getConfiguration().update('fabric.runtimes', [myRuntime], vscode.ConfigurationTarget.Global);

        treeSpy.should.have.been.called;
    });

    it('should install native dependencies on first activation', async () => {
        mySandBox.stub(vscode.commands, 'executeCommand').resolves();
        const dependencyManager: DependencyManager = DependencyManager.instance();
        mySandBox.stub(vscode.commands, 'registerCommand');
        mySandBox.stub(dependencyManager, 'hasNativeDependenciesInstalled').returns(false);
        const installStub: sinon.SinonStub = mySandBox.stub(dependencyManager, 'installNativeDependencies').resolves();
        const tempRegistryExecuteStub: sinon.SinonStub = mySandBox.stub(TemporaryCommandRegistry.instance(), 'executeStoredCommands');
        const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();
        await myExtension.activate(context);
        installStub.should.have.been.called;
        tempRegistryExecuteStub.should.have.been.called;
    });

    it('should not install native dependencies if already installed', async () => {
        mySandBox.stub(vscode.commands, 'executeCommand').resolves();

        const dependencyManager: DependencyManager = DependencyManager.instance();
        mySandBox.stub(vscode.commands, 'registerCommand');
        mySandBox.stub(dependencyManager, 'hasNativeDependenciesInstalled').returns(true);
        const installStub: sinon.SinonStub = mySandBox.stub(dependencyManager, 'installNativeDependencies').resolves();
        const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();

        await myExtension.activate(context);
        installStub.should.not.have.been.called;
    });

    it('should handle any errors when installing dependencies', async () => {
        const dependencyManager: DependencyManager = DependencyManager.instance();

        const showErrorStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showErrorMessage').resolves();
        mySandBox.stub(vscode.commands, 'registerCommand');
        mySandBox.stub(dependencyManager, 'hasNativeDependenciesInstalled').returns(false);
        mySandBox.stub(dependencyManager, 'installNativeDependencies').rejects({message: 'some error'});
        const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();

        await myExtension.activate(context);

        showErrorStub.should.have.been.calledWith('Failed to activate extension: open output view');
    });

    it('should handle any errors when installing dependencies and show output log', async () => {
        const dependencyManager: DependencyManager = DependencyManager.instance();

        const showErrorStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showErrorMessage').resolves('open output view');
        mySandBox.stub(vscode.commands, 'registerCommand');
        mySandBox.stub(dependencyManager, 'hasNativeDependenciesInstalled').returns(false);
        mySandBox.stub(dependencyManager, 'installNativeDependencies').rejects({message: 'some error'});
        const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();

        await myExtension.activate(context);

        showErrorStub.should.have.been.calledWith('Failed to activate extension: open output view');
    });

    it('should deactivate extension', async () => {
        await myExtension.deactivate();

        await vscode.commands.executeCommand('blockchain.refreshEntry').should.be.rejectedWith(`command 'blockchain.refreshEntry' not found`);
    });

    it('should migrate any Fabric runtime configuration', async () => {
        const migrateSpy: sinon.SinonSpy = mySandBox.spy(runtimeManager, 'migrate');
        const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();
        await myExtension.activate(context);
        migrateSpy.should.have.been.calledOnce;
    });

    it('should create a new local_fabric if one does not exist', async () => {
        const addSpy: sinon.SinonSpy = mySandBox.spy(runtimeManager, 'add');
        const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();

        await myExtension.activate(context);
        addSpy.should.have.been.calledOnceWithExactly('local_fabric');
    });

    it('should not create a new local_fabric if one already exists', async () => {
        await runtimeManager.add('local_fabric');
        const addSpy: sinon.SinonSpy = mySandBox.spy(runtimeManager, 'add');
        const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();

        await myExtension.activate(context);
        addSpy.should.not.have.been.called;
    });

    it('should check if production flag is false on extension activiation', async () => {
        mySandBox.stub(vscode.commands, 'executeCommand').resolves();

        mySandBox.stub(ExtensionUtil, 'getPackageJSON').returns({production: false});
        const reporterStub: sinon.SinonStub = mySandBox.stub(Reporter.instance(), 'dispose');

        const dependencyManager: DependencyManager = DependencyManager.instance();
        mySandBox.stub(vscode.commands, 'registerCommand');
        mySandBox.stub(dependencyManager, 'hasNativeDependenciesInstalled').returns(false);
        mySandBox.stub(dependencyManager, 'installNativeDependencies').resolves();
        mySandBox.stub(TemporaryCommandRegistry.instance(), 'executeStoredCommands');
        const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();

        await myExtension.activate(context);

        reporterStub.should.have.been.called;
    });

    it('should check if production flag is true on extension activiation', async () => {
        mySandBox.stub(vscode.commands, 'executeCommand').resolves();

        mySandBox.stub(ExtensionUtil, 'getPackageJSON').returns({production: true});
        const reporterStub: sinon.SinonStub = mySandBox.stub(Reporter, 'instance');

        const dependencyManager: DependencyManager = DependencyManager.instance();
        mySandBox.stub(vscode.commands, 'registerCommand');
        mySandBox.stub(dependencyManager, 'hasNativeDependenciesInstalled').returns(false);
        mySandBox.stub(dependencyManager, 'installNativeDependencies').resolves();
        mySandBox.stub(TemporaryCommandRegistry.instance(), 'executeStoredCommands');
        const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();

        await myExtension.activate(context);

        reporterStub.should.have.been.called;
    });

    it('should not open home page if disabled in settings', async () => {
        await vscode.workspace.getConfiguration().update('extension.home.showOnStartup', false, vscode.ConfigurationTarget.Global);

        const executeCommand: sinon.SinonSpy = mySandBox.spy(vscode.commands, 'executeCommand');

        const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();

        await myExtension.activate(context);

        executeCommand.should.not.have.been.calledWith('extensionHome.open');
    });

    it('should open home page if disabled in settings', async () => {
        await vscode.workspace.getConfiguration().update('extension.home.showOnStartup', true, vscode.ConfigurationTarget.Global);

        const executeCommand: sinon.SinonSpy = mySandBox.spy(vscode.commands, 'executeCommand');

        const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();

        await myExtension.activate(context);

        executeCommand.should.have.been.calledWith('extensionHome.open');
    });

    it('should register and show sample page', async () => {
        const executeCommand: sinon.SinonSpy = mySandBox.spy(vscode.commands, 'executeCommand');
        const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();
        const openContractSampleStub: sinon.SinonStub = mySandBox.stub(SampleView, 'openContractSample').resolves();
        await myExtension.activate(context);

        await vscode.commands.executeCommand('sample.open', 'Repo One', 'Sample One');

        openContractSampleStub.should.have.been.calledWith(context, 'Repo One', 'Sample One');

    });

});
