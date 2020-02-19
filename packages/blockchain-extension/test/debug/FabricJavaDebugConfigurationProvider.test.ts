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
import { LocalEnvironmentManager } from '../../extension/fabric/environments/LocalEnvironmentManager';
import { PackageRegistryEntry } from '../../extension/registries/PackageRegistryEntry';
import { FabricEnvironmentConnection } from 'ibm-blockchain-platform-environment-v1';
import { UserInputUtil } from '../../extension/commands/UserInputUtil';
import { FabricJavaDebugConfigurationProvider } from '../../extension/debug/FabricJavaDebugConfigurationProvider';
import { FabricChaincode, FabricEnvironmentRegistryEntry, FabricRuntimeUtil, EnvironmentType } from 'ibm-blockchain-platform-common';
import { Reporter } from '../../extension/util/Reporter';
import { FabricEnvironmentManager } from '../../extension/fabric/environments/FabricEnvironmentManager';
import { GlobalState } from '../../extension/util/GlobalState';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';
import { LocalEnvironment } from '../../extension/fabric/environments/LocalEnvironment';

const should: Chai.Should = chai.should();
chai.use(sinonChai);

// tslint:disable no-unused-expression
describe('FabricJavaDebugConfigurationProvider', () => {

    describe('provideDebugConfigurations', () => {

        it('should provide a debug configuration', async () => {
            const provider: FabricJavaDebugConfigurationProvider = new FabricJavaDebugConfigurationProvider();
            const config: any = await provider.provideDebugConfigurations();
            config.should.deep.equal([{
                type: 'fabric:java',
                request: 'launch',
                name: 'Debug Smart Contract',
                mainClass: 'org.hyperledger.fabric.contract.ContractRouter'
            }]);
        });

    });

    describe('resolveDebugConfiguration', () => {

        let mySandbox: sinon.SinonSandbox;
        let fabricDebugConfig: FabricJavaDebugConfigurationProvider;
        let workspaceFolder: any;
        let debugConfig: any;
        let runtimeStub: sinon.SinonStubbedInstance<LocalEnvironment>;
        let packageEntry: PackageRegistryEntry;
        let mockRuntimeConnection: sinon.SinonStubbedInstance<FabricEnvironmentConnection>;
        let startDebuggingStub: sinon.SinonStub;
        let sendTelemetryEventStub: sinon.SinonStub;
        let showInputBoxStub: sinon.SinonStub;
        let getExtensionLocalFabricSetting: sinon.SinonStub;
        beforeEach(async () => {

            mySandbox = sinon.createSandbox();
            getExtensionLocalFabricSetting = mySandbox.stub(ExtensionUtil, 'getExtensionLocalFabricSetting');
            getExtensionLocalFabricSetting.returns(true);

            fabricDebugConfig = new FabricJavaDebugConfigurationProvider();

            runtimeStub = mySandbox.createStubInstance(LocalEnvironment);
            runtimeStub.getPeerChaincodeURL.resolves('grpc://127.0.0.1:54321');
            runtimeStub.isRunning.resolves(true);

            mySandbox.stub(LocalEnvironmentManager.instance(), 'getRuntime').returns(runtimeStub);

            const environmentRegistry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
            environmentRegistry.name = FabricRuntimeUtil.LOCAL_FABRIC;
            environmentRegistry.managedRuntime = true;
            environmentRegistry.environmentType = EnvironmentType.LOCAL_ENVIRONMENT;

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
                type: 'fabric:java',
                name: 'Launch Program'
            };

            debugConfig.request = 'myLaunch';
            debugConfig.cwd = 'myCwd';
            debugConfig.args = ['--peer.address', 'localhost:12345'];

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

            showInputBoxStub = mySandbox.stub(UserInputUtil, 'showInputBox').withArgs('Enter a name for your Java package').resolves('mySmartContract');
            showInputBoxStub.withArgs('Enter a version for your Java package').resolves('0.0.1');

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
                type: 'java',
                request: 'myLaunch',
                cwd: 'myCwd',
                debugEvent: FabricJavaDebugConfigurationProvider.debugEvent,
                env: {
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:0.0.1`
                },
                args: ['--peer.address', 'localhost:12345']
            });
            sendTelemetryEventStub.should.have.been.calledWith('Smart Contract Debugged', { language: 'Java' });
        });

        it('should add cwd if not set', async () => {

            debugConfig.cwd = null;

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            startDebuggingStub.should.have.been.calledOnceWithExactly(sinon.match.any, {
                type: 'java',
                request: 'myLaunch',
                cwd: path.sep + 'myPath',
                debugEvent: FabricJavaDebugConfigurationProvider.debugEvent,
                env: {
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:0.0.1`
                },
                args: ['--peer.address', 'localhost:12345']
            });
            sendTelemetryEventStub.should.have.been.calledWith('Smart Contract Debugged', { language: 'Java' });
        });

        it('should add args if not defined', async () => {
            debugConfig.args = null;

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            startDebuggingStub.should.have.been.calledOnceWithExactly(sinon.match.any, {
                type: 'java',
                request: 'myLaunch',
                cwd: 'myCwd',
                debugEvent: FabricJavaDebugConfigurationProvider.debugEvent,
                env: {
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:0.0.1`
                },
                args: ['--peer.address', '127.0.0.1:54321']
            });
            sendTelemetryEventStub.should.have.been.calledWith('Smart Contract Debugged', { language: 'Java' });
        });

        it('should add more args if some args exist', async () => {
            debugConfig.args = ['--myArgs', 'myValue'];

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            startDebuggingStub.should.have.been.calledOnceWithExactly(sinon.match.any, {
                type: 'java',
                request: 'myLaunch',
                cwd: 'myCwd',
                debugEvent: FabricJavaDebugConfigurationProvider.debugEvent,
                env: {
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:0.0.1`
                },
                args: ['--myArgs', 'myValue', '--peer.address', '127.0.0.1:54321']
            });
            sendTelemetryEventStub.should.have.been.calledWith('Smart Contract Debugged', { language: 'Java' });
        });

        it('should add in request if not defined', async () => {
            debugConfig.request = null;

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            startDebuggingStub.should.have.been.calledOnceWithExactly(sinon.match.any, {
                type: 'java',
                request: 'launch',
                cwd: 'myCwd',
                debugEvent: FabricJavaDebugConfigurationProvider.debugEvent,
                env: {
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:0.0.1`
                },
                args: ['--peer.address', 'localhost:12345']
            });
            sendTelemetryEventStub.should.have.been.calledWith('Smart Contract Debugged', { language: 'Java' });
        });

        it('should return if name not set', async () => {
            showInputBoxStub.withArgs('Enter a name for your Java package').resolves();
            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.not.exist(config);
            sendTelemetryEventStub.should.not.have.been.called;
        });
    });
});
