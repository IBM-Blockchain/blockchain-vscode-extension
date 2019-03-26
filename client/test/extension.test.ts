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
import { VSCodeBlockchainOutputAdapter } from '../src/logging/VSCodeBlockchainOutputAdapter';
import { TemporaryCommandRegistry } from '../src/dependencies/TemporaryCommandRegistry';
import { TestUtil } from './TestUtil';
import { FabricRuntimeManager } from '../src/fabric/FabricRuntimeManager';
import { Reporter } from '../src/util/Reporter';
import { BlockchainGatewayExplorerProvider } from '../src/explorer/gatewayExplorer';
import { SampleView } from '../src/webview/SampleView';
import { ExtensionCommands } from '../ExtensionCommands';
import { LogType } from '../src/logging/OutputAdapter';

chai.use(sinonChai);

// tslint:disable no-unused-expression
describe('Extension Tests', () => {
    let mySandBox: sinon.SinonSandbox;
    const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
    before(async () => {
        await TestUtil.storeShowHomeOnStart();
        await vscode.workspace.getConfiguration().update('extension.home.showOnStartup', false, vscode.ConfigurationTarget.Global);
        await TestUtil.setupTests();
        await TestUtil.storeGatewaysConfig();
        await TestUtil.storeRuntimesConfig();
        await TestUtil.storeShowHomeOnStart();
    });

    after(async () => {
        await TestUtil.restoreShowHomeOnStart();
        await TestUtil.restoreGatewaysConfig();
        await TestUtil.restoreRuntimesConfig();
        await TestUtil.restoreShowHomeOnStart();
    });

    beforeEach(async () => {
        const extensionContext: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();
        await extensionContext.globalState.update(myExtension.EXTENSION_DATA_KEY, myExtension.DEFAULT_EXTENSION_DATA);
        mySandBox = sinon.createSandbox();
        await vscode.workspace.getConfiguration().update('fabric.gateways', [], vscode.ConfigurationTarget.Global);
        await vscode.workspace.getConfiguration().update('fabric.runtime', {}, vscode.ConfigurationTarget.Global);
    });

    afterEach(async () => {
        const extensionContext: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();
        await extensionContext.globalState.update(myExtension.EXTENSION_DATA_KEY, myExtension.DEFAULT_EXTENSION_DATA);
        mySandBox.restore();
    });

    it('should check all the commands are registered', async () => {
        const allCommands: Array<string> = await vscode.commands.getCommands();

        const commands: Array<string> = allCommands.filter((command: string) => {
            return command.startsWith('gatewaysExplorer') || command.startsWith('aPackagesExplorer') || command.startsWith('aRuntimeOpsExplorer') || command.startsWith('extensionHome') || command.startsWith('walletExplorer');
        });

        commands.should.deep.equal([
            'aPackagesExplorer.focus',
            'aRuntimeOpsExplorer.focus',
            'gatewaysExplorer.focus',
            'walletExplorer.focus',
            ExtensionCommands.REFRESH_GATEWAYS,
            ExtensionCommands.CONNECT,
            ExtensionCommands.DISCONNECT,
            ExtensionCommands.ADD_GATEWAY,
            ExtensionCommands.DELETE_GATEWAY,
            ExtensionCommands.ADD_WALLET_IDENTITY,
            ExtensionCommands.CREATE_SMART_CONTRACT_PROJECT,
            ExtensionCommands.PACKAGE_SMART_CONTRACT,
            ExtensionCommands.REFRESH_PACKAGES,
            ExtensionCommands.REFRESH_LOCAL_OPS,
            ExtensionCommands.START_FABRIC,
            ExtensionCommands.STOP_FABRIC,
            ExtensionCommands.RESTART_FABRIC,
            ExtensionCommands.TEARDOWN_FABRIC,
            ExtensionCommands.TOGGLE_FABRIC_DEV_MODE,
            ExtensionCommands.OPEN_FABRIC_RUNTIME_TERMINAL,
            ExtensionCommands.EXPORT_CONNECTION_DETAILS,
            ExtensionCommands.DELETE_SMART_CONTRACT,
            ExtensionCommands.EXPORT_SMART_CONTRACT,
            ExtensionCommands.IMPORT_SMART_CONTRACT,
            ExtensionCommands.INSTALL_SMART_CONTRACT,
            ExtensionCommands.INSTANTIATE_SMART_CONTRACT,
            ExtensionCommands.EDIT_GATEWAY,
            ExtensionCommands.TEST_SMART_CONTRACT,
            ExtensionCommands.SUBMIT_TRANSACTION,
            ExtensionCommands.EVALUATE_TRANSACTION,
            ExtensionCommands.UPGRADE_SMART_CONTRACT,
            ExtensionCommands.CREATE_NEW_IDENTITY,
            ExtensionCommands.REFRESH_WALLETS,
            ExtensionCommands.ADD_WALLET,
            ExtensionCommands.EDIT_WALLET,
            ExtensionCommands.OPEN_HOME_PAGE
        ]);
    });

    it('should check the activation events are correct', async () => {
        const packageJSON: any = ExtensionUtil.getPackageJSON();
        const activationEvents: string[] = packageJSON.activationEvents;

        activationEvents.should.deep.equal([
            `onView:gatewayExplorer`,
            `onView:aRuntimeOpsExplorer`,
            `onView:aPackagesExplorer`,
            `onView:walletExplorer`,
            `onCommand:${ExtensionCommands.ADD_GATEWAY}`,
            `onCommand:${ExtensionCommands.DELETE_GATEWAY}`,
            `onCommand:${ExtensionCommands.CONNECT}`,
            `onCommand:${ExtensionCommands.DISCONNECT}`,
            `onCommand:${ExtensionCommands.REFRESH_GATEWAYS}`,
            `onCommand:${ExtensionCommands.EDIT_GATEWAY}`,
            `onCommand:${ExtensionCommands.TEST_SMART_CONTRACT}`,
            `onCommand:${ExtensionCommands.SUBMIT_TRANSACTION}`,
            `onCommand:${ExtensionCommands.EVALUATE_TRANSACTION}`,
            `onCommand:${ExtensionCommands.CREATE_SMART_CONTRACT_PROJECT}`,
            `onCommand:${ExtensionCommands.PACKAGE_SMART_CONTRACT}`,
            `onCommand:${ExtensionCommands.DELETE_SMART_CONTRACT}`,
            `onCommand:${ExtensionCommands.EXPORT_SMART_CONTRACT}`,
            `onCommand:${ExtensionCommands.IMPORT_SMART_CONTRACT}`,
            `onCommand:${ExtensionCommands.REFRESH_PACKAGES}`,
            `onCommand:${ExtensionCommands.INSTALL_SMART_CONTRACT}`,
            `onCommand:${ExtensionCommands.INSTANTIATE_SMART_CONTRACT}`,
            `onCommand:${ExtensionCommands.REFRESH_LOCAL_OPS}`,
            `onCommand:${ExtensionCommands.START_FABRIC}`,
            `onCommand:${ExtensionCommands.STOP_FABRIC}`,
            `onCommand:${ExtensionCommands.RESTART_FABRIC}`,
            `onCommand:${ExtensionCommands.TEARDOWN_FABRIC}`,
            `onCommand:${ExtensionCommands.TOGGLE_FABRIC_DEV_MODE}`,
            `onCommand:${ExtensionCommands.OPEN_FABRIC_RUNTIME_TERMINAL}`,
            `onCommand:${ExtensionCommands.EXPORT_CONNECTION_DETAILS}`,
            `onCommand:${ExtensionCommands.UPGRADE_SMART_CONTRACT}`,
            `onCommand:${ExtensionCommands.CREATE_NEW_IDENTITY}`,
            `onCommand:${ExtensionCommands.REFRESH_WALLETS}`,
            `onCommand:${ExtensionCommands.ADD_WALLET}`,
            `onCommand:${ExtensionCommands.ADD_WALLET_IDENTITY}`,
            `onCommand:${ExtensionCommands.EDIT_WALLET}`,
            `onCommand:${ExtensionCommands.OPEN_HOME_PAGE}`,
            `onDebug`
        ]);
    });

    it('should refresh the tree when a connection is added', async () => {
        await vscode.workspace.getConfiguration().update('fabric.gateways', [], vscode.ConfigurationTarget.Global);

        const treeDataProvider: BlockchainGatewayExplorerProvider = myExtension.getBlockchainGatewayExplorerProvider();

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

        await vscode.workspace.getConfiguration().update('fabric.gateways', [myConnection], vscode.ConfigurationTarget.Global);

        treeSpy.should.have.been.called;
    });

    it('should refresh the tree when a runtime is added', async () => {

        await vscode.workspace.getConfiguration().update('fabric.runtime', {}, vscode.ConfigurationTarget.Global);

        const treeDataProvider: BlockchainGatewayExplorerProvider = myExtension.getBlockchainGatewayExplorerProvider();

        const treeSpy: sinon.SinonSpy = mySandBox.spy(treeDataProvider['_onDidChangeTreeData'], 'fire');

        const myRuntime: any = {
            name: 'local_fabric',
            developmentMode: false
        };

        await vscode.workspace.getConfiguration().update('fabric.runtime', myRuntime, vscode.ConfigurationTarget.Global);

        treeSpy.should.have.been.called;
    });

    it('should install native dependencies on first activation', async () => {
        const showOutputAdapterStub: sinon.SinonStub = mySandBox.stub(VSCodeBlockchainOutputAdapter.instance(), 'show');
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
        showOutputAdapterStub.should.have.been.called;
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

        const logSpy: sinon.SinonSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
        mySandBox.stub(vscode.commands, 'registerCommand');
        mySandBox.stub(dependencyManager, 'hasNativeDependenciesInstalled').returns(false);
        mySandBox.stub(dependencyManager, 'installNativeDependencies').rejects({message: 'some error'});
        const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();

        await myExtension.activate(context);

        logSpy.should.have.been.calledWith(LogType.ERROR, 'Failed to activate extension: open output view');
    });

    it('should handle any errors when installing dependencies', async () => {
        const dependencyManager: DependencyManager = DependencyManager.instance();

        const logSpy: sinon.SinonSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
        mySandBox.stub(vscode.commands, 'registerCommand');
        mySandBox.stub(dependencyManager, 'hasNativeDependenciesInstalled').returns(false);
        mySandBox.stub(dependencyManager, 'installNativeDependencies').rejects({message: 'some error'});
        const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();

        await myExtension.activate(context);

        logSpy.should.have.been.calledWith(LogType.ERROR, 'Failed to activate extension: open output view');
    });

    it('should deactivate extension', async () => {
        await myExtension.deactivate();

        await vscode.commands.executeCommand('blockchain.refreshEntry').should.be.rejectedWith(`command 'blockchain.refreshEntry' not found`);
    });

    it('should create a new local_fabric if one does not exist', async () => {
        // Runtime is created upon extension activation, so need to stub the exists function
        mySandBox.stub(runtimeManager, 'exists').returns(false);
        const addSpy: sinon.SinonSpy = mySandBox.spy(runtimeManager, 'add');

        const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();
        await myExtension.activate(context);
        addSpy.should.have.been.calledOnce;
    });

    it('should not create a new local_fabric if one already exists', async () => {
        // Runtime is created upon extension activation, so no need to add it again
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

        executeCommand.should.not.have.been.calledWith(ExtensionCommands.OPEN_HOME_PAGE);
    });

    it('should open home page if enabled in settings on first activation', async () => {
        await vscode.workspace.getConfiguration().update('extension.home.showOnStartup', true, vscode.ConfigurationTarget.Global);

        const executeCommand: sinon.SinonSpy = mySandBox.spy(vscode.commands, 'executeCommand');

        const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();

        await myExtension.activate(context);

        executeCommand.should.have.been.calledWith(ExtensionCommands.OPEN_HOME_PAGE);
    });

    it('should not open home page if enabled in settings on second activation', async () => {
        await vscode.workspace.getConfiguration().update('extension.home.showOnStartup', true, vscode.ConfigurationTarget.Global);

        const executeCommand: sinon.SinonSpy = mySandBox.spy(vscode.commands, 'executeCommand');

        const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();

        await myExtension.activate(context);

        executeCommand.should.have.been.calledWith(ExtensionCommands.OPEN_HOME_PAGE);

        executeCommand.resetHistory();

        await myExtension.activate(context);

        executeCommand.should.not.have.been.called;
    });

    it('should register and show sample page', async () => {
        mySandBox.spy(vscode.commands, 'executeCommand');
        const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();
        const openContractSampleStub: sinon.SinonStub = mySandBox.stub(SampleView, 'openContractSample').resolves();
        await myExtension.activate(context);

        await vscode.commands.executeCommand(ExtensionCommands.OPEN_SAMPLE_PAGE, 'Repo One', 'Sample One');

        openContractSampleStub.should.have.been.calledWith(context, 'Repo One', 'Sample One');

    });

    it('should reload blockchain explorer when debug event emitted', async () => {
        await vscode.workspace.getConfiguration().update('extension.home.showOnStartup', false, vscode.ConfigurationTarget.Global);

        const session: any = {
            some: 'thing'
        };
        mySandBox.stub(vscode.debug, 'onDidChangeActiveDebugSession').yields(session as vscode.DebugSession);
        const executeCommand: sinon.SinonSpy = mySandBox.spy(vscode.commands, 'executeCommand');
        const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();
        await myExtension.activate(context);
        executeCommand.should.have.been.calledOnce;
        executeCommand.should.have.been.calledWithExactly(ExtensionCommands.REFRESH_GATEWAYS);
    });

    it('should set blockchain-debug false when no debug session', async () => {
        await vscode.workspace.getConfiguration().update('extension.home.showOnStartup', false, vscode.ConfigurationTarget.Global);

        const session: any = undefined;
        mySandBox.stub(vscode.debug, 'onDidChangeActiveDebugSession').yields(session as vscode.DebugSession);
        const executeCommand: sinon.SinonSpy = mySandBox.spy(vscode.commands, 'executeCommand');
        const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();
        await myExtension.activate(context);
        executeCommand.should.have.been.calledOnceWith('setContext', 'blockchain-debug', false);
    });
});
