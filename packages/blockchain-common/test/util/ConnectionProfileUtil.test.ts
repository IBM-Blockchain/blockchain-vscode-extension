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

import { ConnectionProfileUtil } from '../../src/util/ConnectionProfileUtil';

import * as path from 'path';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);
// tslint:disable no-unused-expression
describe('ConnectionProfileUtil', () => {

    let sandbox: sinon.SinonSandbox;

    beforeEach(async () => {
        sandbox = sinon.createSandbox();
    });

    afterEach(async () => {
        sandbox.restore();
    });
    describe('#readConnectionProfile', () => {

        it('should read the connection profile (json)', async () => {
            const profilePath: string = path.join(__dirname, '../data/connectionProfiles/connection.json');
            const result: any = await ConnectionProfileUtil.readConnectionProfile(profilePath);
            result.name.should.equal('hlfv1');
        });

        it('should read the connection profile (yaml)', async () => {
            const profilePath: string = path.join(__dirname, '../data/connectionProfiles/connection.yaml');
            const result: any = await ConnectionProfileUtil.readConnectionProfile(profilePath);
            result.name.should.equal('hlfv1');
        });

        it('should throw an error if not a json or yml file', async () => {
            const profilePath: string = path.join(__dirname, '../data/connectionProfiles/connection.bad');
            await ConnectionProfileUtil.readConnectionProfile(profilePath).should.eventually.be.rejectedWith('Connection profile must be in JSON or yaml format');
        });
    });
});
