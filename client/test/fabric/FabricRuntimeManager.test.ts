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

import { FabricGatewayRegistry } from '../../src/fabric/FabricGatewayRegistry';
import { FabricRuntimeManager } from '../../src/fabric/FabricRuntimeManager';
import { FabricRuntime, FabricRuntimeState } from '../../src/fabric/FabricRuntime';
import { ExtensionUtil } from '../../src/util/ExtensionUtil';
import { TestUtil } from '../TestUtil';
import { FabricRuntimeConnection } from '../../src/fabric/FabricRuntimeConnection';
import { IFabricConnection } from '../../src/fabric/IFabricConnection';
import { FabricConnectionFactory } from '../../src/fabric/FabricConnectionFactory';

import * as chai from 'chai';
import * as sinon from 'sinon';
import { FabricWallet } from '../../src/fabric/FabricWallet';
import { FabricWalletGenerator } from '../../src/fabric/FabricWalletGenerator';
import * as vscode from 'vscode';
import { FabricRuntimePorts } from '../../src/fabric/FabricRuntimePorts';

const should: Chai.Should = chai.should();

// tslint:disable no-unused-expression
describe('FabricRuntimeManager', () => {

    const connectionRegistry: FabricGatewayRegistry = FabricGatewayRegistry.instance();
    const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
    let connection: sinon.SinonStubbedInstance<FabricRuntimeConnection>;

    let sandbox: sinon.SinonSandbox;

    before(async () => {
        await TestUtil.storeGatewaysConfig();
        await TestUtil.storeRuntimesConfig();
    });

    after(async () => {
        await TestUtil.restoreGatewaysConfig();
        await TestUtil.restoreRuntimesConfig();
    });

    beforeEach(async () => {
        sandbox = sinon.createSandbox();
        await ExtensionUtil.activateExtension();
        await connectionRegistry.clear();
        connection = sinon.createStubInstance(FabricRuntimeConnection);
        await vscode.workspace.getConfiguration().update('fabric.runtime', {}, vscode.ConfigurationTarget.Global);

    });

    afterEach(async () => {
        sandbox.restore();
        await connectionRegistry.clear();
    });

    describe('getConnection', () => {
        it('should return the connection if there is a connection', async () => {
            runtimeManager['connection'] = connection;
            runtimeManager['connectingPromise'] = undefined;

            const result: IFabricConnection = await runtimeManager.getConnection();
            result.should.deep.equal(connection);
        });

        it('should connect if there is no connection', async () => {
            runtimeManager['connection'] = undefined;
            runtimeManager['connectingPromise'] = undefined;
            await runtimeManager.add();
            const runtime: FabricRuntime = runtimeManager.getRuntime();
            sandbox.stub(runtime, 'getConnectionProfile');
            sandbox.stub(runtimeManager, 'getRuntime').returns(runtime);
            sandbox.stub(runtime, 'startLogs');
            connection.connect.resolves();
            connection.enroll.resolves({ certificate: 'myCert', privateKey: 'myKey' });
            sandbox.stub(FabricConnectionFactory, 'createFabricRuntimeConnection').returns(connection);
            const runtimeWalletStub: sinon.SinonStubbedInstance<FabricWallet> = sinon.createStubInstance(FabricWallet);
            runtimeWalletStub.exists.resolves(false);
            runtimeWalletStub.importIdentity.resolves();
            const gatewayWalletStub: sinon.SinonStubbedInstance<FabricWallet> = sinon.createStubInstance(FabricWallet);
            gatewayWalletStub.exists.resolves(false);
            gatewayWalletStub.importIdentity.resolves();

            const createWalletStub: sinon.SinonStub = sandbox.stub(FabricWalletGenerator.instance(), 'createLocalWallet');
            createWalletStub.withArgs('local_fabric-ops').resolves(runtimeWalletStub);
            createWalletStub.withArgs('local_fabric').resolves(gatewayWalletStub);

            const result: IFabricConnection = await runtimeManager.getConnection();
            connection.connect.should.have.been.calledWith(runtimeWalletStub, 'Admin@org1.example.com');
            runtimeWalletStub.importIdentity.should.have.been.calledWith(sinon.match.string, sinon.match.string, 'Admin@org1.example.com', 'Org1MSP');
            gatewayWalletStub.importIdentity.should.have.been.calledWith('myCert', 'myKey', 'Admin@org1.example.com', 'Org1MSP');
            runtime.startLogs.should.have.been.called;
            result.should.deep.equal(connection);
        });

        it('should not import runtime identity if already exists', async () => {
            runtimeManager['connection'] = undefined;
            runtimeManager['connectingPromise'] = undefined;
            await runtimeManager.add();
            const runtime: FabricRuntime = runtimeManager.getRuntime();
            sandbox.stub(runtimeManager, 'getRuntime').returns(runtime);
            sandbox.stub(runtime, 'startLogs');
            connection.connect.resolves();
            connection.enroll.resolves({ certificate: 'myCert', privateKey: 'myKey' });
            sandbox.stub(FabricConnectionFactory, 'createFabricRuntimeConnection').returns(connection);

            const runtimeWalletStub: sinon.SinonStubbedInstance<FabricWallet> = sinon.createStubInstance(FabricWallet);
            runtimeWalletStub.exists.resolves(true);
            runtimeWalletStub.importIdentity.resolves();
            const gatewayWalletStub: sinon.SinonStubbedInstance<FabricWallet> = sinon.createStubInstance(FabricWallet);
            gatewayWalletStub.exists.resolves(false);
            gatewayWalletStub.importIdentity.resolves();

            const createWalletStub: sinon.SinonStub = sandbox.stub(FabricWalletGenerator.instance(), 'createLocalWallet');
            createWalletStub.withArgs('local_fabric-ops').resolves(runtimeWalletStub);
            createWalletStub.withArgs('local_fabric').resolves(gatewayWalletStub);

            const result: IFabricConnection = await runtimeManager.getConnection();
            connection.connect.should.have.been.calledWith(runtimeWalletStub, 'Admin@org1.example.com');
            runtimeWalletStub.importIdentity.should.not.have.been.called;
            gatewayWalletStub.importIdentity.should.have.been.calledWith('myCert', 'myKey', 'Admin@org1.example.com', 'Org1MSP');
            runtime.startLogs.should.have.been.called;
            result.should.deep.equal(connection);
        });

        it('should not import gateway identity if already exists', async () => {
            runtimeManager['connection'] = undefined;
            runtimeManager['connectingPromise'] = undefined;
            await runtimeManager.add();
            const runtime: FabricRuntime = runtimeManager.getRuntime();
            sandbox.stub(runtimeManager, 'getRuntime').returns(runtime);
            sandbox.stub(runtime, 'startLogs');
            connection.connect.resolves();
            connection.enroll.resolves({ certificate: 'myCert', privateKey: 'myKey' });
            sandbox.stub(FabricConnectionFactory, 'createFabricRuntimeConnection').returns(connection);

            const runtimeWalletStub: sinon.SinonStubbedInstance<FabricWallet> = sinon.createStubInstance(FabricWallet);
            runtimeWalletStub.exists.resolves(false);
            runtimeWalletStub.importIdentity.resolves();
            const gatewayWalletStub: sinon.SinonStubbedInstance<FabricWallet> = sinon.createStubInstance(FabricWallet);
            gatewayWalletStub.exists.resolves(true);
            gatewayWalletStub.importIdentity.resolves();

            const createWalletStub: sinon.SinonStub = sandbox.stub(FabricWalletGenerator.instance(), 'createLocalWallet');
            createWalletStub.withArgs('local_fabric-ops').resolves(runtimeWalletStub);
            createWalletStub.withArgs('local_fabric').resolves(gatewayWalletStub);
            const result: IFabricConnection = await runtimeManager.getConnection();

            connection.connect.should.have.been.calledWith(runtimeWalletStub, 'Admin@org1.example.com');
            runtimeWalletStub.importIdentity.should.have.been.calledWith(sinon.match.string, sinon.match.string, 'Admin@org1.example.com', 'Org1MSP');
            gatewayWalletStub.importIdentity.should.not.have.been.called;
            runtime.startLogs.should.have.been.called;
            result.should.deep.equal(connection);
        });

        it('should not connect if already connecting', async () => {
            runtimeManager['connection'] = undefined;
            runtimeManager['connectingPromise'] = Promise.resolve(connection);
            connection.connect.resolves();

            await runtimeManager.getConnection();

            connection.connect.should.not.have.been.called;
        });

        it('should disconnect if runtime stopped', async () => {
            runtimeManager['connection'] = undefined;
            runtimeManager['connectingPromise'] = undefined;
            await runtimeManager.add();
            const runtime: FabricRuntime = runtimeManager.getRuntime();
            sandbox.stub(runtimeManager, 'getRuntime').returns(runtime);
            sandbox.stub(runtime, 'startLogs');

            connection.connect.resolves();
            connection.enroll.resolves({ certificate: 'myCert', privateKey: 'myKey' });
            sandbox.stub(FabricConnectionFactory, 'createFabricRuntimeConnection').returns(connection);
            const runtimeWalletStub: sinon.SinonStubbedInstance<FabricWallet> = sinon.createStubInstance(FabricWallet);
            runtimeWalletStub.exists.resolves(false);
            runtimeWalletStub.importIdentity.resolves();
            const gatewayWalletStub: sinon.SinonStubbedInstance<FabricWallet> = sinon.createStubInstance(FabricWallet);
            gatewayWalletStub.exists.resolves(false);
            gatewayWalletStub.importIdentity.resolves();

            const createWalletStub: sinon.SinonStub = sandbox.stub(FabricWalletGenerator.instance(), 'createLocalWallet');
            createWalletStub.withArgs('local_fabric-ops').resolves(runtimeWalletStub);
            createWalletStub.withArgs('local_fabric').resolves(gatewayWalletStub);

            const result: IFabricConnection = await runtimeManager.getConnection();
            connection.connect.should.have.been.calledWith(runtimeWalletStub, 'Admin@org1.example.com');
            runtimeWalletStub.importIdentity.should.have.been.calledWith(sinon.match.string, sinon.match.string, 'Admin@org1.example.com', 'Org1MSP');
            gatewayWalletStub.importIdentity.should.have.been.calledWith('myCert', 'myKey', 'Admin@org1.example.com', 'Org1MSP');
            runtime.startLogs.should.have.been.called;
            result.should.deep.equal(connection);

            runtime.setState(FabricRuntimeState.STOPPED);
            runtime.emit('busy', false);

            connection.disconnect.should.have.been.called;
            should.not.exist(runtimeManager['connection']);
        });

        it('should not discconect if no connection if runtime stopped', async () => {
            runtimeManager['connection'] = undefined;
            runtimeManager['connectingPromise'] = undefined;
            await runtimeManager.add();
            const runtime: FabricRuntime = runtimeManager.getRuntime();
            sandbox.stub(runtimeManager, 'getRuntime').returns(runtime);
            sandbox.stub(runtime, 'startLogs');

            connection.connect.resolves();
            connection.enroll.resolves({ certificate: 'myCert', privateKey: 'myKey' });
            sandbox.stub(FabricConnectionFactory, 'createFabricRuntimeConnection').returns(connection);
            const runtimeWalletStub: sinon.SinonStubbedInstance<FabricWallet> = sinon.createStubInstance(FabricWallet);
            runtimeWalletStub.exists.resolves(false);
            runtimeWalletStub.importIdentity.resolves();
            const gatewayWalletStub: sinon.SinonStubbedInstance<FabricWallet> = sinon.createStubInstance(FabricWallet);
            gatewayWalletStub.exists.resolves(false);
            gatewayWalletStub.importIdentity.resolves();

            const createWalletStub: sinon.SinonStub = sandbox.stub(FabricWalletGenerator.instance(), 'createLocalWallet');
            createWalletStub.withArgs('local_fabric-ops').resolves(runtimeWalletStub);
            createWalletStub.withArgs('local_fabric').resolves(gatewayWalletStub);

            const result: IFabricConnection = await runtimeManager.getConnection();
            connection.connect.should.have.been.calledWith(runtimeWalletStub, 'Admin@org1.example.com');
            runtimeWalletStub.importIdentity.should.have.been.calledWith(sinon.match.string, sinon.match.string, 'Admin@org1.example.com', 'Org1MSP');
            gatewayWalletStub.importIdentity.should.have.been.calledWith('myCert', 'myKey', 'Admin@org1.example.com', 'Org1MSP');
            runtime.startLogs.should.have.been.called;
            result.should.deep.equal(connection);

            runtimeManager['connection'] = undefined;
            runtime.setState(FabricRuntimeState.STOPPED);
            runtime.emit('busy', false);

            connection.disconnect.should.not.have.been.called;
            should.not.exist(runtimeManager['connection']);
        });

        it('should do nothing if started', async () => {
            runtimeManager['connection'] = undefined;
            runtimeManager['connectingPromise'] = undefined;
            await runtimeManager.add();
            const runtime: FabricRuntime = runtimeManager.getRuntime();
            sandbox.stub(runtimeManager, 'getRuntime').returns(runtime);
            sandbox.stub(runtime, 'startLogs');

            connection.connect.resolves();
            connection.enroll.resolves({ certificate: 'myCert', privateKey: 'myKey' });
            sandbox.stub(FabricConnectionFactory, 'createFabricRuntimeConnection').returns(connection);
            const runtimeWalletStub: sinon.SinonStubbedInstance<FabricWallet> = sinon.createStubInstance(FabricWallet);
            runtimeWalletStub.exists.resolves(false);
            runtimeWalletStub.importIdentity.resolves();
            const gatewayWalletStub: sinon.SinonStubbedInstance<FabricWallet> = sinon.createStubInstance(FabricWallet);
            gatewayWalletStub.exists.resolves(false);
            gatewayWalletStub.importIdentity.resolves();

            const createWalletStub: sinon.SinonStub = sandbox.stub(FabricWalletGenerator.instance(), 'createLocalWallet');
            createWalletStub.withArgs('local_fabric-ops').resolves(runtimeWalletStub);
            createWalletStub.withArgs('local_fabric').resolves(gatewayWalletStub);

            const result: IFabricConnection = await runtimeManager.getConnection();
            connection.connect.should.have.been.calledWith(runtimeWalletStub, 'Admin@org1.example.com');
            runtimeWalletStub.importIdentity.should.have.been.calledWith(sinon.match.string, sinon.match.string, 'Admin@org1.example.com', 'Org1MSP');
            gatewayWalletStub.importIdentity.should.have.been.calledWith('myCert', 'myKey', 'Admin@org1.example.com', 'Org1MSP');
            runtime.startLogs.should.have.been.called;
            result.should.deep.equal(connection);

            runtime.setState(FabricRuntimeState.STARTED);
            runtime.emit('busy', false);

            connection.disconnect.should.not.have.been.called;
            runtimeManager['connection'].should.exist;
        });
    });

    describe('#add', () => {

        it('should add a runtime to the runtime manager', async () => {
            // Runtime is created upon extension activation
            sandbox.stub(FabricRuntimeManager, 'findFreePort').resolves([17057, 17058, 17059, 17060, 17061, 17062, 17063]);
            await runtimeManager.add();
            runtimeManager.exists().should.be.true;
            const runtime: FabricRuntime = runtimeManager.getRuntime();
            runtime.getName().should.equal('local_fabric');
            runtime.isDevelopmentMode().should.be.false;
            runtime.ports.should.deep.equal({
                certificateAuthority: 17061,
                couchDB: 17062,
                orderer: 17057,
                peerChaincode: 17059,
                peerEventHub: 17060,
                peerRequest: 17058,
                logs: 17063
            });
        });

    });

    describe('#migrate', () => {

        it('should do nothing if an existing runtime has a port configuration', async () => {
            const existingRuntime: FabricRuntime = runtimeManager.getRuntime();
            await runtimeManager.migrate();
            const runtime: FabricRuntime = runtimeManager.getRuntime();
            existingRuntime.ports.should.deep.equal(runtime.ports);
            sandbox.stub(FabricRuntimeManager, 'findFreePort').should.not.have.been.called;
        });

        it('should add a port configuration to an existing runtime without one', async () => {
            runtimeManager['runtime'].ports = new FabricRuntimePorts();
            sandbox.stub(FabricRuntimeManager, 'findFreePort').withArgs(17050, null, null, 7).resolves([17050, 17051, 17052, 17053, 17054, 17055, 17056]);

            await runtimeManager.migrate();
            const runtime: FabricRuntime = runtimeManager.getRuntime();
            runtime.ports.should.deep.equal({
                    certificateAuthority: 17054,
                    couchDB: 17055,
                    orderer: 17050,
                    peerChaincode: 17052,
                    peerEventHub: 17053,
                    peerRequest: 17051,
                    logs: 17056
            });
        });

        it('should update if doesn\'t have logs section', async () => {
            runtimeManager['runtime'].ports.logs = undefined;
            sandbox.stub(FabricRuntimeManager, 'findFreePort').resolves([17056, 17057, 17058, 17059, 17060, 17061, 17062]);

            await runtimeManager.migrate();
            const runtime: FabricRuntime = runtimeManager.getRuntime();
            runtime.ports.should.deep.equal({
                certificateAuthority: 17060,
                couchDB: 17061,
                orderer: 17056,
                peerChaincode: 17058,
                peerEventHub: 17059,
                peerRequest: 17057,
                logs: 17062
            });
        });
    });
});
