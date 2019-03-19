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
import * as vscode from 'vscode';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';

import { TestUtil } from '../TestUtil';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { ExtensionCommands } from '../../ExtensionCommands';

// tslint:disable no-unused-expression
chai.should();
chai.use(sinonChai);

describe('DebugCommandListCommand', () => {

    let mySandBox: sinon.SinonSandbox;
    let showDebugCommandListStub: sinon.SinonStub;
    let executeCommandStub: sinon.SinonStub;

    before(async () => {
        await TestUtil.setupTests();
    });

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();

        showDebugCommandListStub = mySandBox.stub(UserInputUtil, 'showDebugCommandList').resolves({label: 'Submit transaction', data: ExtensionCommands.SUBMIT_TRANSACTION});

        executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
        executeCommandStub.callThrough();
        executeCommandStub.withArgs(ExtensionCommands.SUBMIT_TRANSACTION).resolves();
    });

    afterEach(async () => {
        mySandBox.restore();
    });

    it('should show the commands and run the chosen one', async () => {
        await vscode.commands.executeCommand(ExtensionCommands.DEBUG_COMMAND_LIST);

        executeCommandStub.should.have.been.calledWith(ExtensionCommands.SUBMIT_TRANSACTION);
    });

    it('should handle cancel', async () => {
        showDebugCommandListStub.resolves();

        await vscode.commands.executeCommand(ExtensionCommands.DEBUG_COMMAND_LIST);

        showDebugCommandListStub.should.have.been.called;
        executeCommandStub.should.have.been.calledOnceWithExactly(ExtensionCommands.DEBUG_COMMAND_LIST);
    });
});
