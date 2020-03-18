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
import { BlockchainPackageExplorerProvider } from '../../extension/explorer/packageExplorer';
import { PackageRegistry } from '../../extension/registries/PackageRegistry';
import { PackageRegistryEntry } from '../../extension/registries/PackageRegistryEntry';
import { TestUtil } from '../TestUtil';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { PackageTreeItem } from '../../extension/explorer/model/PackageTreeItem';
import { BlockchainTreeItem } from '../../extension/explorer/model/BlockchainTreeItem';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from 'ibm-blockchain-platform-common';
import { ExtensionCommands } from '../../ExtensionCommands';
import { Reporter } from '../../extension/util/Reporter';
import { SettingConfigurations } from '../../configurations';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';
import { ListFilesInPackage } from 'ibm-blockchain-platform-environment-v1';
import { UserInputUtil } from '../../extension/commands/UserInputUtil';

// tslint:disable no-unused-expression
chai.should();
chai.use(sinonChai);

describe('viewPackageInformationCommand', () => {

    const sandbox: sinon.SinonSandbox = sinon.createSandbox();
    let blockchainPackageExplorerProvider: BlockchainPackageExplorerProvider;
    let showSpy: sinon.SinonSpy;
    let logSpy: sinon.SinonStub;
    let sendTelemetryEventStub: sinon.SinonStub;
    let showSmartContractPackagesQuickPickBoxStub: sinon.SinonStub;
    let listFilesStub: sinon.SinonStub;
    let getAllStub: sinon.SinonStub;
    let packageRegEntry: PackageRegistryEntry;
    let packagetreeItem: PackageTreeItem;
    let packages: BlockchainTreeItem[];

    before(async () => {
        await TestUtil.setupTests(sandbox);
    });

    beforeEach(async () => {
        logSpy = sandbox.stub(VSCodeBlockchainOutputAdapter.instance(), 'log');
        showSpy = sandbox.stub(VSCodeBlockchainOutputAdapter.instance(), 'show');
        sendTelemetryEventStub = sandbox.stub(Reporter.instance(), 'sendTelemetryEvent');
        blockchainPackageExplorerProvider = ExtensionUtil.getBlockchainPackageExplorerProvider();

        packageRegEntry = new PackageRegistryEntry();
        packageRegEntry.name = 'cake';
        packageRegEntry.version = '0.0.1';
        packageRegEntry.path = '/some/path';
        packageRegEntry.sizeKB = 10;

        getAllStub = sandbox.stub(PackageRegistry.instance(), 'getAll').resolves([packageRegEntry]);
        packages = await blockchainPackageExplorerProvider.getChildren();
        getAllStub.should.have.been.called;
        packagetreeItem = packages[0] as PackageTreeItem;

        showSmartContractPackagesQuickPickBoxStub = sandbox.stub(UserInputUtil, 'showSmartContractPackagesQuickPickBox').resolves({
            label: `${packageRegEntry.name}@${packageRegEntry.name}`,
            data: packageRegEntry
        });
        listFilesStub = sandbox.stub(ListFilesInPackage, 'listFiles');
        listFilesStub.withArgs(packageRegEntry.path).resolves(['src/lib/my-contract.js', 'src/package.json', 'src/test/my-contract.js']);

    });

    afterEach(async () => {
        sandbox.restore();
    });

    after(async () => {
        await vscode.workspace.getConfiguration().update(SettingConfigurations.EXTENSION_DIRECTORY, TestUtil.EXTENSION_TEST_DIR, vscode.ConfigurationTarget.Global);
    });

    it('should display package information when user issues command from command palette', async () => {

        await vscode.commands.executeCommand(ExtensionCommands.VIEW_PACKAGE_INFORMATION);

        showSmartContractPackagesQuickPickBoxStub.should.have.been.called;
        listFilesStub.should.have.been.called;
        logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'viewPackageInformation');
        logSpy.getCall(1).should.have.been.calledWith(LogType.INFO, undefined, `Found 3 file(s) in smart contract package ${packageRegEntry.name}@${packageRegEntry.version}:`);
        logSpy.getCall(2).should.have.been.calledWith(LogType.INFO, undefined, '- src/lib/my-contract.js');
        logSpy.getCall(3).should.have.been.calledWith(LogType.INFO, undefined, '- src/package.json');
        logSpy.getCall(4).should.have.been.calledWith(LogType.INFO, undefined, '- src/test/my-contract.js');
        logSpy.getCall(5).should.have.been.calledWith(LogType.SUCCESS, `Displayed information for smart contract package ${packageRegEntry.name}@${packageRegEntry.version}.`);
        showSpy.should.have.been.calledOnce;
        sendTelemetryEventStub.should.have.been.calledOnceWithExactly('viewPackageInformationCommand');

    });

    it('should display package information from treeItem', async () => {

        await vscode.commands.executeCommand(ExtensionCommands.VIEW_PACKAGE_INFORMATION, packagetreeItem);

        showSmartContractPackagesQuickPickBoxStub.should.not.have.been.called;
        listFilesStub.should.have.been.called;
        logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'viewPackageInformation');
        logSpy.getCall(1).should.have.been.calledWith(LogType.INFO, undefined, `Found 3 file(s) in smart contract package ${packageRegEntry.name}@${packageRegEntry.version}:`);
        logSpy.getCall(2).should.have.been.calledWith(LogType.INFO, undefined, '- src/lib/my-contract.js');
        logSpy.getCall(3).should.have.been.calledWith(LogType.INFO, undefined, '- src/package.json');
        logSpy.getCall(4).should.have.been.calledWith(LogType.INFO, undefined, '- src/test/my-contract.js');
        logSpy.getCall(5).should.have.been.calledWith(LogType.SUCCESS, `Displayed information for smart contract package ${packageRegEntry.name}@${packageRegEntry.version}.`);
        showSpy.should.have.been.calledOnce;
        sendTelemetryEventStub.should.have.been.calledOnceWithExactly('viewPackageInformationCommand');
    });

    it('should handle user canceling when chosing a contract', async () => {
        showSmartContractPackagesQuickPickBoxStub.resolves();

        await vscode.commands.executeCommand(ExtensionCommands.VIEW_PACKAGE_INFORMATION);

        showSmartContractPackagesQuickPickBoxStub.should.have.been.called;
        listFilesStub.should.have.not.been.called;
        logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'viewPackageInformation');
        showSpy.should.not.have.been.called;
    });

    it('should handle error displaying package information', async () => {
        const error: Error = new Error('some error');
        const caughtError: Error = new Error(`Unable to extract file list from ${packageRegEntry.name}@${packageRegEntry.version}: ${error.message}`);
        listFilesStub.reset();
        listFilesStub.rejects(error);

        await vscode.commands.executeCommand(ExtensionCommands.VIEW_PACKAGE_INFORMATION, packagetreeItem);

        showSmartContractPackagesQuickPickBoxStub.should.have.not.been.called;
        listFilesStub.should.have.been.called;
        logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'viewPackageInformation');
        logSpy.should.have.been.calledWith(LogType.ERROR, caughtError.message, caughtError.toString());
        showSpy.should.not.have.been.called;
    });

});
