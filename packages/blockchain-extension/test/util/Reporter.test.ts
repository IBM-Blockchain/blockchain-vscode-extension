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
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';
import { Reporter } from '../../extension/util/Reporter';

chai.should();
chai.use(sinonChai);

// tslint:disable no-unused-expression
describe('Reporter Tests', () => {

    let mySandBox: sinon.SinonSandbox;

    beforeEach(() => {
        mySandBox = sinon.createSandbox();
    });

    afterEach(() => {
        mySandBox.restore();
    });

    it('should send telemetry event if production release', async () => {
        const reporter: Reporter = Reporter.instance();

        const sendSpy: sinon.SinonSpy = mySandBox.stub(reporter['telemetryReporter'], 'sendTelemetryEvent');
        mySandBox.stub(ExtensionUtil, 'getPackageJSON').returns({production: true});

        reporter.sendTelemetryEvent('testEvent', {test: 'testdata'});

        sendSpy.should.have.been.calledWith('testEvent', {test: 'testdata'});
    });

    it('shouldnt send telemetry event if not a production release', async () => {
        const reporter: Reporter = Reporter.instance();

        const sendSpy: sinon.SinonSpy = mySandBox.stub(reporter['telemetryReporter'], 'sendTelemetryEvent');
        mySandBox.stub(ExtensionUtil, 'getPackageJSON').returns({production: false});

        reporter.sendTelemetryEvent('testEvent', {test: 'testdata'});

        sendSpy.should.not.have.been.called;
    });

    it('should dispose the reporter', async () => {
        const reporter: Reporter = Reporter.instance();
        const disposeSpy: sinon.SinonSpy = mySandBox.stub(reporter['telemetryReporter'], 'dispose');

        await reporter.dispose();
        disposeSpy.should.have.been.called;
    });

});
