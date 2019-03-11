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
import { FabricDebugConfigurationProvider } from './FabricDebugConfigurationProvider';
import { UserInputUtil } from '../commands/UserInputUtil';

export class FabricJavaDebugConfigurationProvider extends FabricDebugConfigurationProvider {

    protected async getChaincodeName(folder: vscode.WorkspaceFolder | undefined): Promise<string> {
        const name: string = await UserInputUtil.showInputBox('Enter a name for your Java package'); // Getting the specified name and package from the user
        return name;
    }

    protected async resolveDebugConfigurationInner(folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration, token?: vscode.CancellationToken): Promise<vscode.DebugConfiguration> {
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
            config.args.push('--peer.address', peerAddress);
        }

        return config;
    }

}
