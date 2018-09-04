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
import { FabricConnectionFactory} from '../../src/fabric/FabricConnectionFactory';
import * as fabricClient from 'fabric-client';
import * as path from 'path';

import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';

chai.should();
chai.use(sinonChai);

// tslint:disable no-unused-expression
describe('FabricClientConnection', () => {

    let fabricClientStub: sinon.SinonStubbedInstance<fabricClient>;
    let fabricClientConnection: FabricClientConnection;

    let mySandBox: sinon.SinonSandbox;

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();

        const rootPath = path.dirname(__dirname);

        const connectionData = {
            connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
            certificatePath: path.join(rootPath, '../../test/data/connectionOne/credentials/certificate'),
            privateKeyPath: path.join(rootPath, '../../test/data/connectionOne/credentials/privateKey')
        };

        fabricClientConnection = FabricConnectionFactory.createFabricClientConnection(connectionData) as FabricClientConnection;

        fabricClientStub = mySandBox.createStubInstance(fabricClient);

        mySandBox.stub(fabricClient, 'loadFromConfig').resolves(fabricClientStub);

        fabricClientStub.getMspid.returns('myMSPId');
    });

    afterEach(() => {
        mySandBox.restore();
    });

    describe('connect', () => {
        it('should connect to a fabric', async () => {
            await fabricClientConnection.connect();
            fabricClientStub.setAdminSigningIdentity.should.have.been.calledWith(sinon.match.string, sinon.match.string, 'myMSPId');
        });
    });

});
