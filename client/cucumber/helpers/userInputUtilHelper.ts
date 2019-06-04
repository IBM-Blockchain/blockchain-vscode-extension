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
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';

export class UserInputUtilHelper {

    mySandBox: sinon.SinonSandbox;

    logSpy: sinon.SinonSpy;
    showLanguagesQuickPickStub: sinon.SinonStub;
    inputBoxStub: sinon.SinonStub;
    browseStub: sinon.SinonStub;
    showFolderOptionsStub: sinon.SinonStub;
    showPeersQuickPickStub: sinon.SinonStub;
    showInstallableStub: sinon.SinonStub;
    showChannelStub: sinon.SinonStub;
    showChaincodeAndVersionStub: sinon.SinonStub;
    showYesNoQuickPick: sinon.SinonStub;
    getWorkspaceFoldersStub: sinon.SinonStub;
    findFilesStub: sinon.SinonStub;
    showWalletsQuickPickStub: sinon.SinonStub;
    showIdentitiesQuickPickStub: sinon.SinonStub;
    showCertificateAuthorityQuickPickStub: sinon.SinonStub;
    showConfirmationWarningMessageStub: sinon.SinonStub;
    showGatewayQuickPickStub: sinon.SinonStub;
    showClientInstantiatedSmartContractsStub: sinon.SinonStub;
    showRuntimeInstantiatedSmartContractsStub: sinon.SinonStub;
    showTransactionStub: sinon.SinonStub;

    constructor(sandbox: sinon.SinonSandbox) {
        this.mySandBox = sandbox;

        // TODO move this somewhere more sensible when have other helpers
        this.logSpy = this.mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');

        this.showLanguagesQuickPickStub = this.mySandBox.stub(UserInputUtil, 'showLanguagesQuickPick').callThrough();
        this.inputBoxStub = this.mySandBox.stub(UserInputUtil, 'showInputBox').callThrough();
        this.browseStub = this.mySandBox.stub(UserInputUtil, 'browse').callThrough();
        this.showFolderOptionsStub = this.mySandBox.stub(UserInputUtil, 'showFolderOptions').callThrough();
        this.showPeersQuickPickStub = this.mySandBox.stub(UserInputUtil, 'showPeersQuickPickBox').callThrough();
        this.showInstallableStub = this.mySandBox.stub(UserInputUtil, 'showInstallableSmartContractsQuickPick').callThrough();
        this.showChannelStub = this.mySandBox.stub(UserInputUtil, 'showChannelQuickPickBox').callThrough();
        this.showChaincodeAndVersionStub = this.mySandBox.stub(UserInputUtil, 'showChaincodeAndVersionQuickPick').callThrough();
        this.showYesNoQuickPick = this.mySandBox.stub(UserInputUtil, 'showQuickPickYesNo').callThrough();
        this.getWorkspaceFoldersStub = this.mySandBox.stub(UserInputUtil, 'getWorkspaceFolders').callThrough();
        this.findFilesStub = this.mySandBox.stub(vscode.workspace, 'findFiles');
        this.showWalletsQuickPickStub = this.mySandBox.stub(UserInputUtil, 'showWalletsQuickPickBox').callThrough();
        this.showIdentitiesQuickPickStub = this.mySandBox.stub(UserInputUtil, 'showIdentitiesQuickPickBox').callThrough();
        this.showCertificateAuthorityQuickPickStub = this.mySandBox.stub(UserInputUtil, 'showCertificateAuthorityQuickPickBox').callThrough();
        this.showConfirmationWarningMessageStub = this.mySandBox.stub(UserInputUtil, 'showConfirmationWarningMessage').callThrough();
        this.showGatewayQuickPickStub = this.mySandBox.stub(UserInputUtil, 'showGatewayQuickPickBox').callThrough();
        this.showClientInstantiatedSmartContractsStub = this.mySandBox.stub(UserInputUtil, 'showClientInstantiatedSmartContractsQuickPick').callThrough();
        this.showRuntimeInstantiatedSmartContractsStub = this.mySandBox.stub(UserInputUtil, 'showRuntimeInstantiatedSmartContractsQuickPick').callThrough();
        this.showTransactionStub = this.mySandBox.stub(UserInputUtil, 'showTransactionQuickPick').callThrough();

    }

}
