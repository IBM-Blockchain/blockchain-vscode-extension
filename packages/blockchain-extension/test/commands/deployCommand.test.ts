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
// tslint:disable no-unused-expression
import * as path from 'path';
import * as vscode from 'vscode';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { TestUtil } from '../TestUtil';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricEnvironmentConnection } from 'ibm-blockchain-platform-environment-v1';
import { FabricEnvironmentManager } from '../../extension/fabric/environments/FabricEnvironmentManager';
import { FabricEnvironmentRegistryEntry, FabricRuntimeUtil, LogType, EnvironmentType, FabricSmartContractDefinition } from 'ibm-blockchain-platform-common';
import { PackageRegistryEntry } from '../../extension/registries/PackageRegistryEntry';

chai.use(sinonChai);

describe('deployCommand', () => {
    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();

    before(async () => {
        await TestUtil.setupTests(mySandBox);
    });

    describe('deploySmartContract', () => {
        let fabricRuntimeMock: sinon.SinonStubbedInstance<FabricEnvironmentConnection>;

        let executeCommandStub: sinon.SinonStub;
        let logSpy: sinon.SinonSpy;

        let environmentConnectionStub: sinon.SinonStub;
        let environmentRegistryEntry: FabricEnvironmentRegistryEntry;
        let packageRegistryEntry: PackageRegistryEntry;

        beforeEach(async () => {
            executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT).resolves('myPackageId');
            executeCommandStub.withArgs(ExtensionCommands.APPROVE_SMART_CONTRACT).resolves();
            executeCommandStub.withArgs(ExtensionCommands.COMMIT_SMART_CONTRACT).resolves();
            executeCommandStub.withArgs(ExtensionCommands.CONNECT_TO_ENVIRONMENT).resolves();
            executeCommandStub.callThrough();

            fabricRuntimeMock = mySandBox.createStubInstance(FabricEnvironmentConnection);
            fabricRuntimeMock.connect.resolves();
            fabricRuntimeMock.commitSmartContractDefinition.resolves();

            environmentConnectionStub = mySandBox.stub(FabricEnvironmentManager.instance(), 'getConnection').returns((fabricRuntimeMock));

            environmentRegistryEntry = new FabricEnvironmentRegistryEntry();
            environmentRegistryEntry.name = FabricRuntimeUtil.LOCAL_FABRIC;
            environmentRegistryEntry.managedRuntime = true;
            environmentRegistryEntry.environmentType = EnvironmentType.LOCAL_MICROFAB_ENVIRONMENT;

            packageRegistryEntry = new PackageRegistryEntry({
                name: 'vscode-pkg-1',
                path: path.join('myPath', 'vscode-pkg-1@0.0.1.tar.gz'),
                version: '0.0.1',
                sizeKB: 23.45
            });

            logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
        });

        afterEach(async () => {
            mySandBox.restore();
        });

        it('should deploy the smart contract through the command', async () => {
            const orgMap: Map<string, string[]> = new Map<string, string[]>();
            orgMap.set('Org1MSP', ['peerOne']);
            orgMap.set('Org2MSP', ['peerTwo', 'peerThree']);
            await vscode.commands.executeCommand(ExtensionCommands.DEPLOY_SMART_CONTRACT, true, environmentRegistryEntry, 'myOrderer', 'mychannel', orgMap, packageRegistryEntry, new FabricSmartContractDefinition('mySmartContract', '0.0.1', 1));

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.INSTALL_SMART_CONTRACT, orgMap, packageRegistryEntry);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.APPROVE_SMART_CONTRACT, 'myOrderer', 'mychannel', orgMap, new FabricSmartContractDefinition('mySmartContract', '0.0.1', 1, 'myPackageId'));
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.COMMIT_SMART_CONTRACT, 'myOrderer', 'mychannel', orgMap, new FabricSmartContractDefinition('mySmartContract', '0.0.1', 1, 'myPackageId'));
            logSpy.should.have.been.calledWith(LogType.INFO, 'Deploy Smart Contract');
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully deployed smart contract');
        });

        it('should deploy the smart contract through the command with endorsement policy', async () => {
            const orgMap: Map<string, string[]> = new Map<string, string[]>();
            orgMap.set('Org1MSP', ['peerOne']);
            await vscode.commands.executeCommand(ExtensionCommands.DEPLOY_SMART_CONTRACT, true, environmentRegistryEntry, 'myOrderer', 'mychannel', orgMap, packageRegistryEntry, new FabricSmartContractDefinition('mySmartContract', '0.0.1', 1, undefined, `OutOf(1, 'Org1.member', 'Org2.member')`));

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.INSTALL_SMART_CONTRACT, orgMap, packageRegistryEntry);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.APPROVE_SMART_CONTRACT, 'myOrderer', 'mychannel', orgMap, new FabricSmartContractDefinition('mySmartContract', '0.0.1', 1, 'myPackageId', `OutOf(1, 'Org1.member', 'Org2.member')`));
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.COMMIT_SMART_CONTRACT, 'myOrderer', 'mychannel', orgMap, new FabricSmartContractDefinition('mySmartContract', '0.0.1', 1, 'myPackageId', `OutOf(1, 'Org1.member', 'Org2.member')`));
            logSpy.should.have.been.calledWith(LogType.INFO, 'Deploy Smart Contract');
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully deployed smart contract');
        });

        it('should deploy the smart contract through the command but not commit', async () => {
            const orgMap: Map<string, string[]> = new Map<string, string[]>();
            orgMap.set('Org1MSP', ['peerOne']);
            await vscode.commands.executeCommand(ExtensionCommands.DEPLOY_SMART_CONTRACT, false, environmentRegistryEntry, 'myOrderer', 'mychannel', orgMap, packageRegistryEntry, new FabricSmartContractDefinition('mySmartContract', '0.0.1', 1));

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.INSTALL_SMART_CONTRACT, orgMap, packageRegistryEntry);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.APPROVE_SMART_CONTRACT, 'myOrderer', 'mychannel', orgMap, new FabricSmartContractDefinition('mySmartContract', '0.0.1', 1, 'myPackageId'));
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.COMMIT_SMART_CONTRACT);
            logSpy.should.have.been.calledWith(LogType.INFO, 'Deploy Smart Contract');
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Partially deployed smart contract - commit not performed');
        });

        it('should return if no connection', async () => {
            const orgMap: Map<string, string[]> = new Map<string, string[]>();
            orgMap.set('Org1MSP', ['peerOne']);
            environmentConnectionStub.returns(undefined);

            await vscode.commands.executeCommand(ExtensionCommands.DEPLOY_SMART_CONTRACT, true, environmentRegistryEntry, 'myOrderer', 'mychannel', orgMap, packageRegistryEntry, new FabricSmartContractDefinition('mySmartContract', '0.0.1', 1));

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.INSTALL_SMART_CONTRACT);
        });

        it('should handle error from install', async () => {
            const orgMap: Map<string, string[]> = new Map<string, string[]>();
            orgMap.set('Org1MSP', ['peerOne']);
            executeCommandStub.withArgs(ExtensionCommands.INSTALL_SMART_CONTRACT).resolves();
            const error: Error = new Error('Package was not installed. No packageId was returned');

            await vscode.commands.executeCommand(ExtensionCommands.DEPLOY_SMART_CONTRACT, true, environmentRegistryEntry, 'myOrderer', 'mychannel', orgMap, packageRegistryEntry, new FabricSmartContractDefinition('mySmartContract', '0.0.1', 1));

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.INSTALL_SMART_CONTRACT, orgMap, packageRegistryEntry);
            executeCommandStub.should.not.have.been.calledWith(ExtensionCommands.APPROVE_SMART_CONTRACT);

            logSpy.should.have.been.calledWith(LogType.ERROR, `Failed to deploy smart contract, ${error.message}`, `Failed to deploy smart contract, ${error.toString()}`);
        });

        it('should be able to pass a different maps for installing & improving and committing', async () => {
            const installApproveMap: Map<string, string[]> = new Map<string, string[]>();
            const commitMap: Map<string, string[]> = new Map<string, string[]>();
            installApproveMap.set('Org1MSP', ['peerOne']);
            commitMap.set('Org1MSP', ['peerOne']);
            commitMap.set('Org2MSP', ['peerTwo', 'peerThree']);
            await vscode.commands.executeCommand(ExtensionCommands.DEPLOY_SMART_CONTRACT, true, environmentRegistryEntry, 'myOrderer', 'mychannel', installApproveMap, packageRegistryEntry, new FabricSmartContractDefinition('mySmartContract', '0.0.1', 1), commitMap);

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, environmentRegistryEntry);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.INSTALL_SMART_CONTRACT, installApproveMap, packageRegistryEntry);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.APPROVE_SMART_CONTRACT, 'myOrderer', 'mychannel', installApproveMap, new FabricSmartContractDefinition('mySmartContract', '0.0.1', 1, 'myPackageId'));
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.COMMIT_SMART_CONTRACT, 'myOrderer', 'mychannel', commitMap, new FabricSmartContractDefinition('mySmartContract', '0.0.1', 1, 'myPackageId'));
            logSpy.should.have.been.calledWith(LogType.INFO, 'Deploy Smart Contract');
            logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully deployed smart contract');
        });
    });
});
