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

import { FabricClientConnection } from '../../src/fabric/FabricClientConnection';
import { FabricConnectionFactory } from '../../src/fabric/FabricConnectionFactory';
import * as fabricClient from 'fabric-client';
import * as path from 'path';

import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { Gateway } from 'fabric-network';
import { FabricWallet } from '../../src/fabric/FabricWallet';
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../../src/logging/OutputAdapter';

const should: Chai.Should = chai.should();
chai.use(sinonChai);

// tslint:disable no-unused-expression
describe('FabricClientConnection', () => {

    let fabricClientStub: sinon.SinonStubbedInstance<fabricClient>;
    let fabricClientConnection: FabricClientConnection;
    let fabricClientConnectionYaml: FabricClientConnection;
    let otherFabricClientConnectionYml: FabricClientConnection;
    let fabricClientConnectionWrong: FabricClientConnection;
    let logSpy: sinon.SinonSpy;
    let wallet: FabricWallet;

    let mySandBox: sinon.SinonSandbox;

    let gatewayStub: sinon.SinonStubbedInstance<Gateway>;

    const rootPath: string = path.dirname(__dirname);

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
        logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');

        fabricClientStub = mySandBox.createStubInstance(fabricClient);

        mySandBox.stub(fabricClient, 'loadFromConfig').resolves(fabricClientStub);

        fabricClientStub.getMspid.returns('myMSPId');

        gatewayStub = sinon.createStubInstance(Gateway);
        gatewayStub.connect.resolves();
    });

    afterEach(() => {
        mySandBox.restore();
    });

    describe('connect', () => {

        beforeEach(async () => {
            const connectionData: any = {
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                walletPath: path.join(rootPath, '../../test/data/walletDir/wallet')
            };
            fabricClientConnection = FabricConnectionFactory.createFabricClientConnection(connectionData) as FabricClientConnection;
            fabricClientConnection['gateway'] = gatewayStub;

            wallet = new FabricWallet(connectionData.walletPath);
        });

        it('should connect to a fabric', async () => {
            await fabricClientConnection.connect(wallet, 'Admin@org1.example.com');
            gatewayStub.connect.should.have.been.called;
            logSpy.should.not.have.been.calledWith(LogType.ERROR);
            fabricClientConnection['networkIdProperty'].should.equal(false);
        });

        it('should connect with an already loaded client connection', async () => {
            should.exist(FabricConnectionFactory['clientConnection']);
            await fabricClientConnection.connect(wallet, 'Admin@org1.example.com');
            gatewayStub.connect.should.have.been.called;
            logSpy.should.not.have.been.calledWith(LogType.ERROR);
            fabricClientConnection['networkIdProperty'].should.equal(false);
        });

    });

    it('should connect to a fabric with a .yaml connection profile', async () => {
        const connectionYamlData: any = {
            connectionProfilePath: path.join(rootPath, '../../test/data/connectionYaml/connection.yaml'),
            walletPath: path.join(rootPath, '../../test/data/connectionYaml/wallet')
        };
        wallet = new FabricWallet(connectionYamlData.walletPath);
        fabricClientConnectionYaml = FabricConnectionFactory.createFabricClientConnection(connectionYamlData) as FabricClientConnection;
        fabricClientConnectionYaml['gateway'] = gatewayStub;

        await fabricClientConnectionYaml.connect(wallet, 'Admin@org1.example.com');
        gatewayStub.connect.should.have.been.called;
        logSpy.should.not.have.been.calledWith(LogType.ERROR);
        fabricClientConnectionYaml['networkIdProperty'].should.equal(false);
    });

    it('should connect to a fabric with a .yml connection profile', async () => {
        const otherConnectionYmlData: any = {
            connectionProfilePath: path.join(rootPath, '../../test/data/connectionYaml/otherConnectionProfile.yml'),
            walletPath: path.join(rootPath, '../../test/data/connectionYaml/wallet')
        };
        wallet = new FabricWallet(otherConnectionYmlData.walletPath);
        otherFabricClientConnectionYml = FabricConnectionFactory.createFabricClientConnection(otherConnectionYmlData) as FabricClientConnection;
        otherFabricClientConnectionYml['gateway'] = gatewayStub;

        await otherFabricClientConnectionYml.connect(wallet, 'Admin@org1.example.com');
        gatewayStub.connect.should.have.been.called;
        logSpy.should.not.have.been.calledWith(LogType.ERROR);
        fabricClientConnectionYaml['networkIdProperty'].should.equal(false);
    });

    it('should detecting connecting to ibp instance', async () => {

        const connectionData: any = {
            connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
            walletPath: path.join(rootPath, '../../test/data/walletDir/wallet')
        };
        wallet = new FabricWallet(connectionData.walletPath);
        fabricClientConnection = FabricConnectionFactory.createFabricClientConnection(connectionData) as FabricClientConnection;
        fabricClientConnection['gateway'] = gatewayStub;

        await fabricClientConnection.connect(wallet, 'Admin@org1.example.com');

        gatewayStub.connect.should.have.been.called;
        logSpy.should.not.have.been.calledWith(LogType.ERROR);
        fabricClientConnection['networkIdProperty'].should.equal(true);
    });

    describe('connection failure', () => {
        it('should show an error if connection profile is not .yaml or .json file', async () => {
            const connectionWrongData: any = {
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionYaml/connection'),
                walletPath: path.join(rootPath, '../../test/data/connectionYaml/wallet')
            };
            wallet = new FabricWallet(connectionWrongData.walletPath);
            fabricClientConnectionWrong = FabricConnectionFactory.createFabricClientConnection(connectionWrongData) as FabricClientConnection;
            fabricClientConnectionWrong['gateway'] = gatewayStub;

            await fabricClientConnectionWrong.connect(wallet, 'Admin@org1.example.com').should.have.been.rejectedWith('Connection profile must be in JSON or yaml format');
            gatewayStub.connect.should.not.have.been.called;
        });
    });
});
