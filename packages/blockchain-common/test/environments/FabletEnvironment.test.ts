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

import { FabletEnvironment } from '../../src/environments/FabletEnvironment';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as path from 'path';
import { FabricNode, FabricNodeType } from '../../src/fabricModel/FabricNode';

chai.should();
chai.use(chaiAsPromised);

describe('FabletEnvironment', () => {

    let environment: FabletEnvironment;

    beforeEach(() => {
        environment = new FabletEnvironment('fabletEnvironment', path.join('test', 'data', 'fablet'), 'http://console.fablet.example.com');
    });

    describe('#getAllOrganizationNames', () => {

        it('should do nothing', async () => {
            await environment.getAllOrganizationNames().should.eventually.deep.equal([]);
        });

    });

    describe('#getNodes', () => {

        it('should do nothing', async () => {
            await environment.getNodes().should.eventually.deep.equal([]);
        });

    });

    describe('#updateNode', () => {

        it('should do nothing', async () => {
            const node: FabricNode = {
                short_name: 'org1peer',
                name: 'Org1 Peer',
                api_url: 'http://org1peer-api.fablet.example.org',
                type: FabricNodeType.PEER,
                hidden: false
            };
            await environment.updateNode(node);
        });

    });

    describe('#deleteNode', () => {

        it('should do nothing', async () => {
            const node: FabricNode = {
                short_name: 'org1peer',
                name: 'Org1 Peer',
                api_url: 'http://org1peer-api.fablet.example.org',
                type: FabricNodeType.PEER,
                hidden: false
            };
            await environment.deleteNode(node);
        });

    });

    describe('#requireSetup', () => {

        it('should return false', async () => {
            await environment.requireSetup().should.eventually.be.false;
        });

    });

    describe('#getWalletsAndIdentities', () => {

        it('should do nothing', async () => {
            await environment.getWalletsAndIdentities().should.eventually.deep.equal([]);
        });

    });

    describe('#getGateways', () => {

        it('should do nothing', async () => {
            await environment.getGateways().should.eventually.deep.equal([]);
        });

    });

    describe('#getWalletNames', () => {

        it('should do nothing', async () => {
            await environment.getWalletNames().should.eventually.deep.equal([]);
        });

    });

    describe('#getIdentities', () => {

        it('should do nothing', async () => {
            await environment.getIdentities('Org1').should.eventually.deep.equal([]);
        });

    });

    describe('#getFabricGateways', () => {

        it('should do nothing', async () => {
            await environment.getFabricGateways().should.eventually.deep.equal([]);
        });

    });

});
