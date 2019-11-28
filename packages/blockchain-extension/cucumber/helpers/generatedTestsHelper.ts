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
import { CommandUtil } from '../../extension/util/CommandUtil';
import { SmartContractHelper, LanguageType } from './smartContractHelper';
import { FabricGatewayRegistryEntry } from '../../extension/registries/FabricGatewayRegistryEntry';
import { FabricGatewayRegistry } from '../../extension/registries/FabricGatewayRegistry';
import { FabricWalletUtil } from 'ibm-blockchain-platform-common';

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
            gatewayEntry = await FabricGatewayRegistry.instance().get(gatewayName);
        } catch (error) {
            gatewayEntry = new FabricGatewayRegistryEntry();
            gatewayEntry.name = gatewayName;
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
        this.userInputUtilHelper.showWorkspaceQuickPickBoxStub.withArgs('Choose a workspace folder to create functional tests for').resolves({ label: `${name}@${version}`, data: workspaceFolder });

        const packageJSONPath: string = path.join(contractDirectory, 'package.json');
        this.userInputUtilHelper.findFilesStub.resolves([vscode.Uri.file(packageJSONPath)]);

        if (language === 'Java') {
            this.userInputUtilHelper.showConfirmationWarningMessageStub.withArgs(`This task might overwrite ${path.join(contractDirectory, 'build.gradle')}. Do you wish to continue?`).resolves(true);
            this.userInputUtilHelper.showWarningMessageStub.withArgs('A build file was modified. Do you want to synchronize the Java classpath/configuration?').resolves('Now');
        }
        await vscode.commands.executeCommand(ExtensionCommands.TEST_SMART_CONTRACT);
    }

    public async runSmartContractTests(name: string, testLanguage: string, contractAssetType: string): Promise<boolean> {
        const contractDirectory: string = this.smartContractHelper.getContractDirectory(name, testLanguage);
        let fileExtension: string;
        if (testLanguage === 'JavaScript') {
            fileExtension = 'js';
        } else if (testLanguage === 'TypeScript') {
            fileExtension = 'ts';
        } else if (testLanguage === 'Java') {
            fileExtension = 'java';
        } else {
            // If we get here then we're running a language not supported for test files
            return;
        }

        let testResult: string;
        let success: boolean = false;
        let testCommand: string;
        if (testLanguage === 'Java') {
            const capsContractName: string = name[0].toUpperCase() + name.slice(1);
            const capsAssetType: string = contractAssetType[0].toUpperCase() + contractAssetType.slice(1);
            testCommand = `./gradlew test --tests org.example.Fv${capsAssetType}Contract${capsContractName}001Test*.submitCreate${capsAssetType}Test`;
            testResult = await CommandUtil.sendCommand(testCommand, contractDirectory);
            if (testResult.includes('BUILD SUCCESSFUL')) {
                success = true;
            }
        } else {
            testCommand = `node_modules/.bin/mocha ${path.join(contractDirectory, 'functionalTests', contractAssetType)}Contract-${name}@0.0.1.test.${fileExtension} --grep="create${contractAssetType}"`;
            if (testLanguage === 'TypeScript') {
                testCommand += ` -r ts-node/register`;
            }
            testResult = await CommandUtil.sendCommand(testCommand, contractDirectory);
            if (testResult.includes('1 passing')) {
                success = true;
            }
        }
        return success;
    }

    private getWorkspaceFolder(name: string, contractDirectory: string): vscode.WorkspaceFolder {
        const workspaceFolder: vscode.WorkspaceFolder = { index: 0, name: name, uri: vscode.Uri.file(contractDirectory) };
        return workspaceFolder;
    }
}
