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

import { FabricCertificateAuthority } from '../../src/fabric/FabricCertificateAuthority';
import * as FabricCAServices from 'fabric-ca-client';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as fs from 'fs-extra';
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../../src/logging/OutputAdapter';

// tslint:disable no-unused-expression
const should: Chai.Should = chai.should();

describe('FabricCertificateAuthority', () => {
    let mySandBox: sinon.SinonSandbox;

    let readFileStub: sinon.SinonStub;
    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
        readFileStub = mySandBox.stub(fs, 'readFile');
    });

    afterEach(() => {
        mySandBox.restore();
    });

    describe('enroll', () => {

        it('should return certificate and key from enrollment using JSON connection profile', async () => {
            readFileStub.resolves(`{
                "certificateAuthorities": {
                    "ca0": {
                        "url": "http://ca0url"
                    },
                    "ca1": {
                        "url": "http://ca1url"
                    }
                }
            }`);

            const enroll: sinon.SinonStub = mySandBox.stub(FabricCAServices.prototype, 'enroll').resolves({
                certificate: '---CERT---',
                key: {
                    toBytes: (): string => '---KEY---'
                }
            });
            const {certificate, privateKey} = await FabricCertificateAuthority.enroll('connection.json', 'some_id', 'some_secret');

            enroll.should.have.been.calledWith({enrollmentID: 'some_id', enrollmentSecret: 'some_secret'});
            certificate.should.equal('---CERT---');
            privateKey.should.equal('---KEY---');
        });

        it('should return certificate and key from enrollment using YAML connection profile', async () => {
            readFileStub.resolves(`---
            certificateAuthorities:
                ca0:
                    url: http://ca0url
                ca1:
                    url: http://ca1url`);

            const enroll: sinon.SinonStub = mySandBox.stub(FabricCAServices.prototype, 'enroll').resolves({
                certificate: '---CERT---',
                key: {
                    toBytes: (): string => '---KEY---'
                }
            });
            const {certificate, privateKey} = await FabricCertificateAuthority.enroll('connection.yaml', 'some_id', 'some_secret');

            enroll.should.have.been.calledWith({enrollmentID: 'some_id', enrollmentSecret: 'some_secret'});
            certificate.should.equal('---CERT---');
            privateKey.should.equal('---KEY---');
        });

        it('should throw an error if unable to enroll', async () => {
            const logSpy: sinon.SinonSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');

            const error: Error = new Error('Cannot read file');
            readFileStub.rejects(error);

            const enroll: sinon.SinonSpy = mySandBox.spy(FabricCAServices.prototype, 'enroll');
            await FabricCertificateAuthority.enroll('connection.yaml', 'some_id', 'some_secret').should.be.rejectedWith(error);

            enroll.should.not.have.been.called;
            logSpy.should.have.been.calledOnceWithExactly(LogType.ERROR, `Unable to enroll with certificate authority: ${error.message}`, `Unable to enroll with certificate authority: ${error.toString()}`);
        });
    });
});
