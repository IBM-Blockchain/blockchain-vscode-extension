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
import { FabricDebugConfigurationProvider } from '../../src/debug/FabricDebugConfigurationProvider';
import { FabricRuntimeUtil } from '../../src/fabric/FabricRuntimeUtil';
import { ExtensionUtil } from '../../src/util/ExtensionUtil';
import { ExtensionCommands } from '../../ExtensionCommands';

const should: Chai.Should = chai.should();
chai.use(sinonChai);

class TestFabricDebugConfigurationProvider extends FabricDebugConfigurationProvider {

    public chaincodeName: string = 'mySmartContract';
    public chaincodeVersion: string = '0.0.1';

    protected async getChaincodeNameAndVersion(): Promise<{name: string, version: string}> {
        const version: string = this.chaincodeVersion;
        const name: string = this.chaincodeName;
        return {name, version};
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
        let fabricDebugConfig: TestFabricDebugConfigurationProvider;
        let workspaceFolder: any;
        let debugConfig: any;
        let runtimeStub: sinon.SinonStubbedInstance<FabricRuntime>;
        let commandStub: sinon.SinonStub;
        let mockRuntimeConnection: sinon.SinonStubbedInstance<FabricRuntimeConnection>;
        let getConnectionStub: sinon.SinonStub;
        let startDebuggingStub: sinon.SinonStub;
        let logSpy: sinon.SinonSpy;
        let generatorVersionStub: sinon.SinonStub;

        beforeEach(() => {
            mySandbox = sinon.createSandbox();

            fabricDebugConfig = new TestFabricDebugConfigurationProvider();

            runtimeStub = sinon.createStubInstance(FabricRuntime);
            runtimeStub.getName.returns('localfabric');
            runtimeStub.getPeerChaincodeURL.resolves('grpc://127.0.0.1:54321');
            runtimeStub.isRunning.resolves(true);
            runtimeStub.killChaincode.resolves();
            runtimeStub.getGateways.resolves([{name: 'myGateway', path: 'myPath'}]);

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
                        generatorVersion: '0.0.36'
                    })
                }
            });
        });

        afterEach(() => {
            mySandbox.restore();
        });

        it('should create a new debug configuration', async () => {
            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            startDebuggingStub.should.have.been.calledOnceWithExactly(sinon.match.any, {
                type: 'fake',
                request: 'launch',
                env: {
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:0.0.1`,
                    EXTENSION_COMMAND: ExtensionCommands.INSTANTIATE_SMART_CONTRACT
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
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:0.0.1`,
                    EXTENSION_COMMAND: ExtensionCommands.INSTANTIATE_SMART_CONTRACT
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
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:0.0.1`,
                    EXTENSION_COMMAND: ExtensionCommands.INSTANTIATE_SMART_CONTRACT,
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
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:myVersion`,
                    EXTENSION_COMMAND: ExtensionCommands.INSTANTIATE_SMART_CONTRACT,
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
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:0.0.1`,
                    EXTENSION_COMMAND: ExtensionCommands.INSTANTIATE_SMART_CONTRACT,
                },
                args: ['127.0.0.1:54321']
            });
            commandStub.should.have.been.calledOnceWithExactly('setContext', 'blockchain-debug', true);
        });

        it('should give an error if generator version is too old', async () => {
            generatorVersionStub.returns({
                globalState: {
                    get: mySandbox.stub().returns({
                        generatorVersion: '0.0.34'
                    })
                }
            });

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            startDebuggingStub.should.not.have.been.called;
            commandStub.should.not.have.been.called;
            logSpy.should.have.been.calledWith(LogType.ERROR, 'To debug a smart contract, you must update the Local Fabric runtime. Teardown and start the Local Fabric runtime, and try again.');
        });

        it('should give an error if generator version is unknown', async () => {
            generatorVersionStub.returns({
                globalState: {
                    get: mySandbox.stub().returns({
                        generatorVersion: undefined
                    })
                }
            });

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            startDebuggingStub.should.not.have.been.called;
            commandStub.should.not.have.been.called;
            logSpy.should.have.been.calledWith(LogType.ERROR, 'To debug a smart contract, you must update the Local Fabric runtime. Teardown and start the Local Fabric runtime, and try again.');
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

            logSpy.should.have.been.calledOnceWithExactly(LogType.ERROR, `Please ensure "${FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME}" is running before trying to debug a smart contract`);
        });

        it('should restore from a previous debug session and use the last instantiated package of the same name', async () => {
            const instantiatedChaincodes: { name: string, version: string }[] = [{ name: 'mySmartContract', version: '0.0.1' }, { name: 'cake-network', version: '0.0.2' }];
            mockRuntimeConnection.getAllInstantiatedChaincodes.resolves(instantiatedChaincodes);

            runtimeStub.isRunning.onFirstCall().resolves(true);
            runtimeStub.isRunning.onSecondCall().resolves(false);
            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            startDebuggingStub.should.have.been.calledOnceWithExactly(sinon.match.any, {
                type: 'fake',
                request: 'launch',
                env: {
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:0.0.1`
                },
                args: ['127.0.0.1:54321']
            });

            runtimeStub.isRunning.should.have.been.calledWith(['mySmartContract', '0.0.1']);
            runtimeStub.killChaincode.should.not.have.been.called;
            commandStub.should.have.been.calledOnceWithExactly('setContext', 'blockchain-debug', true);
        });

        it('should upgrade if package.json not the same as instantiated', async () => {
            const instantiatedChaincodes: { name: string, version: string }[] = [{ name: 'mySmartContract', version: '0.0.2' }, { name: 'cake-network', version: '0.0.2' }];
            mockRuntimeConnection.getAllInstantiatedChaincodes.resolves(instantiatedChaincodes);

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            startDebuggingStub.should.have.been.calledOnceWithExactly(sinon.match.any, {
                type: 'fake',
                request: 'launch',
                env: {
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:0.0.1`,
                    EXTENSION_COMMAND: ExtensionCommands.UPGRADE_SMART_CONTRACT,
                },
                args: ['127.0.0.1:54321']
            });

            runtimeStub.isRunning.should.have.been.calledWith(['mySmartContract', '0.0.2']);
            runtimeStub.killChaincode.should.have.been.called;
            commandStub.should.have.been.calledOnceWithExactly('setContext', 'blockchain-debug', true);
        });

        it('should upgrade if CORE_CHAINCODE_ID version not the same as instantiated', async () => {
            debugConfig.env = { CORE_CHAINCODE_ID_NAME: 'mySmartContract:myVersion' };
            const instantiatedChaincodes: { name: string, version: string }[] = [{ name: 'mySmartContract', version: '0.0.2' }, { name: 'cake-network', version: '0.0.2' }];
            mockRuntimeConnection.getAllInstantiatedChaincodes.resolves(instantiatedChaincodes);

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            startDebuggingStub.should.have.been.calledOnceWithExactly(sinon.match.any, {
                type: 'fake',
                request: 'launch',
                env: {
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:myVersion`,
                    EXTENSION_COMMAND: ExtensionCommands.UPGRADE_SMART_CONTRACT,
                },
                args: ['127.0.0.1:54321']
            });

            runtimeStub.isRunning.should.have.been.calledWith(['mySmartContract', '0.0.2']);
            runtimeStub.killChaincode.should.have.been.called;
            commandStub.should.have.been.calledOnceWithExactly('setContext', 'blockchain-debug', true);
        });

        it('should kill the container if there is a container running with the smart contract already', async () => {
            const instantiatedChaincodes: { name: string, version: string }[] = [{ name: 'mySmartContract', version: '0.0.1' }, { name: 'cake-network', version: '0.0.2' }];
            mockRuntimeConnection.getAllInstantiatedChaincodes.resolves(instantiatedChaincodes);

            runtimeStub.isRunning.resolves(true);
            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            startDebuggingStub.should.have.been.calledOnceWithExactly(sinon.match.any, {
                type: 'fake',
                request: 'launch',
                env: {
                    CORE_CHAINCODE_ID_NAME: 'mySmartContract:0.0.1',
                },
                args: ['127.0.0.1:54321']
            });

            runtimeStub.killChaincode.should.have.been.called;

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
