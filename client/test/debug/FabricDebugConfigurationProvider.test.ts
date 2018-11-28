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
import { FabricDebugConfigurationProvider } from '../../src/debug/FabricDebugConfigurationProvider';
import { FabricRuntime } from '../../src/fabric/FabricRuntime';
import { FabricRuntimeManager } from '../../src/fabric/FabricRuntimeManager';
import { VSCodeOutputAdapter } from '../../src/logging/VSCodeOutputAdapter';
import { PackageRegistryEntry } from '../../src/packages/PackageRegistryEntry';
import { FabricRuntimeConnection } from '../../src/fabric/FabricRuntimeConnection';
import { FabricConnectionRegistryEntry } from '../../src/fabric/FabricConnectionRegistryEntry';
import { FabricConnectionRegistry } from '../../src/fabric/FabricConnectionRegistry';
import { FabricConnectionManager } from '../../src/fabric/FabricConnectionManager';

const should: Chai.Should = chai.should();
chai.use(sinonChai);

// tslint:disable no-unused-expression
describe('FabricDebugConfigurationProvider', () => {

    describe('resolveDebugConfiguration', () => {

        let mySandbox: sinon.SinonSandbox;
        let clock: sinon.SinonFakeTimers;
        let fabricDebugConfig: FabricDebugConfigurationProvider;
        let workspaceFolder: any;
        let debugConfig: any;
        let runtimeStub: sinon.SinonStubbedInstance<FabricRuntime>;
        let findFilesStub: sinon.SinonStub;
        let commandStub: sinon.SinonStub;
        let packageEntry: PackageRegistryEntry;
        let mockRuntimeConnection: sinon.SinonStubbedInstance<FabricRuntimeConnection>;
        let readFileStub: sinon.SinonStub;
        let registryEntry: FabricConnectionRegistryEntry;

        beforeEach(() => {
            mySandbox = sinon.createSandbox();
            clock = sinon.useFakeTimers({ toFake: ['Date'] });
            fabricDebugConfig = new FabricDebugConfigurationProvider();

            runtimeStub = sinon.createStubInstance(FabricRuntime);
            runtimeStub.getName.returns('localfabric');
            runtimeStub.getConnectionProfile.resolves({ peers: [{ name: 'peer1' }] });
            runtimeStub.getChaincodeAddress.resolves('127.0.0.1:54321');
            runtimeStub.isRunning.resolves(true);
            runtimeStub.isDevelopmentMode.returns(true);

            registryEntry = new FabricConnectionRegistryEntry();
            registryEntry.name = 'local_fabric';
            registryEntry.connectionProfilePath = 'myPath';
            registryEntry.managedRuntime = true;

            mySandbox.stub(FabricRuntimeManager.instance(), 'get').returns(runtimeStub);
            mySandbox.stub(FabricConnectionRegistry.instance(), 'get').returns(registryEntry);

            workspaceFolder = {
                name: 'myFolder',
                uri: vscode.Uri.file('myPath')
            };

            readFileStub = mySandbox.stub(fs, 'readFile').resolves(`{
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

            findFilesStub = mySandbox.stub(vscode.workspace, 'findFiles').resolves([]);

            commandStub = mySandbox.stub(vscode.commands, 'executeCommand');

            packageEntry = new PackageRegistryEntry();
            packageEntry.name = 'banana';
            packageEntry.version = 'vscode-13232112018';
            packageEntry.path = path.join('myPath');
            commandStub.withArgs('blockchainAPackageExplorer.packageSmartContractProjectEntry', sinon.match.any, sinon.match.any).resolves(packageEntry);
            commandStub.withArgs('blockchainExplorer.installSmartContractEntry', null, sinon.match.any).resolves();
            commandStub.withArgs('blockchainExplorer.connectEntry', sinon.match.any);

            mockRuntimeConnection = sinon.createStubInstance(FabricRuntimeConnection);
            mockRuntimeConnection.connect.resolves();
            mockRuntimeConnection.getAllPeerNames.resolves('peerOne');

            mySandbox.stub(FabricConnectionManager.instance(), 'getConnection').returns(mockRuntimeConnection);
        });

        afterEach(() => {
            clock.restore();
            mySandbox.restore();
        });

        it('should create a debug configuration', async () => {

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            config.should.deep.equal({
                type: 'node2',
                request: 'myLaunch',
                name: 'Launch Program',
                program: 'myProgram',
                cwd: 'myCwd',
                env: { CORE_CHAINCODE_ID_NAME: 'mySmartContract:vscode-debug-197001010000' },
                args: ['start', '--peer.address', 'localhost:12345']
            });
        });

        it('should add start arg if not in there', async () => {

            debugConfig.args = ['--peer.address', 'localhost:12345'];

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            config.should.deep.equal({
                type: 'node2',
                request: 'myLaunch',
                name: 'Launch Program',
                program: 'myProgram',
                cwd: 'myCwd',
                env: { CORE_CHAINCODE_ID_NAME: 'mySmartContract:vscode-debug-197001010000' },
                args: ['--peer.address', 'localhost:12345', 'start']
            });
        });

        it('should set program if not set', async () => {

            debugConfig.program = null;

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            config.should.deep.equal({
                type: 'node2',
                request: 'myLaunch',
                name: 'Launch Program',
                program: path.join(path.sep, 'myPath', 'node_modules', '.bin', 'fabric-chaincode-node'),
                cwd: 'myCwd',
                env: { CORE_CHAINCODE_ID_NAME: 'mySmartContract:vscode-debug-197001010000' },
                args: ['start', '--peer.address', 'localhost:12345']
            });
        });

        it('should add cwd if not set', async () => {

            debugConfig.cwd = null;

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            config.should.deep.equal({
                type: 'node2',
                request: 'myLaunch',
                name: 'Launch Program',
                program: 'myProgram',
                cwd: path.sep + 'myPath',
                env: { CORE_CHAINCODE_ID_NAME: 'mySmartContract:vscode-debug-197001010000' },
                args: ['start', '--peer.address', 'localhost:12345']
            });
        });

        it('should add in env properties if not defined', async () => {
            debugConfig.env = null;

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            config.should.deep.equal({
                type: 'node2',
                request: 'myLaunch',
                name: 'Launch Program',
                program: 'myProgram',
                cwd: 'myCwd',
                env: { CORE_CHAINCODE_ID_NAME: 'mySmartContract:vscode-debug-197001010000' },
                args: ['start', '--peer.address', 'localhost:12345']
            });
        });

        it('should add CORE_CHAINCODE_ID_NAME to an existing env', async () => {
            debugConfig.env = { myProperty: 'myValue' };

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            config.should.deep.equal({
                type: 'node2',
                request: 'myLaunch',
                name: 'Launch Program',
                program: 'myProgram',
                cwd: 'myCwd',
                env: { CORE_CHAINCODE_ID_NAME: 'mySmartContract:vscode-debug-197001010000', myProperty: 'myValue' },
                args: ['start', '--peer.address', 'localhost:12345']
            });
        });

        it('should use CORE_CHAINCODE_ID_NAME if defined', async () => {
            debugConfig.env = { CORE_CHAINCODE_ID_NAME: 'myContract:myVersion' };

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            config.should.deep.equal({
                type: 'node2',
                request: 'myLaunch',
                name: 'Launch Program',
                program: 'myProgram',
                cwd: 'myCwd',
                env: { CORE_CHAINCODE_ID_NAME: 'myContract:myVersion' },
                args: ['start', '--peer.address', 'localhost:12345']
            });
        });

        it('should add args if not defined', async () => {
            debugConfig.args = null;

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            config.should.deep.equal({
                type: 'node2',
                request: 'myLaunch',
                name: 'Launch Program',
                program: 'myProgram',
                cwd: 'myCwd',
                env: { CORE_CHAINCODE_ID_NAME: 'mySmartContract:vscode-debug-197001010000' },
                args: ['start', '--peer.address', '127.0.0.1:54321']
            });
        });

        it('should add more args if some args exist', async () => {
            debugConfig.args = ['--myArgs', 'myValue'];

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            config.should.deep.equal({
                type: 'node2',
                request: 'myLaunch',
                name: 'Launch Program',
                program: 'myProgram',
                cwd: 'myCwd',
                env: { CORE_CHAINCODE_ID_NAME: 'mySmartContract:vscode-debug-197001010000' },
                args: ['--myArgs', 'myValue', 'start', '--peer.address', '127.0.0.1:54321']
            });
        });

        it('should add in request if not defined', async () => {
            debugConfig.request = null;

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            config.should.deep.equal({
                type: 'node2',
                request: 'launch',
                name: 'Launch Program',
                program: 'myProgram',
                cwd: 'myCwd',
                env: { CORE_CHAINCODE_ID_NAME: 'mySmartContract:vscode-debug-197001010000' },
                args: ['start', '--peer.address', 'localhost:12345']
            });
        });

        it('should give an error if runtime isnt running', async () => {
            runtimeStub.isRunning.returns(false);

            const errorSpy: sinon.SinonSpy = mySandbox.spy(VSCodeOutputAdapter.instance(), 'error');
            const otherErrorSpy: sinon.SinonSpy = mySandbox.spy(vscode.window, 'showErrorMessage');

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);

            should.not.exist(config);

            errorSpy.should.have.been.calledWith('Please ensure "local_fabric" is running before trying to debug a smart contract');
            otherErrorSpy.should.have.been.calledWith('Please ensure "local_fabric" is running before trying to debug a smart contract');
        });

        it('should give an error if runtime isn\'t in development mode', async () => {
            runtimeStub.isDevelopmentMode.returns(false);

            const errorSpy: sinon.SinonSpy = mySandbox.spy(VSCodeOutputAdapter.instance(), 'error');
            const otherErrorSpy: sinon.SinonSpy = mySandbox.spy(vscode.window, 'showErrorMessage');

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);

            should.not.exist(config);

            errorSpy.should.have.been.calledWith('Please ensure "local_fabric" is in development mode before trying to debug a smart contract');
            otherErrorSpy.should.have.been.calledWith('Please ensure "local_fabric" is in development mode before trying to debug a smart contract');

        });

        it('should hand errors with package or install', async () => {
            commandStub.withArgs('blockchainAPackageExplorer.packageSmartContractProjectEntry', sinon.match.any, sinon.match.any).rejects({ message: 'some error' });

            const errorSpy: sinon.SinonSpy = mySandbox.spy(vscode.window, 'showErrorMessage');
            const outputSpy: sinon.SinonSpy = mySandbox.spy(VSCodeOutputAdapter.instance(), 'error');
            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);
            should.not.exist(config);

            errorSpy.should.have.been.calledWith('Failed to launch debug some error');
            outputSpy.should.have.been.calledWith('Failed to launch debug some error');
        });

        it('should debug typescript', async () => {
            findFilesStub.resolves([vscode.Uri.file('chaincode.ts')]);

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);

            config.should.deep.equal({
                type: 'node2',
                request: 'myLaunch',
                name: 'Launch Program',
                program: 'myProgram',
                cwd: 'myCwd',
                env: { CORE_CHAINCODE_ID_NAME: 'mySmartContract:vscode-debug-197001010000' },
                args: ['start', '--peer.address', 'localhost:12345'],
                outFiles: [path.join(workspaceFolder.uri.fsPath, '**/*.js')]
            });
        });

        it('should use the tsconfig for the configuration', async () => {

            findFilesStub.resolves([vscode.Uri.file('chaincode.ts')]);

            const fakeConfig: object = {
                compilerOptions: {
                    outDir: 'dist'
                }
            };

            readFileStub.onSecondCall().resolves(JSON.stringify(fakeConfig));

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);

            config.should.deep.equal({
                type: 'node2',
                request: 'myLaunch',
                name: 'Launch Program',
                program: 'myProgram',
                cwd: 'myCwd',
                env: { CORE_CHAINCODE_ID_NAME: 'mySmartContract:vscode-debug-197001010000' },
                args: ['start', '--peer.address', 'localhost:12345'],
                outFiles: [path.join(workspaceFolder.uri.fsPath, 'dist', '**/*.js')],
                preLaunchTask: 'tsc: build - tsconfig.json'
            });
        });

        it('should not update the directory if it is an absolute path', async () => {

            findFilesStub.resolves([vscode.Uri.file('chaincode.ts')]);

            const fakeConfig: object = {
                compilerOptions: {
                    outDir: path.join(__dirname, 'mypath')
                }
            };

            readFileStub.onSecondCall().resolves(JSON.stringify(fakeConfig));

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);

            config.should.deep.equal({
                type: 'node2',
                request: 'myLaunch',
                name: 'Launch Program',
                program: 'myProgram',
                cwd: 'myCwd',
                env: { CORE_CHAINCODE_ID_NAME: 'mySmartContract:vscode-debug-197001010000' },
                args: ['start', '--peer.address', 'localhost:12345'],
                outFiles: [path.join(workspaceFolder.uri.fsPath, '**/*.js')],
                preLaunchTask: 'tsc: build - tsconfig.json'
            });
        });

        it('should update path if not absolute path', async () => {

            findFilesStub.resolves([vscode.Uri.file('chaincode.ts')]);

            const fakeConfig: object = {
                compilerOptions: {
                    outDir: './dist'
                }
            };

            readFileStub.onSecondCall().resolves(JSON.stringify(fakeConfig));

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);

            config.should.deep.equal({
                type: 'node2',
                request: 'myLaunch',
                name: 'Launch Program',
                program: 'myProgram',
                cwd: 'myCwd',
                env: { CORE_CHAINCODE_ID_NAME: 'mySmartContract:vscode-debug-197001010000' },
                args: ['start', '--peer.address', 'localhost:12345'],
                outFiles: [path.join(workspaceFolder.uri.fsPath, 'dist', '**/*.js')],
                preLaunchTask: 'tsc: build - tsconfig.json'
            });
        });

        it('should add to outfile if already set', async () => {

            findFilesStub.resolves([vscode.Uri.file('chaincode.ts')]);

            debugConfig.outFiles = ['cake'];

            const fakeConfig: object = {
                compilerOptions: {
                    outDir: 'dist'
                }
            };

            readFileStub.onSecondCall().resolves(JSON.stringify(fakeConfig));

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);

            config.should.deep.equal({
                type: 'node2',
                request: 'myLaunch',
                name: 'Launch Program',
                program: 'myProgram',
                cwd: 'myCwd',
                env: { CORE_CHAINCODE_ID_NAME: 'mySmartContract:vscode-debug-197001010000' },
                args: ['start', '--peer.address', 'localhost:12345'],
                outFiles: ['cake', path.join(workspaceFolder.uri.fsPath, 'dist', '**/*.js')],
                preLaunchTask: 'tsc: build - tsconfig.json'
            });
        });

        it('should handle error from reading config file', async () => {
            findFilesStub.resolves([vscode.Uri.file('chaincode.ts')]);

            readFileStub.onSecondCall().rejects({ message: 'some error' });

            const errorSpy: sinon.SinonSpy = mySandbox.spy(VSCodeOutputAdapter.instance(), 'error');
            const otherErrorSpy: sinon.SinonSpy = mySandbox.spy(vscode.window, 'showErrorMessage');

            const config: vscode.DebugConfiguration = await fabricDebugConfig.resolveDebugConfiguration(workspaceFolder, debugConfig);

            should.not.exist(config);

            errorSpy.should.have.been.calledWith('Failed to launch debug error reading package.json from project some error');
            otherErrorSpy.should.have.been.calledWith('Failed to launch debug error reading package.json from project some error');
        });
    });

    describe('dispose', () => {
        it('should dispose the config', () => {
            const fabricDebugConfig: FabricDebugConfigurationProvider = new FabricDebugConfigurationProvider();
            try {
                fabricDebugConfig.dispose();
            } catch (error) {
                throw new Error('should not get here');
            }
        });
    });
});
