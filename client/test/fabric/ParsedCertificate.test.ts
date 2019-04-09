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
import * as fs from 'fs-extra';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import { ParsedCertificate } from '../../src/fabric/ParsedCertificate';
import { FabricRuntimeUtil } from '../../src/fabric/FabricRuntimeUtil';

// tslint:disable no-var-requires
const {Certificate} = require('@fidm/x509');

const should: Chai.Should = chai.should();
chai.use(sinonChai);

describe('ParsedCertificate', () => {
    let mySandBox: sinon.SinonSandbox;

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
    });

    afterEach(() => {
        mySandBox.restore();
    });

    describe('contructor', () => {

        it('should create a parsed certificate', async () => {
            const rootPath: string = path.dirname(__dirname);

            const certPath: string = path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate');
            const parsedCertificate: ParsedCertificate = new ParsedCertificate(certPath);

            parsedCertificate.should.be.instanceof(ParsedCertificate);
        });
    });

    describe('getCommonName', () => {
        it('should get the common name from the cert', async () => {
            const rootPath: string = path.dirname(__dirname);

            const certPath: string = path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate');
            const parsedCertificate: ParsedCertificate = new ParsedCertificate(certPath);

            parsedCertificate.getCommonName().should.equal(FabricRuntimeUtil.ADMIN_USER);
        });
    });

    describe('validPEM', () => {
        it('should throw error if file cannot be read', async () => {
            const readFileSyncStub: sinon.SinonStub = mySandBox.stub(fs, 'readFileSync').throws({message: 'cant read file'});
            const CertificateStub: sinon.SinonStub = mySandBox.stub(Certificate, 'fromPEM');
            const filePath: string = '/some/path';
            const type: string = 'certificate';

            ((): any => {
                ParsedCertificate.validPEM(filePath, type);
            }).should.throw('Could not validate certificate: cant read file');

            readFileSyncStub.should.have.been.calledWith(filePath);
            CertificateStub.should.not.have.been.called;
        });

        it('should validate certificate PEM', async () => {
            const readFileSyncStub: sinon.SinonStub = mySandBox.stub(fs, 'readFileSync').returns('loadedfile');
            mySandBox.stub(Certificate, 'fromPEM').returns(undefined);
            const filePath: string = '/some/path';
            const type: string = 'certificate';

            should.equal(ParsedCertificate.validPEM(filePath, type), undefined);
            readFileSyncStub.should.have.been.calledWith(filePath);
        });

        it('should throw error if certificate PEM is invalid', async () => {
            const readFileSyncStub: sinon.SinonStub = mySandBox.stub(fs, 'readFileSync').returns('loadedfile');
            mySandBox.stub(Certificate, 'fromPEM').throws({message: 'invalid body'});
            const filePath: string = '/some/path';
            const type: string = 'certificate';

            ((): any => {
                ParsedCertificate.validPEM(filePath, type);
            }).should.throw('Could not validate certificate: invalid body');

            readFileSyncStub.should.have.been.calledWith(filePath);
        });

        it('should validate private key PEM', async () => {
            const readFileSyncStub: sinon.SinonStub = mySandBox.stub(fs, 'readFileSync').returns(`-----BEGIN PRIVATE KEY----- some data -----END PRIVATE KEY-----`);
            const CertificateStub: sinon.SinonStub = mySandBox.stub(Certificate, 'fromPEM').returns(undefined);
            const filePath: string = '/some/path';
            const type: string = 'private key';

            should.equal(ParsedCertificate.validPEM(filePath, type), undefined);
            readFileSyncStub.should.have.been.calledWith(filePath);
            CertificateStub.should.not.have.been.called;
        });

        it('should throw error if private key PEM is invalid', async () => {
            const readFileSyncStub: sinon.SinonStub = mySandBox.stub(fs, 'readFileSync').returns(`-----BEGIN PRIVATE KEY----- some data`);
            const CertificateStub: sinon.SinonStub = mySandBox.stub(Certificate, 'fromPEM').returns(undefined);
            const filePath: string = '/some/path';
            const type: string = 'private key';
            ((): any => {
                ParsedCertificate.validPEM(filePath, type);
            }).should.throw('Could not validate private key: Invalid private key');

            readFileSyncStub.should.have.been.calledWith(filePath);
            CertificateStub.should.not.have.been.called;
        });
    });
});
