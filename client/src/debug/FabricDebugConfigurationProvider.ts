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

        if (!config.cwd) {
            config.cwd = folder.uri.fsPath;
        }

        if (!config.args) {
            config.args = [];
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

    private async getContractNameAndVersion(folder: vscode.WorkspaceFolder): Promise<{ name: string, version: string }> {
        const workspacePackage: string = path.join(folder.uri.fsPath, 'package.json');
        const workspacePackageContents: Buffer = await fs.readFile(workspacePackage);
        const workspacePackageObj: any = JSON.parse(workspacePackageContents.toString('utf8'));
        return {name: workspacePackageObj.name, version: workspacePackageObj.version};
    }
}
