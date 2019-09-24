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
import { FabricNodeDebugConfigurationProvider } from '../../src/debug/FabricNodeDebugConfigurationProvider';
import { FabricRuntime } from '../../src/fabric/FabricRuntime';
import { FabricRuntimeManager } from '../../src/fabric/FabricRuntimeManager';
import { PackageRegistryEntry } from '../../src/packages/PackageRegistryEntry';
import { FabricEnvironmentConnection } from '../../src/fabric/FabricEnvironmentConnection';
import { FabricGatewayRegistryEntry } from '../../src/fabric/FabricGatewayRegistryEntry';
import { FabricGatewayRegistry } from '../../src/fabric/FabricGatewayRegistry';
import { FabricRuntimeUtil } from '../../src/fabric/FabricRuntimeUtil';
import { Reporter } from '../../src/util/Reporter';

import { FabricEnvironmentManager } from '../../src/fabric/FabricEnvironmentManager';
import { FabricEnvironmentRegistryEntry } from '../../src/fabric/FabricEnvironmentRegistryEntry';
import { FabricWalletUtil } from '../../src/fabric/FabricWalletUtil';
import { GlobalState } from '../../src/util/GlobalState';

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
        let registryEntry: FabricGatewayRegistryEntry;
        let startDebuggingStub: sinon.SinonStub;
        let sendTelemetryEventStub: sinon.SinonStub;

        beforeEach(() => {
            mySandbox = sinon.createSandbox();

            fabricDebugConfig = new FabricNodeDebugConfigurationProvider();

            runtimeStub = sinon.createStubInstance(FabricRuntime);
            runtimeStub.getName.returns('localfabric');
            runtimeStub.getPeerChaincodeURL.resolves('grpc://127.0.0.1:54321');
            runtimeStub.isRunning.resolves(true);
            runtimeStub.getGateways.resolves([{name: 'myGateway', path: 'myPath'}]);

            registryEntry = new FabricGatewayRegistryEntry();
            registryEntry.name = FabricRuntimeUtil.LOCAL_FABRIC;

            mySandbox.stub(FabricRuntimeManager.instance(), 'getRuntime').returns(runtimeStub);
            mySandbox.stub(FabricGatewayRegistry.instance(), 'get').returns(registryEntry);

            const environmentRegistry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
            environmentRegistry.name = FabricRuntimeUtil.LOCAL_FABRIC;
            environmentRegistry.managedRuntime = true;
            environmentRegistry.associatedWallet = FabricWalletUtil.LOCAL_WALLET;

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

            mockRuntimeConnection = sinon.createStubInstance(FabricEnvironmentConnection);
            mockRuntimeConnection.connect.resolves();
            mockRuntimeConnection.getAllPeerNames.resolves('peerOne');

            const instantiatedChaincodes: { name: string, version: string }[] = [{ name: 'myOtherContract', version: 'vscode-debug-13232112018' }, { name: 'cake-network', version: 'vscode-debug-174758735087' }];
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
                env: {
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:0.0.1`
                },
                args: ['start', '--peer.address', 'localhost:12345']
            });
            sendTelemetryEventStub.should.have.been.calledWith('Smart Contract Debugged', {language: 'Node'});
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
                env: {
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:0.0.1`
                },
                args: ['--peer.address', 'localhost:12345', 'start']
            });
            sendTelemetryEventStub.should.have.been.calledWith('Smart Contract Debugged', {language: 'Node'});
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
                env: {
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:0.0.1`
                },
                args: ['start', '--peer.address', 'localhost:12345']
            });
            sendTelemetryEventStub.should.have.been.calledWith('Smart Contract Debugged', {language: 'Node'});
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
                env: {
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:0.0.1`
                },
                args: ['start', '--peer.address', 'localhost:12345']
            });
            sendTelemetryEventStub.should.have.been.calledWith('Smart Contract Debugged', {language: 'Node'});
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
                env: {
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:0.0.1`
                },
                args: ['start', '--peer.address', '127.0.0.1:54321']
            });
            sendTelemetryEventStub.should.have.been.calledWith('Smart Contract Debugged', {language: 'Node'});
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
                env: {
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:0.0.1`
                },
                args: ['--myArgs', 'myValue', 'start', '--peer.address', '127.0.0.1:54321']
            });
            sendTelemetryEventStub.should.have.been.calledWith('Smart Contract Debugged', {language: 'Node'});
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
                env: {
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:0.0.1`
                },
                args: ['start', '--peer.address', 'localhost:12345']
            });
            sendTelemetryEventStub.should.have.been.calledWith('Smart Contract Debugged', {language: 'Node'});
        });
    });
});
