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
import * as path from 'path';
import { FabricRuntimeManager } from '../fabric/FabricRuntimeManager';
import { FabricRuntime } from '../fabric/FabricRuntime';
import * as fs from 'fs-extra';
import { VSCodeOutputAdapter } from '../logging/VSCodeOutputAdapter';

export class FabricDebugConfigurationProvider implements vscode.DebugConfigurationProvider {

    public async resolveDebugConfiguration(folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration, token?: vscode.CancellationToken): Promise<vscode.DebugConfiguration> {

        const runtime: FabricRuntime = FabricRuntimeManager.instance().get('local_fabric');

        const isRunning: boolean = await runtime.isRunning();

        if (!isRunning) {
            VSCodeOutputAdapter.instance().error('Please ensure "local_fabric" is running before trying to debug a smart contract');
            vscode.window.showErrorMessage('Please ensure "local_fabric" is running before trying to debug a smart contract');
            return;
        }

        if (!runtime.isDevelopmentMode()) {
            VSCodeOutputAdapter.instance().error('Please ensure "local_fabric" is in development mode before trying to debug a smart contract');
            vscode.window.showErrorMessage('Please ensure "local_fabric" is in development mode before trying to debug a smart contract');
            return;
        }

        config.type = 'node2';

        if (!config.request) {
            config.request = 'launch';
        }

        if (!config.program) {
            config.program = path.join(folder.uri.fsPath, 'node_modules', '.bin', 'fabric-chaincode-node');
        }

        const tsFiles: Array<vscode.Uri> = await vscode.workspace.findFiles(new vscode.RelativePattern(folder, '**/*.ts'), '**/node_modules/**', 1);

        if (tsFiles.length > 0) {
            let dir: string = '';
            const tsConfig: any = await this.loadJSON(folder, 'tsconfig.json');
            if (tsConfig && tsConfig.compilerOptions && tsConfig.compilerOptions.outDir) {
                const outDir: string = tsConfig.compilerOptions.outDir;
                if (!path.isAbsolute(outDir)) {
                    dir = outDir;
                    if (dir.indexOf('./') === 0) {
                        dir = dir.substr(2);
                    }
                }
                config.preLaunchTask = 'tsc: build - tsconfig.json';
            }

            const outFilesPath: string = path.join(folder.uri.fsPath, dir, '**/*.js');

            if (config.outFiles) {
                config.outFiles.push(outFilesPath);
            } else {
                config.outFiles = [outFilesPath];
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
            const peerAddress: string = await runtime.getChaincodeAddress();
            config.args.push('--peer.address', peerAddress);
        }

        if (!config.env) {
            config.env = {};
        }

        if (!config.env.CORE_CHAINCODE_ID_NAME) {
            const info: { name: string, version: string } = await this.getContractNameAndVersion(folder);
            config.env.CORE_CHAINCODE_ID_NAME = `${info.name}:${info.version}`;
        }

        return config;
    }

    // tslint:disable-next-line no-empty
    public dispose(): void {
    }

    private async loadJSON(folder: vscode.WorkspaceFolder, file: string): Promise<any> {
        try {
            const workspacePackage: string = path.join(folder.uri.fsPath, file);
            const workspacePackageContents: Buffer = await fs.readFile(workspacePackage);
            return JSON.parse(workspacePackageContents.toString('utf8'));
        } catch (error) {
            return;
        }
    }

    private async getContractNameAndVersion(folder: vscode.WorkspaceFolder): Promise<{ name: string, version: string }> {
        const packageJson: any = await this.loadJSON(folder, 'package.json');
        return { name: packageJson.name, version: packageJson.version };
    }
}
