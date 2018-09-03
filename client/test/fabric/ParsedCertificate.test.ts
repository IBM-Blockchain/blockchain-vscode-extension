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
import * as path from 'path';

import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import { ParsedCertificate } from '../../src/fabric/ParsedCertificate';

chai.should();
chai.use(sinonChai);

describe('ParsedCertificate', () => {

    describe('contructor', () => {

        it('should create a parsed certificate', async () => {
            const rootPath = path.dirname(__dirname);

            const certPath = path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate');
            const parsedCertificate = new ParsedCertificate(certPath);

            parsedCertificate.should.be.instanceof(ParsedCertificate);
        });
    });

    describe('getCommonName', () => {
        it('should get the common name from the cert', async () => {
            const rootPath = path.dirname(__dirname);

            const certPath = path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate');
            const parsedCertificate = new ParsedCertificate(certPath);

            parsedCertificate.getCommonName().should.equal('Admin@org1.example.com');
        });
    });
});
