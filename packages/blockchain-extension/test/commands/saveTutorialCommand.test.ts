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
import * as fs from 'fs-extra';
import { ExtensionCommands } from '../../ExtensionCommands';
import { LogType } from 'ibm-blockchain-platform-common';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';
import { Reporter } from '../../extension/util/Reporter';
import { TestUtil } from '../TestUtil';
chai.should();

// tslint:disable: no-unused-expression

describe('saveTutorial', () => {

    const targetPath: string = path.join('/', 'path', 'to', 'the', 'tutorial.pdf');
    const extensionPath: string = ExtensionUtil.getExtensionPath();
    let mySandbox: sinon.SinonSandbox;
    let showSaveDialogStub: sinon.SinonStub;
    let logSpy: sinon.SinonSpy;
    let copyStub: sinon.SinonStub;
    let sendTelemetryEventStub: sinon.SinonStub;
    let folderPath: string;

    const tutorialObject: any = {
        title: 'a1',
        series: 'Basic tutorials',
        firstInSeries: true,
        length: '4 weeks',
        objectives: [
            'objective 1',
            'objective 2',
            'objective 3'
        ],
        file: 'some/file/path'
    };

    before(async () => {
        mySandbox = sinon.createSandbox();
        await TestUtil.setupTests(mySandbox);
    });

    beforeEach(async () => {
        copyStub = mySandbox.stub(fs, 'copy').resolves();
        logSpy = mySandbox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
        sendTelemetryEventStub = mySandbox.stub(Reporter.instance(), 'sendTelemetryEvent');
        showSaveDialogStub = mySandbox.stub(vscode.window, 'showSaveDialog');
    });

    afterEach(async () => {
        mySandbox.restore();
    });

    describe('saveSeries', async () => {
        beforeEach(async () => {
            showSaveDialogStub.resolves(vscode.Uri.file(targetPath));
            folderPath = path.join(extensionPath, 'tutorials', 'new-tutorials', 'basic-tutorials', 'pdf');
        });
        it('should save all pdfs in the series', async () => {
            await vscode.commands.executeCommand(ExtensionCommands.SAVE_TUTORIAL_AS_PDF, undefined, true, 'basic-tutorials');
            copyStub.should.have.been.calledWithExactly(folderPath, targetPath);
            showSaveDialogStub.should.have.been.calledOnce;
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('saveTutorialCommand');
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, `saveTutorial`);
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, `Downloaded all basic-tutorials to ${targetPath}.`);
        });

        it('should do nothing if the user cancels picking where they want to save the series', async () => {
            showSaveDialogStub.resolves();
            await vscode.commands.executeCommand(ExtensionCommands.SAVE_TUTORIAL_AS_PDF, undefined, true, 'basic-tutorials');
            showSaveDialogStub.should.have.been.calledOnce;
            copyStub.should.not.have.been.called;
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `saveTutorial`);
            sendTelemetryEventStub.should.not.have.been.called;
        });
    });

    describe('saveOnePDF', async () => {
        beforeEach(async () => {
            showSaveDialogStub.resolves(vscode.Uri.file(targetPath));
            const pathToFolder: string = (tutorialObject.file).substring(0, tutorialObject.file.lastIndexOf('/'));
            folderPath = path.join(extensionPath, 'tutorials', pathToFolder, 'pdf');
        });

        it('should save the selected pdf', async () => {
            const pdfPath: string = path.join(folderPath, `${tutorialObject.title}.pdf`);
            await vscode.commands.executeCommand(ExtensionCommands.SAVE_TUTORIAL_AS_PDF, tutorialObject);
            copyStub.should.have.been.calledWithExactly(pdfPath, targetPath);
            showSaveDialogStub.should.have.been.calledOnce;
            sendTelemetryEventStub.should.have.been.calledOnceWithExactly('saveTutorialCommand');
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, `saveTutorial`);
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, `Downloaded tutorial ${tutorialObject.title}.pdf to ${targetPath}.`);
        });

        it('should do nothing if the user cancels picking where they want to save the pdf', async () => {
            showSaveDialogStub.resolves();
            await vscode.commands.executeCommand(ExtensionCommands.SAVE_TUTORIAL_AS_PDF, tutorialObject);
            showSaveDialogStub.should.have.been.calledOnce;
            copyStub.should.not.have.been.called;
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `saveTutorial`);
            sendTelemetryEventStub.should.not.have.been.called;
        });
    });

    it('should catch and throw error to the user if there is an error when copying the pdf files', async () => {
        const error: Error = new Error('copy error');
        copyStub.rejects(error);
        showSaveDialogStub.resolves(vscode.Uri.file(targetPath));
        await vscode.commands.executeCommand(ExtensionCommands.SAVE_TUTORIAL_AS_PDF, tutorialObject);
        logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, `saveTutorial`);
        logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, error.message, error.toString());
    });

});
