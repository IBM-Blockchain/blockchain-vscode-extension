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

import { LocalEnvironmentManager } from '../../../extension/fabric/environments/LocalEnvironmentManager';
import { TestUtil } from '../../TestUtil';
import { FabricEnvironmentConnection } from 'ibm-blockchain-platform-environment-v1';
import { FabricConnectionFactory } from '../../../extension/fabric/FabricConnectionFactory';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { SettingConfigurations } from '../../../extension/configurations';
import { FabricEnvironmentManager, ConnectedState } from '../../../extension/fabric/environments/FabricEnvironmentManager';
import { FabricEnvironmentRegistryEntry, FabricRuntimeUtil, FabricEnvironmentRegistry, FabricGatewayRegistry } from 'ibm-blockchain-platform-common';
import { LocalEnvironment } from '../../../extension/fabric/environments/LocalEnvironment';

chai.should();

// tslint:disable no-unused-expression
describe('LocalEnvironmentManager', () => {

    const connectionRegistry: FabricGatewayRegistry = FabricGatewayRegistry.instance();
    const runtimeManager: LocalEnvironmentManager = LocalEnvironmentManager.instance();
    let mockRuntime: sinon.SinonStubbedInstance<LocalEnvironment>;
    let mockConnection: sinon.SinonStubbedInstance<FabricEnvironmentConnection>;

    let sandbox: sinon.SinonSandbox;
    let findFreePortStub: sinon.SinonStub;
    let originalRuntime: LocalEnvironment;

    before(async () => {
        await TestUtil.setupTests(sandbox);
        await TestUtil.setupLocalFabric();
        originalRuntime = runtimeManager.getRuntime();
    });

    beforeEach(async () => {
        sandbox = sinon.createSandbox();
        await connectionRegistry.clear();
        mockRuntime = sandbox.createStubInstance(LocalEnvironment);
        runtimeManager['connection'] = runtimeManager['connectingPromise'] = undefined;
        runtimeManager['runtime'] = ((mockRuntime as any) as LocalEnvironment);
        mockConnection = sandbox.createStubInstance(FabricEnvironmentConnection);
        sandbox.stub(FabricConnectionFactory, 'createFabricEnvironmentConnection').returns(mockConnection);
        findFreePortStub = sandbox.stub().resolves([17050, 17051, 17052, 17053, 17054, 17055, 17056]);
        sandbox.stub(LocalEnvironmentManager, 'findFreePort').value(findFreePortStub);
    });

    afterEach(async () => {
        sandbox.restore();
        runtimeManager['connection'] = runtimeManager['connectingPromise'] = undefined;
        runtimeManager['runtime'] = undefined;
        await connectionRegistry.clear();
    });

    after(() => {
        // need to restore the runtime
        Object.defineProperty(runtimeManager, 'runtime', {
            configurable: true,
            enumerable: true,
            get: (): LocalEnvironment => (originalRuntime as any) as LocalEnvironment
        });
    });

    describe('#getRuntime', () => {
        it('should return the runtime', () => {
            runtimeManager.getRuntime().should.equal(mockRuntime);
        });
    });

    describe('#initialize', () => {
        beforeEach(() => {
            mockRuntime.isCreated.resolves(true);
            Object.defineProperty(runtimeManager, 'runtime', {
                configurable: true,
                enumerable: true,
                get: (): LocalEnvironment => (mockRuntime as any) as LocalEnvironment,
                set: (): void => { /* Ignore the new value */ }
            });
        });

        it('should use existing configuration and import all wallets/identities', async () => {
            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, {
                ports: {
                    startPort: 17050,
                    endPort: 17070
                }
            }, vscode.ConfigurationTarget.Global);
            await runtimeManager.initialize();
            mockRuntime.ports.should.deep.equal({
                startPort: 17050,
                endPort: 17070
            });
            mockRuntime.updateUserSettings.should.not.have.been.called;
        });

        it('should generate new configuration', async () => {
            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, {}, vscode.ConfigurationTarget.Global);

            findFreePortStub.returns([17050, 17070]);
            await runtimeManager.initialize();
            mockRuntime.ports.should.deep.equal({
                startPort: 17050,
                endPort: 17070
            });
            mockRuntime.updateUserSettings.should.have.been.calledOnce;
        });

        it('create the runtime if it is not already created', async () => {
            mockRuntime.isCreated.resolves(false);
            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, {}, vscode.ConfigurationTarget.Global);
            findFreePortStub.returns([17050, 17070]);

            await runtimeManager.initialize();
            mockRuntime.ports.should.deep.equal({
                startPort: 17050,
                endPort: 17070
            });
            mockRuntime.updateUserSettings.should.have.been.calledOnce;
            mockRuntime.create.should.have.been.calledOnce;
        });

        it(`should start logs if ${FabricRuntimeUtil.LOCAL_FABRIC} is connected`, async () => {
            mockRuntime.isCreated.resolves(true);
            await runtimeManager.initialize();
            const registryEntry: FabricEnvironmentRegistryEntry = await FabricEnvironmentRegistry.instance().get(FabricRuntimeUtil.LOCAL_FABRIC);
            mockRuntime.startLogs.resetHistory();
            FabricEnvironmentManager.instance().connect(mockConnection, registryEntry, ConnectedState.CONNECTED);
            mockRuntime.startLogs.should.have.been.called;
        });

        it('should not start the logs when other fabric connected', async () => {
            mockRuntime.isCreated.resolves(false);
            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, {}, vscode.ConfigurationTarget.Global);
            await runtimeManager.initialize();

            const registryEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
            registryEntry.name = 'myFabric';
            registryEntry.managedRuntime = true;
            FabricEnvironmentManager.instance().connect(mockConnection, registryEntry, ConnectedState.CONNECTED);

            mockRuntime.startLogs.should.not.have.been.called;
        });

        it('should stop the logs when disconnected', async () => {
            FabricEnvironmentManager.instance()['connection'] = undefined;
            mockRuntime.isCreated.resolves(false);
            await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, {}, vscode.ConfigurationTarget.Global);
            await runtimeManager.initialize();

            FabricEnvironmentManager.instance().disconnect();

            mockRuntime.stopLogs.should.have.been.called;
        });
    });
});
