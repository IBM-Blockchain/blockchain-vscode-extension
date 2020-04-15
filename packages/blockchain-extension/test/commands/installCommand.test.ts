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
'use strict';
import * as vscode from 'vscode';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as path from 'path';
import { TestUtil } from '../TestUtil';
import { PackageRegistryEntry } from '../../extension/registries/PackageRegistryEntry';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';
import { VSCodeBlockchainDockerOutputAdapter } from '../../extension/logging/VSCodeBlockchainDockerOutputAdapter';
import { FabricEnvironmentConnection } from 'ibm-blockchain-platform-environment-v1';
import { FabricEnvironmentManager, ConnectedState } from '../../extension/fabric/environments/FabricEnvironmentManager';
import { FabricEnvironmentRegistryEntry, FabricRuntimeUtil, LogType, EnvironmentType } from 'ibm-blockchain-platform-common';
import { SettingConfigurations } from '../../extension/configurations';

chai.use(sinonChai);
const should: Chai.Should = chai.should();

// tslint:disable no-unused-expression
describe('InstallCommand', () => {

    const TEST_PACKAGE_DIRECTORY: string = path.join(path.dirname(__dirname), '../../test/data/packageDir');

    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();

    before(async () => {
        await TestUtil.setupTests(mySandBox);
    });

    after(async () => {
        await vscode.workspace.getConfiguration().update(SettingConfigurations.EXTENSION_DIRECTORY, TestUtil.EXTENSION_TEST_DIR, vscode.ConfigurationTarget.Global);
    });

    describe('InstallSmartContract', () => {
        let fabricRuntimeMock: sinon.SinonStubbedInstance<FabricEnvironmentConnection>;

        let executeCommandStub: sinon.SinonStub;
        let packageRegistryEntry: PackageRegistryEntry;
        let getRuntimeConnectionStub: sinon.SinonStub;
        let logOutputSpy: sinon.SinonSpy;
        let dockerLogsOutputSpy: sinon.SinonSpy;
        let environmentRegistryStub: sinon.SinonStub;

        beforeEach(async () => {
            executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
            executeCommandStub.withArgs(ExtensionCommands.CONNECT_TO_GATEWAY).resolves();
            executeCommandStub.withArgs(ExtensionCommands.CONNECT_TO_ENVIRONMENT).resolves();
            executeCommandStub.callThrough();

            fabricRuntimeMock = mySandBox.createStubInstance(FabricEnvironmentConnection);
            fabricRuntimeMock.connect.resolves();
            fabricRuntimeMock.installChaincode.resolves('myPackageId');
            fabricRuntimeMock.getInstalledChaincode.resolves(new Map<string, Array<string>>());
            fabricRuntimeMock.getAllOrdererNames.returns(['orderer1']);
            fabricRuntimeMock.getAllCertificateAuthorityNames.returns(['ca1']);
            fabricRuntimeMock.getNode.withArgs('peerOne').resolves({ wallet: 'myWallet' });

            getRuntimeConnectionStub = mySandBox.stub(FabricEnvironmentManager.instance(), 'getConnection').returns((fabricRuntimeMock as any));
            mySandBox.stub(FabricEnvironmentManager.instance(), 'getState').returns(ConnectedState.CONNECTED);
            const environmentRegistryEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
            environmentRegistryEntry.name = FabricRuntimeUtil.LOCAL_FABRIC;
            environmentRegistryEntry.managedRuntime = true;
            environmentRegistryEntry.environmentType = EnvironmentType.LOCAL_ENVIRONMENT;

            environmentRegistryStub = mySandBox.stub(FabricEnvironmentManager.instance(), 'getEnvironmentRegistryEntry').returns(environmentRegistryEntry);

            packageRegistryEntry = new PackageRegistryEntry({
                name: 'vscode-pkg-1@0.0.1',
                path: path.join(TEST_PACKAGE_DIRECTORY, 'vscode-pkg-1@0.0.1.tar.gz'),
                version: '0.0.1',
                sizeKB: 23.45
            });

            logOutputSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
            dockerLogsOutputSpy = mySandBox.spy(VSCodeBlockchainDockerOutputAdapter.instance(FabricRuntimeUtil.LOCAL_FABRIC), 'show');

            fabricRuntimeMock.getAllPeerNames.returns(['peerOne']);

            logOutputSpy.resetHistory();
        });

        afterEach(async () => {
            await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT_ENVIRONMENT);

            mySandBox.restore();
        });

        it('should install the smart contract through the command', async () => {
            const peers: Array<string> = ['peerThree', 'peerOne'];
            const result: string = await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT, peers, packageRegistryEntry);
            result.should.equal('myPackageId');

            fabricRuntimeMock.installChaincode.getCall(0).should.have.been.calledWith(packageRegistryEntry.path, 'peerThree');
            fabricRuntimeMock.installChaincode.getCall(1).should.have.been.calledWith(packageRegistryEntry.path, 'peerOne');

            dockerLogsOutputSpy.should.have.been.called;
            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');
            logOutputSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully installed on peer peerThree');
            logOutputSpy.getCall(2).should.have.been.calledWith(LogType.SUCCESS, 'Successfully installed on peer peerOne');
        });

        it('should install the smart contract through the command and connect if no connection', async () => {
            const peers: Array<string> = ['peerOne'];
            getRuntimeConnectionStub.resetHistory();
            getRuntimeConnectionStub.onFirstCall().returns(undefined);
            const result: string = await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT, peers, packageRegistryEntry);
            result.should.equal('myPackageId');
            fabricRuntimeMock.installChaincode.should.have.been.calledWith(packageRegistryEntry.path, 'peerOne');

            dockerLogsOutputSpy.should.have.been.called;
            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');
            logOutputSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully installed on peer peerOne');
        });

        it('should not show docker logs if not managed runtime', async () => {
            const peers: Array<string> = ['peerOne'];
            const registryEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
            registryEntry.name = 'myFabric';
            registryEntry.managedRuntime = false;
            environmentRegistryStub.returns(registryEntry);
            const result: PackageRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT, peers, packageRegistryEntry);
            result.should.equal('myPackageId');
            fabricRuntimeMock.installChaincode.should.have.been.calledWith(packageRegistryEntry.path, 'peerOne');

            dockerLogsOutputSpy.should.not.have.been.called;
            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');
            logOutputSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully installed on peer peerOne');
        });

        it('should return if cannot make connection', async () => {
            const peers: Array<string> = ['peerOne'];
            getRuntimeConnectionStub.returns(undefined);
            const result: PackageRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT, peers, packageRegistryEntry);
            should.not.exist(result);
            fabricRuntimeMock.installChaincode.should.not.have.been.called;

            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');
        });

        it('should handle error from installing smart contract', async () => {
            const peers: Array<string> = ['peerOne'];
            const error: Error = new Error('some error');
            fabricRuntimeMock.installChaincode.rejects(error);

            const result: PackageRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT, peers, packageRegistryEntry);
            should.not.exist(result);

            fabricRuntimeMock.installChaincode.should.have.been.calledWith(packageRegistryEntry.path, 'peerOne');
            dockerLogsOutputSpy.should.have.been.called;
            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');
            logOutputSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Failed to install on peer peerOne with reason: ${error.message}`, `Failed to install on peer peerOne with reason: ${error.toString()}`);
        });

        it('should still install on other peers if one fails', async () => {
            const peers: Array<string> = ['peerOne', 'peerTwo'];

            const error: Error = new Error('some error');
            fabricRuntimeMock.installChaincode.onFirstCall().rejects(error);

            const result: PackageRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT, peers, packageRegistryEntry);
            should.not.exist(result);

            fabricRuntimeMock.installChaincode.should.have.been.calledWith(packageRegistryEntry.path, 'peerOne');
            fabricRuntimeMock.installChaincode.should.have.been.calledWith(packageRegistryEntry.path, 'peerTwo');

            dockerLogsOutputSpy.should.have.been.called;
            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');
            logOutputSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Failed to install on peer peerOne with reason: ${error.message}`, `Failed to install on peer peerOne with reason: ${error.toString()}`);
            logOutputSpy.getCall(2).should.have.been.calledWith(LogType.SUCCESS, 'Successfully installed on peer peerTwo');
        });

        it('should handle peer failing to install', async () => {
            const peers: Array<string> = ['peerOne'];
            fabricRuntimeMock.installChaincode.onFirstCall().rejects({ message: 'failed to install for some reason' });

            const result: PackageRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT, peers, packageRegistryEntry);
            should.not.exist(result);

            dockerLogsOutputSpy.should.have.been.called;
            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');
            logOutputSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, 'Failed to install on peer peerOne with reason: failed to install for some reason');
        });
    });
});
