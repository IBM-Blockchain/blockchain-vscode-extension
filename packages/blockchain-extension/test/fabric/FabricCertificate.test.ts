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
import { FabricCertificate } from '../../extension/fabric/FabricCertificate';
import { FabricRuntimeUtil } from 'ibm-blockchain-platform-common';

// tslint:disable no-var-requires
const {Certificate} = require('@fidm/x509');
chai.should();
chai.use(sinonChai);

describe('FabricCertificate', () => {
    let mySandBox: sinon.SinonSandbox;

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
    });

    afterEach(() => {
        mySandBox.restore();
    });

    describe('contructor', () => {

        it('should create a certificate', async () => {
            const rootPath: string = path.dirname(__dirname);

            const certPath: string = path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate');
            const cert: string = FabricCertificate.loadFileFromDisk(certPath);
            const certificate: FabricCertificate = new FabricCertificate(cert);

            certificate.should.be.instanceof(FabricCertificate);
        });
    });

    describe('getCommonName', () => {
        it('should get the common name from the cert', async () => {
            const rootPath: string = path.dirname(__dirname);

            const certPath: string = path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate');
            const cert: string = FabricCertificate.loadFileFromDisk(certPath);
            const certificate: FabricCertificate = new FabricCertificate(cert);

            certificate.getCommonName().should.equal(FabricRuntimeUtil.ADMIN_USER);
        });
    });

    describe('validateCertificate', () => {
        it('should throw an error if the certificate is invalid', async () => {
            const error: Error = new Error('invalid body');
            const fromPemStub: sinon.SinonStub = mySandBox.stub(Certificate, 'fromPEM').throws(error);
            const cert: string = 'someCert';

            ((): any => {
                FabricCertificate.validateCertificate(cert);
            }).should.throw(`Invalid certificate: ${error.message}`);

            fromPemStub.should.have.been.calledOnceWithExactly(cert);
        });

        it('should return if certificate is valid', async () => {
            const fromPemStub: sinon.SinonStub = mySandBox.stub(Certificate, 'fromPEM').returns(undefined);
            const cert: string = 'someCert';

            const error: Error = new Error('invalid body');

            ((): any => {
                FabricCertificate.validateCertificate(cert);
            }).should.not.throw(`Invalid certificate: ${error.message}`);

            fromPemStub.should.have.been.calledOnceWithExactly(cert);
       });
    });

    describe('validatePrivateKey', () => {
        it(`should throw an error if the private key doesn't have '-----BEGIN PRIVATE KEY-----'`, async () => {
            const key: string = `
            someKey
            -----END PRIVATE KEY-----
            `;

            ((): any => {
                FabricCertificate.validatePrivateKey(key);
            }).should.throw(`Invalid private key`);

        });

        it(`should throw an error if the private key doesn't have '-----END PRIVATE KEY-----'`, async () => {
            const key: string = `
            -----BEGIN PRIVATE KEY-----
            someKey
            `;

            ((): any => {
                FabricCertificate.validatePrivateKey(key);
            }).should.throw(`Invalid private key`);

        });

        it(`should return if private key is valid`, async () => {
            const key: string = `
            -----BEGIN PRIVATE KEY-----
            someKey
            -----END PRIVATE KEY-----
            `;

            ((): any => {
                FabricCertificate.validatePrivateKey(key);
            }).should.not.throw(`Invalid private key`);

        });
    });

    describe('getAttributes', () => {
        it('should return empty array if no attributes can be found', async () => {

            mySandBox.stub(Certificate, 'fromPEM').returns({
                extensions: [
                    {
                        id: '1'
                    },
                    {
                        id: '2'
                    }
                ]
            });

            const certificate: FabricCertificate = new FabricCertificate('someCert');
            certificate.getAttributes().should.deep.equal({});
        });

        it('should return attributes if they exist', async () => {

            const objStr: string = JSON.stringify({attrs: {attr1: 'hello', attr2: 'world'}});
            const buffer: Buffer = Buffer.from(objStr);

            mySandBox.stub(Certificate, 'fromPEM').returns({
                extensions: [
                    {
                        id: '1.8.7.6.5.4.3.2.1'
                    },
                    {
                        id: '1.2.3.4.5.6.7.8.1', value: buffer
                    }
                ]
            });

            const certificate: FabricCertificate = new FabricCertificate('someCert');
            certificate.getAttributes().should.deep.equal({attr1: 'hello', attr2: 'world'});
        });
    });
});
