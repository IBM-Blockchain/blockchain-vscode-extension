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
import * as vscode from 'vscode';
import { TestUtil } from '../TestUtil';
import { GlobalState, ExtensionData, DEFAULT_EXTENSION_DATA, EXTENSION_DATA_KEY } from '../../extension/util/GlobalState';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from 'ibm-blockchain-platform-common';

chai.use(sinonChai);

// tslint:disable no-unused-expression
describe('GlobalState', () => {

    let mySandBox: sinon.SinonSandbox;
    let context: vscode.ExtensionContext;

    before(async () => {
        mySandBox = sinon.createSandbox();
        await TestUtil.setupTests(mySandBox);
    });

    beforeEach(async () => {
        context = GlobalState.getExtensionContext();

        const extensionData: ExtensionData = DEFAULT_EXTENSION_DATA;
        await GlobalState.update(extensionData);
    });

    afterEach(() => {
        mySandBox.restore();
    });

    describe('get', () => {
        it('should get global state', async () => {
            const getStateSpy: sinon.SinonSpy = mySandBox.spy(context.globalState, 'get');

            const extensionData: ExtensionData = GlobalState.get();

            extensionData.should.deep.equal(DEFAULT_EXTENSION_DATA);
            getStateSpy.should.have.been.calledOnceWith(EXTENSION_DATA_KEY, DEFAULT_EXTENSION_DATA);

        });

        it('should handle any problems getting the global state', async () => {
            const error: Error = new Error(`can't get global state`);
            const getStateStub: sinon.SinonStub = mySandBox.stub(context.globalState, 'get').throws(error);

            const logSpy: sinon.SinonSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');

            ((): any => {
                GlobalState.get();
            }).should.throw(error);

            getStateStub.should.have.been.calledOnceWith(EXTENSION_DATA_KEY, DEFAULT_EXTENSION_DATA);
            logSpy.should.have.been.calledOnceWithExactly(LogType.ERROR, `Unable to get extension's global state: ${error.message}`, `Unable to get extension's global state: ${error.toString()}`);

        });
    });

    describe('update', () => {
        it('should update global state', async () => {
            const updateStateSpy: sinon.SinonSpy = mySandBox.spy(context.globalState, 'update');

            const newExtensionData: ExtensionData = DEFAULT_EXTENSION_DATA;
            newExtensionData.generatorVersion = '0.0.0';

            await GlobalState.update(newExtensionData);

            updateStateSpy.should.have.been.calledOnceWith(EXTENSION_DATA_KEY, newExtensionData);

        });

        it('should handle any problems updating the global state', async () => {
            const error: Error = new Error(`can't update global state`);
            const updateStateStub: sinon.SinonSpy = mySandBox.stub(context.globalState, 'update').throws(error);

            const newExtensionData: ExtensionData = DEFAULT_EXTENSION_DATA;
            newExtensionData.generatorVersion = '0.0.0';

            const logSpy: sinon.SinonSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');

            await GlobalState.update(newExtensionData).should.be.rejectedWith(error);

            updateStateStub.should.have.been.calledOnceWith(EXTENSION_DATA_KEY, newExtensionData);
            logSpy.should.have.been.calledOnceWithExactly(LogType.ERROR, `Unable to update extension's global state: ${error.message}`, `Unable to update extension's global state: ${error.toString()}`);

        });
    });

    describe('reset', () => {
        it('should reset global state', async () => {

            const extensionData: ExtensionData = DEFAULT_EXTENSION_DATA;
            extensionData.generatorVersion = '0.0.0';
            await GlobalState.update(extensionData);

            const writtenState: ExtensionData = GlobalState.get();
            writtenState.should.deep.equal(extensionData);

            const updateStateSpy: sinon.SinonSpy = mySandBox.spy(context.globalState, 'update');

            await GlobalState.reset();

            updateStateSpy.should.have.been.calledOnceWith(EXTENSION_DATA_KEY, DEFAULT_EXTENSION_DATA);

        });
    });
});
