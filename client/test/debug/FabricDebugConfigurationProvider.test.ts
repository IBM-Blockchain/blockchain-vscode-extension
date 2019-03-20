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
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';
import { PackageRegistryEntry } from '../../src/packages/PackageRegistryEntry';
import { FabricRuntimeConnection } from '../../src/fabric/FabricRuntimeConnection';
import { FabricGatewayRegistryEntry } from '../../src/fabric/FabricGatewayRegistryEntry';
import { FabricGatewayRegistry } from '../../src/fabric/FabricGatewayRegistry';
import { LogType } from '../../src/logging/OutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';
import * as dateFormat from 'dateformat';
import { FabricDebugConfigurationProvider } from '../../src/debug/FabricDebugConfigurationProvider';

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
            args: [ chaincodeAddress ]
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
        let packageEntry: PackageRegistryEntry;
        let mockRuntimeConnection: sinon.SinonStubbedInstance<FabricRuntimeConnection>;
        let registryEntry: FabricGatewayRegistryEntry;
        let getConnectionStub: sinon.SinonStub;
        let date: Date;
        let formattedDate: string;
        let startDebuggingStub: sinon.SinonStub;

        beforeEach(() => {
            mySandbox = sinon.createSandbox();
            clock = sinon.useFakeTimers({ toFake: ['Date'] });
            date = new Date();
            formattedDate = dateFormat(date, 'yyyymmddHHMM');
            fabricDebugConfig = new TestFabricDebugConfigurationProvider();

            runtimeStub = sinon.createStubInstance(FabricRuntime);
            runtimeStub.getName.returns('localfabric');
            runtimeStub.getConnectionProfile.resolves({ peers: [{ name: 'peer1' }] });
            runtimeStub.getChaincodeAddress.resolves('127.0.0.1:54321');
            runtimeStub.isRunning.resolves(true);
            runtimeStub.isDevelopmentMode.returns(true);

            registryEntry = new FabricGatewayRegistryEntry();
            registryEntry.name = 'local_fabric';
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
                type: 'fabric:fake',
                name: 'Launch Program'
            };

            mySandbox.stub(vscode.workspace, 'findFiles').resolves([]);

            commandStub = mySandbox.stub(vscode.commands, 'executeCommand');

            packageEntry = new PackageRegistryEntry();
            packageEntry.name = 'banana';
            packageEntry.version = 'vscode-13232112018';
            packageEntry.path = path.join('myPath');
            commandStub.withArgs(ExtensionCommands.PACKAGE_SMART_CONTRACT, sinon.match.any, sinon.match.any).resolves(packageEntry);
            commandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, null, sinon.match.any).resolves({
                name: 'test-package@0.0.1',
                path: 'some/path',
                version: '0.0.1'
            });
            commandStub.withArgs(ExtensionCommands.CONNECT, sinon.match.any);

            mockRuntimeConnection = sinon.createStubInstance(FabricRuntimeConnection);
            mockRuntimeConnection.connect.resolves();
            mockRuntimeConnection.getAllPeerNames.resolves('peerOne');

            getConnectionStub = mySandbox.stub(FabricRuntimeManager.instance(), 'getConnection').returns(mockRuntimeConnection);

            startDebuggingStub = mySandbox.stub(vscode.debug, 'startDebugging');
        });

        afterEach(() => {
            clock.restore();
            mySandbox.restore();
        });

        it('should create a debug configuration', async () => {
            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            startDebuggingStub.should.have.been.calledOnceWithExactly(sinon.match.any, {
                type: 'fake',
                request: 'launch',
                env: { CORE_CHAINCODE_ID_NAME: `mySmartContract:vscode-debug-${formattedDate}` },
                args: ['127.0.0.1:54321']
            });
            commandStub.callCount.should.equal(4);
            commandStub.should.have.been.calledWithExactly(ExtensionCommands.PACKAGE_SMART_CONTRACT, workspaceFolder, 'mySmartContract', `vscode-debug-${formattedDate}`);
            commandStub.should.have.been.calledWithExactly(ExtensionCommands.CONNECT, { managedRuntime: true, name: 'localfabric' });
            commandStub.should.have.been.calledWithExactly(ExtensionCommands.INSTALL_SMART_CONTRACT, null, new Set(['peerOne']), packageEntry);
            commandStub.should.have.been.calledWithExactly('setContext', 'blockchain-debug', true);
        });

        it('should add in env properties if not defined', async () => {
            debugConfig.env = null;

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            startDebuggingStub.should.have.been.calledOnceWithExactly(sinon.match.any, {
                type: 'fake',
                request: 'launch',
                env: { CORE_CHAINCODE_ID_NAME: `mySmartContract:vscode-debug-${formattedDate}` },
                args: ['127.0.0.1:54321']
            });
            commandStub.callCount.should.equal(4);
            commandStub.should.have.been.calledWithExactly(ExtensionCommands.PACKAGE_SMART_CONTRACT, workspaceFolder, 'mySmartContract', `vscode-debug-${formattedDate}`);
            commandStub.should.have.been.calledWithExactly(ExtensionCommands.CONNECT, { managedRuntime: true, name: 'localfabric' });
            commandStub.should.have.been.calledWithExactly(ExtensionCommands.INSTALL_SMART_CONTRACT, null, new Set(['peerOne']), packageEntry);
            commandStub.should.have.been.calledWithExactly('setContext', 'blockchain-debug', true);
        });

        it('should add CORE_CHAINCODE_ID_NAME to an existing env', async () => {
            debugConfig.env = { myProperty: 'myValue' };

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            startDebuggingStub.should.have.been.calledOnceWithExactly(sinon.match.any, {
                type: 'fake',
                request: 'launch',
                env: { CORE_CHAINCODE_ID_NAME: `mySmartContract:vscode-debug-${formattedDate}`, myProperty: 'myValue' },
                args: ['127.0.0.1:54321']
            });
            commandStub.callCount.should.equal(4);
            commandStub.should.have.been.calledWithExactly(ExtensionCommands.PACKAGE_SMART_CONTRACT, workspaceFolder, 'mySmartContract', `vscode-debug-${formattedDate}`);
            commandStub.should.have.been.calledWithExactly(ExtensionCommands.CONNECT, { managedRuntime: true, name: 'localfabric' });
            commandStub.should.have.been.calledWithExactly(ExtensionCommands.INSTALL_SMART_CONTRACT, null, new Set(['peerOne']), packageEntry);
            commandStub.should.have.been.calledWithExactly('setContext', 'blockchain-debug', true);
        });

        it('should use CORE_CHAINCODE_ID_NAME if defined', async () => {
            debugConfig.env = { CORE_CHAINCODE_ID_NAME: 'myContract:myVersion' };

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.equal(config, undefined);
            startDebuggingStub.should.have.been.calledOnceWithExactly(sinon.match.any, {
                type: 'fake',
                request: 'launch',
                env: { CORE_CHAINCODE_ID_NAME: `myContract:myVersion` },
                args: ['127.0.0.1:54321']
            });
            commandStub.callCount.should.equal(4);
            commandStub.should.have.been.calledWithExactly(ExtensionCommands.PACKAGE_SMART_CONTRACT, workspaceFolder, 'myContract', 'myVersion');
            commandStub.should.have.been.calledWithExactly(ExtensionCommands.CONNECT, { managedRuntime: true, name: 'localfabric' });
            commandStub.should.have.been.calledWithExactly(ExtensionCommands.INSTALL_SMART_CONTRACT, null, new Set(['peerOne']), packageEntry);
            commandStub.should.have.been.calledWithExactly('setContext', 'blockchain-debug', true);
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

            const logSpy: sinon.SinonSpy = mySandbox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);

            should.not.exist(config);

            logSpy.should.have.been.calledWith(LogType.ERROR, 'Please ensure "local_fabric" is running before trying to debug a smart contract');
        });

        it('should give an error if runtime isn\'t in development mode', async () => {
            runtimeStub.isDevelopmentMode.returns(false);

            const logSpy: sinon.SinonSpy = mySandbox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);

            should.not.exist(config);

            logSpy.should.have.been.calledWith(LogType.ERROR, `Please ensure "local_fabric" is in development mode before trying to debug a smart contract`);
        });

        it('should handle errors with packaging', async () => {
            commandStub.withArgs(ExtensionCommands.PACKAGE_SMART_CONTRACT, sinon.match.any, sinon.match.any).resolves();

            const logSpy: sinon.SinonSpy = mySandbox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.not.exist(config);

            logSpy.should.not.have.been.called;
        });

        it('should handle errors with installing', async () => {
            commandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT, sinon.match.any, sinon.match.any, sinon.match.any).resolves();

            const logSpy: sinon.SinonSpy = mySandbox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.not.exist(config);

            logSpy.should.not.have.been.called;
        });

        it('should handle connecting failing', async () => {
            getConnectionStub.returns(undefined);

            const logSpy: sinon.SinonSpy = mySandbox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.not.exist(config);

            logSpy.should.not.have.been.called;
        });

        it('should handle errors with installing', async () => {
            commandStub.withArgs(ExtensionCommands.PACKAGE_SMART_CONTRACT, sinon.match.any, sinon.match.any).rejects({message: 'some error'});

            const logSpy: sinon.SinonSpy = mySandbox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.not.exist(config);

            logSpy.should.have.been.calledWith(LogType.ERROR, 'Failed to launch debug: some error');
        });
    });
});
