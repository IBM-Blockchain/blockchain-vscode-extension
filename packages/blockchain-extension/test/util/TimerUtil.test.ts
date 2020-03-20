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
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as vscode from 'vscode';
import { TimerUtil } from '../../extension/util/TimerUtil';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricEnvironmentRegistryEntry } from 'ibm-blockchain-platform-common';

// tslint:disable no-unused-expression
chai.use(sinonChai);

describe('TimerUtil Test', () => {

    let mySandBox: sinon.SinonSandbox;

    let clock: sinon.SinonFakeTimers;
    let executeCommandStub: sinon.SinonStub;

    before(async () => {
        mySandBox = sinon.createSandbox();
    });

    beforeEach(() => {
        clock = sinon.useFakeTimers();
        executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
    });

    afterEach(() => {
        clock.restore();
        mySandBox.restore();
    });

    describe('setInterval', () => {
        it('should call the set command at a given interval', () => {
            const entry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry({ name: 'myFabric' });
            const result: NodeJS.Timeout = TimerUtil.setInterval([{command: ExtensionCommands.CONNECT_TO_ENVIRONMENT, args: [entry]}], 10000);
            clock.tick(10000);

            executeCommandStub.should.have.been.calledOnceWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, entry);
            result.should.exist;
        });

        it('should call multiple commands at a given interval', () => {
            const entry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry({ name: 'myFabric' });
            const result: NodeJS.Timeout = TimerUtil.setInterval([
                {command: ExtensionCommands.CONNECT_TO_ENVIRONMENT, args: [entry]},
                {command: ExtensionCommands.DISCONNECT_ENVIRONMENT, args: []}
            ], 10000);
            clock.tick(10000);

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.CONNECT_TO_ENVIRONMENT, entry);
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
            result.should.exist;
        });
    });

    describe('cancelInterval', () => {
        it('should cancel the interval', () => {
            const timeoutObj: any = {name: 'timeout'};
            const clearIntervalStub: sinon.SinonStub = mySandBox.stub(global, 'clearInterval');

            TimerUtil.cancelInterval(timeoutObj);

            clearIntervalStub.should.have.been.calledWith(timeoutObj);
        });
    });

    describe('sleep', () => {

        it('should delay for the specified time', async () => {
            const stub: sinon.SinonStub = mySandBox.stub();
            const p: Promise<any> = TimerUtil.sleep(2000).then(stub);
            sinon.assert.notCalled(stub);

            clock.tick(2300);
            await p.should.be.eventually.fulfilled;
            sinon.assert.calledOnce(stub);
        });
    });
});
