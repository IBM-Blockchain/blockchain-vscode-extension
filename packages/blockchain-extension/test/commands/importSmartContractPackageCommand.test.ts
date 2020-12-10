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
import * as fs from 'fs-extra';
import * as path from 'path';
import { TestUtil } from '../TestUtil';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from 'ibm-blockchain-platform-common';
import { ExtensionCommands } from '../../ExtensionCommands';
import { UserInputUtil } from '../../extension/commands/UserInputUtil';
import { Reporter } from '../../extension/util/Reporter';
import { SettingConfigurations } from '../../extension/configurations';
import { DeployView } from '../../extension/webview/DeployView';

chai.use(sinonChai);

// tslint:disable no-unused-expression
describe('importSmartContractPackageCommand', () => {
    const sandbox: sinon.SinonSandbox = sinon.createSandbox();
    const TEST_PACKAGE_DIRECTORY: string = path.join(path.dirname(__dirname), '../../test/data/packageDir');

    before(async () => {
        await TestUtil.setupTests(sandbox);
        await vscode.workspace.getConfiguration().update(SettingConfigurations.EXTENSION_DIRECTORY, TEST_PACKAGE_DIRECTORY, vscode.ConfigurationTarget.Global);
    });

    let copyStub: sinon.SinonStub;
    let logSpy: sinon.SinonSpy;
    let browseStub: sinon.SinonStub;
    let commandSpy: sinon.SinonSpy;
    let sendTelemetryEventStub: sinon.SinonStub;
    let readdirStub: sinon.SinonStub;

    let srcPackage: string = path.join('myPath', 'test.tar.gz');

    let packagesList: string[];

    beforeEach(async () => {
        DeployView.panel = undefined;
        srcPackage = path.join('myPath', 'test.tar.gz');
        packagesList = ['myPackage.tar.gz', 'badPackage'];
        browseStub = sandbox.stub(UserInputUtil, 'browse').resolves(srcPackage);
        copyStub = sandbox.stub(fs, 'copy').resolves();
        logSpy = sandbox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
        commandSpy = sandbox.spy(vscode.commands, 'executeCommand');
        sendTelemetryEventStub = sandbox.stub(Reporter.instance(), 'sendTelemetryEvent');
        readdirStub = sandbox.stub(fs, 'readdir').resolves(packagesList);
    });

    afterEach(async () => {
        sandbox.restore();
    });

    after(async () => {
        await vscode.workspace.getConfiguration().update(SettingConfigurations.EXTENSION_DIRECTORY, TestUtil.EXTENSION_TEST_DIR, vscode.ConfigurationTarget.Global);
    });

    it('should import a tar.gz package', async () => {
        await vscode.commands.executeCommand(ExtensionCommands.IMPORT_SMART_CONTRACT);

        const endPackage: string = path.join(TEST_PACKAGE_DIRECTORY, 'v2', 'packages', 'test.tar.gz');
        copyStub.should.have.been.calledWith(srcPackage, endPackage);
        logSpy.firstCall.should.have.been.calledWith(LogType.INFO, undefined, 'Import smart contract package');
        logSpy.secondCall.should.have.been.calledWith(LogType.SUCCESS, 'Successfully imported smart contract package', 'Successfully imported smart contract package test.tar.gz');
        commandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_PACKAGES);
        readdirStub.should.have.been.calledWith(path.join(TEST_PACKAGE_DIRECTORY, 'v2', 'packages'));
        sendTelemetryEventStub.should.have.been.calledOnceWithExactly('importSmartContractPackageCommand');
    });

    it('should import a tgz package', async () => {
        srcPackage = path.join('myPath', 'test.tgz');
        browseStub.resolves(srcPackage);

        await vscode.commands.executeCommand(ExtensionCommands.IMPORT_SMART_CONTRACT);

        const endPackage: string = path.join(TEST_PACKAGE_DIRECTORY, 'v2', 'packages', 'test.tgz');
        copyStub.should.have.been.calledWith(srcPackage, endPackage);
        logSpy.firstCall.should.have.been.calledWith(LogType.INFO, undefined, 'Import smart contract package');
        logSpy.secondCall.should.have.been.calledWith(LogType.SUCCESS, 'Successfully imported smart contract package', 'Successfully imported smart contract package test.tgz');
        commandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_PACKAGES);
        readdirStub.should.have.been.calledWith(path.join(TEST_PACKAGE_DIRECTORY, 'v2', 'packages'));
        sendTelemetryEventStub.should.have.been.calledOnceWithExactly('importSmartContractPackageCommand');
    });

    it('should import a cds package', async () => {
        srcPackage = path.join('myPath', 'test.cds');
        browseStub.resolves(srcPackage);

        await vscode.commands.executeCommand(ExtensionCommands.IMPORT_SMART_CONTRACT);

        const endPackage: string = path.join(TEST_PACKAGE_DIRECTORY, 'v2', 'packages', 'test.cds');
        copyStub.should.have.been.calledWith(srcPackage, endPackage);
        logSpy.firstCall.should.have.been.calledWith(LogType.INFO, undefined, 'Import smart contract package');
        logSpy.secondCall.should.have.been.calledWith(LogType.SUCCESS, 'Successfully imported smart contract package', 'Successfully imported smart contract package test.cds');
        commandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_PACKAGES);
        readdirStub.should.have.been.calledWith(path.join(TEST_PACKAGE_DIRECTORY, 'v2', 'packages'));
        sendTelemetryEventStub.should.have.been.calledOnceWithExactly('importSmartContractPackageCommand');
    });

    it('should handle duplicate packages - same file extensions (both tar.gz)', async () => {
        packagesList.push('test.tar.gz');
        readdirStub.resolves(packagesList);

        const error: Error = new Error(`Package with name test and same file extension already exists`);
        await vscode.commands.executeCommand(ExtensionCommands.IMPORT_SMART_CONTRACT);

        readdirStub.should.have.been.calledWith(path.join(TEST_PACKAGE_DIRECTORY, 'v2', 'packages'));
        copyStub.should.not.have.been.called;
        logSpy.firstCall.should.have.been.calledWith(LogType.INFO, undefined, 'Import smart contract package');
        logSpy.secondCall.should.have.been.calledWith(LogType.ERROR, `Failed to import smart contract package: ${error.message}`, `Failed to import smart contract package: ${error.toString()}`);
        sendTelemetryEventStub.should.not.have.been.called;
    });

    it('should handle duplicate packages - equivalent file extensions (both t*gz)', async () => {
        packagesList.push('test.tgz');
        readdirStub.resolves(packagesList);

        const error: Error = new Error(`Package with name test and equivalent file extension already exists`);
        await vscode.commands.executeCommand(ExtensionCommands.IMPORT_SMART_CONTRACT);

        readdirStub.should.have.been.calledWith(path.join(TEST_PACKAGE_DIRECTORY, 'v2', 'packages'));
        copyStub.should.not.have.been.called;
        logSpy.firstCall.should.have.been.calledWith(LogType.INFO, undefined, 'Import smart contract package');
        logSpy.secondCall.should.have.been.calledWith(LogType.ERROR, `Failed to import smart contract package: ${error.message}`, `Failed to import smart contract package: ${error.toString()}`);
        sendTelemetryEventStub.should.not.have.been.called;
    });

    it('should handle duplicate packages - different file extensions (cds vs t*gz)', async () => {
        packagesList.push('test.cds');
        readdirStub.resolves(packagesList);

        await vscode.commands.executeCommand(ExtensionCommands.IMPORT_SMART_CONTRACT);

        const endPackage: string = path.join(TEST_PACKAGE_DIRECTORY, 'v2', 'packages', 'test.tar.gz');
        copyStub.should.have.been.calledWith(srcPackage, endPackage);
        logSpy.firstCall.should.have.been.calledWith(LogType.INFO, undefined, 'Import smart contract package');
        logSpy.secondCall.should.have.been.calledWith(LogType.SUCCESS, 'Successfully imported smart contract package', 'Successfully imported smart contract package test.tar.gz');
        commandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_PACKAGES);
        readdirStub.should.have.been.calledWith(path.join(TEST_PACKAGE_DIRECTORY, 'v2', 'packages'));
        sendTelemetryEventStub.should.have.been.calledOnceWithExactly('importSmartContractPackageCommand');
    });

    it('should handle cancel choosing package', async () => {
        browseStub.resolves();
        await vscode.commands.executeCommand(ExtensionCommands.IMPORT_SMART_CONTRACT);

        copyStub.should.not.have.been.called;
        logSpy.should.have.been.calledOnce;
        logSpy.should.have.been.calledWith(LogType.INFO, undefined, 'Import smart contract package');
    });

    it('should handle incorrect file type', async () => {
        srcPackage = path.join('myPath', 'test.json');
        browseStub.resolves(srcPackage);

        const error: Error = new Error('Incorrect file type, file extension must be "cds", "tar.gz" or "tgz"');

        await vscode.commands.executeCommand(ExtensionCommands.IMPORT_SMART_CONTRACT);

        readdirStub.should.not.have.been.called;
        copyStub.should.not.have.been.called;
        logSpy.firstCall.should.have.been.calledWith(LogType.INFO, undefined, 'Import smart contract package');
        logSpy.secondCall.should.have.been.calledWith(LogType.ERROR, `Failed to import smart contract package: ${error.message}`, `Failed to import smart contract package: ${error.toString()}`);
        sendTelemetryEventStub.should.not.have.been.called;
    });

    it('should handle error', async () => {
        const error: Error = new Error('such error');
        copyStub.rejects(error);

        await vscode.commands.executeCommand(ExtensionCommands.IMPORT_SMART_CONTRACT);

        const endPackage: string = path.join(TEST_PACKAGE_DIRECTORY, 'v2', 'packages', 'test.tar.gz');
        readdirStub.should.have.been.calledWith(path.join(TEST_PACKAGE_DIRECTORY, 'v2', 'packages'));
        copyStub.should.have.been.calledWith(srcPackage, endPackage);
        logSpy.firstCall.should.have.been.calledWith(LogType.INFO, undefined, 'Import smart contract package');
        logSpy.secondCall.should.have.been.calledWith(LogType.ERROR, `Failed to import smart contract package: ${error.message}`, `Failed to import smart contract package: ${error.toString()}`);
        sendTelemetryEventStub.should.not.have.been.called;
    });

    it('should update deploy view (if open) when importing package', async () => {
        DeployView.panel = {
            webview: {}
        } as unknown as vscode.WebviewPanel;

        const updatePackagesStub: sinon.SinonStub = sandbox.stub(DeployView, 'updatePackages').resolves();

        await vscode.commands.executeCommand(ExtensionCommands.IMPORT_SMART_CONTRACT);

        const endPackage: string = path.join(TEST_PACKAGE_DIRECTORY, 'v2', 'packages', 'test.tar.gz');
        copyStub.should.have.been.calledWith(srcPackage, endPackage);
        logSpy.firstCall.should.have.been.calledWith(LogType.INFO, undefined, 'Import smart contract package');
        logSpy.secondCall.should.have.been.calledWith(LogType.SUCCESS, 'Successfully imported smart contract package', 'Successfully imported smart contract package test.tar.gz');
        commandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_PACKAGES);
        readdirStub.should.have.been.calledWith(path.join(TEST_PACKAGE_DIRECTORY, 'v2', 'packages'));
        sendTelemetryEventStub.should.have.been.calledOnceWithExactly('importSmartContractPackageCommand');

        updatePackagesStub.should.have.been.calledOnce;
    });

});
