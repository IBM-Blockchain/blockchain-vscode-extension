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
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../../src/logging/OutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';
import { UserInputUtil } from '../../src/commands/UserInputUtil';

chai.use(sinonChai);

// tslint:disable no-unused-expression
describe('importSmartContractPackageCommand', () => {

    const TEST_PACKAGE_DIRECTORY: string = path.join(path.dirname(__dirname), '../../test/data/packageDir');

    before(async () => {
        await TestUtil.setupTests();
        await TestUtil.storeExtensionDirectoryConfig();
        await vscode.workspace.getConfiguration().update('blockchain.ext.directory', TEST_PACKAGE_DIRECTORY, vscode.ConfigurationTarget.Global);
    });

    after(async () => {
        await TestUtil.restoreExtensionDirectoryConfig();
    });

    let sandbox: sinon.SinonSandbox;
    let copyStub: sinon.SinonStub;
    let logSpy: sinon.SinonSpy;
    let browseEditStub: sinon.SinonStub;
    let commandSpy: sinon.SinonSpy;

    const srcPackage: string = path.join('myPath', 'test.cds');

    beforeEach(async () => {
        sandbox = sinon.createSandbox();

        browseEditStub = sandbox.stub(UserInputUtil, 'browseEdit').resolves(srcPackage);
        copyStub = sandbox.stub(fs, 'copyFile').resolves();
        logSpy = sandbox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
        commandSpy = sandbox.spy(vscode.commands, 'executeCommand');
    });

    afterEach(async () => {
        sandbox.restore();
    });

    it('should import a package', async () => {
        await vscode.commands.executeCommand(ExtensionCommands.IMPORT_SMART_CONTRACT);

        const endPackage: string = path.join(TEST_PACKAGE_DIRECTORY, 'packages', 'test.cds');
        copyStub.should.have.been.calledWith(srcPackage, endPackage);
        logSpy.firstCall.should.have.been.calledWith(LogType.INFO, undefined, 'Import smart contract package');
        logSpy.secondCall.should.have.been.calledWith(LogType.SUCCESS, 'Successfully imported smart contract package', 'Successfully imported smart contract package test.cds');
        commandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_PACKAGES);
    });

    it('should handle cancel choosing package', async () => {
        browseEditStub.resolves();
        await vscode.commands.executeCommand(ExtensionCommands.IMPORT_SMART_CONTRACT);

        copyStub.should.not.have.been.called;
        logSpy.should.have.been.calledOnce;
        logSpy.should.have.been.calledWith(LogType.INFO, undefined, 'Import smart contract package');
    });

    it('should handle error', async () => {
        const error: Error = new Error('such error');
        copyStub.rejects(error);

        await vscode.commands.executeCommand(ExtensionCommands.IMPORT_SMART_CONTRACT);

        const endPackage: string = path.join(TEST_PACKAGE_DIRECTORY, 'packages', 'test.cds');
        copyStub.should.have.been.calledWith(srcPackage, endPackage);
        logSpy.firstCall.should.have.been.calledWith(LogType.INFO, undefined, 'Import smart contract package');
        logSpy.secondCall.should.have.been.calledWith(LogType.ERROR, `Failed to import smart contract package: ${error.message}`, `Failed to import smart contract package: ${error.toString()}`);
    });
});
