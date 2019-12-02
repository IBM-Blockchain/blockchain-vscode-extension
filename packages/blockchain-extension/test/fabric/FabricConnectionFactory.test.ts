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
import * as sinon from 'sinon';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import { FabricConnectionFactory } from '../../extension/fabric/FabricConnectionFactory';
import { IFabricGatewayConnection } from 'ibm-blockchain-platform-common';

// tslint:disable no-var-requires
chai.should();
chai.use(sinonChai);

describe('FabricConnectionFactory', () => {
    let mySandBox: sinon.SinonSandbox;

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
    });

    afterEach(() => {
        mySandBox.restore();
    });

    describe('createFabricGatewayConnection', () => {

        it('should create a fabric gateway connection', async () => {
            const rootPath: string = path.dirname(__dirname);
            const profilePath: string = path.join(rootPath, '../../test/data/connectionTwo/connection.json');
            const connection: IFabricGatewayConnection = FabricConnectionFactory.createFabricGatewayConnection(profilePath);
            connection.should.exist;
        });

        it('should resuse connection if have one', async () => {
            const rootPath: string = path.dirname(__dirname);
            const profilePath: string = path.join(rootPath, '../../test/data/connectionTwo/connection.json');
            FabricConnectionFactory.createFabricGatewayConnection(profilePath);
            const connection: IFabricGatewayConnection = FabricConnectionFactory.createFabricGatewayConnection(profilePath);
            connection.should.exist;
        });
    });
});
