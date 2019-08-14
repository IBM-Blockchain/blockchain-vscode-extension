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
import { FabricRuntime } from '../../src/fabric/FabricRuntime';
import { FabricRuntimeManager } from '../../src/fabric/FabricRuntimeManager';
import { PackageRegistryEntry } from '../../src/packages/PackageRegistryEntry';
import { FabricEnvironmentConnection } from '../../src/fabric/FabricEnvironmentConnection';
import { FabricGatewayRegistryEntry } from '../../src/fabric/FabricGatewayRegistryEntry';
import { FabricGatewayRegistry } from '../../src/fabric/FabricGatewayRegistry';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { FabricJavaDebugConfigurationProvider } from '../../src/debug/FabricJavaDebugConfigurationProvider';
import { FabricRuntimeUtil } from '../../src/fabric/FabricRuntimeUtil';
import { Reporter } from '../../src/util/Reporter';
import { ExtensionUtil } from '../../src/util/ExtensionUtil';
import { FabricEnvironmentManager } from '../../src/fabric/FabricEnvironmentManager';
import { FabricEnvironmentRegistryEntry } from '../../src/fabric/FabricEnvironmentRegistryEntry';
import { FabricWalletUtil } from '../../src/fabric/FabricWalletUtil';
import { ExtensionCommands } from '../../ExtensionCommands';

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
                name: 'Launch Smart Contract'
            }]);
        });

    });

    describe('resolveDebugConfiguration', () => {

        let mySandbox: sinon.SinonSandbox;
        let fabricDebugConfig: FabricJavaDebugConfigurationProvider;
        let workspaceFolder: any;
        let debugConfig: any;
        let runtimeStub: sinon.SinonStubbedInstance<FabricRuntime>;
        let packageEntry: PackageRegistryEntry;
        let mockRuntimeConnection: sinon.SinonStubbedInstance<FabricEnvironmentConnection>;
        let registryEntry: FabricGatewayRegistryEntry;
        let startDebuggingStub: sinon.SinonStub;
        let sendTelemetryEventStub: sinon.SinonStub;
        let showInputBoxStub: sinon.SinonStub;

        beforeEach(() => {
            mySandbox = sinon.createSandbox();
            fabricDebugConfig = new FabricJavaDebugConfigurationProvider();

            runtimeStub = sinon.createStubInstance(FabricRuntime);
            runtimeStub.getName.returns('localfabric');
            runtimeStub.getPeerChaincodeURL.resolves('grpc://127.0.0.1:54321');
            runtimeStub.isRunning.resolves(true);
            runtimeStub.getGateways.resolves([{name: 'myGateway', path: 'myPath'}]);

            registryEntry = new FabricGatewayRegistryEntry();
            registryEntry.name = FabricRuntimeUtil.LOCAL_FABRIC;
            registryEntry.connectionProfilePath = 'myPath';
            registryEntry.managedRuntime = true;

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

            mockRuntimeConnection = sinon.createStubInstance(FabricEnvironmentConnection);
            mockRuntimeConnection.connect.resolves();
            mockRuntimeConnection.getAllPeerNames.resolves('peerOne');

            const instantiatedChaincodes: { name: string, version: string }[] = [{ name: 'myOtherContract', version: 'vscode-debug-13232112018' }, { name: 'cake-network', version: 'vscode-debug-174758735087' }];
            mockRuntimeConnection.getAllInstantiatedChaincodes.resolves(instantiatedChaincodes);

            mySandbox.stub(FabricEnvironmentManager.instance(), 'getConnection').returns(mockRuntimeConnection);

            startDebuggingStub = mySandbox.stub(vscode.debug, 'startDebugging');

            showInputBoxStub = mySandbox.stub(UserInputUtil, 'showInputBox').withArgs('Enter a name for your Java package').resolves('mySmartContract');
            showInputBoxStub.withArgs('Enter a version for your Java package').resolves('0.0.1');

            sendTelemetryEventStub = mySandbox.stub(Reporter.instance(), 'sendTelemetryEvent');

            mySandbox.stub(ExtensionUtil, 'getExtensionContext').returns({
                globalState: {
                    get: mySandbox.stub().returns({
                        generatorVersion: '0.0.36'
                    })
                }
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
                env: {
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:0.0.1`,
                    EXTENSION_COMMAND: ExtensionCommands.INSTANTIATE_SMART_CONTRACT
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
                env: {
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:0.0.1`,
                    EXTENSION_COMMAND: ExtensionCommands.INSTANTIATE_SMART_CONTRACT
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
                env: {
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:0.0.1`,
                    EXTENSION_COMMAND: ExtensionCommands.INSTANTIATE_SMART_CONTRACT
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
                env: {
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:0.0.1`,
                    EXTENSION_COMMAND: ExtensionCommands.INSTANTIATE_SMART_CONTRACT
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
                env: {
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:0.0.1`,
                    EXTENSION_COMMAND: ExtensionCommands.INSTANTIATE_SMART_CONTRACT
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
