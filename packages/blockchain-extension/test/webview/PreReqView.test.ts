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
import * as ejs from 'ejs';
import { PreReqView } from '../../extension/webview/PreReqView';
import { View } from '../../extension/webview/View';
import { ExtensionCommands } from '../../ExtensionCommands';
import { Reporter } from '../../extension/util/Reporter';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';
import { TestUtil } from '../TestUtil';
import { DependencyManager } from '../../extension/dependencies/DependencyManager';
import { GlobalState, DEFAULT_EXTENSION_DATA, ExtensionData } from '../../extension/util/GlobalState';
import { SettingConfigurations } from '../../configurations';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { Dependencies } from '../../extension/dependencies/Dependencies';
import { LogType } from 'ibm-blockchain-platform-common';
const should: Chai.Should = chai.should();
chai.use(sinonChai);

describe('PreReqView', () => {
    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();
    let context: vscode.ExtensionContext;
    let createWebviewPanelStub: sinon.SinonStub;
    let reporterStub: sinon.SinonStub;
    let executeCommandStub: sinon.SinonStub;
    const nodeJsRequirement: string = Dependencies.NODEJS_REQUIRED.replace(/<.*\|\|/, '||').replace(/<.*/, '');

    before(async () => {
        await TestUtil.setupTests(mySandBox);
    });

    beforeEach(async () => {

        context = GlobalState.getExtensionContext();
        executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
        executeCommandStub.callThrough();

        createWebviewPanelStub = mySandBox.stub(vscode.window, 'createWebviewPanel');

        View['openPanels'].splice(0, View['openPanels'].length);

        reporterStub = mySandBox.stub(Reporter.instance(), 'sendTelemetryEvent');

        createWebviewPanelStub.returns({
            title: 'Prerequisites',
            webview: {
                onDidReceiveMessage: mySandBox.stub()
            },
            reveal: mySandBox.stub(),
            dispose: mySandBox.stub(),
            onDidDispose: mySandBox.stub(),
            onDidChangeViewState: mySandBox.stub(),
            _isDisposed: false

        });

    });

    afterEach(() => {
        mySandBox.restore();
    });

    it('should register and show prereq page', async () => {

        const preReqView: PreReqView = new PreReqView(context);
        await preReqView.openView(false);
        createWebviewPanelStub.should.have.been.called;
    });

    it('should reveal prereq page if already open', async () => {

        const preReqView: PreReqView = new PreReqView(context);
        await preReqView.openView(true);
        await preReqView.openView(true);

        createWebviewPanelStub.should.have.been.calledOnce;
        should.equal(createWebviewPanelStub.getCall(1), null);
    });

    describe('getHTMLString', () => {

        it('should show message that all prerequisites have been installed', async () => {
            const dependencies: any = {
                node: {name: 'Node.js', required: true, version: '10.15.3', url: 'https://nodejs.org/en/download/releases', requiredVersion: Dependencies.NODEJS_REQUIRED, requiredLabel: 'only' },
                npm: {name: 'npm', required: true, version: '6.4.1', url: 'https://nodejs.org/en/download/releases', requiredVersion: Dependencies.NPM_REQUIRED, requiredLabel: '' },
                docker: {name: 'Docker', required: true, version: '17.7.0', url: 'https://www.docker.com/get-started', requiredVersion: Dependencies.DOCKER_REQUIRED, requiredLabel: '' },
                dockerCompose: {name: 'Docker Compose', required: true, version: '1.15.0', url: 'https://docs.docker.com/compose/install/', requiredVersion: Dependencies.DOCKER_COMPOSE_REQUIRED, requiredLabel: '' },
                xcode: {name: 'Xcode', required: true, version: '123', url: 'https://apps.apple.com/gb/app/xcode/id497799835', requiredVersion: undefined, requiredLabel: undefined},
                go: {name: 'Go', required: false, version: '1.13.0', url: 'https://golang.org/dl/', requiredVersion: Dependencies.GO_REQUIRED, requiredLabel: '' },
                goExtension: {name: 'Go Extension', required: false, version: '1.0.0', url: 'vscode:extension/ms-vscode.Go', requiredVersion: '', requiredLabel: '' },
                javaLanguageExtension: {name: 'Java Language Support Extension', required: false, version: '1.0.0', url: 'vscode:extension/redhat.java', requiredVersion: undefined, requiredLabel: '' },
                javaDebuggerExtension: {name: 'Java Debugger Extension', required: false, version: '1.0.0', url: 'vscode:extension/vscjava.vscode-java-debug', requiredVersion: undefined, requiredLabel: '' },
                javaTestRunnerExtension: {name: 'Java Test Runner Extension', required: false, version: '1.0.0', url: 'vscode:extension/vscjava.vscode-java-test', requiredVersion: undefined, requiredLabel: '' },
                systemRequirements: {name: 'System Requirements', id: 'systemRequirements', complete: true, version: undefined, checkbox: true, required: true, text: 'In order to support the local runtime, please confirm your system has at least 4GB of RAM' }
            };

            const getPreReqVersionsStub: sinon.SinonStub = mySandBox.stub(DependencyManager.instance(), 'getPreReqVersions').resolves(dependencies);

            const hasPreReqsInstalledStub: sinon.SinonStub = mySandBox.stub(DependencyManager.instance(), 'hasPreReqsInstalled').resolves(true);

            const preReqView: PreReqView = new PreReqView(context);

            const html: string = await preReqView.getHTMLString();

            getPreReqVersionsStub.should.have.been.calledOnce;
            hasPreReqsInstalledStub.should.have.been.calledOnceWith(dependencies);

            html.should.contain('<div id="complete-panel" class="large-panel">'); // The success message should be visible
            html.should.contain(`<div id="check-finish-button" class="finish" onclick="finish();">Let's Blockchain!</div>`); // The button should indicate that the dependencies have been installed
            html.should.contain('<span class="prereqs-number">(0)</span>'); // No missing (required) dependencies

            html.should.contain(`"node":{"name":"Node.js","required":true,"version":"10.15.3","url":"https://nodejs.org/en/download/releases","requiredVersion":"${nodeJsRequirement}","requiredLabel":"only"}`);
            html.should.contain(`"npm":{"name":"npm","required":true,"version":"6.4.1","url":"https://nodejs.org/en/download/releases","requiredVersion":"${Dependencies.NPM_REQUIRED}","requiredLabel":""}`);
            html.should.contain(`"docker":{"name":"Docker","required":true,"version":"17.7.0","url":"https://www.docker.com/get-started","requiredVersion":"${Dependencies.DOCKER_REQUIRED}","requiredLabel":""}`);
            html.should.contain(`"dockerCompose":{"name":"Docker Compose","required":true,"version":"1.15.0","url":"https://docs.docker.com/compose/install/","requiredVersion":"${Dependencies.DOCKER_COMPOSE_REQUIRED}","requiredLabel":""}`);
            html.should.contain(`"xcode":{"name":"Xcode","required":true,"version":"123","url":"https://apps.apple.com/gb/app/xcode/id497799835"}`);
            html.should.contain(`"go":{"name":"Go","required":false,"version":"1.13.0","url":"https://golang.org/dl/","requiredVersion":"${Dependencies.GO_REQUIRED}","requiredLabel":""}`);
            html.should.contain(`"goExtension":{"name":"Go Extension","required":false,"version":"1.0.0","url":"vscode:extension/ms-vscode.Go","requiredVersion":"","requiredLabel":""}`);
            html.should.contain(`"javaLanguageExtension":{"name":"Java Language Support Extension","required":false,"version":"1.0.0","url":"vscode:extension/redhat.java","requiredLabel":""}`);
            html.should.contain(`"javaDebuggerExtension":{"name":"Java Debugger Extension","required":false,"version":"1.0.0","url":"vscode:extension/vscjava.vscode-java-debug","requiredLabel":""}`);
            html.should.contain(`"javaTestRunnerExtension":{"name":"Java Test Runner Extension","required":false,"version":"1.0.0","url":"vscode:extension/vscjava.vscode-java-test","requiredLabel":""}`);
            html.should.contain(`"systemRequirements":{"name":"System Requirements","id":"systemRequirements","complete":true,"checkbox":true,"required":true,"text":"In order to support the local runtime, please confirm your system has at least 4GB of RAM"}`);

        });

        it(`shouldn't show message that prerequisites have been installed`, async () => {
            const dependencies: any = {
                node: {name: 'Node.js', required: true, version: undefined, url: 'https://nodejs.org/en/download/releases', requiredVersion: Dependencies.NODEJS_REQUIRED, requiredLabel: 'only' },
                npm: {name: 'npm', required: true, version: '6.4.1', url: 'https://nodejs.org/en/download/releases', requiredVersion: Dependencies.NPM_REQUIRED, requiredLabel: '' },
                docker: {name: 'Docker', required: true, version: undefined, url: 'https://www.docker.com/get-started', requiredVersion: Dependencies.DOCKER_REQUIRED, requiredLabel: '' },
                dockerCompose: {name: 'Docker Compose', required: true, version: '1.15.0', url: 'https://docs.docker.com/compose/install/', requiredVersion: Dependencies.DOCKER_COMPOSE_REQUIRED, requiredLabel: '' },
                xcode: {name: 'Xcode', required: true, version: '123', url: 'https://apps.apple.com/gb/app/xcode/id497799835', requiredVersion: undefined, requiredLabel: undefined},
                go: {name: 'Go', required: false, version: '1.13.0', url: 'https://golang.org/dl/', requiredVersion: Dependencies.GO_REQUIRED, requiredLabel: '' },
                goExtension: {name: 'Go Extension', required: false, version: '1.0.0', url: 'vscode:extension/ms-vscode.Go', requiredVersion: '', requiredLabel: '' },
                javaLanguageExtension: {name: 'Java Language Support Extension', required: false, version: undefined, url: 'vscode:extension/redhat.java', requiredVersion: undefined, requiredLabel: '' },
                javaDebuggerExtension: {name: 'Java Debugger Extension', required: false, version: '1.0.0', url: 'vscode:extension/vscjava.vscode-java-debug', requiredVersion: undefined, requiredLabel: '' },
                javaTestRunnerExtension: {name: 'Java Test Runner Extension', required: false, version: '1.0.0', url: 'vscode:extension/vscjava.vscode-java-test', requiredVersion: undefined, requiredLabel: '' },
                systemRequirements: {name: 'System Requirements', id: 'systemRequirements', complete: true, version: undefined, checkbox: true, required: true, text: 'In order to support the local runtime, please confirm your system has at least 4GB of RAM' }
            };

            const getPreReqVersionsStub: sinon.SinonStub = mySandBox.stub(DependencyManager.instance(), 'getPreReqVersions').resolves(dependencies);

            const hasPreReqsInstalledStub: sinon.SinonStub = mySandBox.stub(DependencyManager.instance(), 'hasPreReqsInstalled').resolves(false);

            const preReqView: PreReqView = new PreReqView(context);

            const html: string = await preReqView.getHTMLString();

            getPreReqVersionsStub.should.have.been.calledOnce;
            hasPreReqsInstalledStub.should.have.been.calledOnceWith(dependencies);

            html.should.contain('<div id="complete-panel" class="large-panel hidden">'); // The success message should be hidden
            html.should.contain(`<div id="check-finish-button" class="check" onclick="check();">Check again</div>`); // The button shouldn't indicate that everything has been installed
            html.should.contain('<span class="prereqs-number">(2)</span>'); // Missing (required) dependencies

            html.should.not.contain(`"node":{"name":"Node.js","required":true,"version"`);
            html.should.contain(`"npm":{"name":"npm","required":true,"version":"6.4.1","url":"https://nodejs.org/en/download/releases","requiredVersion":"${Dependencies.NPM_REQUIRED}","requiredLabel":""}`);
            html.should.not.contain(`"docker":{"name":"Docker","required":true,"version"`);
            html.should.contain(`"dockerCompose":{"name":"Docker Compose","required":true,"version":"1.15.0","url":"https://docs.docker.com/compose/install/","requiredVersion":"${Dependencies.DOCKER_COMPOSE_REQUIRED}","requiredLabel":""}`);
            html.should.contain(`"xcode":{"name":"Xcode","required":true,"version":"123","url":"https://apps.apple.com/gb/app/xcode/id497799835"}`);
            html.should.contain(`"go":{"name":"Go","required":false,"version":"1.13.0","url":"https://golang.org/dl/","requiredVersion":"${Dependencies.GO_REQUIRED}","requiredLabel":""}`);
            html.should.contain(`"goExtension":{"name":"Go Extension","required":false,"version":"1.0.0","url":"vscode:extension/ms-vscode.Go","requiredVersion":"","requiredLabel":""}`);
            html.should.not.contain(`"javaLanguageExtension":{"name":"Java Language Support Extension","required":false,"version"`);
            html.should.contain(`"javaDebuggerExtension":{"name":"Java Debugger Extension","required":false,"version":"1.0.0","url":"vscode:extension/vscjava.vscode-java-debug","requiredLabel":""}`);
            html.should.contain(`"javaTestRunnerExtension":{"name":"Java Test Runner Extension","required":false,"version":"1.0.0","url":"vscode:extension/vscjava.vscode-java-test","requiredLabel":""}`);
            html.should.contain(`"systemRequirements":{"name":"System Requirements","id":"systemRequirements","complete":true,"checkbox":true,"required":true,"text":"In order to support the local runtime, please confirm your system has at least 4GB of RAM"}`);

        });

        it('should be able to pass dependencies and if complete', async () => {
            const getPreReqVersionsSpy: sinon.SinonSpy = mySandBox.spy(DependencyManager.instance(), 'getPreReqVersions');

            mySandBox.stub(DependencyManager.instance(), 'hasPreReqsInstalled').resolves(true);

            const preReqView: PreReqView = new PreReqView(context);

            const dependencies: any = {
                node: {name: 'Node.js', required: true, version: '10.15.3', url: 'https://nodejs.org/en/download/releases', requiredVersion: Dependencies.NODEJS_REQUIRED, requiredLabel: 'only' },
                npm: {name: 'npm', required: true, version: '6.4.1', url: 'https://nodejs.org/en/download/releases', requiredVersion: Dependencies.NPM_REQUIRED, requiredLabel: '' },
                docker: {name: 'Docker', required: true, version: '17.7.0', url: 'https://www.docker.com/get-started', requiredVersion: Dependencies.DOCKER_REQUIRED, requiredLabel: '' },
                dockerCompose: {name: 'Docker Compose', required: true, version: '1.15.0', url: 'https://docs.docker.com/compose/install/', requiredVersion: Dependencies.DOCKER_COMPOSE_REQUIRED, requiredLabel: '' },
                xcode: {name: 'Xcode', required: true, version: '123', url: 'https://apps.apple.com/gb/app/xcode/id497799835', requiredVersion: undefined, requiredLabel: undefined},
                go: {name: 'Go', required: false, version: '1.13.0', url: 'https://golang.org/dl/', requiredVersion: Dependencies.GO_REQUIRED, requiredLabel: '' },
                goExtension: {name: 'Go Extension', required: false, version: '1.0.0', url: 'vscode:extension/ms-vscode.Go', requiredVersion: '', requiredLabel: '' },
                javaLanguageExtension: {name: 'Java Language Support Extension', required: false, version: '1.0.0', url: 'vscode:extension/redhat.java', requiredVersion: undefined, requiredLabel: '' },
                javaDebuggerExtension: {name: 'Java Debugger Extension', required: false, version: '1.0.0', url: 'vscode:extension/vscjava.vscode-java-debug', requiredVersion: undefined, requiredLabel: '' },
                javaTestRunnerExtension: {name: 'Java Test Runner Extension', required: false, version: '1.0.0', url: 'vscode:extension/vscjava.vscode-java-test', requiredVersion: undefined, requiredLabel: '' },
                systemRequirements: {name: 'System Requirements', id: 'systemRequirements', complete: true, version: undefined, checkbox: true, required: true, text: 'In order to support the local runtime, please confirm your system has at least 4GB of RAM' }
            };

            const html: string = await preReqView.getHTMLString(dependencies, true);

            getPreReqVersionsSpy.should.not.have.been.called;

            html.should.contain('<div id="complete-panel" class="large-panel">'); // The success message should be visible
            html.should.contain(`<div id="check-finish-button" class="finish" onclick="finish();">Let's Blockchain!</div>`); // The button should indicate that the dependencies have been installed
            html.should.contain('<span class="prereqs-number">(0)</span>'); // No missing (required) dependencies

            html.should.contain(`"node":{"name":"Node.js","required":true,"version":"10.15.3","url":"https://nodejs.org/en/download/releases","requiredVersion":"${nodeJsRequirement}","requiredLabel":"only"}`);
            html.should.contain(`"npm":{"name":"npm","required":true,"version":"6.4.1","url":"https://nodejs.org/en/download/releases","requiredVersion":"${Dependencies.NPM_REQUIRED}","requiredLabel":""}`);
            html.should.contain(`"docker":{"name":"Docker","required":true,"version":"17.7.0","url":"https://www.docker.com/get-started","requiredVersion":"${Dependencies.DOCKER_REQUIRED}","requiredLabel":""}`);
            html.should.contain(`"dockerCompose":{"name":"Docker Compose","required":true,"version":"1.15.0","url":"https://docs.docker.com/compose/install/","requiredVersion":"${Dependencies.DOCKER_COMPOSE_REQUIRED}","requiredLabel":""}`);
            html.should.contain(`"xcode":{"name":"Xcode","required":true,"version":"123","url":"https://apps.apple.com/gb/app/xcode/id497799835"}`);
            html.should.contain(`"go":{"name":"Go","required":false,"version":"1.13.0","url":"https://golang.org/dl/","requiredVersion":"${Dependencies.GO_REQUIRED}","requiredLabel":""}`);
            html.should.contain(`"goExtension":{"name":"Go Extension","required":false,"version":"1.0.0","url":"vscode:extension/ms-vscode.Go","requiredVersion":"","requiredLabel":""}`);
            html.should.contain(`"javaLanguageExtension":{"name":"Java Language Support Extension","required":false,"version":"1.0.0","url":"vscode:extension/redhat.java","requiredLabel":""}`);
            html.should.contain(`"javaDebuggerExtension":{"name":"Java Debugger Extension","required":false,"version":"1.0.0","url":"vscode:extension/vscjava.vscode-java-debug","requiredLabel":""}`);
            html.should.contain(`"javaTestRunnerExtension":{"name":"Java Test Runner Extension","required":false,"version":"1.0.0","url":"vscode:extension/vscjava.vscode-java-test","requiredLabel":""}`);
            html.should.contain(`"systemRequirements":{"name":"System Requirements","id":"systemRequirements","complete":true,"checkbox":true,"required":true,"text":"In order to support the local runtime, please confirm your system has at least 4GB of RAM"}`);

        });

        it('should be able to pass localFabricFunctionality flag', async () => {
            const getPreReqVersionsSpy: sinon.SinonSpy = mySandBox.spy(DependencyManager.instance(), 'getPreReqVersions');

            mySandBox.stub(DependencyManager.instance(), 'hasPreReqsInstalled').resolves(true);

            const getSettingsStub: sinon.SinonStub = mySandBox.stub();
            const updateSettingsStub: sinon.SinonStub = mySandBox.stub().resolves();
            const getConfigurationStub: sinon.SinonStub = mySandBox.stub(vscode.workspace, 'getConfiguration');
            getConfigurationStub.returns({
                get: getSettingsStub,
                update: updateSettingsStub
            });

            const preReqView: PreReqView = new PreReqView(context);

            const dependencies: any = {
                node: {name: 'Node.js', required: true, version: '10.15.3', url: 'https://nodejs.org/en/download/releases', requiredVersion: Dependencies.NODEJS_REQUIRED, requiredLabel: 'only' },
                npm: {name: 'npm', required: true, version: '6.4.1', url: 'https://nodejs.org/en/download/releases', requiredVersion: Dependencies.NPM_REQUIRED, requiredLabel: '' },
                docker: {name: 'Docker', required: true, version: '17.7.0', url: 'https://www.docker.com/get-started', requiredVersion: Dependencies.DOCKER_REQUIRED, requiredLabel: '' },
                dockerCompose: {name: 'Docker Compose', required: true, version: '1.15.0', url: 'https://docs.docker.com/compose/install/', requiredVersion: Dependencies.DOCKER_COMPOSE_REQUIRED, requiredLabel: '' },
                xcode: {name: 'Xcode', required: true, version: '123', url: 'https://apps.apple.com/gb/app/xcode/id497799835', requiredVersion: undefined, requiredLabel: undefined},
                go: {name: 'Go', required: false, version: '1.13.0', url: 'https://golang.org/dl/', requiredVersion: Dependencies.GO_REQUIRED, requiredLabel: '' },
                goExtension: {name: 'Go Extension', required: false, version: '1.0.0', url: 'vscode:extension/ms-vscode.Go', requiredVersion: '', requiredLabel: '' },
                javaLanguageExtension: {name: 'Java Language Support Extension', required: false, version: '1.0.0', url: 'vscode:extension/redhat.java', requiredVersion: undefined, requiredLabel: '' },
                javaDebuggerExtension: {name: 'Java Debugger Extension', required: false, version: '1.0.0', url: 'vscode:extension/vscjava.vscode-java-debug', requiredVersion: undefined, requiredLabel: '' },
                javaTestRunnerExtension: {name: 'Java Test Runner Extension', required: false, version: '1.0.0', url: 'vscode:extension/vscjava.vscode-java-test', requiredVersion: undefined, requiredLabel: '' },
                systemRequirements: {name: 'System Requirements', id: 'systemRequirements', complete: true, version: undefined, checkbox: true, required: true, text: 'In order to support the local runtime, please confirm your system has at least 4GB of RAM' }
            };

            const html: string = await preReqView.getHTMLString(dependencies, true, false);

            getPreReqVersionsSpy.should.not.have.been.called;
            getSettingsStub.should.not.have.been.calledWith(SettingConfigurations.EXTENSION_LOCAL_FABRIC);

            html.should.contain('<div id="complete-panel" class="large-panel">'); // The success message should be visible
            html.should.contain(`<div id="check-finish-button" class="finish" onclick="finish();">Let's Blockchain!</div>`); // The button should indicate that the dependencies have been installed
            html.should.contain('<span class="prereqs-number">(0)</span>'); // No missing (required) dependencies

            html.should.contain(`"node":{"name":"Node.js","required":true,"version":"10.15.3","url":"https://nodejs.org/en/download/releases","requiredVersion":"${nodeJsRequirement}","requiredLabel":"only"}`);
            html.should.contain(`"npm":{"name":"npm","required":true,"version":"6.4.1","url":"https://nodejs.org/en/download/releases","requiredVersion":"${Dependencies.NPM_REQUIRED}","requiredLabel":""}`);
            html.should.contain(`"docker":{"name":"Docker","required":true,"version":"17.7.0","url":"https://www.docker.com/get-started","requiredVersion":"${Dependencies.DOCKER_REQUIRED}","requiredLabel":""}`);
            html.should.contain(`"dockerCompose":{"name":"Docker Compose","required":true,"version":"1.15.0","url":"https://docs.docker.com/compose/install/","requiredVersion":"${Dependencies.DOCKER_COMPOSE_REQUIRED}","requiredLabel":""}`);
            html.should.contain(`"xcode":{"name":"Xcode","required":true,"version":"123","url":"https://apps.apple.com/gb/app/xcode/id497799835"}`);
            html.should.contain(`"go":{"name":"Go","required":false,"version":"1.13.0","url":"https://golang.org/dl/","requiredVersion":"${Dependencies.GO_REQUIRED}","requiredLabel":""}`);
            html.should.contain(`"goExtension":{"name":"Go Extension","required":false,"version":"1.0.0","url":"vscode:extension/ms-vscode.Go","requiredVersion":"","requiredLabel":""}`);
            html.should.contain(`"javaLanguageExtension":{"name":"Java Language Support Extension","required":false,"version":"1.0.0","url":"vscode:extension/redhat.java","requiredLabel":""}`);
            html.should.contain(`"javaDebuggerExtension":{"name":"Java Debugger Extension","required":false,"version":"1.0.0","url":"vscode:extension/vscjava.vscode-java-debug","requiredLabel":""}`);
            html.should.contain(`"javaTestRunnerExtension":{"name":"Java Test Runner Extension","required":false,"version":"1.0.0","url":"vscode:extension/vscjava.vscode-java-test","requiredLabel":""}`);
            html.should.contain(`"systemRequirements":{"name":"System Requirements","id":"systemRequirements","complete":true,"checkbox":true,"required":true,"text":"In order to support the local runtime, please confirm your system has at least 4GB of RAM"}`);

        });

        it('should handle error rendering the webview', async () => {

            const getPreReqVersionsStub: sinon.SinonStub = mySandBox.stub(DependencyManager.instance(), 'getPreReqVersions').resolves({
                node: {name: 'Node.js', required: true, version: undefined, url: 'https://nodejs.org/en/download/releases', requiredVersion: Dependencies.NODEJS_REQUIRED, requiredLabel: 'only' },
                npm: {name: 'npm', required: true, version: '6.4.1', url: 'https://nodejs.org/en/download/releases', requiredVersion: Dependencies.NPM_REQUIRED, requiredLabel: '' },
                docker: {name: 'Docker', required: true, version: undefined, url: 'https://www.docker.com/get-started', requiredVersion: Dependencies.DOCKER_REQUIRED, requiredLabel: '' },
                dockerCompose: {name: 'Docker Compose', required: true, version: '1.15.0', url: 'https://docs.docker.com/compose/install/', requiredVersion: Dependencies.DOCKER_COMPOSE_REQUIRED, requiredLabel: '' },
                xcode: {name: 'Xcode', required: true, version: '123', url: 'https://apps.apple.com/gb/app/xcode/id497799835', requiredVersion: undefined, requiredLabel: undefined},
                go: {name: 'Go', required: false, version: '1.13.0', url: 'https://golang.org/dl/', requiredVersion: Dependencies.GO_REQUIRED, requiredLabel: '' },
                goExtension: {name: 'Go Extension', required: false, version: '1.0.0', url: 'vscode:extension/ms-vscode.Go', requiredVersion: '', requiredLabel: '' },
                javaLanguageExtension: {name: 'Java Language Support Extension', required: false, version: undefined, url: 'vscode:extension/redhat.java', requiredVersion: undefined, requiredLabel: '' },
                javaDebuggerExtension: {name: 'Java Debugger Extension', required: false, version: '1.0.0', url: 'vscode:extension/vscjava.vscode-java-debug', requiredVersion: undefined, requiredLabel: '' },
                javaTestRunnerExtension: {name: 'Java Test Runner Extension', required: false, version: '1.0.0', url: 'vscode:extension/vscjava.vscode-java-test', requiredVersion: undefined, requiredLabel: '' },
                systemRequirements: {name: 'System Requirements', id: 'systemRequirements', complete: true, version: undefined, checkbox: true, required: true, text: 'In order to support the local runtime, please confirm your system has at least 4GB of RAM' }
            });

            mySandBox.stub(DependencyManager.instance(), 'hasPreReqsInstalled').resolves(false);
            const error: Error = new Error('error happened');
            mySandBox.stub(ejs, 'renderFile').yields(error);

            const preReqView: PreReqView = new PreReqView(context);

            await preReqView.getHTMLString().should.be.rejectedWith(error);

            getPreReqVersionsStub.should.have.been.calledOnce;

        });
    });

    describe('openPanelInner', () => {
        let logSpy: sinon.SinonSpy;
        let setupCommandsStub: sinon.SinonStub;
        let completeActivationStub: sinon.SinonStub;
        beforeEach(async () => {
            await vscode.workspace.getConfiguration().update(SettingConfigurations.EXTENSION_BYPASS_PREREQS, false, vscode.ConfigurationTarget.Global);

            logSpy = mySandBox.stub(VSCodeBlockchainOutputAdapter.instance(), 'log');
            setupCommandsStub = mySandBox.stub(ExtensionUtil, 'setupCommands').resolves();
            completeActivationStub = mySandBox.stub(ExtensionUtil, 'completeActivation').resolves();
        });

        it('should dispose prereq page if the user closes the tab', async () => {
            mySandBox.stub(DependencyManager.instance(), 'hasPreReqsInstalled').resolves(false);
            mySandBox.stub(DependencyManager.instance(), 'isValidDependency').returns(false);

            const onDidDisposePromises: any[] = [];

            executeCommandStub.withArgs(ExtensionCommands.OPEN_HOME_PAGE).resolves();

            const onDidDisposeStub: sinon.SinonStub = mySandBox.stub();
            onDidDisposePromises.push(new Promise((resolve: any): void => {
                onDidDisposeStub.onCall(0).yields();
                onDidDisposeStub.onCall(1).callsFake(async (callback: any) => {
                    await callback();
                    resolve();
                });
            }));

            createWebviewPanelStub.returns({
                title: 'Prerequisites',
                webview: {
                    onDidReceiveMessage: mySandBox.stub()
                },
                reveal: (): void => {
                    return;
                },
                onDidDispose: onDidDisposeStub,
                onDidChangeViewState: mySandBox.stub(),
                _isDisposed: false
            });

            const preReqView: PreReqView = new PreReqView(context);

            await preReqView.openView(true);
            await Promise.all(onDidDisposePromises);

            reporterStub.should.have.been.calledOnceWithExactly('openedView', {name: 'Prerequisites'});
            logSpy.should.have.been.calledOnceWith(LogType.WARNING, `Required prerequisites are missing. They must be installed before the extension can be used.`);
            createWebviewPanelStub.should.have.been.calledOnceWith(
                'preReq',
                'Prerequisites',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    enableCommandUris: true,
                    localResourceRoots: [
                        vscode.Uri.file(path.join(context.extensionPath, 'resources')),
                        vscode.Uri.file(path.join(context.extensionPath, 'build'))
                    ]
                }
            );

        });

        it('should dispose prereq page and restore command hijacking', async () => {
            const hasPreReqsInstalledStub: sinon.SinonStub = mySandBox.stub(DependencyManager.instance(), 'hasPreReqsInstalled');
            mySandBox.stub(DependencyManager.instance(), 'isValidDependency').returns(false);
            const onDidDisposePromises: any[] = [];

            executeCommandStub.withArgs(ExtensionCommands.OPEN_HOME_PAGE).resolves();

            const onDidDisposeStub: sinon.SinonStub = mySandBox.stub();
            onDidDisposePromises.push(new Promise((resolve: any): void => {
                onDidDisposeStub.onCall(0).yields();
                onDidDisposeStub.onCall(1).callsFake(async (callback: any) => {
                    await callback();
                    resolve();
                });
            }));

            createWebviewPanelStub.returns({
                title: 'Prerequisites',
                webview: {
                    onDidReceiveMessage: mySandBox.stub()
                },
                reveal: (): void => {
                    return;
                },
                onDidDispose: onDidDisposeStub,
                onDidChangeViewState: mySandBox.stub(),
                _isDisposed: false
            });

            const preReqView: PreReqView = new PreReqView(context);
            preReqView.restoreCommandHijack = true;
            await preReqView.openView(true);
            await Promise.all(onDidDisposePromises);

            hasPreReqsInstalledStub.should.have.been.calledOnce;

            reporterStub.should.have.been.calledOnceWithExactly('openedView', {name: 'Prerequisites'});
            logSpy.should.not.have.been.calledOnceWith(LogType.WARNING, `Required prerequisites are missing. They must be installed before the extension can be used.`);

            setupCommandsStub.should.have.been.calledOnce;
            completeActivationStub.should.have.been.calledOnce;
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.OPEN_HOME_PAGE);

            createWebviewPanelStub.should.have.been.calledOnceWith(
                'preReq',
                'Prerequisites',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    enableCommandUris: true,
                    localResourceRoots: [
                        vscode.Uri.file(path.join(context.extensionPath, 'resources')),
                        vscode.Uri.file(path.join(context.extensionPath, 'build'))
                    ]
                }
            );

        });

        it('should dispose prereq page if the user closes the tab, restore commands and open home page', async () => {
            mySandBox.stub(DependencyManager.instance(), 'hasPreReqsInstalled').resolves(true);
            mySandBox.stub(DependencyManager.instance(), 'isValidDependency').returns(true);

            const onDidDisposePromises: any[] = [];

            executeCommandStub.withArgs(ExtensionCommands.OPEN_HOME_PAGE).resolves();

            const onDidDisposeStub: sinon.SinonStub = mySandBox.stub();
            onDidDisposePromises.push(new Promise((resolve: any): void => {
                onDidDisposeStub.onCall(0).yields();
                onDidDisposeStub.onCall(1).callsFake(async (callback: any) => {
                    await callback();
                    resolve();
                });
            }));

            createWebviewPanelStub.returns({
                title: 'Prerequisites',
                webview: {
                    onDidReceiveMessage: mySandBox.stub()
                },
                reveal: (): void => {
                    return;
                },
                onDidDispose: onDidDisposeStub,
                onDidChangeViewState: mySandBox.stub(),
                _isDisposed: false
            });

            const preReqView: PreReqView = new PreReqView(context);
            await preReqView.openView(true);
            await Promise.all(onDidDisposePromises);

            reporterStub.should.have.been.calledOnceWithExactly('openedView', {name: 'Prerequisites'});
            logSpy.should.not.have.been.calledOnceWith(LogType.WARNING, `Required prerequisites are missing. They must be installed before the extension can be used.`);

            setupCommandsStub.should.have.been.calledOnce;
            completeActivationStub.should.have.been.calledOnce;
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.OPEN_HOME_PAGE);

            createWebviewPanelStub.should.have.been.calledOnceWith(
                'preReq',
                'Prerequisites',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    enableCommandUris: true,
                    localResourceRoots: [
                        vscode.Uri.file(path.join(context.extensionPath, 'resources')),
                        vscode.Uri.file(path.join(context.extensionPath, 'build'))
                    ]
                }
            );

        });

        it('should dispose prereq page if the user closes the tab, restore commands and open home page if bypass prereq setting is true', async () => {
            await vscode.workspace.getConfiguration().update(SettingConfigurations.EXTENSION_BYPASS_PREREQS, true, vscode.ConfigurationTarget.Global);

            mySandBox.stub(DependencyManager.instance(), 'hasPreReqsInstalled').resolves(false);
            mySandBox.stub(DependencyManager.instance(), 'isValidDependency').returns(false);

            const onDidDisposePromises: any[] = [];

            executeCommandStub.withArgs(ExtensionCommands.OPEN_HOME_PAGE).resolves();

            const onDidDisposeStub: sinon.SinonStub = mySandBox.stub();
            onDidDisposePromises.push(new Promise((resolve: any): void => {
                onDidDisposeStub.onCall(0).yields();
                onDidDisposeStub.onCall(1).callsFake(async (callback: any) => {
                    await callback();
                    resolve();
                });
            }));

            createWebviewPanelStub.returns({
                title: 'Prerequisites',
                webview: {
                    onDidReceiveMessage: mySandBox.stub()
                },
                reveal: (): void => {
                    return;
                },
                onDidDispose: onDidDisposeStub,
                onDidChangeViewState: mySandBox.stub(),
                _isDisposed: false
            });

            const preReqView: PreReqView = new PreReqView(context);
            await preReqView.openView(true);
            await Promise.all(onDidDisposePromises);

            reporterStub.should.have.been.calledOnceWithExactly('openedView', {name: 'Prerequisites'});
            logSpy.should.not.have.been.calledOnceWith(LogType.WARNING, `Required prerequisites are missing. They must be installed before the extension can be used.`);

            setupCommandsStub.should.have.been.calledOnce;
            completeActivationStub.should.have.been.calledOnce;
            executeCommandStub.should.have.been.calledWith(ExtensionCommands.OPEN_HOME_PAGE);

            createWebviewPanelStub.should.have.been.calledOnceWith(
                'preReq',
                'Prerequisites',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    enableCommandUris: true,
                    localResourceRoots: [
                        vscode.Uri.file(path.join(context.extensionPath, 'resources')),
                        vscode.Uri.file(path.join(context.extensionPath, 'build'))
                    ]
                }
            );

        });

        it(`should handle 'finish' message`, async () => {
            const disposeStub: sinon.SinonStub = mySandBox.stub().returns(undefined);

            const onDidDisposePromises: any[] = [];

            onDidDisposePromises.push(new Promise((resolve: any): void => {
                createWebviewPanelStub.returns({
                    title: 'Prerequisites',
                    webview: {
                        onDidReceiveMessage: async (callback: any): Promise<void> => {
                            await callback({
                                command: 'finish',
                                localFabricFunctionality: true
                            });
                            resolve();
                        }
                    },
                    reveal: (): void => {
                        return;
                    },
                    dispose: disposeStub,
                    onDidDispose: mySandBox.stub(),
                    onDidChangeViewState: mySandBox.stub(),
                    _isDisposed: false

                });
            }));

            const getSettingsStub: sinon.SinonStub = mySandBox.stub();
            const updateSettingsStub: sinon.SinonStub = mySandBox.stub().resolves();
            const getConfigurationStub: sinon.SinonStub = mySandBox.stub(vscode.workspace, 'getConfiguration');
            getConfigurationStub.returns({
                get: getSettingsStub,
                update: updateSettingsStub
            });

            const preReqView: PreReqView = new PreReqView(context);
            await preReqView.openView(true);
            await Promise.all(onDidDisposePromises);

            reporterStub.should.have.been.calledOnceWithExactly('openedView', {name: 'Prerequisites'});
            preReqView.restoreCommandHijack.should.equal(true);
            disposeStub.should.have.been.calledOnce;
            updateSettingsStub.should.have.been.calledOnceWith(SettingConfigurations.EXTENSION_LOCAL_FABRIC, true, vscode.ConfigurationTarget.Global);
        });

        it(`should handle 'check' message where Docker for Windows has been confirmed`, async () => {

            const mockDependencies: any = {
                node: {name: 'Node.js', required: true, version: '10.15.3', url: 'https://nodejs.org/en/download/releases', requiredVersion: Dependencies.NODEJS_REQUIRED, requiredLabel: 'only' },
                npm: {name: 'npm', required: true, version: '6.4.1', url: 'https://nodejs.org/en/download/releases', requiredVersion: Dependencies.NPM_REQUIRED, requiredLabel: '' },
                docker: {name: 'Docker', required: true, version: '17.7.0', url: 'https://www.docker.com/get-started', requiredVersion: Dependencies.DOCKER_REQUIRED, requiredLabel: '' },
                dockerCompose: {name: 'Docker Compose', required: true, version: '1.15.0', url: 'https://docs.docker.com/compose/install/', requiredVersion: Dependencies.DOCKER_COMPOSE_REQUIRED, requiredLabel: '' },
                xcode: {name: 'Xcode', required: true, version: '123', url: 'https://apps.apple.com/gb/app/xcode/id497799835', requiredVersion: undefined, requiredLabel: undefined},
                go: {name: 'Go', required: false, version: '1.13.0', url: 'https://golang.org/dl/', requiredVersion: Dependencies.GO_REQUIRED, requiredLabel: '' },
                goExtension: {name: 'Go Extension', required: false, version: '1.0.0', url: 'vscode:extension/ms-vscode.Go', requiredVersion: '', requiredLabel: '' },
                javaLanguageExtension: {name: 'Java Language Support Extension', required: false, version: '1.0.0', url: 'vscode:extension/redhat.java', requiredVersion: undefined, requiredLabel: '' },
                javaDebuggerExtension: {name: 'Java Debugger Extension', required: false, version: '1.0.0', url: 'vscode:extension/vscjava.vscode-java-debug', requiredVersion: undefined, requiredLabel: '' },
                javaTestRunnerExtension: {name: 'Java Test Runner Extension', required: false, version: '1.0.0', url: 'vscode:extension/vscjava.vscode-java-test', requiredVersion: undefined, requiredLabel: '' },
                systemRequirements: {name: 'System Requirements', id: 'systemRequirements', complete: true, version: undefined, checkbox: true, required: true, text: 'In order to support the local runtime, please confirm your system has at least 4GB of RAM' },
                dockerForWindows: {name: 'Docker for Windows', id: 'dockerForWindows', complete: undefined, checkbox: true, required: true, text: 'Docker for Windows must be configured to use Linux containers (this is the default)' }
            };

            const hasPreReqsInstalledStub: sinon.SinonStub = mySandBox.stub(DependencyManager.instance(), 'hasPreReqsInstalled');
            hasPreReqsInstalledStub.resolves(true);

            const getPreReqVersionsStub: sinon.SinonStub = mySandBox.stub(DependencyManager.instance(), 'getPreReqVersions').resolves(mockDependencies);

            mySandBox.stub(DependencyManager.instance(), 'isValidDependency').returns(false);

            const getGlobalStateStub: sinon.SinonStub = mySandBox.stub(GlobalState, 'get').returns(DEFAULT_EXTENSION_DATA);
            const updateGlobalStateStub: sinon.SinonStub = mySandBox.stub(GlobalState, 'update').resolves();

            const expectedNewState: ExtensionData = DEFAULT_EXTENSION_DATA;
            expectedNewState.dockerForWindows = true;

            const expectedMockDependencies: any = mockDependencies;
            expectedMockDependencies.dockerForWindows.complete = true;

            const onDidDisposePromises: any[] = [];

            onDidDisposePromises.push(new Promise((resolve: any): void => {
                createWebviewPanelStub.returns({
                    title: 'Prerequisites',
                    webview: {
                        onDidReceiveMessage: async (callback: any): Promise<void> => {
                            await callback({
                                command: 'check',
                                dockerForWindows: true,
                                localFabricFunctionality: true,
                                toggle: undefined
                            });
                            resolve();
                        }
                    },
                    reveal: (): void => {
                        return;
                    },
                    onDidDispose: mySandBox.stub(),
                    onDidChangeViewState: mySandBox.stub(),
                    _isDisposed: false

                });
            }));

            const getSettingsStub: sinon.SinonStub = mySandBox.stub();
            const updateSettingsStub: sinon.SinonStub = mySandBox.stub().resolves();
            const getConfigurationStub: sinon.SinonStub = mySandBox.stub(vscode.workspace, 'getConfiguration');
            getConfigurationStub.returns({
                get: getSettingsStub,
                update: updateSettingsStub
            });

            const preReqView: PreReqView = new PreReqView(context);

            const getHTMLStringStub: sinon.SinonStub = mySandBox.stub(preReqView, 'getHTMLString').resolves();

            await preReqView.openView(true);
            await Promise.all(onDidDisposePromises);

            updateSettingsStub.should.have.been.calledOnceWith(SettingConfigurations.EXTENSION_LOCAL_FABRIC, true, vscode.ConfigurationTarget.Global);
            reporterStub.should.have.been.calledOnceWithExactly('openedView', {name: 'Prerequisites'});

            getPreReqVersionsStub.should.have.been.called;

            getGlobalStateStub.should.have.been.calledOnce;
            updateGlobalStateStub.should.have.been.calledOnceWithExactly(expectedNewState);

            hasPreReqsInstalledStub.should.have.been.calledWith(expectedMockDependencies);

            getHTMLStringStub.should.have.been.calledWith(expectedMockDependencies, true, true);

            logSpy.should.have.been.calledWith(LogType.SUCCESS, undefined, 'Finished checking installed dependencies');
            logSpy.should.not.have.been.calledWith(LogType.INFO, `Local Fabric functionality set to 'true'.`);
        });

        it(`should handle 'check' message where System Requirements has been confirmed`, async () => {

            const mockDependencies: any = {
                node: {name: 'Node.js', required: true, version: '10.15.3', url: 'https://nodejs.org/en/download/releases', requiredVersion: Dependencies.NODEJS_REQUIRED, requiredLabel: 'only' },
                npm: {name: 'npm', required: true, version: '6.4.1', url: 'https://nodejs.org/en/download/releases', requiredVersion: Dependencies.NPM_REQUIRED, requiredLabel: '' },
                docker: {name: 'Docker', required: true, version: '17.7.0', url: 'https://www.docker.com/get-started', requiredVersion: Dependencies.DOCKER_REQUIRED, requiredLabel: '' },
                dockerCompose: {name: 'Docker Compose', required: true, version: '1.15.0', url: 'https://docs.docker.com/compose/install/', requiredVersion: Dependencies.DOCKER_COMPOSE_REQUIRED, requiredLabel: '' },
                xcode: {name: 'Xcode', required: true, version: '123', url: 'https://apps.apple.com/gb/app/xcode/id497799835', requiredVersion: undefined, requiredLabel: undefined},
                go: {name: 'Go', required: false, version: '1.13.0', url: 'https://golang.org/dl/', requiredVersion: Dependencies.GO_REQUIRED, requiredLabel: '' },
                goExtension: {name: 'Go Extension', required: false, version: '1.0.0', url: 'vscode:extension/ms-vscode.Go', requiredVersion: '', requiredLabel: '' },
                javaLanguageExtension: {name: 'Java Language Support Extension', required: false, version: '1.0.0', url: 'vscode:extension/redhat.java', requiredVersion: undefined, requiredLabel: '' },
                javaDebuggerExtension: {name: 'Java Debugger Extension', required: false, version: '1.0.0', url: 'vscode:extension/vscjava.vscode-java-debug', requiredVersion: undefined, requiredLabel: '' },
                javaTestRunnerExtension: {name: 'Java Test Runner Extension', required: false, version: '1.0.0', url: 'vscode:extension/vscjava.vscode-java-test', requiredVersion: undefined, requiredLabel: '' },
                systemRequirements: {name: 'System Requirements', id: 'systemRequirements', complete: true, version: undefined, checkbox: true, required: true, text: 'In order to support the local runtime, please confirm your system has at least 4GB of RAM' }
            };

            const hasPreReqsInstalledStub: sinon.SinonStub = mySandBox.stub(DependencyManager.instance(), 'hasPreReqsInstalled');
            hasPreReqsInstalledStub.resolves(true);

            const getPreReqVersionsStub: sinon.SinonStub = mySandBox.stub(DependencyManager.instance(), 'getPreReqVersions').resolves(mockDependencies);

            mySandBox.stub(DependencyManager.instance(), 'isValidDependency').returns(false);

            const getGlobalStateStub: sinon.SinonStub = mySandBox.stub(GlobalState, 'get').returns(DEFAULT_EXTENSION_DATA);
            const updateGlobalStateStub: sinon.SinonStub = mySandBox.stub(GlobalState, 'update').resolves();

            const expectedNewState: ExtensionData = DEFAULT_EXTENSION_DATA;

            const expectedMockDependencies: any = mockDependencies;
            expectedMockDependencies.systemRequirements.complete = true;

            const onDidDisposePromises: any[] = [];

            onDidDisposePromises.push(new Promise((resolve: any): void => {
                createWebviewPanelStub.returns({
                    title: 'Prerequisites',
                    webview: {
                        onDidReceiveMessage: async (callback: any): Promise<void> => {
                            await callback({
                                command: 'check',
                                systemRequirements: true,
                                localFabricFunctionality: false,
                                toggle: 'true'
                            });
                            resolve();
                        }
                    },
                    reveal: (): void => {
                        return;
                    },
                    onDidDispose: mySandBox.stub(),
                    onDidChangeViewState: mySandBox.stub(),
                    _isDisposed: false

                });
            }));

            const getSettingsStub: sinon.SinonStub = mySandBox.stub();
            const updateSettingsStub: sinon.SinonStub = mySandBox.stub().resolves();
            const getConfigurationStub: sinon.SinonStub = mySandBox.stub(vscode.workspace, 'getConfiguration');
            getConfigurationStub.returns({
                get: getSettingsStub,
                update: updateSettingsStub
            });

            const preReqView: PreReqView = new PreReqView(context);

            const getHTMLStringStub: sinon.SinonStub = mySandBox.stub(preReqView, 'getHTMLString').resolves();

            await preReqView.openView(true);
            await Promise.all(onDidDisposePromises);

            updateSettingsStub.should.have.been.calledOnceWith(SettingConfigurations.EXTENSION_LOCAL_FABRIC, false, vscode.ConfigurationTarget.Global);
            reporterStub.should.have.been.calledOnceWithExactly('openedView', {name: 'Prerequisites'});

            getPreReqVersionsStub.should.have.been.called;

            getGlobalStateStub.should.have.been.calledOnce;
            updateGlobalStateStub.should.have.been.calledOnceWithExactly(expectedNewState);

            hasPreReqsInstalledStub.should.have.been.calledWith(expectedMockDependencies);

            getHTMLStringStub.should.have.been.calledWith(expectedMockDependencies, true, false);

            logSpy.should.have.been.calledWith(LogType.INFO, `Local Fabric functionality set to 'false'.`);
            logSpy.should.have.been.calledWith(LogType.SUCCESS, undefined, 'Finished checking installed dependencies');
        });

        it(`should handle 'skip' message where dependencies are missing`, async () => {

            const mockDependencies: any = {
                node: {name: 'Node.js', required: true, version: undefined, url: 'https://nodejs.org/en/download/releases', requiredVersion: Dependencies.NODEJS_REQUIRED, requiredLabel: 'only' },
                npm: {name: 'npm', required: true, version: undefined, url: 'https://nodejs.org/en/download/releases', requiredVersion: Dependencies.NPM_REQUIRED, requiredLabel: '' },
                docker: {name: 'Docker', required: true, version: '17.7.0', url: 'https://www.docker.com/get-started', requiredVersion: Dependencies.DOCKER_REQUIRED, requiredLabel: '' },
                dockerCompose: {name: 'Docker Compose', required: true, version: '1.15.0', url: 'https://docs.docker.com/compose/install/', requiredVersion: Dependencies.DOCKER_COMPOSE_REQUIRED, requiredLabel: '' },
                xcode: {name: 'Xcode', required: true, version: '123', url: 'https://apps.apple.com/gb/app/xcode/id497799835', requiredVersion: undefined, requiredLabel: undefined},
                go: {name: 'Go', required: false, version: '1.13.0', url: 'https://golang.org/dl/', requiredVersion: Dependencies.GO_REQUIRED, requiredLabel: '' },
                goExtension: {name: 'Go Extension', required: false, version: '1.0.0', url: 'vscode:extension/ms-vscode.Go', requiredVersion: undefined, requiredLabel: '' },
                javaLanguageExtension: {name: 'Java Language Support Extension', required: false, version: '1.0.0', url: 'vscode:extension/redhat.java', requiredVersion: undefined, requiredLabel: '' },
                javaDebuggerExtension: {name: 'Java Debugger Extension', required: false, version: '1.0.0', url: 'vscode:extension/vscjava.vscode-java-debug', requiredVersion: undefined, requiredLabel: '' },
                javaTestRunnerExtension: {name: 'Java Test Runner Extension', required: false, version: '1.0.0', url: 'vscode:extension/vscjava.vscode-java-test', requiredVersion: undefined, requiredLabel: '' },
                systemRequirements: {name: 'System Requirements', id: 'systemRequirements', complete: true, version: undefined, checkbox: true, required: true, text: 'In order to support the local runtime, please confirm your system has at least 4GB of RAM' }
            };

            const getPreReqVersionsStub: sinon.SinonStub = mySandBox.stub(DependencyManager.instance(), 'getPreReqVersions').resolves(mockDependencies);

            const isValidDependency: sinon.SinonStub = mySandBox.stub(DependencyManager.instance(), 'isValidDependency');
            isValidDependency.returns(true);
            isValidDependency.onFirstCall().returns(false);
            isValidDependency.onSecondCall().returns(false);

            const disposeStub: sinon.SinonStub = mySandBox.stub();

            const onDidDisposePromises: any[] = [];

            onDidDisposePromises.push(new Promise((resolve: any): void => {
                createWebviewPanelStub.returns({
                    title: 'Prerequisites',
                    webview: {
                        onDidReceiveMessage: async (callback: any): Promise<void> => {
                            await callback({
                                command: 'skip',
                                localFabricFunctionality: true
                            });
                            resolve();
                        }
                    },
                    reveal: (): void => {
                        return;
                    },
                    dispose: disposeStub,
                    onDidDispose: mySandBox.stub(),
                    onDidChangeViewState: mySandBox.stub(),
                    _isDisposed: false

                });
            }));

            const preReqView: PreReqView = new PreReqView(context);

            const getHTMLStringStub: sinon.SinonStub = mySandBox.stub(preReqView, 'getHTMLString').resolves();

            const getSettingsStub: sinon.SinonStub = mySandBox.stub();
            const updateSettingsStub: sinon.SinonStub = mySandBox.stub().resolves();
            const getConfigurationStub: sinon.SinonStub = mySandBox.stub(vscode.workspace, 'getConfiguration');
            getConfigurationStub.returns({
                get: getSettingsStub,
                update: updateSettingsStub
            });

            await preReqView.openView(true);
            await Promise.all(onDidDisposePromises);
            preReqView.restoreCommandHijack.should.equal(true);

            reporterStub.getCall(0).should.have.been.calledWithExactly('openedView', {name: 'Prerequisites'});
            reporterStub.getCall(1).should.have.been.calledWithExactly('skipPreReqs', {node: 'missing', npm: 'missing'});

            getHTMLStringStub.should.have.been.calledOnce;
            disposeStub.should.have.been.calledOnce;

            updateSettingsStub.getCall(0).should.have.been.calledWithExactly(SettingConfigurations.EXTENSION_BYPASS_PREREQS, true, vscode.ConfigurationTarget.Global);
            updateSettingsStub.getCall(1).should.have.been.calledWithExactly(SettingConfigurations.EXTENSION_LOCAL_FABRIC, true, vscode.ConfigurationTarget.Global);
            getPreReqVersionsStub.should.have.been.called;

        });

        it(`should handle 'skip' message where all dependencies are installed`, async () => {

            const mockDependencies: any = {
                node: {name: 'Node.js', required: true, version: '10.15.3', url: 'https://nodejs.org/en/download/releases', requiredVersion: Dependencies.NODEJS_REQUIRED, requiredLabel: 'only' },
                npm: {name: 'npm', required: true, version: '6.4.1', url: 'https://nodejs.org/en/download/releases', requiredVersion: Dependencies.NPM_REQUIRED, requiredLabel: '' },
                docker: {name: 'Docker', required: true, version: '17.7.0', url: 'https://www.docker.com/get-started', requiredVersion: Dependencies.DOCKER_REQUIRED, requiredLabel: '' },
                dockerCompose: {name: 'Docker Compose', required: true, version: '1.15.0', url: 'https://docs.docker.com/compose/install/', requiredVersion: Dependencies.DOCKER_COMPOSE_REQUIRED, requiredLabel: '' },
                xcode: {name: 'Xcode', required: true, version: '123', url: 'https://apps.apple.com/gb/app/xcode/id497799835', requiredVersion: undefined, requiredLabel: undefined},
                go: {name: 'Go', required: false, version: '1.13.0', url: 'https://golang.org/dl/', requiredVersion: Dependencies.GO_REQUIRED, requiredLabel: '' },
                goExtension: {name: 'Go Extension', required: false, version: '1.0.0', url: 'vscode:extension/ms-vscode.Go', requiredVersion: undefined, requiredLabel: '' },
                javaLanguageExtension: {name: 'Java Language Support Extension', required: false, version: '1.0.0', url: 'vscode:extension/redhat.java', requiredVersion: undefined, requiredLabel: '' },
                javaDebuggerExtension: {name: 'Java Debugger Extension', required: false, version: '1.0.0', url: 'vscode:extension/vscjava.vscode-java-debug', requiredVersion: undefined, requiredLabel: '' },
                javaTestRunnerExtension: {name: 'Java Test Runner Extension', required: false, version: '1.0.0', url: 'vscode:extension/vscjava.vscode-java-test', requiredVersion: undefined, requiredLabel: '' },
                systemRequirements: {name: 'System Requirements', id: 'systemRequirements', complete: true, version: undefined, checkbox: true, required: true, text: 'In order to support the local runtime, please confirm your system has at least 4GB of RAM' }
            };

            const getPreReqVersionsStub: sinon.SinonStub = mySandBox.stub(DependencyManager.instance(), 'getPreReqVersions').resolves(mockDependencies);

            const isValidDependency: sinon.SinonStub = mySandBox.stub(DependencyManager.instance(), 'isValidDependency');
            isValidDependency.returns(true);

            const disposeStub: sinon.SinonStub = mySandBox.stub();

            const onDidDisposePromises: any[] = [];

            onDidDisposePromises.push(new Promise((resolve: any): void => {
                createWebviewPanelStub.returns({
                    title: 'Prerequisites',
                    webview: {
                        onDidReceiveMessage: async (callback: any): Promise<void> => {
                            await callback({
                                command: 'skip',
                                localFabricFunctionality: false
                            });
                            resolve();
                        }
                    },
                    reveal: (): void => {
                        return;
                    },
                    dispose: disposeStub,
                    onDidDispose: mySandBox.stub(),
                    onDidChangeViewState: mySandBox.stub(),
                    _isDisposed: false

                });
            }));

            const preReqView: PreReqView = new PreReqView(context);

            const getHTMLStringStub: sinon.SinonStub = mySandBox.stub(preReqView, 'getHTMLString').resolves();

            const getSettingsStub: sinon.SinonStub = mySandBox.stub();
            const updateSettingsStub: sinon.SinonStub = mySandBox.stub().resolves();
            const getConfigurationStub: sinon.SinonStub = mySandBox.stub(vscode.workspace, 'getConfiguration');
            getConfigurationStub.returns({
                get: getSettingsStub,
                update: updateSettingsStub
            });

            await preReqView.openView(true);
            await Promise.all(onDidDisposePromises);
            preReqView.restoreCommandHijack.should.equal(true);

            reporterStub.should.have.been.calledOnceWithExactly('openedView', {name: 'Prerequisites'});

            getHTMLStringStub.should.have.been.calledOnce;
            disposeStub.should.have.been.calledOnce;

            updateSettingsStub.getCall(0).should.have.been.calledWithExactly(SettingConfigurations.EXTENSION_BYPASS_PREREQS, true, vscode.ConfigurationTarget.Global);
            updateSettingsStub.getCall(1).should.have.been.calledWithExactly(SettingConfigurations.EXTENSION_LOCAL_FABRIC, false, vscode.ConfigurationTarget.Global);
            getPreReqVersionsStub.should.have.been.called;

        });

        it(`should handle unknown command`, async () => {

            const getPreReqVersionsStub: sinon.SinonStub = mySandBox.stub(DependencyManager.instance(), 'getPreReqVersions');

            const isValidDependency: sinon.SinonStub = mySandBox.stub(DependencyManager.instance(), 'isValidDependency');
            isValidDependency.returns(true);

            const onDidDisposePromises: any[] = [];

            onDidDisposePromises.push(new Promise((resolve: any): void => {
                createWebviewPanelStub.returns({
                    title: 'Prerequisites',
                    webview: {
                        onDidReceiveMessage: async (callback: any): Promise<void> => {
                            await callback({
                                command: 'unknown-command'
                            });
                            resolve();
                        }
                    },
                    reveal: (): void => {
                        return;
                    },
                    onDidDispose: mySandBox.stub(),
                    onDidChangeViewState: mySandBox.stub(),
                    _isDisposed: false

                });
            }));

            const preReqView: PreReqView = new PreReqView(context);

            const getHTMLStringStub: sinon.SinonStub = mySandBox.stub(preReqView, 'getHTMLString').resolves();

            await preReqView.openView(true);
            await Promise.all(onDidDisposePromises);

            reporterStub.should.have.been.calledOnceWithExactly('openedView', {name: 'Prerequisites'});

            getHTMLStringStub.should.have.been.calledOnce;

            getPreReqVersionsStub.should.not.have.been.called;

        });

    });

});
