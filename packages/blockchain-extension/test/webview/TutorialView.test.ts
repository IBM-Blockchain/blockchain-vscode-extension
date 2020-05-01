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

import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as path from 'path';
import { TutorialView } from '../../extension/webview/TutorialView';
import { Reporter } from '../../extension/util/Reporter';
import { SettingConfigurations } from '../../configurations';

chai.use(sinonChai);

describe('TutorialView', () => {
    let mySandBox: sinon.SinonSandbox;
    let sendTelemetryEventStub: sinon.SinonStub;

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
        sendTelemetryEventStub = mySandBox.stub(Reporter.instance(), 'sendTelemetryEvent');

        await vscode.workspace.getConfiguration().update(SettingConfigurations.HOME_SHOW_ON_STARTUP, true, vscode.ConfigurationTarget.Global);
        await vscode.workspace.getConfiguration().update(SettingConfigurations.HOME_SHOW_ON_NEXT_ACTIVATION, false, vscode.ConfigurationTarget.Global);
    });

    afterEach(() => {
        mySandBox.restore();
    });

    it('should show tutorial', async () => {
        const commandSpy: sinon.SinonSpy = mySandBox.spy(vscode.commands, 'executeCommand');

        const tutorialView: TutorialView = new TutorialView('Basic tutorials', 'A1: Introduction');
        await tutorialView.openView();

        const filePath: string = path.join(__dirname, '..', '..', '..', 'tutorials', 'new-tutorials', 'basic-tutorials', 'a1.md');
        const uri: vscode.Uri = vscode.Uri.file(filePath);

        commandSpy.getCall(0).args[0].should.equal('markdown.showPreview');
        commandSpy.getCall(0).args[1].fsPath.should.equal(uri.fsPath);
        sendTelemetryEventStub.should.have.been.calledOnceWithExactly('Tutorial Viewed', {series: 'Basic tutorials', tutorial: 'A1: Introduction'});
    });

    it('should do nothing on openPanelInner', async () => {
        const tutorialView: TutorialView = new TutorialView('Basic tutorials', 'A1: Introduction');
        await tutorialView['openPanelInner']();
        sendTelemetryEventStub.should.not.have.been.called;
    });

    it('should return empty string on getHTMLString', async () => {
        const tutorialView: TutorialView = new TutorialView('Basic tutorials', 'A1: Introduction');
        const result: string = await tutorialView['getHTMLString']();
        result.should.equal('');
    });

    it('should load component', async () => {
        const tutorialView: TutorialView = new TutorialView('Basic tutorials', 'A1: Introduction');
        tutorialView.loadComponent({} as vscode.WebviewPanel);
    });
});
