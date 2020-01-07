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
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';
import { UserInputUtil } from '../../extension/commands/UserInputUtil';
import { UserInputUtilHelper } from './userInputUtilHelper';
import { SmartContractHelper } from './smartContractHelper';
import { SampleView } from '../../extension/webview/SampleView';
import { FileConfigurations} from 'ibm-blockchain-platform-common';

chai.use(sinonChai);
chai.use(chaiAsPromised);

export enum LanguageType {
    CHAINCODE = 'chaincode',
    CONTRACT = 'contract'
}

export class SampleHelper {

    mySandBox: sinon.SinonSandbox;
    userInputUtilHelper: UserInputUtilHelper;
    smartContractHelper: SmartContractHelper;

    constructor(sandbox: sinon.SinonSandbox, userInputUtilHelper: UserInputUtilHelper, smartContractHelper: SmartContractHelper) {
        this.mySandBox = sandbox;
        this.userInputUtilHelper = userInputUtilHelper;
        this.smartContractHelper = smartContractHelper;

    }

    public async cloneSample(repositoryName: string, sampleName: string): Promise<SampleView> {
        const repositoryPath: string = path.join(this.userInputUtilHelper.cucumberDir, 'tmp', FileConfigurations.REPOSITORIES, repositoryName);
        this.userInputUtilHelper.showSaveDialogStub.withArgs({defaultUri: sinon.match.any,
            saveLabel: 'Clone Repository'}).resolves(vscode.Uri.file(repositoryPath));
        const sampleView: SampleView = new SampleView(null, repositoryName, sampleName);
        await sampleView['cloneRepository'](false);

        return sampleView;
    }

    public async openContract(sampleView: SampleView, sampleName: string, language: string, contractName: string): Promise<void> {
        this.userInputUtilHelper.showFolderOptionsStub.withArgs('Choose how to open the sample files').resolves(UserInputUtil.ADD_TO_WORKSPACE);
        await sampleView['cloneAndOpenRepository'](`chaincode/${sampleName}/${language}`, 'release-1.4', contractName, []);
    }
}
