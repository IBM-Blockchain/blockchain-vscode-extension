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
import { SettingConfigurations } from '../../configurations';
import { UserInputUtilHelper } from '../helpers/userInputUtilHelper';
import { SmartContractHelper } from '../helpers/smartContractHelper';
import { GeneratedTestsHelper } from '../helpers/generatedTestsHelper';
import { WalletAndIdentityHelper } from '../helpers/walletAndIdentityHelper';
import { GatewayHelper } from '../helpers/gatewayHelper';
import { EnvironmentHelper } from '../helpers/environmentHelper';
import { SampleHelper } from '../helpers/sampleHelper';
import { FabricRuntimeUtil } from 'ibm-blockchain-platform-common';

// tslint:disable:no-unused-expression

chai.use(sinonChai);
chai.use(chaiAsPromised);

export enum LanguageType {
    CHAINCODE = 'chaincode',
    CONTRACT = 'contract'
}

let firstTime: boolean = true; // Flag used for making sure we do some setup once

module.exports = function(): any {

    this.timeout = {timeout: 120000 * 1000}; // Global timeout - 2 minutes

    this.Before(this.timeout, async () => {
        try {
            if (firstTime) {
                this.mySandBox = sinon.createSandbox();
                this.userInputUtilHelper = new UserInputUtilHelper(this.mySandBox);
                this.smartContractHelper = new SmartContractHelper(this.mySandBox, this.userInputUtilHelper);
                this.generatedTestsHelper = new GeneratedTestsHelper(this.mySandBox, this.userInputUtilHelper, this.smartContractHelper);
                this.walletAndIdentityHelper = new WalletAndIdentityHelper(this.mySandBox, this.userInputUtilHelper);
                this.gatewayHelper = new GatewayHelper(this.mySandBox, this.userInputUtilHelper);
                this.fabricEnvironmentHelper = new EnvironmentHelper(this.mySandbox, this.userInputUtilHelper);
                this.sampleHelper = new SampleHelper(this.mySandBox, this.userInputUtilHelper, this.smartContractHelper);

                VSCodeBlockchainOutputAdapter.instance().setConsole(true);

                await TestUtil.storeBypassPreReqs();
                await vscode.workspace.getConfiguration().update(SettingConfigurations.EXTENSION_BYPASS_PREREQS, true, vscode.ConfigurationTarget.Global);

                const extDir: string = path.join(__dirname, '..', '..', '..', 'cucumber', 'tmp');

                this.userInputUtilHelper.showConfirmationWarningMessageStub.reset();
                firstTime = false;

                const extDirExists: boolean = await fs.pathExists(extDir);
                if (!extDirExists) {
                    await fs.mkdir(extDir);
                }

                const packageDir: string = path.join(extDir, 'packages');
                const contractDir: string = path.join(extDir, 'contracts');
                const environmentsDir: string = path.join(extDir, 'environments');
                const walletsDir: string = path.join(extDir, 'wallets');
                const profileDir: string = path.join(extDir, 'profiles');
                for (const dir of [packageDir, contractDir, environmentsDir, walletsDir, profileDir]) {
                    const exists: boolean = await fs.pathExists(dir);

                    if (exists) {
                        await fs.remove(dir);
                    }
                }

                const tmpRepo: string = path.join(extDir, 'repositories');

                const tmpExists: boolean = await fs.pathExists(tmpRepo);
                if (tmpExists) {
                    await fs.remove(tmpRepo);
                }
                await fs.mkdir(tmpRepo);

                await TestUtil.storeRuntimesConfig();
                await TestUtil.storeExtensionDirectoryConfig();

                await vscode.workspace.getConfiguration().update(SettingConfigurations.EXTENSION_DIRECTORY, extDir, vscode.ConfigurationTarget.Global);

                await ExtensionUtil.activateExtension();

                try {
                    await vscode.commands.executeCommand(ExtensionCommands.TEARDOWN_FABRIC, undefined, true, FabricRuntimeUtil.LOCAL_FABRIC);
                } catch (error) {
                    // If the Fabric is already torn down, do nothing
                }
            }
        } catch (error) {
            // tslint:disable-next-line: no-console
            console.log(error);
        }
    });

    // TODO: We want an After hook which clears the call count on all of our stubs after each scenario - then we can getCalls/ check call counts
    // VS Code user setting restores can be found in 'index.ts' after we start the cucumber tests
    this.After(this.timeout, async () => {
        await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT_GATEWAY);
        await vscode.commands.executeCommand(ExtensionCommands.DISCONNECT_ENVIRONMENT);

    });
};
