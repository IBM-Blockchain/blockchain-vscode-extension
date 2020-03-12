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
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as fs from 'fs-extra';
import * as path from 'path';
import { FabricNodeDebugConfigurationProvider } from '../../extension/debug/FabricNodeDebugConfigurationProvider';
import { LocalEnvironmentManager } from '../../extension/fabric/environments/LocalEnvironmentManager';
import { PackageRegistryEntry } from '../../extension/registries/PackageRegistryEntry';
import { FabricEnvironmentConnection } from 'ibm-blockchain-platform-environment-v1';
import { FabricChaincode, FabricEnvironmentRegistryEntry, FabricRuntimeUtil, EnvironmentType, FabricEnvironmentRegistry } from 'ibm-blockchain-platform-common';
import { Reporter } from '../../extension/util/Reporter';
import { FabricEnvironmentManager } from '../../extension/fabric/environments/FabricEnvironmentManager';
import { GlobalState } from '../../extension/util/GlobalState';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';
import { LocalEnvironment } from '../../extension/fabric/environments/LocalEnvironment';
import { UserInputUtil } from '../../extension/commands/UserInputUtil';
import { TestUtil } from '../TestUtil';
import { EnvironmentFactory } from '../../extension/fabric/environments/EnvironmentFactory';
import { FabricDebugConfigurationProvider } from '../../extension/debug/FabricDebugConfigurationProvider';

const should: Chai.Should = chai.should();
chai.use(sinonChai);

// tslint:disable no-unused-expression
describe('FabricNodeDebugConfigurationProvider', () => {
    let mySandbox: sinon.SinonSandbox;

    before(async () => {
        mySandbox = sinon.createSandbox();
        await TestUtil.setupTests(mySandbox);
    });

    describe('provideDebugConfigurations', () => {

        beforeEach(async () => {

            mySandbox = sinon.createSandbox();
        });

        afterEach(() => {
            mySandbox.restore();
        });

        it('should provide a debug configuration for javascript', async () => {
            const provider: FabricNodeDebugConfigurationProvider = new FabricNodeDebugConfigurationProvider();
            const workspaceFolder: vscode.WorkspaceFolder = {
                name: 'myFolder',
                index: 1,
                uri: vscode.Uri.file('myPath')
            };

            mySandbox.stub(fs, 'readdir').resolves(['myFile.js']);

            const config: any = await provider.provideDebugConfigurations(workspaceFolder);
            config.should.deep.equal([{
                type: 'fabric:node',
                request: 'launch',
                name: 'Debug Smart Contract'
            }]);
        });

        it('should provide a debug configuration for typscript', async () => {
            const provider: FabricNodeDebugConfigurationProvider = new FabricNodeDebugConfigurationProvider();
            const workspaceFolder: vscode.WorkspaceFolder = {
                name: 'myFolder',
                index: 1,
                uri: vscode.Uri.file('myPath')
            };

            mySandbox.stub(fs, 'readdir').resolves(['tsconfig.json', 'myFile.ts']);

            const config: any = await provider.provideDebugConfigurations(workspaceFolder);
            config.should.deep.equal([{
                type: 'fabric:node',
                request: 'launch',
                name: 'Debug Smart Contract',
                preLaunchTask: 'tsc: build - tsconfig.json',
                outFiles: [
                    '${workspaceFolder}/dist/**/*.js'
                ]
            }]);
        });
    });

    describe('resolveDebugConfiguration', () => {

        let fabricDebugConfig: FabricNodeDebugConfigurationProvider;
        let workspaceFolder: any;
        let debugConfig: any;
        let runtimeStub: sinon.SinonStubbedInstance<LocalEnvironment>;
        let packageEntry: PackageRegistryEntry;
        let mockRuntimeConnection: sinon.SinonStubbedInstance<FabricEnvironmentConnection>;
        let startDebuggingStub: sinon.SinonStub;
        let sendTelemetryEventStub: sinon.SinonStub;
        let getExtensionLocalFabricSetting: sinon.SinonStub;
        let showQuickPickItemStub: sinon.SinonStub;
        let environmentRegistry: FabricEnvironmentRegistryEntry;
        let showQuickPickStub: sinon.SinonStub;
        beforeEach(async () => {

            mySandbox = sinon.createSandbox();
            await FabricEnvironmentRegistry.instance().clear();
            await TestUtil.setupLocalFabric();

            getExtensionLocalFabricSetting = mySandbox.stub(ExtensionUtil, 'getExtensionLocalFabricSetting');
            getExtensionLocalFabricSetting.returns(true);

            fabricDebugConfig = new FabricNodeDebugConfigurationProvider();

            runtimeStub = mySandbox.createStubInstance(LocalEnvironment);
            runtimeStub.getPeerChaincodeURL.resolves('grpc://127.0.0.1:54321');
            runtimeStub.isRunning.resolves(true);
            runtimeStub.numberOfOrgs = 1;
            runtimeStub.getAllOrganizationNames.resolves(['Org1MSP', 'Org2MSP']);
            runtimeStub.getName.returns(FabricRuntimeUtil.LOCAL_FABRIC);

            mySandbox.stub(LocalEnvironmentManager.instance(), 'getRuntime').returns(runtimeStub);

            environmentRegistry = new FabricEnvironmentRegistryEntry();
            environmentRegistry.name = FabricRuntimeUtil.LOCAL_FABRIC;
            environmentRegistry.managedRuntime = true;
            environmentRegistry.environmentType = EnvironmentType.LOCAL_ENVIRONMENT;
            environmentRegistry.numberOfOrgs = 1;

            mySandbox.stub(FabricEnvironmentManager.instance(), 'getEnvironmentRegistryEntry').returns(environmentRegistry);

            workspaceFolder = {
                name: 'myFolder',
                uri: vscode.Uri.file('myPath')
            };

            mySandbox.stub(fs, 'readJSON');
            mySandbox.stub(fs, 'readFile').resolves(`{
                "name": "mySmartContract",
                "version": "0.0.1"
            }`);

            debugConfig = {
                type: 'fabric:node',
                name: 'Launch Program'
            };

            debugConfig.request = 'myLaunch';
            debugConfig.program = 'myProgram';
            debugConfig.cwd = 'myCwd';
            debugConfig.args = ['start', '--peer.address', 'localhost:12345'];

            mySandbox.stub(vscode.workspace, 'findFiles').resolves([]);

            packageEntry = new PackageRegistryEntry();
            packageEntry.name = 'banana';
            packageEntry.version = 'vscode-13232112018';
            packageEntry.path = path.join('myPath');

            mockRuntimeConnection = mySandbox.createStubInstance(FabricEnvironmentConnection);
            mockRuntimeConnection.connect.resolves();
            mockRuntimeConnection.getAllPeerNames.resolves('peerOne');

            const instantiatedChaincodes: FabricChaincode[] = [{ name: 'myOtherContract', version: 'vscode-debug-13232112018' }, { name: 'cake-network', version: 'vscode-debug-174758735087' }];
            mockRuntimeConnection.getAllInstantiatedChaincodes.resolves(instantiatedChaincodes);

            mySandbox.stub(FabricEnvironmentManager.instance(), 'getConnection').returns(mockRuntimeConnection);

            startDebuggingStub = mySandbox.stub(vscode.debug, 'startDebugging');

            sendTelemetryEventStub = mySandbox.stub(Reporter.instance(), 'sendTelemetryEvent');

            mySandbox.stub(GlobalState, 'get').returns({
                generatorVersion: '0.0.36'
            });

            const localEnvironment: LocalEnvironment = EnvironmentFactory.getEnvironment(environmentRegistry) as LocalEnvironment;
            showQuickPickItemStub = mySandbox.stub(UserInputUtil, 'showQuickPickItem').resolves({label: FabricRuntimeUtil.LOCAL_FABRIC, data: localEnvironment});
            mySandbox.stub(LocalEnvironmentManager.instance(), 'ensureRuntime').resolves(runtimeStub);

            mySandbox.stub(FabricDebugConfigurationProvider, 'connectToGateway').resolves(true);

            showQuickPickStub = mySandbox.stub(UserInputUtil, 'showQuickPick');

            FabricDebugConfigurationProvider.environmentName = FabricRuntimeUtil.LOCAL_FABRIC;

        });

        afterEach(() => {
            mySandbox.restore();
        });

        it('should create a debug configuration', async () => {

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            const localEnvironment: LocalEnvironment = EnvironmentFactory.getEnvironment(environmentRegistry) as LocalEnvironment;
            showQuickPickItemStub.should.have.been.calledOnceWithExactly('Select a local environment to debug', [{label: FabricRuntimeUtil.LOCAL_FABRIC, data: localEnvironment}]);

            startDebuggingStub.should.have.been.calledOnceWithExactly(sinon.match.any, {
                type: 'node',
                request: 'myLaunch',
                program: 'myProgram',
                cwd: 'myCwd',
                debugEvent: FabricNodeDebugConfigurationProvider.debugEvent,
                env: {
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:0.0.1`
                },
                args: ['start', '--peer.address', 'localhost:12345']
            });
            sendTelemetryEventStub.should.have.been.calledWith('Smart Contract Debugged', { language: 'Node' });
        });

        it('should add start arg if not in there', async () => {

            debugConfig.args = ['--peer.address', 'localhost:12345'];

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            const localEnvironment: LocalEnvironment = EnvironmentFactory.getEnvironment(environmentRegistry) as LocalEnvironment;
            showQuickPickItemStub.should.have.been.calledOnceWithExactly('Select a local environment to debug', [{label: FabricRuntimeUtil.LOCAL_FABRIC, data: localEnvironment}]);
            startDebuggingStub.should.have.been.calledOnceWithExactly(sinon.match.any, {
                type: 'node',
                request: 'myLaunch',
                program: 'myProgram',
                cwd: 'myCwd',
                debugEvent: FabricNodeDebugConfigurationProvider.debugEvent,
                env: {
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:0.0.1`
                },
                args: ['--peer.address', 'localhost:12345', 'start']
            });
            sendTelemetryEventStub.should.have.been.calledWith('Smart Contract Debugged', { language: 'Node' });
        });

        it('should set program if not set', async () => {

            debugConfig.program = null;

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            const localEnvironment: LocalEnvironment = EnvironmentFactory.getEnvironment(environmentRegistry) as LocalEnvironment;
            showQuickPickItemStub.should.have.been.calledOnceWithExactly('Select a local environment to debug', [{label: FabricRuntimeUtil.LOCAL_FABRIC, data: localEnvironment}]);
            startDebuggingStub.should.have.been.calledOnceWithExactly(sinon.match.any, {
                type: 'node',
                request: 'myLaunch',
                program: path.join(path.sep, 'myPath', 'node_modules', '.bin', 'fabric-chaincode-node'),
                cwd: 'myCwd',
                debugEvent: FabricNodeDebugConfigurationProvider.debugEvent,
                env: {
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:0.0.1`
                },
                args: ['start', '--peer.address', 'localhost:12345']
            });
            sendTelemetryEventStub.should.have.been.calledWith('Smart Contract Debugged', { language: 'Node' });
        });

        it('should set program if not set for Windows', async () => {
            mySandbox.stub(process, 'platform').value('win32');
            debugConfig.program = null;

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            const localEnvironment: LocalEnvironment = EnvironmentFactory.getEnvironment(environmentRegistry) as LocalEnvironment;
            showQuickPickItemStub.should.have.been.calledOnceWithExactly('Select a local environment to debug', [{label: FabricRuntimeUtil.LOCAL_FABRIC, data: localEnvironment}]);
            startDebuggingStub.should.have.been.calledOnceWithExactly(sinon.match.any, {
                type: 'node',
                request: 'myLaunch',
                program: path.join(path.sep, 'myPath', 'node_modules', 'fabric-shim', 'cli'),
                cwd: 'myCwd',
                debugEvent: FabricNodeDebugConfigurationProvider.debugEvent,
                env: {
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:0.0.1`
                },
                args: ['start', '--peer.address', 'localhost:12345']
            });
            sendTelemetryEventStub.should.have.been.calledWith('Smart Contract Debugged', { language: 'Node' });
        });

        it('should add cwd if not set', async () => {

            debugConfig.cwd = null;

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            const localEnvironment: LocalEnvironment = EnvironmentFactory.getEnvironment(environmentRegistry) as LocalEnvironment;
            showQuickPickItemStub.should.have.been.calledOnceWithExactly('Select a local environment to debug', [{label: FabricRuntimeUtil.LOCAL_FABRIC, data: localEnvironment}]);
            startDebuggingStub.should.have.been.calledOnceWithExactly(sinon.match.any, {
                type: 'node',
                request: 'myLaunch',
                program: 'myProgram',
                cwd: path.sep + 'myPath',
                debugEvent: FabricNodeDebugConfigurationProvider.debugEvent,
                env: {
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:0.0.1`
                },
                args: ['start', '--peer.address', 'localhost:12345']
            });
            sendTelemetryEventStub.should.have.been.calledWith('Smart Contract Debugged', { language: 'Node' });
        });

        it('should add args if not defined', async () => {
            debugConfig.args = null;

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            const localEnvironment: LocalEnvironment = EnvironmentFactory.getEnvironment(environmentRegistry) as LocalEnvironment;
            showQuickPickItemStub.should.have.been.calledOnceWithExactly('Select a local environment to debug', [{label: FabricRuntimeUtil.LOCAL_FABRIC, data: localEnvironment}]);
            startDebuggingStub.should.have.been.calledOnceWithExactly(sinon.match.any, {
                type: 'node',
                request: 'myLaunch',
                program: 'myProgram',
                cwd: 'myCwd',
                debugEvent: FabricNodeDebugConfigurationProvider.debugEvent,
                env: {
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:0.0.1`
                },
                args: ['start', '--peer.address', '127.0.0.1:54321']
            });
            sendTelemetryEventStub.should.have.been.calledWith('Smart Contract Debugged', { language: 'Node' });
        });

        it('should add more args if some args exist', async () => {
            debugConfig.args = ['--myArgs', 'myValue'];

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            const localEnvironment: LocalEnvironment = EnvironmentFactory.getEnvironment(environmentRegistry) as LocalEnvironment;
            showQuickPickItemStub.should.have.been.calledOnceWithExactly('Select a local environment to debug', [{label: FabricRuntimeUtil.LOCAL_FABRIC, data: localEnvironment}]);
            startDebuggingStub.should.have.been.calledOnceWithExactly(sinon.match.any, {
                type: 'node',
                request: 'myLaunch',
                program: 'myProgram',
                cwd: 'myCwd',
                debugEvent: FabricNodeDebugConfigurationProvider.debugEvent,
                env: {
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:0.0.1`
                },
                args: ['--myArgs', 'myValue', 'start', '--peer.address', '127.0.0.1:54321']
            });
            sendTelemetryEventStub.should.have.been.calledWith('Smart Contract Debugged', { language: 'Node' });
        });

        it('should return if peer address is undefined', async () => {
            debugConfig.args = ['--myArgs', 'myValue'];
            runtimeStub.numberOfOrgs = 2;
            showQuickPickStub.resolves();
            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            const localEnvironment: LocalEnvironment = EnvironmentFactory.getEnvironment(environmentRegistry) as LocalEnvironment;
            showQuickPickItemStub.should.have.been.calledOnceWithExactly('Select a local environment to debug', [{label: FabricRuntimeUtil.LOCAL_FABRIC, data: localEnvironment}]);
            startDebuggingStub.should.not.have.been.called;
            runtimeStub.getAllOrganizationNames.should.have.been.calledOnceWithExactly(false);
            showQuickPickStub.should.have.been.calledOnceWithExactly('Select the organization to debug for', ['Org1MSP', 'Org2MSP']);
            sendTelemetryEventStub.should.not.have.been.called;
            should.not.exist(FabricDebugConfigurationProvider.orgName);
        });

        it('should set correct org if there are multiple', async () => {
            debugConfig.args = [];
            runtimeStub.numberOfOrgs = 2;
            showQuickPickStub.resolves('Org2MSP');
            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            const localEnvironment: LocalEnvironment = EnvironmentFactory.getEnvironment(environmentRegistry) as LocalEnvironment;
            showQuickPickItemStub.should.have.been.calledOnceWithExactly('Select a local environment to debug', [{label: FabricRuntimeUtil.LOCAL_FABRIC, data: localEnvironment}]);
            startDebuggingStub.should.have.been.calledOnceWithExactly(sinon.match.any, {
                args: ['start', '--peer.address', '127.0.0.1:54321'],
                cwd: 'myCwd',
                debugEvent: FabricNodeDebugConfigurationProvider.debugEvent,
                env: {
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:0.0.1`
                },
                program: 'myProgram',
                request: 'myLaunch',
                type: 'node'
            });
            runtimeStub.getAllOrganizationNames.should.have.been.calledOnceWithExactly(false);
            showQuickPickStub.should.have.been.calledOnceWithExactly('Select the organization to debug for', ['Org1MSP', 'Org2MSP']);
            sendTelemetryEventStub.should.have.been.calledWith('Smart Contract Debugged', { language: 'Node' });
            FabricDebugConfigurationProvider.orgName.should.equal('Org2');
        });

        it('should add in request if not defined', async () => {
            debugConfig.request = null;

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            const localEnvironment: LocalEnvironment = EnvironmentFactory.getEnvironment(environmentRegistry) as LocalEnvironment;
            showQuickPickItemStub.should.have.been.calledOnceWithExactly('Select a local environment to debug', [{label: FabricRuntimeUtil.LOCAL_FABRIC, data: localEnvironment}]);
            startDebuggingStub.should.have.been.calledOnceWithExactly(sinon.match.any, {
                type: 'node',
                request: 'launch',
                program: 'myProgram',
                cwd: 'myCwd',
                debugEvent: FabricNodeDebugConfigurationProvider.debugEvent,
                env: {
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:0.0.1`
                },
                args: ['start', '--peer.address', 'localhost:12345']
            });
            sendTelemetryEventStub.should.have.been.calledWith('Smart Contract Debugged', { language: 'Node' });
        });
    });
});
