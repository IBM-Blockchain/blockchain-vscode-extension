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

import * as vscode from 'vscode';
import { Reporter } from '../util/Reporter';
import { FabricDebugConfigurationProvider } from './FabricDebugConfigurationProvider';
import { UserInputUtil } from '../commands/UserInputUtil';

export class FabricJavaDebugConfigurationProvider extends FabricDebugConfigurationProvider {

    public async provideDebugConfigurations(): Promise<vscode.DebugConfiguration[]> {
        return [
            {
                type: 'fabric:java',
                request: 'launch',
                name: 'Debug Smart Contract',
                mainClass: 'org.hyperledger.fabric.contract.ContractRouter'
            }
        ];
    }

    protected async getChaincodeNameAndVersion(): Promise<{name: string, version: string}> {
        const name: string = await UserInputUtil.showInputBox('Enter a name for your Java package'); // Getting the specified name and package from the user
        if (!name) {
            return;
        }
        const version: string = await UserInputUtil.showInputBox('Enter a version for your Java package');
        return {name, version};
    }

    protected async resolveDebugConfigurationInner(folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration): Promise<vscode.DebugConfiguration> {
        config.type = 'java';

        if (!config.request) {
            config.request = 'launch';
        }

        if (!config.cwd) {
            config.cwd = folder.uri.fsPath;
        }

        if (!config.args) {
            config.args = [];
        }

        if (!config.args.includes('--peer.address')) {
            const peerAddress: string = await this.getChaincodeAddress();
            if (!peerAddress) {
                return;
            }
            config.args.push('--peer.address', peerAddress);
        }

        Reporter.instance().sendTelemetryEvent('Smart Contract Debugged', {language: 'Java'});
        return config;
    }
}
