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
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as path from 'path';
import * as fs from 'fs-extra';
import { ExtensionCommands } from '../../ExtensionCommands';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';
import { TestUtil } from '../../test/TestUtil';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { SettingConfigurations } from '../../extension/configurations';
import { UserInputUtilHelper } from '../helpers/userInputUtilHelper';
import { SmartContractHelper } from '../helpers/smartContractHelper';
import { GeneratedTestsHelper } from '../helpers/generatedTestsHelper';
import { WalletAndIdentityHelper } from '../helpers/walletAndIdentityHelper';
import { GatewayHelper } from '../helpers/gatewayHelper';
import { EnvironmentHelper } from '../helpers/environmentHelper';
import { SampleHelper } from '../helpers/sampleHelper';
import { FabricRuntimeUtil, LogType } from 'ibm-blockchain-platform-common';
import { ModuleUtilHelper } from '../helpers/moduleUtilHelper';

// tslint:disable:no-unused-expression

chai.use(sinonChai);
chai.use(chaiAsPromised);

export enum LanguageType {
    CHAINCODE = 'chaincode',
    CONTRACT = 'contract'
}

let firstTime: boolean = true; // Flag used for making sure we do some setup once

module.exports = function(): any {

    this.timeout = { timeout: 120000 * 1000 }; // Global timeout - 2 minutes
    this.cucumberDir = path.join(__dirname, '..', '..', '..', 'cucumber');

    this.Before(this.timeout, async () => {
        if (firstTime) {
            await TestUtil.storeRuntimesConfig();
            await TestUtil.storeExtensionDirectoryConfig();

            const extDir: string = path.join(__dirname, '..', '..', '..', 'cucumber', 'tmp');

            await vscode.workspace.getConfiguration().update(SettingConfigurations.EXTENSION_DIRECTORY, extDir, vscode.ConfigurationTarget.Global);

            this.mySandBox = sinon.createSandbox();
            this.userInputUtilHelper = new UserInputUtilHelper(this.mySandBox);
            this.moduleUtilHelper = new ModuleUtilHelper(this.mySandBox);
            this.smartContractHelper = new SmartContractHelper(this.mySandBox, this.userInputUtilHelper);
            this.generatedTestsHelper = new GeneratedTestsHelper(this.mySandBox, this.userInputUtilHelper, this.smartContractHelper);
            this.walletAndIdentityHelper = new WalletAndIdentityHelper(this.mySandBox, this.userInputUtilHelper);
            this.gatewayHelper = new GatewayHelper(this.mySandBox, this.userInputUtilHelper);
            this.fabricEnvironmentHelper = new EnvironmentHelper(this.mySandbox, this.userInputUtilHelper, this.moduleUtilHelper);
            this.sampleHelper = new SampleHelper(this.mySandBox, this.userInputUtilHelper, this.smartContractHelper);

            VSCodeBlockchainOutputAdapter.instance().setConsole(true);

            await TestUtil.storeBypassPreReqs();
            await vscode.workspace.getConfiguration().update(SettingConfigurations.EXTENSION_BYPASS_PREREQS, true, vscode.ConfigurationTarget.Global);

            this.userInputUtilHelper.showConfirmationWarningMessageStub.reset();
            firstTime = false;

            const extDirExists: boolean = await fs.pathExists(extDir);
            if (extDirExists) {
                await fs.remove(extDir);
            }

            await fs.ensureDir(extDir);

            await ExtensionUtil.activateExtension();

            await vscode.commands.executeCommand('environmentExplorer.focus');

            // sleep to allow the panels to refresh
            await ExtensionUtil.sleep(3000);

            // check there were no errors on activation
            this.userInputUtilHelper.logSpy.should.not.have.been.calledWith(LogType.ERROR);
            this.userInputUtilHelper.logSpy.resetHistory();

            try {
                await vscode.commands.executeCommand(ExtensionCommands.TEARDOWN_FABRIC, undefined, true, FabricRuntimeUtil.LOCAL_FABRIC);
            } catch (error) {
                // If the Fabric is already torn down, do nothing
            }
        }
    });

    // TODO: We want an After hook which clears the call count on all of our stubs after each scenario - then we can getCalls/ check call counts
    // VS Code user setting restores can be found in 'index.ts' after we start the cucumber tests
    this.After(this.timeout, async () => {
        await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT_GATEWAY);
        await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT_ENVIRONMENT);

    });
};
