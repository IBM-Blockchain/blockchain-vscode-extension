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
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { UserInputUtilHelper } from './userInputUtilHelper';
import { ExtensionCommands } from '../../ExtensionCommands';
import { CommandUtil } from '../../src/util/CommandUtil';
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';

export enum LanguageType {
    CHAINCODE = 'chaincode',
    CONTRACT = 'contract'
}

export class SmartContractHelper {

    mySandBox: sinon.SinonSandbox;
    userInputUtilHelper: UserInputUtilHelper;

    constructor(sandbox: sinon.SinonSandbox, userInputUtilHelper: UserInputUtilHelper) {
        this.mySandBox = sandbox;
        this.userInputUtilHelper = userInputUtilHelper;
    }

    public async createSmartContract(language: string, assetType: string, contractName: string): Promise<string> {

        let type: LanguageType;
        if (language === 'Go' || language === 'Java') {
            type = LanguageType.CHAINCODE;
        } else if (language === 'JavaScript' || language === 'TypeScript') {
            type = LanguageType.CONTRACT;
        } else {
            throw new Error(`You must update this test to support the ${language} language`);
        }

        this.userInputUtilHelper.showLanguagesQuickPickStub.resolves({ label: language, type });

        this.userInputUtilHelper.inputBoxStub.withArgs('Name the type of asset managed by this smart contract', 'MyAsset').resolves(assetType);

        this.userInputUtilHelper.showFolderOptionsStub.withArgs('Choose how to open your new project').resolves(UserInputUtil.ADD_TO_WORKSPACE);

        const contractDirectory: string = this.getContractDirectory(contractName, language);

        const uri: vscode.Uri = vscode.Uri.file(contractDirectory);

        this.userInputUtilHelper.browseStub.withArgs('Choose the location to save the smart contract.', [{ label: UserInputUtil.BROWSE_LABEL, description: UserInputUtil.VALID_FOLDER_NAME }], {
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Save',
            filters: undefined
        }, true).resolves(uri);

        await vscode.commands.executeCommand(ExtensionCommands.CREATE_SMART_CONTRACT_PROJECT);

        if (language === 'JavaScript' || language === 'TypeScript') {
            // TODO can we remove this?
            await CommandUtil.sendCommandWithOutput('npm', ['install'], contractDirectory, undefined, VSCodeBlockchainOutputAdapter.instance(), false);
        }

        return contractDirectory;
    }

    public getContractDirectory(name: string, language: string): string {
        let contractDirectory: string;
        if (language === 'Go') {
            process.env.GOPATH = path.join(__dirname, '..', '..', '..', 'integrationTest', 'tmp');
            contractDirectory = path.join(process.env.GOPATH, 'src', name);
        } else {
            contractDirectory = path.join(__dirname, '..', '..', '..', 'integrationTest', 'tmp', name);
        }

        return contractDirectory;
    }
}
