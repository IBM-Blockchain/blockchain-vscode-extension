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
import * as path from 'path';
import { ExtensionCommands } from '../../ExtensionCommands';
import { LogType } from 'ibm-blockchain-platform-common';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';
import { TestUtil } from '../TestUtil';
chai.should();

describe('openReleaseNotes', () => {
    let mySandbox: sinon.SinonSandbox;
    let logSpy: sinon.SinonSpy;

    before(async () => {
        mySandbox = sinon.createSandbox();
        await TestUtil.setupTests(mySandbox);
    });

    beforeEach(async () => {
        logSpy = mySandbox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
    });

    afterEach(async () => {
        mySandbox.restore();
    });

    it('should open release notes markdown file', async () => {
        await vscode.commands.executeCommand(ExtensionCommands.OPEN_RELEASE_NOTES);

        logSpy.should.have.been.calledWithExactly(LogType.INFO, undefined, `openReleaseNotes`);
    });

    it(`should report that the release notes can't be opened`, async () => {
        const releaseNotesPath: string = path.join(ExtensionUtil.getExtensionPath(), 'RELEASE-NOTES.md');
        const releaseNotesUri: vscode.Uri = vscode.Uri.file(releaseNotesPath);
        const executeCommandStub: sinon.SinonStub = mySandbox.stub(vscode.commands, 'executeCommand');
        executeCommandStub.callThrough();

        const error: Error = new Error('unable to preview markdown');
        executeCommandStub.withArgs('markdown.showPreview', releaseNotesUri).throws(error);

        await vscode.commands.executeCommand(ExtensionCommands.OPEN_RELEASE_NOTES);

        logSpy.should.have.been.calledWithExactly(LogType.INFO, undefined, `openReleaseNotes`);
        logSpy.should.have.been.calledWithExactly(LogType.ERROR, `Unable to open release notes: ${error.toString()}`);

        executeCommandStub.should.have.been.calledWith('markdown.showPreview', releaseNotesUri);
    });

});
