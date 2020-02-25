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
import * as vscode from 'vscode';

import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';
import { TestUtil } from '../TestUtil';
import { TemporaryCommandRegistry } from '../../extension/dependencies/TemporaryCommandRegistry';
import { ExtensionCommands } from '../../ExtensionCommands';

chai.should();
chai.use(sinonChai);
const should: Chai.Should = chai.should();
// tslint:disable no-unused-expression
describe('TemporaryCommandRegistry Tests', () => {

    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();

    before(async () => {
        await TestUtil.setupTests(mySandBox);
    });

    afterEach(() => {
        mySandBox.restore();
    });

    it('should delay execution of commands', async () => {

        const numberOfCommands: number = ExtensionUtil.getPackageJSON().actualActivationEvents.onCommand.length;

        const registerCommandStub: sinon.SinonStub = mySandBox.stub(vscode.commands, 'registerCommand');
        registerCommandStub.returns(new vscode.Disposable((): void => { return; }));
        registerCommandStub.yields(undefined); // Somehow this works alongside the return
        const tempRegistry: TemporaryCommandRegistry = TemporaryCommandRegistry.instance();

        tempRegistry.createTempCommands(true);

        tempRegistry['delayExecution'].should.equal(true);
        should.not.exist(tempRegistry['alternativeCommand']);
        registerCommandStub.callCount.should.equal(numberOfCommands - 2);
        tempRegistry['tempCommands'].length.should.deep.equal(numberOfCommands - 2); // Should register all but the 'Open PreReq' & 'Open ReleaseNotes' command

        tempRegistry.restoreCommands();

        registerCommandStub.should.not.have.been.calledWith(ExtensionCommands.OPEN_PRE_REQ_PAGE);
        tempRegistry['delayedCommandsToExecute'].size.should.equal(numberOfCommands - 2);
        tempRegistry['tempCommands'].should.deep.equal([]);

        const executeStub: sinon.SinonStub = mySandBox.stub(vscode.commands, 'executeCommand').resolves();

        await tempRegistry.executeStoredCommands();
        executeStub.callCount.should.equal(numberOfCommands - 2);
        tempRegistry['delayedCommandsToExecute'].size.should.equal(0);
    });

    it('should not delay execution of commands', async () => {
        const numberOfCommands: number = ExtensionUtil.getPackageJSON().actualActivationEvents.onCommand.length;

        const registerCommandStub: sinon.SinonStub = mySandBox.stub(vscode.commands, 'registerCommand');
        registerCommandStub.returns(new vscode.Disposable((): void => { return; }));
        registerCommandStub.yields(undefined); // Somehow this works alongside the return
        const tempRegistry: TemporaryCommandRegistry = TemporaryCommandRegistry.instance();

        const executeStub: sinon.SinonStub = mySandBox.stub(vscode.commands, 'executeCommand').resolves();

        tempRegistry.createTempCommands(false, 'some.otherCommand');

        tempRegistry['delayExecution'].should.equal(false);
        tempRegistry['alternativeCommand'].should.equal('some.otherCommand');
        registerCommandStub.callCount.should.equal(numberOfCommands - 2);
        tempRegistry['tempCommands'].length.should.deep.equal(numberOfCommands - 2); // Should register all but the 'Open PreReq' & 'Open ReleaseNotes' command
        executeStub.callCount.should.equal(numberOfCommands - 2);
        executeStub.should.have.been.calledWith('some.otherCommand');

        executeStub.reset();
        tempRegistry.restoreCommands();

        registerCommandStub.should.not.have.been.calledWith(ExtensionCommands.OPEN_PRE_REQ_PAGE);
        tempRegistry['delayedCommandsToExecute'].size.should.equal(0);
        tempRegistry['tempCommands'].should.deep.equal([]);

        executeStub.callCount.should.equal(0);

        executeStub.reset();
        await tempRegistry.executeStoredCommands();

        executeStub.callCount.should.equal(0);
        tempRegistry['delayedCommandsToExecute'].size.should.equal(0);
    });
});
