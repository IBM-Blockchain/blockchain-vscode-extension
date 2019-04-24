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
import { FabricRuntimeConnection } from '../../src/fabric/FabricRuntimeConnection';
import { FabricGatewayRegistryEntry } from '../../src/fabric/FabricGatewayRegistryEntry';
import { FabricGatewayRegistry } from '../../src/fabric/FabricGatewayRegistry';
import { ExtensionCommands } from '../../ExtensionCommands';
import * as dateFormat from 'dateformat';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { FabricRuntimeUtil } from '../../src/fabric/FabricRuntimeUtil';

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
        let clock: sinon.SinonFakeTimers;
        let fabricDebugConfig: FabricNodeDebugConfigurationProvider;
        let workspaceFolder: any;
        let debugConfig: any;
        let runtimeStub: sinon.SinonStubbedInstance<FabricRuntime>;
        let commandStub: sinon.SinonStub;
        let packageEntry: PackageRegistryEntry;
        let mockRuntimeConnection: sinon.SinonStubbedInstance<FabricRuntimeConnection>;
        let registryEntry: FabricGatewayRegistryEntry;
        let date: Date;
        let formattedDate: string;
        let startDebuggingStub: sinon.SinonStub;

        beforeEach(() => {
            mySandbox = sinon.createSandbox();
            clock = sinon.useFakeTimers({ toFake: ['Date'] });
            date = new Date();
            formattedDate = dateFormat(date, 'yyyymmddHHMMss');
            fabricDebugConfig = new FabricNodeDebugConfigurationProvider();

            runtimeStub = sinon.createStubInstance(FabricRuntime);
            runtimeStub.getName.returns('localfabric');
            runtimeStub.getPeerChaincodeURL.resolves('127.0.0.1:54321');
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
                type: 'fabric:node',
                name: 'Launch Program'
            };

            debugConfig.request = 'myLaunch';
            debugConfig.program = 'myProgram';
            debugConfig.cwd = 'myCwd';
            debugConfig.args = ['start', '--peer.address', 'localhost:12345'];

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

            mySandbox.stub(FabricRuntimeManager.instance(), 'getConnection').returns(mockRuntimeConnection);

            startDebuggingStub = mySandbox.stub(vscode.debug, 'startDebugging');

            mySandbox.stub(UserInputUtil, 'packageAndInstallQuestion').resolves({
                label: 'Yes',
                data: true,
                description: `Create a new debug package and install`
            });
        });

        afterEach(() => {
            clock.restore();
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
                env: { CORE_CHAINCODE_ID_NAME: `mySmartContract:vscode-debug-${formattedDate}`, CORE_CHAINCODE_EXECUTETIMEOUT: '540s' },
                args: ['start', '--peer.address', 'localhost:12345']
            });
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
                env: { CORE_CHAINCODE_ID_NAME: `mySmartContract:vscode-debug-${formattedDate}`, CORE_CHAINCODE_EXECUTETIMEOUT: '540s' },
                args: ['--peer.address', 'localhost:12345', 'start']
            });
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
                env: { CORE_CHAINCODE_ID_NAME: `mySmartContract:vscode-debug-${formattedDate}`, CORE_CHAINCODE_EXECUTETIMEOUT: '540s' },
                args: ['start', '--peer.address', 'localhost:12345']
            });
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
                env: { CORE_CHAINCODE_ID_NAME: `mySmartContract:vscode-debug-${formattedDate}`, CORE_CHAINCODE_EXECUTETIMEOUT: '540s' },
                args: ['start', '--peer.address', 'localhost:12345']
            });
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
                env: { CORE_CHAINCODE_ID_NAME: `mySmartContract:vscode-debug-${formattedDate}`, CORE_CHAINCODE_EXECUTETIMEOUT: '540s' },
                args: ['start', '--peer.address', '127.0.0.1:54321']
            });
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
                env: { CORE_CHAINCODE_ID_NAME: `mySmartContract:vscode-debug-${formattedDate}`, CORE_CHAINCODE_EXECUTETIMEOUT: '540s' },
                args: ['--myArgs', 'myValue', 'start', '--peer.address', '127.0.0.1:54321']
            });
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
                env: { CORE_CHAINCODE_ID_NAME: `mySmartContract:vscode-debug-${formattedDate}`, CORE_CHAINCODE_EXECUTETIMEOUT: '540s' },
                args: ['start', '--peer.address', 'localhost:12345']
            });
        });
    });
});
