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
import { version as currentExtensionVersion } from '../package.json';
import { ExtensionUtil } from '../src/util/ExtensionUtil';
import { DependencyManager } from '../src/dependencies/DependencyManager';
import { VSCodeBlockchainOutputAdapter } from '../src/logging/VSCodeBlockchainOutputAdapter';
import { TemporaryCommandRegistry } from '../src/dependencies/TemporaryCommandRegistry';
import { TestUtil } from './TestUtil';
import { Reporter } from '../src/util/Reporter';
import { BlockchainGatewayExplorerProvider } from '../src/explorer/gatewayExplorer';
import { SampleView } from '../src/webview/SampleView';
import { ExtensionCommands } from '../ExtensionCommands';
import { LogType } from '../src/logging/OutputAdapter';
import { FabricRuntimeUtil } from '../src/fabric/FabricRuntimeUtil';
import { TutorialView } from '../src/webview/TutorialView';
import { FabricRuntimeManager } from '../src/fabric/FabricRuntimeManager';
import { TutorialGalleryView } from '../src/webview/TutorialGalleryView';
import { SettingConfigurations } from '../SettingConfigurations';
import { version } from 'punycode';

chai.use(sinonChai);

// tslint:disable no-unused-expression
describe('Extension Tests', () => {

    let mySandBox: sinon.SinonSandbox;
    let migrateRuntimeStub: sinon.SinonStub;
    let initializeStub: sinon.SinonStub;
    let migrateSettingConfigurations: sinon.SinonStub;

    before(async () => {
        await TestUtil.storeShowHomeOnStart();
        await vscode.workspace.getConfiguration().update(SettingConfigurations.HOME_SHOW_ON_STARTUP, false, vscode.ConfigurationTarget.Global);
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
        await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_GATEWAYS, [], vscode.ConfigurationTarget.Global);
        await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, {}, vscode.ConfigurationTarget.Global);
        migrateRuntimeStub = mySandBox.stub(FabricRuntimeManager.instance(), 'migrate');
        initializeStub = mySandBox.stub(FabricRuntimeManager.instance(), 'initialize');
        migrateSettingConfigurations = mySandBox.stub(ExtensionUtil, 'migrateSettingConfigurations').resolves();
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
            ExtensionCommands.OPEN_NEW_TERMINAL,
            ExtensionCommands.EXPORT_CONNECTION_PROFILE,
            ExtensionCommands.DELETE_SMART_CONTRACT,
            ExtensionCommands.EXPORT_SMART_CONTRACT,
            ExtensionCommands.IMPORT_SMART_CONTRACT,
            ExtensionCommands.INSTALL_SMART_CONTRACT,
            ExtensionCommands.INSTANTIATE_SMART_CONTRACT,
            ExtensionCommands.EDIT_GATEWAY,
            ExtensionCommands.TEST_ALL_SMART_CONTRACT,
            ExtensionCommands.TEST_SMART_CONTRACT,
            ExtensionCommands.SUBMIT_TRANSACTION,
            ExtensionCommands.EVALUATE_TRANSACTION,
            ExtensionCommands.UPGRADE_SMART_CONTRACT,
            ExtensionCommands.CREATE_NEW_IDENTITY,
            ExtensionCommands.REFRESH_WALLETS,
            ExtensionCommands.ADD_WALLET,
            ExtensionCommands.EDIT_WALLET,
            ExtensionCommands.REMOVE_WALLET,
            ExtensionCommands.DELETE_IDENTITY,
            ExtensionCommands.ASSOCIATE_WALLET,
            ExtensionCommands.DISSOCIATE_WALLET,
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
            `onCommand:${ExtensionCommands.TEST_ALL_SMART_CONTRACT}`,
            `onCommand:${ExtensionCommands.SUBMIT_TRANSACTION}`,
            `onCommand:${ExtensionCommands.EVALUATE_TRANSACTION}`,
            `onCommand:${ExtensionCommands.ASSOCIATE_WALLET}`,
            `onCommand:${ExtensionCommands.DISSOCIATE_WALLET}`,
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
            `onCommand:${ExtensionCommands.OPEN_NEW_TERMINAL}`,
            `onCommand:${ExtensionCommands.EXPORT_CONNECTION_PROFILE}`,
            `onCommand:${ExtensionCommands.UPGRADE_SMART_CONTRACT}`,
            `onCommand:${ExtensionCommands.CREATE_NEW_IDENTITY}`,
            `onCommand:${ExtensionCommands.REFRESH_WALLETS}`,
            `onCommand:${ExtensionCommands.ADD_WALLET}`,
            `onCommand:${ExtensionCommands.ADD_WALLET_IDENTITY}`,
            `onCommand:${ExtensionCommands.EDIT_WALLET}`,
            `onCommand:${ExtensionCommands.REMOVE_WALLET}`,
            `onCommand:${ExtensionCommands.DELETE_IDENTITY}`,
            `onCommand:${ExtensionCommands.OPEN_HOME_PAGE}`,
            `onCommand:${ExtensionCommands.OPEN_TUTORIAL_GALLERY}`,
            `onDebug`
        ]);
    });

    it('should refresh the tree when a connection is added', async () => {
        await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_GATEWAYS, [], vscode.ConfigurationTarget.Global);

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

        await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_GATEWAYS, [myConnection], vscode.ConfigurationTarget.Global);

        treeSpy.should.have.been.called;
    });

    it('should refresh the tree when a runtime is added', async () => {

        await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, {}, vscode.ConfigurationTarget.Global);

        const treeDataProvider: BlockchainGatewayExplorerProvider = myExtension.getBlockchainGatewayExplorerProvider();

        const treeSpy: sinon.SinonSpy = mySandBox.spy(treeDataProvider['_onDidChangeTreeData'], 'fire');

        const myRuntime: any = {
            name: FabricRuntimeUtil.LOCAL_FABRIC,
            developmentMode: false
        };

        await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, myRuntime, vscode.ConfigurationTarget.Global);

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

    it('should check if production flag is false on extension activation', async () => {
        mySandBox.stub(vscode.commands, 'executeCommand').resolves();

        mySandBox.stub(ExtensionUtil, 'getPackageJSON').returns({production: false});
        const reporterDisposeStub: sinon.SinonStub = mySandBox.stub(Reporter.instance(), 'dispose');

        const dependencyManager: DependencyManager = DependencyManager.instance();
        mySandBox.stub(vscode.commands, 'registerCommand');
        mySandBox.stub(dependencyManager, 'hasNativeDependenciesInstalled').returns(false);
        mySandBox.stub(dependencyManager, 'installNativeDependencies').resolves();
        mySandBox.stub(TemporaryCommandRegistry.instance(), 'executeStoredCommands');
        const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();

        await myExtension.activate(context);

        reporterDisposeStub.should.have.been.called;
    });

    it('should check if production flag is true on extension activation', async () => {
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
        await vscode.workspace.getConfiguration().update(SettingConfigurations.HOME_SHOW_ON_STARTUP, false, vscode.ConfigurationTarget.Global);

        const executeCommand: sinon.SinonSpy = mySandBox.spy(vscode.commands, 'executeCommand');

        const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();

        await myExtension.activate(context);

        executeCommand.should.not.have.been.calledWith(ExtensionCommands.OPEN_HOME_PAGE);
    });

    it('should open home page if enabled in settings on first activation', async () => {
        await vscode.workspace.getConfiguration().update(SettingConfigurations.HOME_SHOW_ON_STARTUP, true, vscode.ConfigurationTarget.Global);

        const executeCommand: sinon.SinonSpy = mySandBox.spy(vscode.commands, 'executeCommand');

        const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();

        await myExtension.activate(context);

        executeCommand.should.have.been.calledWith(ExtensionCommands.OPEN_HOME_PAGE);
    });

    it('should not open home page if enabled in settings on second activation', async () => {
        await vscode.workspace.getConfiguration().update(SettingConfigurations.HOME_SHOW_ON_STARTUP, true, vscode.ConfigurationTarget.Global);

        const executeCommand: sinon.SinonSpy = mySandBox.spy(vscode.commands, 'executeCommand');

        const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();

        await myExtension.activate(context);

        executeCommand.should.have.been.calledWith(ExtensionCommands.OPEN_HOME_PAGE);

        executeCommand.resetHistory();

        await myExtension.activate(context);

        executeCommand.should.not.have.been.called;
    });

    it('should register and show sample page', async () => {
        const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();
        const sampleViewStub: sinon.SinonStub = mySandBox.stub(SampleView.prototype, 'openView');
        sampleViewStub.resolves();
        await myExtension.activate(context);

        await vscode.commands.executeCommand(ExtensionCommands.OPEN_SAMPLE_PAGE, 'hyperledger/fabric-samples', 'FabCar');

        sampleViewStub.should.have.been.called;
    });

    it('should register and show the tutorial gallery page', async () => {
        const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();
        const tutorialGalleryViewStub: sinon.SinonStub = mySandBox.stub(TutorialGalleryView.prototype, 'openView');
        tutorialGalleryViewStub.resolves();
        await myExtension.activate(context);

        await vscode.commands.executeCommand(ExtensionCommands.OPEN_TUTORIAL_GALLERY);

        tutorialGalleryViewStub.should.have.been.called;
    });

    it('should register and show tutorial page', async () => {
        const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();
        const tutorialViewStub: sinon.SinonStub = mySandBox.stub(TutorialView.prototype, 'openView');
        tutorialViewStub.resolves();
        await myExtension.activate(context);

        await vscode.commands.executeCommand(ExtensionCommands.OPEN_TUTORIAL_PAGE, 'IBMCode/Code-Tutorials', 'Developing smart contracts with IBM Blockchain VSCode Extension');

        tutorialViewStub.should.have.been.called;
    });

    it('should reload blockchain explorer when debug event emitted', async () => {
        await vscode.workspace.getConfiguration().update(SettingConfigurations.HOME_SHOW_ON_STARTUP, false, vscode.ConfigurationTarget.Global);

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
        await vscode.workspace.getConfiguration().update(SettingConfigurations.HOME_SHOW_ON_STARTUP, false, vscode.ConfigurationTarget.Global);

        const session: any = undefined;
        mySandBox.stub(vscode.debug, 'onDidChangeActiveDebugSession').yields(session as vscode.DebugSession);
        const executeCommand: sinon.SinonSpy = mySandBox.spy(vscode.commands, 'executeCommand');
        const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();
        await myExtension.activate(context);
        executeCommand.should.have.been.calledOnceWith('setContext', 'blockchain-debug', false);
    });

    it('should always migrate runtime and initialize the runtime manager', async () => {
        const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();
        await context.globalState.update(myExtension.EXTENSION_DATA_KEY, {
            activationCount: 0,
            version: '0.0.7',
            migrationCheck: 1
        });
        await myExtension.activate(context);
        migrateRuntimeStub.should.have.been.calledOnceWithExactly('0.0.7');
        initializeStub.should.have.been.calledOnceWithExactly();
    });

    it('should migrate setting configurations, if not done already', async () => {
        const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();
        await context.globalState.update(myExtension.EXTENSION_DATA_KEY, {
            activationCount: 0,
            version: currentExtensionVersion,
            migrationCheck: 0
        });
        await myExtension.activate(context);
        migrateSettingConfigurations.should.have.been.calledOnce;
    });

    it('should not migrate user settings, if done already', async () => {
        const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();
        await context.globalState.update(myExtension.EXTENSION_DATA_KEY, {
            activationCount: 0,
            version: version,
            migrationCheck: 1
        });
        await myExtension.activate(context);
        migrateSettingConfigurations.should.not.have.been.called;
    });

});
