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
        let getSettingsStub: sinon.SinonStub;
        let getConfigurationStub: sinon.SinonStub;
        let packageLabel: string;

        beforeEach(async () => {
            executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
            executeCommandStub.withArgs(ExtensionCommands.CONNECT_TO_GATEWAY).resolves();
            executeCommandStub.withArgs(ExtensionCommands.CONNECT_TO_ENVIRONMENT).resolves();
            executeCommandStub.callThrough();

            fabricRuntimeMock = mySandBox.createStubInstance(FabricEnvironmentConnection);
            fabricRuntimeMock.connect.resolves();
            fabricRuntimeMock.installSmartContract.resolves('myPackageId');

            getSettingsStub = mySandBox.stub();
            getSettingsStub.withArgs(SettingConfigurations.FABRIC_CLIENT_TIMEOUT).returns(9000);

            getConfigurationStub = mySandBox.stub(vscode.workspace, 'getConfiguration');
            getConfigurationStub.returns({
                get: getSettingsStub,
                update: mySandBox.stub().callThrough()
            });

            getRuntimeConnectionStub = mySandBox.stub(FabricEnvironmentManager.instance(), 'getConnection').returns((fabricRuntimeMock as any));
            mySandBox.stub(FabricEnvironmentManager.instance(), 'getState').returns(ConnectedState.CONNECTED);
            const environmentRegistryEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
            environmentRegistryEntry.name = FabricRuntimeUtil.LOCAL_FABRIC;
            environmentRegistryEntry.managedRuntime = true;
            environmentRegistryEntry.environmentType = EnvironmentType.LOCAL_MICROFAB_ENVIRONMENT;

            environmentRegistryStub = mySandBox.stub(FabricEnvironmentManager.instance(), 'getEnvironmentRegistryEntry').returns(environmentRegistryEntry);

            packageRegistryEntry = new PackageRegistryEntry({
                name: 'vscode-pkg-1',
                path: path.join(TEST_PACKAGE_DIRECTORY, 'vscode-pkg-1@0.0.1.tar.gz'),
                version: '0.0.1',
                sizeKB: 23.45
            });

            packageLabel = `${packageRegistryEntry.name}_${packageRegistryEntry.version}`;

            logOutputSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
            dockerLogsOutputSpy = mySandBox.spy(VSCodeBlockchainDockerOutputAdapter.instance(FabricRuntimeUtil.LOCAL_FABRIC), 'show');

            logOutputSpy.resetHistory();
        });

        afterEach(async () => {
            await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT_ENVIRONMENT);

            mySandBox.restore();
        });

        it('should install the smart contract through the command', async () => {
            const orgMap: Map<string, string[]> = new Map<string, string[]>();
            orgMap.set('Org1MSP', ['peerOne']);
            orgMap.set('Org2MSP', ['peerTwo', 'peerThree']);
            const result: string = await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT, orgMap, packageRegistryEntry);
            result.should.equal('myPackageId');

            fabricRuntimeMock.installSmartContract.should.have.been.calledWithExactly(packageRegistryEntry.path, 'peerThree', packageLabel, 9000000);
            fabricRuntimeMock.installSmartContract.should.have.been.calledWithExactly(packageRegistryEntry.path, 'peerOne', packageLabel, 9000000);
            fabricRuntimeMock.installSmartContract.should.have.been.calledWithExactly(packageRegistryEntry.path, 'peerTwo', packageLabel, 9000000);

            dockerLogsOutputSpy.should.have.been.called;
            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');
            logOutputSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully installed on peer peerThree');
            logOutputSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully installed on peer peerOne');
            logOutputSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully installed on peer peerTwo');
        });

        it('should install the smart contract through the command when timeout is not provided in user settings', async () => {
            const orgMap: Map<string, string[]> = new Map<string, string[]>();
            orgMap.set('Org1MSP', ['peerOne']);
            orgMap.set('Org2MSP', ['peerTwo', 'peerThree']);

            getSettingsStub.withArgs(SettingConfigurations.FABRIC_CLIENT_TIMEOUT).returns(undefined);

            getConfigurationStub.returns({
                get: getSettingsStub,
                update: mySandBox.stub().callThrough()
            });

            const result: string = await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT, orgMap, packageRegistryEntry);
            result.should.equal('myPackageId');

            fabricRuntimeMock.installSmartContract.should.have.been.calledWithExactly(packageRegistryEntry.path, 'peerThree', packageLabel, undefined);
            fabricRuntimeMock.installSmartContract.should.have.been.calledWithExactly(packageRegistryEntry.path, 'peerOne', packageLabel, undefined);
            fabricRuntimeMock.installSmartContract.should.have.been.calledWithExactly(packageRegistryEntry.path, 'peerTwo', packageLabel, undefined);

            dockerLogsOutputSpy.should.have.been.called;
            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');
            logOutputSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully installed on peer peerThree');
            logOutputSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully installed on peer peerOne');
            logOutputSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully installed on peer peerTwo');
        });

        it('should install the smart contract through the command and connect if no connection', async () => {
            const orgMap: Map<string, string[]> = new Map<string, string[]>();
            orgMap.set('Org1MSP', ['peerOne']);
            getRuntimeConnectionStub.resetHistory();
            getRuntimeConnectionStub.onFirstCall().returns(undefined);
            const result: string = await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT, orgMap, packageRegistryEntry);
            result.should.equal('myPackageId');
            fabricRuntimeMock.installSmartContract.should.have.been.calledWithExactly(packageRegistryEntry.path, 'peerOne', packageLabel, 9000000);

            dockerLogsOutputSpy.should.have.been.called;
            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');
            logOutputSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully installed on peer peerOne');
        });

        it('should not show docker logs if not managed runtime', async () => {
            const orgMap: Map<string, string[]> = new Map<string, string[]>();
            orgMap.set('Org1MSP', ['peerOne']);
            const registryEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
            registryEntry.name = 'myFabric';
            registryEntry.managedRuntime = false;
            environmentRegistryStub.returns(registryEntry);
            const result: PackageRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT, orgMap, packageRegistryEntry);
            result.should.equal('myPackageId');
            fabricRuntimeMock.installSmartContract.should.have.been.calledWithExactly(packageRegistryEntry.path, 'peerOne', packageLabel, 9000000);

            dockerLogsOutputSpy.should.not.have.been.called;
            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');
            logOutputSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully installed on peer peerOne');
        });

        it('should return if cannot make connection', async () => {
            const peers: Array<string> = ['peerOne'];
            getRuntimeConnectionStub.returns(undefined);
            const result: PackageRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT, peers, packageRegistryEntry);
            should.not.exist(result);
            fabricRuntimeMock.installSmartContract.should.not.have.been.called;

            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');
        });

        it('should handle error from installing smart contract', async () => {
            const orgMap: Map<string, string[]> = new Map<string, string[]>();
            orgMap.set('Org1MSP', ['peerOne']);
            const error: Error = new Error('some error');
            fabricRuntimeMock.installSmartContract.rejects(error);

            const result: PackageRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT, orgMap, packageRegistryEntry);
            should.not.exist(result);

            fabricRuntimeMock.installSmartContract.should.have.been.calledWith(packageRegistryEntry.path, 'peerOne');
            dockerLogsOutputSpy.should.have.been.called;
            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');
            logOutputSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Failed to install on peer peerOne with reason: ${error.message}`, `Failed to install on peer peerOne with reason: ${error.toString()}`);
        });

        it('should still install on other peers if one fails', async () => {
            const orgMap: Map<string, string[]> = new Map<string, string[]>();
            orgMap.set('Org1MSP', ['peerOne', 'peerTwo']);

            const error: Error = new Error('some error');
            fabricRuntimeMock.installSmartContract.onFirstCall().rejects(error);

            const result: PackageRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT, orgMap, packageRegistryEntry);
            should.not.exist(result);

            fabricRuntimeMock.installSmartContract.should.have.been.calledWithExactly(packageRegistryEntry.path, 'peerOne', packageLabel, 9000000);
            fabricRuntimeMock.installSmartContract.should.have.been.calledWithExactly(packageRegistryEntry.path, 'peerTwo', packageLabel, 9000000);

            dockerLogsOutputSpy.should.have.been.called;
            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');
            logOutputSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Failed to install on peer peerOne with reason: ${error.message}`, `Failed to install on peer peerOne with reason: ${error.toString()}`);
            logOutputSpy.getCall(2).should.have.been.calledWith(LogType.SUCCESS, 'Successfully installed on peer peerTwo');
        });

        it('should handle peer failing to install', async () => {
            const orgMap: Map<string, string[]> = new Map<string, string[]>();
            orgMap.set('Org1MSP', ['peerOne']);
            fabricRuntimeMock.installSmartContract.onFirstCall().rejects({ message: 'failed to install for some reason' });

            const result: PackageRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT, orgMap, packageRegistryEntry);
            should.not.exist(result);

            dockerLogsOutputSpy.should.have.been.called;
            logOutputSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'installSmartContract');
            logOutputSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, 'Failed to install on peer peerOne with reason: failed to install for some reason');
        });
    });
});
