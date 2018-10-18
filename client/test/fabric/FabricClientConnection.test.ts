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
import * as vscode from 'vscode';

import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { Gateway } from 'fabric-network';

const should = chai.should();
chai.use(sinonChai);

// tslint:disable no-unused-expression
describe('FabricClientConnection', () => {

    let fabricClientStub: sinon.SinonStubbedInstance<fabricClient>;
    let fabricClientConnection: FabricClientConnection;
    let fabricClientConnectionYaml: FabricClientConnection;
    let otherFabricClientConnectionYml: FabricClientConnection;
    let fabricClientConnectionWrong: FabricClientConnection;
    let errorSpy: sinon.SinonSpy;

    let mySandBox: sinon.SinonSandbox;

    let gatewayStub;

    const rootPath: string = path.dirname(__dirname);

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
        errorSpy = mySandBox.spy(vscode.window, 'showErrorMessage');

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
        it('should connect to a fabric', async () => {
            const connectionData: any = {
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                certificatePath: path.join(rootPath, '../../test/data/connectionOne/credentials/certificate'),
                privateKeyPath: path.join(rootPath, '../../test/data/connectionOne/credentials/privateKey')
            };
            fabricClientConnection = FabricConnectionFactory.createFabricClientConnection(connectionData) as FabricClientConnection;
            fabricClientConnection['gateway'] = gatewayStub;

            await fabricClientConnection.connect();
            gatewayStub.connect.should.have.been.called;
            errorSpy.should.not.have.been.called;
        });

        it('should connect with an already loaded client connection', async () => {
            const connectionData: any = {
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                certificatePath: path.join(rootPath, '../../test/data/connectionOne/credentials/certificate'),
                privateKeyPath: path.join(rootPath, '../../test/data/connectionOne/credentials/privateKey')
            };
            fabricClientConnection = FabricConnectionFactory.createFabricClientConnection(connectionData) as FabricClientConnection;
            fabricClientConnection['gateway'] = gatewayStub;

            should.exist(FabricConnectionFactory['clientConnection']);
            await fabricClientConnection.connect();
            gatewayStub.connect.should.have.been.called;
            errorSpy.should.not.have.been.called;
        });

        it('should connect to a fabric with a .yaml connection profile', async () => {
            const connectionYamlData: any = {
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionYaml/connection.yaml'),
                certificatePath: path.join(rootPath, '../../test/data/connectionYaml/credentials/certificate'),
                privateKeyPath: path.join(rootPath, '../../test/data/connectionYaml/credentials/privateKey')
            };
            fabricClientConnectionYaml = FabricConnectionFactory.createFabricClientConnection(connectionYamlData) as FabricClientConnection;
            fabricClientConnectionYaml['gateway'] = gatewayStub;

            await fabricClientConnectionYaml.connect();
            gatewayStub.connect.should.have.been.called;
            errorSpy.should.not.have.been.called;
        });

        it('should connect to a fabric with a .yml connection profile', async () => {
            const otherConnectionYmlData: any = {
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionYaml/otherConnectionProfile.yml'),
                certificatePath: path.join(rootPath, '../../test/data/connectionYaml/credentials/certificate'),
                privateKeyPath: path.join(rootPath, '../../test/data/connectionYaml/credentials/privateKey')
            };
            otherFabricClientConnectionYml = FabricConnectionFactory.createFabricClientConnection(otherConnectionYmlData) as FabricClientConnection;
            otherFabricClientConnectionYml['gateway'] = gatewayStub;

            await otherFabricClientConnectionYml.connect();
            gatewayStub.connect.should.have.been.called;
            errorSpy.should.not.have.been.called;
        });
    });

    describe('connection failure', () => {
        it('should show an error if connection profile is not .yaml or .json file', async () => {
            const connectionWrongData: any = {
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionYaml/connection'),
                certificatePath: path.join(rootPath, '../../test/data/connectionYaml/credentials/certificate'),
                privateKeyPath: path.join(rootPath, '../../test/data/connectionYaml/credentials/privateKey')
            };
            fabricClientConnectionWrong = FabricConnectionFactory.createFabricClientConnection(connectionWrongData) as FabricClientConnection;

            await fabricClientConnectionWrong.connect();
            errorSpy.should.have.been.calledWith('Connection profile must be in JSON or yaml format');
        });
    });

    describe('getConnectionDetails', () => {
        it('should return connection details for a client connection', async () => {
            const connectionProfilePath: string = path.join(rootPath, '../../test/data/connectionOne/connection.json');
            const certificatePath: string = path.join(rootPath, '../../test/data/connectionOne/credentials/certificate');
            const privateKeyPath: string = path.join(rootPath, '../../test/data/connectionOne/credentials/privateKey');
            const connectionData: any = {
                connectionProfilePath: connectionProfilePath,
                certificatePath: certificatePath,
                privateKeyPath: privateKeyPath
            };
            fabricClientConnection = FabricConnectionFactory.createFabricClientConnection(connectionData) as FabricClientConnection;
            fabricClientConnection['gateway'] = gatewayStub;

            const connectionDetails: any = fabricClientConnection.getConnectionDetails();
            connectionDetails.connectionProfilePath.should.equal(connectionProfilePath);
            connectionDetails.certificatePath.should.equal(certificatePath);
            connectionDetails.privateKeyPath.should.equal(privateKeyPath);
            errorSpy.should.not.have.been.called;
        });
    });

});
