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
import { LocalEnvironmentManager } from '../../extension/fabric/environments/LocalEnvironmentManager';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { FabricEnvironmentConnection } from 'ibm-blockchain-platform-environment-v1';
import { FabricDebugConfigurationProvider } from '../../extension/debug/FabricDebugConfigurationProvider';
import { FabricChaincode, FabricEnvironmentRegistryEntry, FabricRuntimeUtil, LogType, FabricEnvironmentRegistry } from 'ibm-blockchain-platform-common';
import { FabricEnvironmentManager } from '../../extension/fabric/environments/FabricEnvironmentManager';
import { ExtensionCommands } from '../../ExtensionCommands';
import { TestUtil } from '../TestUtil';
import { SettingConfigurations } from '../../extension/configurations';
import { UserInputUtil } from '../../extension/commands/UserInputUtil';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';
import { LocalEnvironment } from '../../extension/fabric/environments/LocalEnvironment';

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

    let mySandbox: sinon.SinonSandbox;
    let getExtensionLocalFabricSetting: sinon.SinonStub;
    before(async () => {
        mySandbox = sinon.createSandbox();
        await TestUtil.setupTests(mySandbox);
        await TestUtil.setupLocalFabric();
    });
    describe('resolveDebugConfiguration', () => {
        let fabricDebugConfig: TestFabricDebugConfigurationProvider;
        let workspaceFolder: any;
        let debugConfig: any;
        let commandStub: sinon.SinonStub;
        let mockRuntimeConnection: sinon.SinonStubbedInstance<FabricEnvironmentConnection>;
        let getConnectionStub: sinon.SinonStub;
        let startDebuggingStub: sinon.SinonStub;
        let logSpy: sinon.SinonSpy;
        let getEnvironmentRegistryStub: sinon.SinonStub;
        let environmentRegistry: FabricEnvironmentRegistryEntry;
        let getName: sinon.SinonStub;
        let getPeerChaincodeURL: sinon.SinonStub;
        let isRunning: sinon.SinonStub;
        let killChaincode: sinon.SinonStub;
        let getGateways: sinon.SinonStub;
        beforeEach(async () => {
            getExtensionLocalFabricSetting = mySandbox.stub(ExtensionUtil, 'getExtensionLocalFabricSetting');
            getExtensionLocalFabricSetting.returns(true);

            fabricDebugConfig = new TestFabricDebugConfigurationProvider();

            getName = mySandbox.stub(LocalEnvironment.prototype, 'getName');
            getName.returns(FabricRuntimeUtil.LOCAL_FABRIC);
            getPeerChaincodeURL = mySandbox.stub(LocalEnvironment.prototype, 'getPeerChaincodeURL');
            getPeerChaincodeURL.resolves('grpc://127.0.0.1:54321');
            isRunning = mySandbox.stub(LocalEnvironment.prototype, 'isRunning');
            isRunning.resolves(true);
            killChaincode = mySandbox.stub(LocalEnvironment.prototype, 'killChaincode');
            killChaincode.resolves();
            getGateways = mySandbox.stub(LocalEnvironment.prototype, 'getGateways');
            getGateways.resolves([{name: 'myGateway', path: 'myPath'}]);
            mySandbox.stub(LocalEnvironmentManager.instance(), 'getRuntime').returns({
                getName,
                getPeerChaincodeURL,
                isRunning,
                killChaincode,
                getGateways
            });

            workspaceFolder = {
                name: 'myFolder',
                uri: vscode.Uri.file('myPath')
            };

            debugConfig = {
                type: 'fabric:fake',
                name: 'Launch Program'
            };

            commandStub = mySandbox.stub(vscode.commands, 'executeCommand');

            mockRuntimeConnection = mySandbox.createStubInstance(FabricEnvironmentConnection);
            mockRuntimeConnection.getAllPeerNames.resolves(['peerOne']);
            const instantiatedChaincodes: FabricChaincode[] = [{ name: 'myOtherContract', version: 'vscode-debug-13232112018' }, { name: 'cake-network', version: 'vscode-debug-174758735087' }];
            mockRuntimeConnection.getAllInstantiatedChaincodes.resolves(instantiatedChaincodes);

            getConnectionStub = mySandbox.stub(FabricEnvironmentManager.instance(), 'getConnection');
            getConnectionStub.returns(mockRuntimeConnection);

            environmentRegistry = await FabricEnvironmentRegistry.instance().get(FabricRuntimeUtil.LOCAL_FABRIC);

            getEnvironmentRegistryStub = mySandbox.stub(FabricEnvironmentManager.instance(), 'getEnvironmentRegistryEntry').returns(environmentRegistry);

            startDebuggingStub = mySandbox.stub(vscode.debug, 'startDebugging');
            logSpy = mySandbox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
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
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:0.0.1`
                },
                args: ['127.0.0.1:54321'],
                debugEvent: FabricDebugConfigurationProvider.debugEvent
            });
            commandStub.should.have.been.calledOnceWithExactly('setContext', 'blockchain-debug', true);
        });

        it('should create a new debug configuration if smart contract has a scoped name', async () => {
            const scopedDebugConfig: TestFabricDebugConfigurationProvider = new TestFabricDebugConfigurationProvider();
            scopedDebugConfig.chaincodeName = '@removeThis/mySmartContract';

            const config: vscode.DebugConfiguration = await scopedDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            startDebuggingStub.should.have.been.calledOnceWithExactly(sinon.match.any, {
                type: 'fake',
                request: 'launch',
                env: {
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:0.0.1`
                },
                args: ['127.0.0.1:54321'],
                debugEvent: FabricDebugConfigurationProvider.debugEvent
            });
            commandStub.should.have.been.calledOnceWithExactly('setContext', 'blockchain-debug', true);
        });

        it('should disconnect and connect to local fabric', async () => {
            const otherEnvironentRegistry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
            otherEnvironentRegistry.name = 'myFabric';
            otherEnvironentRegistry.managedRuntime = false;

            getEnvironmentRegistryStub.resetHistory();
            getEnvironmentRegistryStub.onFirstCall().returns(otherEnvironentRegistry);

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            startDebuggingStub.should.have.been.calledOnceWithExactly(sinon.match.any, {
                type: 'fake',
                request: 'launch',
                env: {
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:0.0.1`
                },
                args: ['127.0.0.1:54321'],
                debugEvent: FabricDebugConfigurationProvider.debugEvent
            });
            commandStub.should.have.been.calledWithExactly('setContext', 'blockchain-debug', true);
            commandStub.should.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            commandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistry);
        });

        it('should connect if no connection', async () => {
            getConnectionStub.resetHistory();
            getConnectionStub.onFirstCall().returns(undefined);
            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            startDebuggingStub.should.have.been.calledOnceWithExactly(sinon.match.any, {
                type: 'fake',
                request: 'launch',
                env: {
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:0.0.1`
                },
                args: ['127.0.0.1:54321'],
                debugEvent: FabricDebugConfigurationProvider.debugEvent
            });
            commandStub.should.have.been.calledWithExactly('setContext', 'blockchain-debug', true);
            commandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistry);
        });

        it('should add in env properties if not defined', async () => {
            debugConfig.env = null;

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            startDebuggingStub.should.have.been.calledOnceWithExactly(sinon.match.any, {
                type: 'fake',
                request: 'launch',
                env: {
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:0.0.1`
                },
                args: ['127.0.0.1:54321'],
                debugEvent: FabricDebugConfigurationProvider.debugEvent
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
                    myProperty: 'myValue'
                },
                args: ['127.0.0.1:54321'],
                debugEvent: FabricDebugConfigurationProvider.debugEvent
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
                args: ['127.0.0.1:54321'],
                debugEvent: FabricDebugConfigurationProvider.debugEvent
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
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:0.0.1`
                },
                args: ['127.0.0.1:54321'],
                debugEvent: FabricDebugConfigurationProvider.debugEvent
            });
            commandStub.should.have.been.calledOnceWithExactly('setContext', 'blockchain-debug', true);
        });

        it('should return if cannot connect', async () => {
            getConnectionStub.returns(undefined);
            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.not.exist(config);
            commandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistry);
        });

        it('should not run if the chaincode name is not provided', async () => {
            fabricDebugConfig.chaincodeName = undefined;

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            startDebuggingStub.should.not.have.been.called;
            commandStub.should.not.have.been.called;
        });

        it('should give an error if runtime isnt running', async () => {
            isRunning.returns(false);

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);

            should.not.exist(config);

            logSpy.should.have.been.calledOnceWithExactly(LogType.ERROR, `Please ensure "${FabricRuntimeUtil.LOCAL_FABRIC}" is running before trying to debug a smart contract`);
        });

        it('should restore from a previous debug session and use the last instantiated package of the same name', async () => {
            const instantiatedChaincodes: FabricChaincode[] = [{ name: 'mySmartContract', version: '0.0.1' }, { name: 'cake-network', version: '0.0.2' }];
            mockRuntimeConnection.getAllInstantiatedChaincodes.resolves(instantiatedChaincodes);

            isRunning.onFirstCall().resolves(true);
            isRunning.onSecondCall().resolves(false);
            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            startDebuggingStub.should.have.been.calledOnceWithExactly(sinon.match.any, {
                type: 'fake',
                request: 'launch',
                env: {
                    CORE_CHAINCODE_ID_NAME: `mySmartContract:0.0.1`
                },
                args: ['127.0.0.1:54321'],
                debugEvent: FabricDebugConfigurationProvider.debugEvent
            });

            isRunning.should.have.been.calledWith(['mySmartContract', '0.0.1']);
            killChaincode.should.not.have.been.called;
            commandStub.should.have.been.calledOnceWithExactly('setContext', 'blockchain-debug', true);
        });

        it('should kill the container if there is a container running with the smart contract already', async () => {
            const instantiatedChaincodes: FabricChaincode[] = [{ name: 'mySmartContract', version: '0.0.1' }, { name: 'cake-network', version: '0.0.2' }];
            mockRuntimeConnection.getAllInstantiatedChaincodes.resolves(instantiatedChaincodes);

            isRunning.resolves(true);
            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            startDebuggingStub.should.have.been.calledOnceWithExactly(sinon.match.any, {
                type: 'fake',
                request: 'launch',
                env: {
                    CORE_CHAINCODE_ID_NAME: 'mySmartContract:0.0.1'
                },
                args: ['127.0.0.1:54321'],
                debugEvent: FabricDebugConfigurationProvider.debugEvent
            });

            killChaincode.should.have.been.called;

            commandStub.should.have.been.calledOnceWithExactly('setContext', 'blockchain-debug', true);
        });

        it('should handle errors with the debug session failing to start', async () => {
            const error: Error = new Error('whoops - failed');
            commandStub.withArgs('setContext', 'blockchain-debug', true).rejects(error);

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);

            logSpy.should.have.been.calledOnceWithExactly(LogType.ERROR, `Failed to launch debug: ${error.message}`);
        });

        it(`should error if ${FabricRuntimeUtil.LOCAL_FABRIC} is not enabled`, async () => {
            mySandbox.stub(UserInputUtil, 'showConfirmationWarningMessage').withArgs(`Toggling this feature will remove the world state and ledger data for the ${FabricRuntimeUtil.LOCAL_FABRIC} runtime. Do you want to continue?`).resolves(true);
            getExtensionLocalFabricSetting.returns(false);
            await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);

            logSpy.should.have.been.calledOnceWithExactly(LogType.ERROR, `Setting '${SettingConfigurations.EXTENSION_LOCAL_FABRIC}' must be set to 'true' to enable debugging.`);
        });
    });
});
