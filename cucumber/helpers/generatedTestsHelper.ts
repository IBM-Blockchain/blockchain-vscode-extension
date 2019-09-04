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
import * as sinon from 'sinon';
import * as path from 'path';
import { UserInputUtilHelper } from './userInputUtilHelper';
import { ExtensionCommands } from '../../ExtensionCommands';
import { CommandUtil } from '../../src/util/CommandUtil';
import { SmartContractHelper, LanguageType } from './smartContractHelper';
import { FabricGatewayRegistryEntry } from '../../src/fabric/FabricGatewayRegistryEntry';
import { FabricGatewayRegistry } from '../../src/fabric/FabricGatewayRegistry';
import { FabricWalletUtil } from '../../src/fabric/FabricWalletUtil';

export class GeneratedTestsHelper {
    mySandBox: sinon.SinonSandbox;
    userInputUtilHelper: UserInputUtilHelper;
    smartContractHelper: SmartContractHelper;

    constructor(sandbox: sinon.SinonSandbox, userInputUtilHelper: UserInputUtilHelper, smartContractHelper: SmartContractHelper) {
        this.mySandBox = sandbox;
        this.userInputUtilHelper = userInputUtilHelper;
        this.smartContractHelper = smartContractHelper;
    }

    public async generateSmartContractTests(name: string, version: string, language: string, gatewayName: string): Promise<void> {
        let gatewayEntry: FabricGatewayRegistryEntry;

        try {
            gatewayEntry = FabricGatewayRegistry.instance().get(gatewayName);
        } catch (error) {
            gatewayEntry = new FabricGatewayRegistryEntry();
            gatewayEntry.name = gatewayName;
            gatewayEntry.managedRuntime = true;
            gatewayEntry.associatedWallet = FabricWalletUtil.LOCAL_WALLET;
        }

        this.userInputUtilHelper.showGatewayQuickPickStub.resolves({
            label: gatewayName,
            data: gatewayEntry
        });

        this.userInputUtilHelper.showChannelStub.resolves('mychannel');
        this.userInputUtilHelper.showClientInstantiatedSmartContractsStub.resolves({
            label: `${name}@${version}`,
            data: { name: name, channel: 'mychannel', version: version }
        });

        this.userInputUtilHelper.showLanguagesQuickPickStub.resolves({ label: language, type: LanguageType.CONTRACT });

        const contractDirectory: string = this.smartContractHelper.getContractDirectory(name, language);
        const workspaceFolder: vscode.WorkspaceFolder = this.getWorkspaceFolder(name, contractDirectory);
        this.userInputUtilHelper.getWorkspaceFoldersStub.returns([workspaceFolder]);
        this.userInputUtilHelper.showWorkspaceQuickPickBoxStub.withArgs('Choose a workspace folder to create functional tests for').resolves({label: `${name}@${version}`, data: workspaceFolder});

        const packageJSONPath: string = path.join(contractDirectory, 'package.json');
        this.userInputUtilHelper.findFilesStub.resolves([vscode.Uri.file(packageJSONPath)]);

        let getConfigurationStub: sinon.SinonStub;
        const workspaceConfigurationGetStub: sinon.SinonStub = this.mySandBox.stub();
        const workspaceConfigurationUpdateStub: sinon.SinonStub = this.mySandBox.stub();

        if (language === 'TypeScript') {
            // Stub out the update of JavaScript Test Runner user settings
            workspaceConfigurationGetStub.callThrough();
            workspaceConfigurationUpdateStub.callThrough();
            workspaceConfigurationGetStub.withArgs('javascript-test-runner.additionalArgs').returns('');
            workspaceConfigurationUpdateStub.withArgs('javascript-test-runner.additionalArgs', '-r ts-node/register', vscode.ConfigurationTarget.Global).resolves();
            getConfigurationStub = this.mySandBox.stub(vscode.workspace, 'getConfiguration');
            getConfigurationStub.returns({
                get: workspaceConfigurationGetStub,
                update: workspaceConfigurationUpdateStub
            });
        }

        await vscode.commands.executeCommand(ExtensionCommands.TEST_SMART_CONTRACT);

        if (language === 'TypeScript') {
            getConfigurationStub.restore();
        }
    }

    public async runSmartContractTests(name: string, testLanguage: string, contractAssetType: string): Promise<string> {
        const contractDirectory: string = this.smartContractHelper.getContractDirectory(name, testLanguage);
        let fileExtension: string;
        if (testLanguage === 'JavaScript') {
            fileExtension = 'js';
        } else if (testLanguage === 'TypeScript') {
            fileExtension = 'ts';
        } else {
            // If we get here then we're running a language not supported for test files
            return;
        }
        let testCommand: string = `node_modules/.bin/mocha ${path.join(contractDirectory, 'functionalTests', contractAssetType)}Contract-${name}@0.0.1.test.${fileExtension} --grep="create${contractAssetType}"`;
        if (testLanguage === 'TypeScript') {
            testCommand += ` -r ts-node/register`;
        }
        const testResult: string = await CommandUtil.sendCommand(testCommand, contractDirectory);
        return testResult;
    }

    private getWorkspaceFolder(name: string, contractDirectory: string): vscode.WorkspaceFolder {
        const workspaceFolder: vscode.WorkspaceFolder = { index: 0, name: name, uri: vscode.Uri.file(contractDirectory) };
        return workspaceFolder;
    }
}
