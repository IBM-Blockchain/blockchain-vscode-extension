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
import { FabricRuntime } from '../../extension/fabric/FabricRuntime';
import { FabricRuntimeManager } from '../../extension/fabric/FabricRuntimeManager';
import { PackageRegistryEntry } from '../../extension/registries/PackageRegistryEntry';
import { FabricEnvironmentConnection } from '../../extension/fabric/FabricEnvironmentConnection';
import { FabricRuntimeUtil } from '../../extension/fabric/FabricRuntimeUtil';
import { Reporter } from '../../extension/util/Reporter';
import { FabricEnvironmentManager } from '../../extension/fabric/FabricEnvironmentManager';
import { FabricEnvironmentRegistryEntry } from '../../extension/registries/FabricEnvironmentRegistryEntry';
import { GlobalState } from '../../extension/util/GlobalState';
import { FabricChaincode } from '../../extension/fabric/FabricChaincode';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';

const should: Chai.Should = chai.should();
chai.use(sinonChai);

// tslint:disable no-unused-expression
describe('FabricNodeDebugConfigurationProvider', () => {

    describe('provideDebugConfigurations', () => {

        it('should provide a debug configuration', async () => {
            const provider: FabricNodeDebugConfigurationProvider = new FabricNodeDebugConfigurationProvider();
            const config: any = await provider.provideDebugConfigurations();
            config.should.deep.equal([{
                type: 'fabric:node',
                request: 'launch',
                name: 'Launch Smart Contract'
            }]);
        });

    });

    describe('resolveDebugConfiguration', () => {

        let mySandbox: sinon.SinonSandbox;
        let fabricDebugConfig: FabricNodeDebugConfigurationProvider;
        let workspaceFolder: any;
        let debugConfig: any;
        let runtimeStub: sinon.SinonStubbedInstance<FabricRuntime>;
        let packageEntry: PackageRegistryEntry;
        let mockRuntimeConnection: sinon.SinonStubbedInstance<FabricEnvironmentConnection>;
        let startDebuggingStub: sinon.SinonStub;
        let sendTelemetryEventStub: sinon.SinonStub;
        let getExtensionLocalFabricSetting: sinon.SinonStub;

        beforeEach(async () => {

            mySandbox = sinon.createSandbox();
            getExtensionLocalFabricSetting = mySandbox.stub(ExtensionUtil, 'getExtensionLocalFabricSetting');
            getExtensionLocalFabricSetting.returns(true);

            fabricDebugConfig = new FabricNodeDebugConfigurationProvider();

            runtimeStub = mySandbox.createStubInstance(FabricRuntime);
            runtimeStub.getPeerChaincodeURL.resolves('grpc://127.0.0.1:54321');
            runtimeStub.isRunning.resolves(true);

            mySandbox.stub(FabricRuntimeManager.instance(), 'getRuntime').returns(runtimeStub);

            const environmentRegistry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
            environmentRegistry.name = FabricRuntimeUtil.LOCAL_FABRIC;
            environmentRegistry.managedRuntime = true;

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
        });

        afterEach(() => {
            mySandbox.restore();
        });

        it('should create a debug configuration', async () => {

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
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

        it('should add in request if not defined', async () => {
            debugConfig.request = null;

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
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
