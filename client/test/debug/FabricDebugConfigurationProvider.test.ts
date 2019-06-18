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
import { FabricRuntime } from '../../src/fabric/FabricRuntime';
import { FabricRuntimeManager } from '../../src/fabric/FabricRuntimeManager';
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';
import { FabricRuntimeConnection } from '../../src/fabric/FabricRuntimeConnection';
import { LogType } from '../../src/logging/OutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';
import * as dateFormat from 'dateformat';
import { FabricDebugConfigurationProvider } from '../../src/debug/FabricDebugConfigurationProvider';
import { FabricRuntimeUtil } from '../../src/fabric/FabricRuntimeUtil';
import { ExtensionUtil } from '../../src/util/ExtensionUtil';

const should: Chai.Should = chai.should();
chai.use(sinonChai);

class TestFabricDebugConfigurationProvider extends FabricDebugConfigurationProvider {

    public chaincodeName: string = 'mySmartContract';

    protected async getChaincodeName(): Promise<string> {
        return this.chaincodeName;
    }

    protected async resolveDebugConfigurationInner(folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration): Promise<vscode.DebugConfiguration> {
        const chaincodeAddress: string = await this.getChaincodeAddress();
        return Object.assign(config, {
            type: 'fake',
            name: 'Fake Debug' + folder.name,
            request: 'launch',
            args: [chaincodeAddress]
        });
    }

}

// tslint:disable no-unused-expression
describe('FabricDebugConfigurationProvider', () => {

    describe('resolveDebugConfiguration', () => {

        let mySandbox: sinon.SinonSandbox;
        let clock: sinon.SinonFakeTimers;
        let fabricDebugConfig: TestFabricDebugConfigurationProvider;
        let workspaceFolder: any;
        let debugConfig: any;
        let runtimeStub: sinon.SinonStubbedInstance<FabricRuntime>;
        let commandStub: sinon.SinonStub;
        let mockRuntimeConnection: sinon.SinonStubbedInstance<FabricRuntimeConnection>;
        let getConnectionStub: sinon.SinonStub;
        let date: Date;
        let formattedDate: string;
        let startDebuggingStub: sinon.SinonStub;
        let newDebugVersionStub: sinon.SinonStub;
        let logSpy: sinon.SinonSpy;
        let generatorVersionStub: sinon.SinonStub;

        beforeEach(() => {
            mySandbox = sinon.createSandbox();
            clock = sinon.useFakeTimers({ toFake: ['Date'] });
            date = new Date();
            formattedDate = dateFormat(date, 'yyyymmddHHMMss');
            newDebugVersionStub = mySandbox.stub(ExtensionUtil, 'getNewDebugVersion');
            newDebugVersionStub.returns(`vscode-debug-${formattedDate}`);
            fabricDebugConfig = new TestFabricDebugConfigurationProvider();

            runtimeStub = sinon.createStubInstance(FabricRuntime);
            runtimeStub.getName.returns('localfabric');
            runtimeStub.getPeerChaincodeURL.resolves('grpc://127.0.0.1:54321');
            runtimeStub.isRunning.resolves(true);
            runtimeStub.isDevelopmentMode.returns(true);

            mySandbox.stub(FabricRuntimeManager.instance(), 'getRuntime').returns(runtimeStub);

            workspaceFolder = {
                name: 'myFolder',
                uri: vscode.Uri.file('myPath')
            };

            debugConfig = {
                type: 'fabric:fake',
                name: 'Launch Program'
            };

            commandStub = mySandbox.stub(vscode.commands, 'executeCommand');

            mockRuntimeConnection = sinon.createStubInstance(FabricRuntimeConnection);
            mockRuntimeConnection.getAllPeerNames.resolves(['peerOne']);
            const instantiatedChaincodes: { name: string, version: string }[] = [{ name: 'myOtherContract', version: 'vscode-debug-13232112018' }, { name: 'cake-network', version: 'vscode-debug-174758735087' }];
            mockRuntimeConnection.getAllInstantiatedChaincodes.resolves(instantiatedChaincodes);

            getConnectionStub = mySandbox.stub(FabricRuntimeManager.instance(), 'getConnection');
            getConnectionStub.returns(mockRuntimeConnection);

            startDebuggingStub = mySandbox.stub(vscode.debug, 'startDebugging');
            logSpy = mySandbox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');

            generatorVersionStub = mySandbox.stub(ExtensionUtil, 'getExtensionContext').returns({
                globalState: {
                    get: mySandbox.stub().returns({
                        generatorVersion: '0.0.33'
                    })
                }
            });
        });

        afterEach(() => {
            clock.restore();
            mySandbox.restore();
        });

        it('should create a new debug configuration', async () => {
            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            startDebuggingStub.should.have.been.calledOnceWithExactly(sinon.match.any, {
                type: 'fake',
                request: 'launch',
                env: {
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:vscode-debug-${formattedDate}`
                },
                args: ['127.0.0.1:54321']
            });
            commandStub.should.have.been.calledOnceWithExactly('setContext', 'blockchain-debug', true);
        });

        it('should add in env properties if not defined', async () => {
            debugConfig.env = null;

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            startDebuggingStub.should.have.been.calledOnceWithExactly(sinon.match.any, {
                type: 'fake',
                request: 'launch',
                env: {
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:vscode-debug-${formattedDate}`
                },
                args: ['127.0.0.1:54321']
            });
            commandStub.should.have.been.calledOnceWithExactly('setContext', 'blockchain-debug', true);
        });

        it('should add CORE_CHAINCODE_ID_NAME to an existing env', async () => {
            debugConfig.env = { myProperty: 'myValue' };

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            startDebuggingStub.should.have.been.calledOnceWithExactly(sinon.match.any, {
                type: 'fake',
                request: 'launch',
                env: {
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:vscode-debug-${formattedDate}`,
                    myProperty: 'myValue'
                },
                args: ['127.0.0.1:54321']
            });
            commandStub.should.have.been.calledOnceWithExactly('setContext', 'blockchain-debug', true);
        });

        it('should use CORE_CHAINCODE_ID_NAME if defined', async () => {
            debugConfig.env = { CORE_CHAINCODE_ID_NAME: 'mySmartContract:myVersion' };

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            startDebuggingStub.should.have.been.calledOnceWithExactly(sinon.match.any, {
                type: 'fake',
                request: 'launch',
                env: {
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:myVersion`
                },
                args: ['127.0.0.1:54321']
            });
            commandStub.should.have.been.calledOnceWithExactly('setContext', 'blockchain-debug', true);
        });

        it('should use CORE_CHAINCODE_EXECUTETIMEOUT if defined', async () => {
            debugConfig.env = { CORE_CHAINCODE_EXECUTETIMEOUT: '10s' };

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            startDebuggingStub.should.have.been.calledOnceWithExactly(sinon.match.any, {
                type: 'fake',
                request: 'launch',
                env: {
                    CORE_CHAINCODE_EXECUTETIMEOUT: '10s',
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:vscode-debug-${formattedDate}`
                },
                args: ['127.0.0.1:54321']
            });
            commandStub.should.have.been.calledOnceWithExactly('setContext', 'blockchain-debug', true);
        });

        it('should give an error if generator version is too old', async () => {
            generatorVersionStub.returns({
                globalState: {
                    get: mySandbox.stub().returns({
                        generatorVersion: '0.0.32'
                    })
                }
            });

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            startDebuggingStub.should.not.have.been.called;
            commandStub.should.not.have.been.called;
            logSpy.should.have.been.calledWith(LogType.ERROR, 'To debug a smart contract, you must update the local Fabric runtime. Teardown and start the local Fabric runtime, and try again.', 'To debug a smart contract, you must update the local Fabric runtime. Teardown and start the local Fabric runtime, and try again.');
        });

        it('should not run if the chaincode name is not provided', async () => {
            fabricDebugConfig.chaincodeName = undefined;

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            startDebuggingStub.should.not.have.been.called;
            commandStub.should.not.have.been.called;
        });

        it('should give an error if runtime isnt running', async () => {
            runtimeStub.isRunning.returns(false);

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);

            should.not.exist(config);

            logSpy.should.have.been.calledOnceWithExactly(LogType.ERROR, `Please ensure "${FabricRuntimeUtil.LOCAL_FABRIC}" is running before trying to debug a smart contract`);
        });

        it('should give an error if runtime isn\'t in development mode and allow the user to chose to run the toggle dev mode comand', async () => {
            runtimeStub.isDevelopmentMode.onCall(0).returns(false);
            mySandbox.stub(vscode.window, 'showErrorMessage').resolves('Toggle development mode');
            commandStub.withArgs(ExtensionCommands.TOGGLE_FABRIC_DEV_MODE).resolves();

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            startDebuggingStub.should.have.been.calledOnceWithExactly(sinon.match.any, {
                type: 'fake',
                request: 'launch',
                env: {
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:vscode-debug-${formattedDate}`
                },
                args: ['127.0.0.1:54321']
            });
            commandStub.should.have.been.calledWithExactly('setContext', 'blockchain-debug', true);
            commandStub.should.have.been.calledWithExactly(ExtensionCommands.TOGGLE_FABRIC_DEV_MODE);
        });

        it('should give an error if runtime isn\'t in development mode and handle the user not selected to run the toggle command', async () => {
            runtimeStub.isDevelopmentMode.onCall(0).returns(false);
            const errorMessageStub: sinon.SinonStub = mySandbox.stub(vscode.window, 'showErrorMessage').resolves(undefined);

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            errorMessageStub.should.have.been.calledOnce;
            startDebuggingStub.should.not.have.been.called;
            commandStub.should.not.have.been.calledWith(ExtensionCommands.TOGGLE_FABRIC_DEV_MODE);
        });

        it('should handle toggling dev mode failing', async () => {
            runtimeStub.isDevelopmentMode.returns(false);
            mySandbox.stub(vscode.window, 'showErrorMessage').resolves('Toggle development mode');
            commandStub.withArgs(ExtensionCommands.TOGGLE_FABRIC_DEV_MODE).resolves();

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            startDebuggingStub.should.not.have.been.called;
            commandStub.should.have.been.calledOnceWithExactly(ExtensionCommands.TOGGLE_FABRIC_DEV_MODE);

            logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, `The ${FabricRuntimeUtil.LOCAL_FABRIC} peer is not in development mode`);
            logSpy.getCall(1).should.have.been.calledWithExactly(LogType.ERROR, `Failed to toggle development mode`, `Failed to toggle development mode`);
        });

        it('should restore from a previous debug session and use the last instantiated debug package of the same name', async () => {
            const instantiatedChaincodes: { name: string, version: string }[] = [{ name: 'mySmartContract', version: 'vscode-debug-13232112018' }, { name: 'cake-network', version: '0.0.2' }];
            mockRuntimeConnection.getAllInstantiatedChaincodes.resolves(instantiatedChaincodes);

            runtimeStub.isRunning.onFirstCall().resolves(true);
            runtimeStub.isRunning.onSecondCall().resolves(false);
            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            startDebuggingStub.should.have.been.calledOnceWithExactly(sinon.match.any, {
                type: 'fake',
                request: 'launch',
                env: {
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:vscode-debug-13232112018`
                },
                args: ['127.0.0.1:54321']
            });

            runtimeStub.isRunning.should.have.been.calledWith(['mySmartContract', 'vscode-debug-13232112018']);
            commandStub.should.have.been.calledOnceWithExactly('setContext', 'blockchain-debug', true);
        });

        it('should create a new version if there is a container running with the smart contract already', async () => {
            const instantiatedChaincodes: { name: string, version: string }[] = [{ name: 'mySmartContract', version: 'vscode-debug-13232112018' }, { name: 'cake-network', version: '0.0.2' }];
            mockRuntimeConnection.getAllInstantiatedChaincodes.resolves(instantiatedChaincodes);

            runtimeStub.isRunning.resolves(true);
            newDebugVersionStub.returns('debug-version-123456');
            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            startDebuggingStub.should.have.been.calledOnceWithExactly(sinon.match.any, {
                type: 'fake',
                request: 'launch',
                env: {
                    CORE_CHAINCODE_ID_NAME: 'mySmartContract:debug-version-123456',
                    OLD_CHAINCODE_VERSION: 'debug-version-123456'
                },
                args: ['127.0.0.1:54321']
            });

            commandStub.should.have.been.calledOnceWithExactly('setContext', 'blockchain-debug', true);
        });

        it('should create a new debug session if a debug package of the smart contract isn\'t installed already', async () => {
            const chaincodeMap: Map<string, Array<string>> = new Map<string, Array<string>>();
            chaincodeMap.set('mySmartContract', ['0.0.1', '0.0.2']);
            chaincodeMap.set('cake-network', ['vscode-debug-174758735087']);
            chaincodeMap.set('mySmartContract', ['001']);
            mockRuntimeConnection.getInstalledChaincode.resolves(chaincodeMap);

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            startDebuggingStub.should.have.been.calledOnceWithExactly(sinon.match.any, {
                type: 'fake',
                request: 'launch',
                env: {
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:vscode-debug-${formattedDate}`
                },
                args: ['127.0.0.1:54321']
            });
            commandStub.should.have.been.calledOnceWithExactly('setContext', 'blockchain-debug', true);
        });

        it('should handle errors with the debug session failing to start', async () => {
            const error: Error = new Error('whoops - failed');
            commandStub.withArgs('setContext', 'blockchain-debug', true).rejects(error);

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);

            logSpy.should.have.been.calledOnceWithExactly(LogType.ERROR, `Failed to launch debug: ${error.message}`);

        });
    });
});
