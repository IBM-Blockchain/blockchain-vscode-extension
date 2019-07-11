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
import { ExtensionUtil, EXTENSION_DATA_KEY, DEFAULT_EXTENSION_DATA } from '../src/util/ExtensionUtil';
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
import { UserInputUtil } from '../src/commands/UserInputUtil';
import { FabricWalletUtil } from '../src/fabric/FabricWalletUtil';
import { dependencies } from '../package.json';
import { FabricRuntime } from '../src/fabric/FabricRuntime';

chai.use(sinonChai);

// tslint:disable no-unused-expression
describe('Extension Tests', () => {

    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();
    let migrateRuntimeStub: sinon.SinonStub;
    let initializeStub: sinon.SinonStub;
    let migrateSettingConfigurations: sinon.SinonStub;
    let tidyWalletsStub: sinon.SinonStub;
    let sendTelemetryStub: sinon.SinonStub;
    let showConfirmationWarningMessageStub: sinon.SinonStub;

    before(async () => {
        await TestUtil.storeShowHomeOnStart();
        await vscode.workspace.getConfiguration().update(SettingConfigurations.HOME_SHOW_ON_STARTUP, false, vscode.ConfigurationTarget.Global);
        await TestUtil.setupTests(mySandBox);
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
        mySandBox.restore();
        showConfirmationWarningMessageStub = mySandBox.stub(UserInputUtil, 'showConfirmationWarningMessage');

        const extensionContext: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();
        await extensionContext.globalState.update(EXTENSION_DATA_KEY, DEFAULT_EXTENSION_DATA);

        await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_GATEWAYS, [], vscode.ConfigurationTarget.Global);
        await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, {}, vscode.ConfigurationTarget.Global);
        migrateRuntimeStub = mySandBox.stub(FabricRuntimeManager.instance(), 'migrate');
        initializeStub = mySandBox.stub(FabricRuntimeManager.instance(), 'initialize');
        migrateSettingConfigurations = mySandBox.stub(ExtensionUtil, 'migrateSettingConfigurations').resolves();
        tidyWalletsStub = mySandBox.stub(FabricWalletUtil, 'tidyWalletSettings').resolves();

        sendTelemetryStub = mySandBox.stub(Reporter.instance(), 'sendTelemetryEvent');
    });

    afterEach(async () => {
        const extensionContext: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();
        await extensionContext.globalState.update(EXTENSION_DATA_KEY, DEFAULT_EXTENSION_DATA);
        mySandBox.restore();
    });

    it('should check all the commands are registered', async () => {
        const allCommands: Array<string> = await vscode.commands.getCommands();

        const commands: Array<string> = allCommands.filter((command: string) => {
            return command.startsWith('gatewaysExplorer') || command.startsWith('aPackagesExplorer') || command.startsWith('environmentExplorer') || command.startsWith('extensionHome') || command.startsWith('walletExplorer');
        });

        commands.should.deep.equal([
            'aPackagesExplorer.focus',
            'environmentExplorer.focus',
            'gatewaysExplorer.focus',
            'walletExplorer.focus',
            ExtensionCommands.REFRESH_GATEWAYS,
            ExtensionCommands.CONNECT_TO_GATEWAY,
            ExtensionCommands.DISCONNECT_GATEWAY,
            ExtensionCommands.ADD_GATEWAY,
            ExtensionCommands.DELETE_GATEWAY,
            ExtensionCommands.ADD_WALLET_IDENTITY,
            ExtensionCommands.CREATE_SMART_CONTRACT_PROJECT,
            ExtensionCommands.PACKAGE_SMART_CONTRACT,
            ExtensionCommands.REFRESH_PACKAGES,
            ExtensionCommands.REFRESH_ENVIRONMENTS,
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
            ExtensionCommands.ADD_ENVIRONMENT,
            ExtensionCommands.CONNECT_TO_ENVIRONMENT,
            ExtensionCommands.DISCONNECT_ENVIRONMENT,
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
            ExtensionCommands.EXPORT_WALLET,
            ExtensionCommands.OPEN_HOME_PAGE
        ]);
    });

    it('should check the activation events are correct', async () => {
        const packageJSON: any = ExtensionUtil.getPackageJSON();
        const activationEvents: string[] = packageJSON.activationEvents;

        activationEvents.should.deep.equal([
            `onView:gatewayExplorer`,
            `onView:environmentExplorer`,
            `onView:aPackagesExplorer`,
            `onView:walletExplorer`,
            `onCommand:${ExtensionCommands.ADD_GATEWAY}`,
            `onCommand:${ExtensionCommands.DELETE_GATEWAY}`,
            `onCommand:${ExtensionCommands.CONNECT_TO_GATEWAY}`,
            `onCommand:${ExtensionCommands.DISCONNECT_GATEWAY}`,
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
            `onCommand:${ExtensionCommands.ADD_ENVIRONMENT}`,
            `onCommand:${ExtensionCommands.CONNECT_TO_ENVIRONMENT}`,
            `onCommand:${ExtensionCommands.DISCONNECT_ENVIRONMENT}`,
            `onCommand:${ExtensionCommands.INSTALL_SMART_CONTRACT}`,
            `onCommand:${ExtensionCommands.INSTANTIATE_SMART_CONTRACT}`,
            `onCommand:${ExtensionCommands.REFRESH_ENVIRONMENTS}`,
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
            `onCommand:${ExtensionCommands.EXPORT_WALLET}`,
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
        const error: Error = new Error('some error');
        mySandBox.stub(dependencyManager, 'installNativeDependencies').rejects(error);

        const failedActivationWindowStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'failedActivationWindow').resolves();

        const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();

        await myExtension.activate(context);

        failedActivationWindowStub.should.have.been.calledOnceWithExactly('some error');
        logSpy.should.have.been.calledWith(LogType.ERROR, undefined, `Failed to activate extension: ${error.toString()}`);
    });

    it('should handle any errors when installing dependencies', async () => {
        const dependencyManager: DependencyManager = DependencyManager.instance();

        const logSpy: sinon.SinonSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
        mySandBox.stub(vscode.commands, 'registerCommand');
        mySandBox.stub(dependencyManager, 'hasNativeDependenciesInstalled').returns(false);
        const error: Error = new Error('some error');
        mySandBox.stub(dependencyManager, 'installNativeDependencies').rejects(error);
        const failedActivationWindowStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'failedActivationWindow').resolves();
        const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();

        await myExtension.activate(context);

        failedActivationWindowStub.should.have.been.calledOnceWithExactly('some error');
        logSpy.should.have.been.calledWith(LogType.ERROR, undefined, `Failed to activate extension: ${error.toString()}`);
    });

    it('should deactivate extension', async () => {
        await myExtension.deactivate();

        await vscode.commands.executeCommand('blockchain.refreshEntry').should.be.rejectedWith(`command 'blockchain.refreshEntry' not found`);
    });

    it('should dispose of the reporter instance production flag is false on extension activiation', async () => {
        mySandBox.stub(vscode.commands, 'executeCommand').resolves();

        mySandBox.stub(ExtensionUtil, 'getPackageJSON').returns({ production: false });
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

    it('should push the reporter instance to the context if production flag is true on extension activiation', async () => {
        mySandBox.stub(vscode.commands, 'executeCommand').resolves();

        mySandBox.stub(ExtensionUtil, 'getPackageJSON').returns({ production: true });
        const reporterSpy: sinon.SinonSpy = mySandBox.spy(Reporter, 'instance');

        const dependencyManager: DependencyManager = DependencyManager.instance();
        mySandBox.stub(vscode.commands, 'registerCommand');
        mySandBox.stub(dependencyManager, 'hasNativeDependenciesInstalled').returns(false);
        mySandBox.stub(dependencyManager, 'installNativeDependencies').resolves();
        mySandBox.stub(TemporaryCommandRegistry.instance(), 'executeStoredCommands');
        const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();

        await myExtension.activate(context);

        reporterSpy.should.have.been.called;
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
        await context.globalState.update(EXTENSION_DATA_KEY, {
            activationCount: 0,
            version: '0.0.7',
            migrationCheck: 1,
            generatorVersion: dependencies['generator-fabric']
        });
        await myExtension.activate(context);
        migrateRuntimeStub.should.have.been.calledOnceWithExactly('0.0.7');
        initializeStub.should.have.been.calledOnceWithExactly();
    });

    it('should migrate setting configurations, if not done already', async () => {
        const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();
        await context.globalState.update(EXTENSION_DATA_KEY, {
            activationCount: 0,
            version: currentExtensionVersion,
            migrationCheck: 0,
            generatorVersion: dependencies['generator-fabric']
        });
        await myExtension.activate(context);
        migrateSettingConfigurations.should.have.been.calledOnce;
    });

    it('should not migrate user settings, if done already', async () => {
        const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();
        await context.globalState.update(EXTENSION_DATA_KEY, {
            activationCount: 0,
            version: currentExtensionVersion,
            migrationCheck: 1,
            generatorVersion: dependencies['generator-fabric']
        });
        await myExtension.activate(context);
        migrateSettingConfigurations.should.not.have.been.called;
    });

    it('should report if new install', async () => {
        const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();
        await context.globalState.update(EXTENSION_DATA_KEY, {
            activationCount: 0,
            version: '0.0.7',
            migrationCheck: 1
        });
        await myExtension.activate(context);
        sendTelemetryStub.should.have.been.calledWith('updatedInstall', {IBM: sinon.match.string});
    });

    it('should not report if not changed version', async () => {
        const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();
        await context.globalState.update(EXTENSION_DATA_KEY, {
            activationCount: 0,
            version: currentExtensionVersion,
            migrationCheck: 1
        });
        await myExtension.activate(context);
        sendTelemetryStub.should.not.have.been.called;
    });

    it('should report if updated install', async () => {
        const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();
        await context.globalState.update(EXTENSION_DATA_KEY, {
            activationCount: 0,
            version: null,
            migrationCheck: 1
        });
        await myExtension.activate(context);
        sendTelemetryStub.should.have.been.calledWith('newInstall', {IBM: sinon.match.string});
    });

    it('should call tidy wallets function on extension activation', async () => {
        const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();

        await myExtension.activate(context);
        tidyWalletsStub.should.have.been.called;
    });

    it('should do nothing if generator version is the latest', async () => {
        const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();
        const generatorVersion: string = dependencies['generator-fabric'];
        await context.globalState.update(EXTENSION_DATA_KEY, {
            activationCount: 0,
            version: currentExtensionVersion,
            migrationCheck: 1,
            generatorVersion: generatorVersion
        });

        const updateGlobalStateSpy: sinon.SinonSpy = mySandBox.spy(context.globalState, 'update');
        await myExtension.activate(context);
        updateGlobalStateSpy.should.not.have.been.calledTwice;
    });

    it(`should update generator version to latest when the ${FabricRuntimeUtil.LOCAL_FABRIC} not already generated`, async () => {
        const oldContext: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();

        const generatorVersion: string = dependencies['generator-fabric'];
        await oldContext.globalState.update(EXTENSION_DATA_KEY, {
            activationCount: 0,
            version: currentExtensionVersion,
            migrationCheck: 1,
            generatorVersion: 'not_the_latest_version'
        });

        const newContext: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();

        const updateGlobalStateSpy: sinon.SinonSpy = mySandBox.spy(newContext.globalState, 'update');

        await myExtension.activate(newContext);

        updateGlobalStateSpy.should.have.been.calledTwice;
        updateGlobalStateSpy.getCall(1).should.have.been.calledWithExactly(EXTENSION_DATA_KEY, {
            activationCount: 1,
            version: currentExtensionVersion,
            migrationCheck: 1,
            generatorVersion: generatorVersion
        });
    });

    it(`should update generator version to latest when the ${FabricRuntimeUtil.LOCAL_FABRIC} has not been generated`, async () => {
        const oldContext: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();

        const generatorVersion: string = dependencies['generator-fabric'];
        await oldContext.globalState.update(EXTENSION_DATA_KEY, {
            activationCount: 0,
            version: currentExtensionVersion,
            migrationCheck: 1,
            generatorVersion: 'not_the_latest_version'
        });

        const newContext: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();

        const updateGlobalStateSpy: sinon.SinonSpy = mySandBox.spy(newContext.globalState, 'update');

        await myExtension.activate(newContext);

        updateGlobalStateSpy.should.have.been.calledTwice;
        updateGlobalStateSpy.getCall(1).should.have.been.calledWithExactly(EXTENSION_DATA_KEY, {
            activationCount: 1,
            version: currentExtensionVersion,
            migrationCheck: 1,
            generatorVersion: generatorVersion
        });
    });

    // This test updates the generator to the lastest when the user is prompted by the showConfirmationWarningMessage.
    // It also doesn't start the newly generated Fabric, as it was stopped when the user selected 'Yes' at the prompt
    it(`should update generator version to latest when the user selects 'Yes' (and stopped)`, async () => {
        const oldContext: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();

        const generatorVersion: string = dependencies['generator-fabric'];
        await oldContext.globalState.update(EXTENSION_DATA_KEY, {
            activationCount: 0,
            version: currentExtensionVersion,
            migrationCheck: 1,
            generatorVersion: 'not_the_latest_version'
        });

        const newContext: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();

        const updateGlobalStateSpy: sinon.SinonSpy = mySandBox.spy(newContext.globalState, 'update');

        const mockRuntime: sinon.SinonStubbedInstance<FabricRuntime> = sinon.createStubInstance(FabricRuntime);
        mockRuntime.isRunning.resolves(false);
        mockRuntime.isGenerated.resolves(true);
        mySandBox.stub(FabricRuntimeManager.instance(), 'getRuntime').returns(mockRuntime);
        const executeCommandStub: sinon.SinonStub = mySandBox.stub(vscode.commands, 'executeCommand').resolves();
        showConfirmationWarningMessageStub.withArgs(`The ${FabricRuntimeUtil.LOCAL_FABRIC} configuration is out of date and must be torn down before updating. Do you want to teardown your ${FabricRuntimeUtil.LOCAL_FABRIC} now?`).resolves(true);

        await myExtension.activate(newContext);

        updateGlobalStateSpy.should.have.been.calledTwice;
        updateGlobalStateSpy.getCall(1).should.have.been.calledWithExactly(EXTENSION_DATA_KEY, {
            activationCount: 1,
            version: currentExtensionVersion,
            migrationCheck: 1,
            generatorVersion: generatorVersion
        });

        showConfirmationWarningMessageStub.should.have.been.calledOnce;
        executeCommandStub.should.have.been.calledWith(ExtensionCommands.TEARDOWN_FABRIC, true);
        executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.START_FABRIC);

    });

    // This test updates the generator to the lastest when the user is prompted by the showConfirmationWarningMessage.
    // It should also start the newly generated Fabric, as it was stopped when the user selected 'Yes' at the prompt
    it(`should update generator version to latest when the user selects 'Yes' (and started)`, async () => {
        const oldContext: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();

        const generatorVersion: string = dependencies['generator-fabric'];
        await oldContext.globalState.update(EXTENSION_DATA_KEY, {
            activationCount: 0,
            version: currentExtensionVersion,
            migrationCheck: 1,
            generatorVersion: 'not_the_latest_version'
        });

        const newContext: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();

        const updateGlobalStateSpy: sinon.SinonSpy = mySandBox.spy(newContext.globalState, 'update');

        const mockRuntime: sinon.SinonStubbedInstance<FabricRuntime> = sinon.createStubInstance(FabricRuntime);
        mockRuntime.isRunning.resolves(true);
        mockRuntime.isGenerated.resolves(true);
        mySandBox.stub(FabricRuntimeManager.instance(), 'getRuntime').returns(mockRuntime);
        const executeCommandStub: sinon.SinonStub = mySandBox.stub(vscode.commands, 'executeCommand').resolves();
        showConfirmationWarningMessageStub.withArgs(`The ${FabricRuntimeUtil.LOCAL_FABRIC} configuration is out of date and must be torn down before updating. Do you want to teardown your ${FabricRuntimeUtil.LOCAL_FABRIC} now?`).resolves(true);

        await myExtension.activate(newContext);

        updateGlobalStateSpy.should.have.been.calledTwice;
        updateGlobalStateSpy.getCall(1).should.have.been.calledWithExactly(EXTENSION_DATA_KEY, {
            activationCount: 1,
            version: currentExtensionVersion,
            migrationCheck: 1,
            generatorVersion: generatorVersion
        });

        showConfirmationWarningMessageStub.should.have.been.calledOnce;
        executeCommandStub.should.have.been.calledWith(ExtensionCommands.TEARDOWN_FABRIC, true);
        executeCommandStub.should.have.been.calledWith(ExtensionCommands.START_FABRIC);

    });

    it(`shouldn't update the generator version to latest when the user selects 'No'`, async () => {
        const oldContext: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();

        const generatorVersion: string = dependencies['generator-fabric'];
        await oldContext.globalState.update(EXTENSION_DATA_KEY, {
            activationCount: 0,
            version: currentExtensionVersion,
            migrationCheck: 1,
            generatorVersion: 'not_the_latest_version'
        });

        const newContext: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();

        const updateGlobalStateSpy: sinon.SinonSpy = mySandBox.spy(newContext.globalState, 'update');

        const mockRuntime: sinon.SinonStubbedInstance<FabricRuntime> = sinon.createStubInstance(FabricRuntime);
        mockRuntime.isGenerated.resolves(true);
        mySandBox.stub(FabricRuntimeManager.instance(), 'getRuntime').returns(mockRuntime);
        const executeCommandStub: sinon.SinonStub = mySandBox.stub(vscode.commands, 'executeCommand').resolves();
        showConfirmationWarningMessageStub.withArgs(`The ${FabricRuntimeUtil.LOCAL_FABRIC} configuration is out of date and must be torn down before updating. Do you want to teardown your ${FabricRuntimeUtil.LOCAL_FABRIC} now?`).resolves(false);

        await myExtension.activate(newContext);

        updateGlobalStateSpy.should.have.been.calledOnce;
        updateGlobalStateSpy.should.not.have.been.calledWith(EXTENSION_DATA_KEY, {
            activationCount: 1,
            version: currentExtensionVersion,
            migrationCheck: 1,
            generatorVersion: generatorVersion
        });

        showConfirmationWarningMessageStub.should.have.been.calledOnce;
        executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.TEARDOWN_FABRIC, true);
        executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.START_FABRIC);

    });

});
