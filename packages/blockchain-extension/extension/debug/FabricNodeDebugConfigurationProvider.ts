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
import * as path from 'path';
import * as fs from 'fs-extra';
import { FabricDebugConfigurationProvider } from './FabricDebugConfigurationProvider';
import { ExtensionUtil } from '../util/ExtensionUtil';

export class FabricNodeDebugConfigurationProvider extends FabricDebugConfigurationProvider {

    public async provideDebugConfigurations(folder: vscode.WorkspaceFolder): Promise<vscode.DebugConfiguration[]> {
        const debugInfo: any = {
            type: 'fabric:node',
            request: 'launch',
            name: 'Debug Smart Contract'
        };

        const files: string[] = await fs.readdir(folder.uri.fsPath);
        if (files.includes('tsconfig.json')) {
            debugInfo.preLaunchTask = 'tsc: build - tsconfig.json';
            debugInfo.outFiles = [
                '${workspaceFolder}/dist/**/*.js'
            ];
        }

        return [
            debugInfo
        ];
    }

    protected async getChaincodeNameAndVersion(folder: vscode.WorkspaceFolder | undefined): Promise<{ name: string, version: string }> {
        return ExtensionUtil.getContractNameAndVersion(folder);
    }

    protected async resolveDebugConfigurationInner(folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration): Promise<vscode.DebugConfiguration> {
        config.type = 'node';

        if (!config.request) {
            config.request = 'launch';
        }

        if (!config.program) {

            // Workaround for Windows (Issue #1077)
            if (process.platform === 'win32') {
                config.program = path.join(folder.uri.fsPath, 'node_modules', 'fabric-shim', 'cli');
            } else {
                config.program = path.join(folder.uri.fsPath, 'node_modules', '.bin', 'fabric-chaincode-node');
            }
        }

        if (!config.cwd) {
            config.cwd = folder.uri.fsPath;
        }

        if (!config.args) {
            config.args = [];
        }

        if (!config.args.includes('start')) {
            config.args.push('start');
        }

        if (!config.args.includes('--peer.address')) {
            const peerAddress: string = await this.getChaincodeAddress();
            if (!peerAddress) {
                return;
            }
            config.args.push('--peer.address', peerAddress);
        }

        Reporter.instance().sendTelemetryEvent('Smart Contract Debugged', { language: 'Node' });
        return config;
    }
}
