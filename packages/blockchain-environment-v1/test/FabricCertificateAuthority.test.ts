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

import * as FabricCAServices from 'fabric-ca-client';
import * as sinon from 'sinon';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { LogType, ConsoleOutputAdapter, OutputAdapter } from 'ibm-blockchain-platform-common';
import { FabricCertificateAuthority } from '../src/FabricCertificateAuthority';

chai.use(chaiAsPromised);

// tslint:disable no-unused-expression

describe('FabricCertificateAuthority', () => {
    let mySandBox: sinon.SinonSandbox;
    let fabricCertificateAuthority: FabricCertificateAuthority;
    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
        fabricCertificateAuthority = FabricCertificateAuthority.instance();
    });

    afterEach(() => {
        mySandBox.restore();
    });

    class TestOutputAdapter extends OutputAdapter {

        public static instance(): TestOutputAdapter {
            return TestOutputAdapter._instance;
        }

        private static _instance: TestOutputAdapter = new TestOutputAdapter();

        private constructor() {
            super();
        }

        public log(type: LogType, popupMessage: string, outputMessage?: string, stackTrace?: string): void {
            super.log(type, popupMessage, outputMessage, stackTrace);
        }
    }

    describe('enroll', () => {

        it('should return certificate and key from enrollment', async () => {
            const enroll: sinon.SinonStub = mySandBox.stub(FabricCAServices.prototype, 'enroll').resolves({
                certificate: '---CERT---',
                key: {
                    toBytes: (): string => '---KEY---'
                }
            });
            const { certificate, privateKey } = await fabricCertificateAuthority.enroll('http://ca1url', 'some_id', 'some_secret');
            enroll.should.have.been.calledWith({ enrollmentID: 'some_id', enrollmentSecret: 'some_secret' });
            certificate.should.equal('---CERT---');
            privateKey.should.equal('---KEY---');
        });

        it('should throw an error if unable to enroll', async () => {
            const logSpy: sinon.SinonSpy = mySandBox.spy(ConsoleOutputAdapter.instance(), 'log');

            const error: Error = new Error('Some Error');

            const enroll: sinon.SinonStub = mySandBox.stub(FabricCAServices.prototype, 'enroll').throws(error);
            await fabricCertificateAuthority.enroll('http://ca1url', 'some_id', 'some_secret').should.be.rejectedWith(error);

            enroll.should.have.been.calledOnce;
            logSpy.should.have.been.calledOnceWithExactly(LogType.ERROR, `Unable to enroll with certificate authority: ${error.message}`, `Unable to enroll with certificate authority: ${error.toString()}`);
        });

        it('should throw an error if unable to enroll and use custom output adapter', async () => {
            const logSpy: sinon.SinonSpy = mySandBox.spy(TestOutputAdapter.instance(), 'log');
            const error: Error = new Error('Some Error');

            const enroll: sinon.SinonStub = mySandBox.stub(FabricCAServices.prototype, 'enroll').throws(error);
            await fabricCertificateAuthority.enroll('http://ca1url', 'some_id', 'some_secret', undefined, TestOutputAdapter.instance()).should.be.rejectedWith(error);

            enroll.should.have.been.calledOnce;
            logSpy.should.have.been.calledOnceWithExactly(LogType.ERROR, `Unable to enroll with certificate authority: ${error.message}`, `Unable to enroll with certificate authority: ${error.toString()}`);
        });
    });
});
