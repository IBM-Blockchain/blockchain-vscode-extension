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

import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';
import { FabricChaincode, FabricIdentity } from '../..';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);
// tslint:disable no-unused-expression
describe('fabricModel', () => {

    let sandbox: sinon.SinonSandbox;

    beforeEach(async () => {
        sandbox = sinon.createSandbox();
    });

    afterEach(async () => {
        sandbox.restore();
    });

    it('should create a fabric chaincode', () => {
        const myChaincode: FabricChaincode = new FabricChaincode('myChaincode', '0.0.1');

        myChaincode.name.should.equal('myChaincode');
        myChaincode.version.should.equal('0.0.1');
    });

    it('should create a fabric identity', () => {
        const myIdentity: FabricIdentity = new FabricIdentity('myIdentity', 'myCert', 'myKey', 'mymspid');

        myIdentity.name.should.equal('myIdentity');
        myIdentity.cert.should.equal('myCert');
        myIdentity.private_key.should.equal('myKey');
        myIdentity.msp_id.should.equal('mymspid');
    });
});
