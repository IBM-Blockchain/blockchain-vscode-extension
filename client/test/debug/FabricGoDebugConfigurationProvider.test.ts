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
import { FabricRuntimeConnection } from '../../src/fabric/FabricRuntimeConnection';
import { FabricGatewayRegistryEntry } from '../../src/fabric/FabricGatewayRegistryEntry';
import { FabricGatewayRegistry } from '../../src/fabric/FabricGatewayRegistry';
import * as dateFormat from 'dateformat';
import { FabricGoDebugConfigurationProvider } from '../../src/debug/FabricGoDebugConfigurationProvider';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { FabricRuntimeUtil } from '../../src/fabric/FabricRuntimeUtil';
import { Reporter } from '../../src/util/Reporter';
import { ExtensionUtil } from '../../src/util/ExtensionUtil';

const should: Chai.Should = chai.should();
chai.use(sinonChai);

// tslint:disable no-unused-expression
describe('FabricGoDebugConfigurationProvider', () => {

    describe('provideDebugConfigurations', () => {

        it('should provide a debug configuration', async () => {
            const provider: FabricGoDebugConfigurationProvider = new FabricGoDebugConfigurationProvider();
            const config: any = await provider.provideDebugConfigurations();
            config.should.deep.equal([{
                type: 'fabric:go',
                request: 'launch',
                name: 'Launch Smart Contract'
            }]);
        });

    });

    describe('resolveDebugConfiguration', () => {

        let mySandbox: sinon.SinonSandbox;
        let clock: sinon.SinonFakeTimers;
        let fabricDebugConfig: FabricGoDebugConfigurationProvider;
        let workspaceFolder: any;
        let debugConfig: any;
        let runtimeStub: sinon.SinonStubbedInstance<FabricRuntime>;
        let packageEntry: PackageRegistryEntry;
        let mockRuntimeConnection: sinon.SinonStubbedInstance<FabricRuntimeConnection>;
        let registryEntry: FabricGatewayRegistryEntry;
        let date: Date;
        let formattedDate: string;
        let startDebuggingStub: sinon.SinonStub;
        let sendTelemetryEventStub: sinon.SinonStub;
        let newDebugVersionStub: sinon.SinonStub;

        beforeEach(() => {
            mySandbox = sinon.createSandbox();
            clock = sinon.useFakeTimers({ toFake: ['Date'] });
            date = new Date();
            formattedDate = dateFormat(date, 'yyyymmddHHMMss');
            newDebugVersionStub = mySandbox.stub(ExtensionUtil, 'getNewDebugVersion');
            newDebugVersionStub.resolves(`vscode-debug-${formattedDate}`);
            fabricDebugConfig = new FabricGoDebugConfigurationProvider();

            runtimeStub = sinon.createStubInstance(FabricRuntime);
            runtimeStub.getName.returns('localfabric');
            runtimeStub.getPeerChaincodeURL.resolves('grpc://127.0.0.1:54321');
            runtimeStub.isRunning.resolves(true);
            runtimeStub.isDevelopmentMode.returns(true);
            runtimeStub.getGateways.resolves([{name: 'myGateway', path: 'myPath'}]);

            registryEntry = new FabricGatewayRegistryEntry();
            registryEntry.name = FabricRuntimeUtil.LOCAL_FABRIC;
            registryEntry.connectionProfilePath = 'myPath';
            registryEntry.managedRuntime = true;

            mySandbox.stub(FabricRuntimeManager.instance(), 'getRuntime').returns(runtimeStub);
            mySandbox.stub(FabricGatewayRegistry.instance(), 'get').returns(registryEntry);

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
                type: 'fabric:go',
                name: 'Launch Program'
            };

            debugConfig.request = 'myLaunch';
            debugConfig.program = 'myProgram';
            debugConfig.cwd = 'myCwd';
            debugConfig.args = ['--peer.address', 'localhost:12345'];
            debugConfig.mode = 'auto';

            mySandbox.stub(vscode.workspace, 'findFiles').resolves([]);

            packageEntry = new PackageRegistryEntry();
            packageEntry.name = 'banana';
            packageEntry.version = 'vscode-13232112018';
            packageEntry.path = path.join('myPath');

            mockRuntimeConnection = sinon.createStubInstance(FabricRuntimeConnection);
            mockRuntimeConnection.connect.resolves();
            mockRuntimeConnection.getAllPeerNames.resolves('peerOne');

            const instantiatedChaincodes: { name: string, version: string }[] = [{ name: 'myOtherContract', version: 'vscode-debug-13232112018' }, { name: 'cake-network', version: 'vscode-debug-174758735087' }];
            mockRuntimeConnection.getAllInstantiatedChaincodes.resolves(instantiatedChaincodes);

            mySandbox.stub(FabricRuntimeManager.instance(), 'getConnection').returns(mockRuntimeConnection);

            startDebuggingStub = mySandbox.stub(vscode.debug, 'startDebugging');

            mySandbox.stub(UserInputUtil, 'showInputBox').withArgs('Enter a name for your Go package').resolves('mySmartContract');

            sendTelemetryEventStub = mySandbox.stub(Reporter.instance(), 'sendTelemetryEvent');

        });

        afterEach(() => {
            clock.restore();
            mySandbox.restore();
        });

        it('should create a debug configuration', async () => {

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            startDebuggingStub.should.have.been.calledOnceWithExactly(sinon.match.any, {
                type: 'go',
                mode: 'auto',
                request: 'myLaunch',
                program: 'myProgram',
                cwd: 'myCwd',
                env: {
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:vscode-debug-${formattedDate}`
                },
                args: ['--peer.address', 'localhost:12345']
            });
            sendTelemetryEventStub.should.have.been.calledWith('Smart Contract Debugged', {language: 'Go'});
        });

        it('should set mode if not set', async () => {

            debugConfig.mode = null;

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            startDebuggingStub.should.have.been.calledOnceWithExactly(sinon.match.any, {
                type: 'go',
                mode: 'auto',
                request: 'myLaunch',
                program: 'myProgram',
                cwd: 'myCwd',
                env: {
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:vscode-debug-${formattedDate}`
                },
                args: ['--peer.address', 'localhost:12345']
            });
            sendTelemetryEventStub.should.have.been.calledWith('Smart Contract Debugged', {language: 'Go'});
        });

        it('should set program if not set', async () => {

            debugConfig.program = null;

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            startDebuggingStub.should.have.been.calledOnceWithExactly(sinon.match.any, {
                type: 'go',
                mode: 'auto',
                request: 'myLaunch',
                program: path.join(path.sep, 'myPath'),
                cwd: 'myCwd',
                env: {
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:vscode-debug-${formattedDate}`
                },
                args: ['--peer.address', 'localhost:12345']
            });
            sendTelemetryEventStub.should.have.been.calledWith('Smart Contract Debugged', {language: 'Go'});
        });

        it('should add cwd if not set', async () => {

            debugConfig.cwd = null;

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            startDebuggingStub.should.have.been.calledOnceWithExactly(sinon.match.any, {
                type: 'go',
                mode: 'auto',
                request: 'myLaunch',
                program: 'myProgram',
                cwd: path.sep + 'myPath',
                env: {
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:vscode-debug-${formattedDate}`
                },
                args: ['--peer.address', 'localhost:12345']
            });
        });

        it('should add args if not defined', async () => {
            debugConfig.args = null;

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            startDebuggingStub.should.have.been.calledOnceWithExactly(sinon.match.any, {
                type: 'go',
                mode: 'auto',
                request: 'myLaunch',
                program: 'myProgram',
                cwd: 'myCwd',
                env: {
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:vscode-debug-${formattedDate}`
                },
                args: ['--peer.address', '127.0.0.1:54321']
            });
            sendTelemetryEventStub.should.have.been.calledWith('Smart Contract Debugged', {language: 'Go'});
        });

        it('should add more args if some args exist', async () => {
            debugConfig.args = ['--myArgs', 'myValue'];

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            startDebuggingStub.should.have.been.calledOnceWithExactly(sinon.match.any, {
                type: 'go',
                mode: 'auto',
                request: 'myLaunch',
                program: 'myProgram',
                cwd: 'myCwd',
                env: {
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:vscode-debug-${formattedDate}`
                },
                args: ['--myArgs', 'myValue', '--peer.address', '127.0.0.1:54321']
            });
            sendTelemetryEventStub.should.have.been.calledWith('Smart Contract Debugged', {language: 'Go'});
        });

        it('should add in request if not defined', async () => {
            debugConfig.request = null;

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            startDebuggingStub.should.have.been.calledOnceWithExactly(sinon.match.any, {
                type: 'go',
                mode: 'auto',
                request: 'launch',
                program: 'myProgram',
                cwd: 'myCwd',
                env: {
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:vscode-debug-${formattedDate}`
                },
                args: ['--peer.address', 'localhost:12345']
            });
            sendTelemetryEventStub.should.have.been.calledWith('Smart Contract Debugged', {language: 'Go'});
        });
    });
});
