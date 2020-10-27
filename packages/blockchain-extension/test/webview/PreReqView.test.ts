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
import { SettingConfigurations } from '../../extension/configurations';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { defaultDependencies, Dependencies } from '../../extension/dependencies/Dependencies';
import { LogType } from 'ibm-blockchain-platform-common';
const should: Chai.Should = chai.should();
chai.use(sinonChai);

interface VersionOverrides {
    docker?: string;
    dockerCompose?: string;
    node?: string;
    npm?: string;
    go?: string;
    goExtension?: string;
    java?: string;
    javaLanguageExtension?: string;
    javaDebuggerExtension?: string;
    javaTestRunnerExtension?: string;
    systemRequirements?: number;
    openssl?: string;
}

interface CompleteOverrides {
    systemRequirements?: boolean;
    dockerForWindows?: boolean;
}

const generateDependencies: any = (versions: VersionOverrides = {}, completes: CompleteOverrides = {}): Dependencies => {
    const dependencies: Dependencies = { ...defaultDependencies.required, ...defaultDependencies.optional };

    // Add versions
    dependencies.node.version = versions.hasOwnProperty('node') ? versions.node : '10.15.3';
    dependencies.npm.version = versions.hasOwnProperty('npm') ? versions.npm : '6.4.1';
    dependencies.docker.version = versions.hasOwnProperty('docker') ? versions.docker : '17.7.0';
    dependencies.dockerCompose.version = versions.hasOwnProperty('dockerCompose') ? versions.dockerCompose : '1.15.0';
    dependencies.go.version = versions.hasOwnProperty('go') ? versions.go : '1.13.0';
    dependencies.goExtension.version = versions.hasOwnProperty('goExtension') ? versions.goExtension : '1.0.0';
    dependencies.java.version = versions.hasOwnProperty('java') ? versions.java : '1.7.1';
    dependencies.javaLanguageExtension.version = versions.hasOwnProperty('javaLanguageExtension') ? versions.javaLanguageExtension : '1.0.0';
    dependencies.javaDebuggerExtension.version = versions.hasOwnProperty('javaDebuggerExtension') ? versions.javaDebuggerExtension : '1.0.0';
    dependencies.javaTestRunnerExtension.version = versions.hasOwnProperty('javaTestRunnerExtension') ? versions.javaTestRunnerExtension : '1.0.0';
    dependencies.systemRequirements.version = versions.hasOwnProperty('systemRequirements') ? versions.systemRequirements : 4;
    dependencies.openssl.version = versions.hasOwnProperty('openssl') ? versions.openssl : '1.1.1';

    // Add complete
    dependencies.dockerForWindows.complete = versions.hasOwnProperty('dockerForWindows') ? completes.dockerForWindows : true;
    dependencies.systemRequirements.complete = versions.hasOwnProperty('systemRequirements') ? completes.systemRequirements : true;

    // Modify html rendering of node version
    dependencies.node.requiredVersion = '>=10.15.3 || >=12.13.1';

    return dependencies;
};

describe('PreReqView', () => {
    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();
    let context: vscode.ExtensionContext;
    let createWebviewPanelStub: sinon.SinonStub;
    let reporterStub: sinon.SinonStub;
    let executeCommandStub: sinon.SinonStub;

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

            const dependencies: Dependencies = generateDependencies();

            const getPreReqVersionsStub: sinon.SinonStub = mySandBox.stub(DependencyManager.instance(), 'getPreReqVersions').resolves(dependencies);

            const hasPreReqsInstalledStub: sinon.SinonStub = mySandBox.stub(DependencyManager.instance(), 'hasPreReqsInstalled').resolves(true);

            const preReqView: PreReqView = new PreReqView(context);

            const html: string = await preReqView.getHTMLString();

            getPreReqVersionsStub.should.have.been.calledOnce;
            hasPreReqsInstalledStub.should.have.been.calledOnceWith(dependencies);

            html.should.contain('<div id="complete-panel" class="large-panel">'); // The success message should be visible
            html.should.contain(`<div id="check-finish-button" class="finish" onclick="finish();">Let's Blockchain!</div>`); // The button should indicate that the dependencies have been installed
            html.should.contain('<span class="prereqs-number">(0)</span>'); // No missing (required) dependencies

            html.should.contain(JSON.stringify({ ...defaultDependencies.optional.node, version: '10.15.3' }));
            html.should.contain(JSON.stringify({ ...defaultDependencies.optional.npm, version: '6.4.1' }));
            html.should.contain(JSON.stringify({ ...defaultDependencies.required.docker, version: '17.7.0' }));
            html.should.contain(JSON.stringify({ ...defaultDependencies.required.dockerCompose, version: '1.15.0' }));
            html.should.contain(JSON.stringify({ ...defaultDependencies.optional.go, version: '1.13.0' }));
            html.should.contain(JSON.stringify({ ...defaultDependencies.optional.goExtension, version: '1.0.0' }));
            html.should.contain(JSON.stringify({ ...defaultDependencies.optional.javaLanguageExtension, version: '1.0.0' }));
            html.should.contain(JSON.stringify({ ...defaultDependencies.optional.javaDebuggerExtension, version: '1.0.0' }));
            html.should.contain(JSON.stringify({ ...defaultDependencies.optional.javaTestRunnerExtension, version: '1.0.0' }));
            html.should.contain(JSON.stringify({ ...defaultDependencies.required.systemRequirements, complete: true, version: 4 }));
        });

        it(`shouldn't show message that prerequisites have been installed`, async () => {

            const dependencies: Dependencies = generateDependencies({ node: undefined, docker: undefined, javaLanguageExtension: undefined });

            const getPreReqVersionsStub: sinon.SinonStub = mySandBox.stub(DependencyManager.instance(), 'getPreReqVersions').resolves(dependencies);

            const hasPreReqsInstalledStub: sinon.SinonStub = mySandBox.stub(DependencyManager.instance(), 'hasPreReqsInstalled').resolves(false);

            const preReqView: PreReqView = new PreReqView(context);

            const html: string = await preReqView.getHTMLString();

            getPreReqVersionsStub.should.have.been.calledOnce;
            hasPreReqsInstalledStub.should.have.been.calledOnceWith(dependencies);

            html.should.contain('<div id="complete-panel" class="large-panel hidden">'); // The success message should be hidden
            html.should.contain(`<div id="check-finish-button" class="check" onclick="check();">Check again</div>`); // The button shouldn't indicate that everything has been installed
            html.should.contain('<span class="prereqs-number">(1)</span>'); // Missing (required) dependencies

            html.should.not.contain(JSON.stringify({ ...defaultDependencies.optional.node, version: '' }));
            html.should.contain(JSON.stringify({ ...defaultDependencies.optional.npm, version: '6.4.1' }));
            html.should.not.contain(JSON.stringify({ ...defaultDependencies.required.docker, version: '' }));
            html.should.contain(JSON.stringify({ ...defaultDependencies.required.dockerCompose, version: '1.15.0' }));
            html.should.contain(JSON.stringify({ ...defaultDependencies.optional.go, version: '1.13.0' }));
            html.should.contain(JSON.stringify({ ...defaultDependencies.optional.goExtension, version: '1.0.0' }));
            html.should.not.contain(JSON.stringify({ ...defaultDependencies.optional.javaLanguageExtension, version: '' }));
            html.should.contain(JSON.stringify({ ...defaultDependencies.optional.javaDebuggerExtension, version: '1.0.0' }));
            html.should.contain(JSON.stringify({ ...defaultDependencies.optional.javaTestRunnerExtension, version: '1.0.0' }));
            html.should.contain(JSON.stringify({ ...defaultDependencies.required.systemRequirements, complete: true, version: 4 }));
        });

        it('should be able to pass dependencies and if complete', async () => {
            const getPreReqVersionsSpy: sinon.SinonSpy = mySandBox.spy(DependencyManager.instance(), 'getPreReqVersions');

            mySandBox.stub(DependencyManager.instance(), 'hasPreReqsInstalled').resolves(true);

            const preReqView: PreReqView = new PreReqView(context);

            const dependencies: Dependencies = generateDependencies();

            const html: string = await preReqView.getHTMLString(dependencies, true);

            getPreReqVersionsSpy.should.not.have.been.called;

            html.should.contain('<div id="complete-panel" class="large-panel">'); // The success message should be visible
            html.should.contain(`<div id="check-finish-button" class="finish" onclick="finish();">Let's Blockchain!</div>`); // The button should indicate that the dependencies have been installed
            html.should.contain('<span class="prereqs-number">(0)</span>'); // No missing (required) dependencies

            html.should.contain(JSON.stringify({ ...defaultDependencies.optional.node, version: '10.15.3' }));
            html.should.contain(JSON.stringify({ ...defaultDependencies.optional.npm, version: '6.4.1' }));
            html.should.contain(JSON.stringify({ ...defaultDependencies.required.docker, version: '17.7.0' }));
            html.should.contain(JSON.stringify({ ...defaultDependencies.required.dockerCompose, version: '1.15.0' }));
            html.should.contain(JSON.stringify({ ...defaultDependencies.optional.go, version: '1.13.0' }));
            html.should.contain(JSON.stringify({ ...defaultDependencies.optional.goExtension, version: '1.0.0' }));
            html.should.contain(JSON.stringify({ ...defaultDependencies.optional.javaLanguageExtension, version: '1.0.0' }));
            html.should.contain(JSON.stringify({ ...defaultDependencies.optional.javaDebuggerExtension, version: '1.0.0' }));
            html.should.contain(JSON.stringify({ ...defaultDependencies.optional.javaTestRunnerExtension, version: '1.0.0' }));
            html.should.contain(JSON.stringify({ ...defaultDependencies.required.systemRequirements, complete: true, version: 4 }));
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

            const dependencies: Dependencies = generateDependencies();

            const html: string = await preReqView.getHTMLString(dependencies, true, false);

            getPreReqVersionsSpy.should.not.have.been.called;
            getSettingsStub.should.not.have.been.calledWith(SettingConfigurations.EXTENSION_LOCAL_FABRIC);

            html.should.contain('<div id="complete-panel" class="large-panel">'); // The success message should be visible
            html.should.contain(`<div id="check-finish-button" class="finish" onclick="finish();">Let's Blockchain!</div>`); // The button should indicate that the dependencies have been installed
            html.should.contain('<span class="prereqs-number">(0)</span>'); // No missing (required) dependencies

            html.should.contain(JSON.stringify({ ...defaultDependencies.optional.node, version: '10.15.3' }));
            html.should.contain(JSON.stringify({ ...defaultDependencies.optional.npm, version: '6.4.1' }));
            html.should.contain(JSON.stringify({ ...defaultDependencies.required.docker, version: '17.7.0' }));
            html.should.contain(JSON.stringify({ ...defaultDependencies.required.dockerCompose, version: '1.15.0' }));
            html.should.contain(JSON.stringify({ ...defaultDependencies.optional.go, version: '1.13.0' }));
            html.should.contain(JSON.stringify({ ...defaultDependencies.optional.goExtension, version: '1.0.0' }));
            html.should.contain(JSON.stringify({ ...defaultDependencies.optional.javaLanguageExtension, version: '1.0.0' }));
            html.should.contain(JSON.stringify({ ...defaultDependencies.optional.javaDebuggerExtension, version: '1.0.0' }));
            html.should.contain(JSON.stringify({ ...defaultDependencies.optional.javaTestRunnerExtension, version: '1.0.0' }));
            html.should.contain(JSON.stringify({ ...defaultDependencies.required.systemRequirements, complete: true, version: 4 }));
        });

        it('should handle error rendering the webview', async () => {
            const getPreReqVersionsStub: sinon.SinonStub = mySandBox.stub(DependencyManager.instance(), 'getPreReqVersions').resolves({
                // These will all have version set as undefined
                ...defaultDependencies.required,
                ...defaultDependencies.optional,
            });

            mySandBox.stub(DependencyManager.instance(), 'hasPreReqsInstalled').resolves(false);
            const error: Error = new Error('error happened');
            mySandBox.stub(ejs, 'renderFile').yields(error);

            const preReqView: PreReqView = new PreReqView(context);

            await preReqView.getHTMLString().should.be.rejectedWith(error);

            getPreReqVersionsStub.should.have.been.calledOnce;

        });

        it('should use the dependencies passed in through the constructor when available', async () => {
            const getPreReqVersionsStub: sinon.SinonStub = mySandBox.stub(DependencyManager.instance(), 'getPreReqVersions');
            const hasPreReqsInstalledStub: sinon.SinonStub = mySandBox.stub(DependencyManager.instance(), 'hasPreReqsInstalled');
            const dependencies: Dependencies = generateDependencies();
            const preReqView: PreReqView = new PreReqView(context, dependencies);

            const html: string = await preReqView.getHTMLString();

            html.should.contain(JSON.stringify({ ...defaultDependencies.optional.node, version: '10.15.3' }));
            html.should.contain(JSON.stringify({ ...defaultDependencies.optional.npm, version: '6.4.1' }));
            html.should.contain(JSON.stringify({ ...defaultDependencies.required.docker, version: '17.7.0' }));
            html.should.contain(JSON.stringify({ ...defaultDependencies.required.dockerCompose, version: '1.15.0' }));
            html.should.contain(JSON.stringify({ ...defaultDependencies.optional.go, version: '1.13.0' }));
            html.should.contain(JSON.stringify({ ...defaultDependencies.optional.goExtension, version: '1.0.0' }));
            html.should.contain(JSON.stringify({ ...defaultDependencies.optional.javaLanguageExtension, version: '1.0.0' }));
            html.should.contain(JSON.stringify({ ...defaultDependencies.optional.javaDebuggerExtension, version: '1.0.0' }));
            html.should.contain(JSON.stringify({ ...defaultDependencies.optional.javaTestRunnerExtension, version: '1.0.0' }));
            html.should.contain(JSON.stringify({ ...defaultDependencies.required.systemRequirements, complete: true, version: 4 }));

            getPreReqVersionsStub.should.not.be.called;
            hasPreReqsInstalledStub.should.be.calledWith(dependencies);
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
            const mockDependencies: Dependencies = generateDependencies({}, { systemRequirements: false, dockerForWindows: false });

            const hasPreReqsInstalledStub: sinon.SinonStub = mySandBox.stub(DependencyManager.instance(), 'hasPreReqsInstalled');
            hasPreReqsInstalledStub.resolves(true);

            const getPreReqVersionsStub: sinon.SinonStub = mySandBox.stub(DependencyManager.instance(), 'getPreReqVersions').resolves(mockDependencies);

            mySandBox.stub(DependencyManager.instance(), 'isValidDependency').returns(false);

            const getGlobalStateStub: sinon.SinonStub = mySandBox.stub(GlobalState, 'get').returns(DEFAULT_EXTENSION_DATA);
            const updateGlobalStateStub: sinon.SinonStub = mySandBox.stub(GlobalState, 'update').resolves();

            const expectedNewState: ExtensionData = DEFAULT_EXTENSION_DATA;
            expectedNewState.dockerForWindows = true;

            const expectedMockDependencies: Dependencies = mockDependencies;
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

            const mockDependencies: Dependencies = generateDependencies({}, { systemRequirements: false, dockerForWindows: false });

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

        it(`should handle 'check' message where neither System Requirements nor Docker on Windows have been confirmed`, async () => {

            const mockDependencies: Dependencies = generateDependencies({}, { systemRequirements: false, dockerForWindows: false });

            const hasPreReqsInstalledStub: sinon.SinonStub = mySandBox.stub(DependencyManager.instance(), 'hasPreReqsInstalled');
            hasPreReqsInstalledStub.resolves(true);

            const getPreReqVersionsStub: sinon.SinonStub = mySandBox.stub(DependencyManager.instance(), 'getPreReqVersions').resolves(mockDependencies);

            mySandBox.stub(DependencyManager.instance(), 'isValidDependency').returns(false);

            const getGlobalStateStub: sinon.SinonStub = mySandBox.stub(GlobalState, 'get').returns(DEFAULT_EXTENSION_DATA);
            const updateGlobalStateStub: sinon.SinonStub = mySandBox.stub(GlobalState, 'update').resolves();

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

            getGlobalStateStub.should.have.not.been.called;
            updateGlobalStateStub.should.have.not.been.called;

            hasPreReqsInstalledStub.should.have.been.calledWith(expectedMockDependencies);

            getHTMLStringStub.should.have.been.calledWith(expectedMockDependencies, true, false);

            logSpy.should.have.been.calledWith(LogType.INFO, `Local Fabric functionality set to 'false'.`);
            logSpy.should.have.been.calledWith(LogType.SUCCESS, undefined, 'Finished checking installed dependencies');
        });

        it(`should handle 'skip' message where dependencies are missing`, async () => {
            const mockDependencies: Dependencies = generateDependencies({ node: undefined, npm: undefined });

            const getPreReqVersionsStub: sinon.SinonStub = mySandBox.stub(DependencyManager.instance(), 'getPreReqVersions').resolves(mockDependencies);

            const isValidDependency: sinon.SinonStub = mySandBox.stub(DependencyManager.instance(), 'isValidDependency');
            isValidDependency.returns(true);
            isValidDependency.withArgs({ ...defaultDependencies.optional.node }).returns(false);
            isValidDependency.withArgs({ ...defaultDependencies.optional.npm}).returns(false);

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
            const mockDependencies: Dependencies = generateDependencies();

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
