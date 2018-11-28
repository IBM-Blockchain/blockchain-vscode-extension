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
import * as dateFormat from 'dateformat';
import { VSCodeOutputAdapter } from '../logging/VSCodeOutputAdapter';
import { FabricConnectionManager } from '../fabric/FabricConnectionManager';
import { FabricConnectionFactory } from '../fabric/FabricConnectionFactory';
import { IFabricConnection } from '../fabric/IFabricConnection';
import { PackageRegistryEntry } from '../packages/PackageRegistryEntry';
import { ExtensionUtil } from '../util/ExtensionUtil';
import { FabricConnectionRegistryEntry } from '../fabric/FabricConnectionRegistryEntry';
import { FabricConnectionRegistry } from '../fabric/FabricConnectionRegistry';

export class FabricDebugConfigurationProvider implements vscode.DebugConfigurationProvider {

    private PREFIX: string = 'vscode-debug';
    private runtime: FabricRuntime;

    public async resolveDebugConfiguration(folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration, token?: vscode.CancellationToken): Promise<vscode.DebugConfiguration> {
        try {
            this.runtime = FabricRuntimeManager.instance().get('local_fabric');

            const isRunning: boolean = await this.runtime.isRunning();

            if (!isRunning) {
                VSCodeOutputAdapter.instance().error('Please ensure "local_fabric" is running before trying to debug a smart contract');
                vscode.window.showErrorMessage('Please ensure "local_fabric" is running before trying to debug a smart contract');
                return;
            }

            if (!this.runtime.isDevelopmentMode()) {
                VSCodeOutputAdapter.instance().error('Please ensure "local_fabric" is in development mode before trying to debug a smart contract');
                vscode.window.showErrorMessage('Please ensure "local_fabric" is in development mode before trying to debug a smart contract');
                return;
            }

            if (!config.env) {
                config.env = {};
            }

            let newVersion: string;
            if (!config.env.CORE_CHAINCODE_ID_NAME) {

                const chaincodeInfo: { name: string, version: string } = await ExtensionUtil.getContractNameAndVersion(folder);

                newVersion = this.getNewVersion();

                config.env.CORE_CHAINCODE_ID_NAME = `${chaincodeInfo.name}:${newVersion}`;
            } else {
                newVersion = config.env.CORE_CHAINCODE_ID_NAME.split(':')[1];
            }

            const newPackage: PackageRegistryEntry = await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry', folder, newVersion) as PackageRegistryEntry;

            const peersToIntallOn: Array<string> = await this.getPeersToInstallOn();

            await vscode.commands.executeCommand('blockchainExplorer.installSmartContractEntry', null, new Set(peersToIntallOn), newPackage);

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
                const tsConfig: any = await ExtensionUtil.loadJSON(folder, 'tsconfig.json');
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
                const peerAddress: string = await this.runtime.getChaincodeAddress();
                config.args.push('--peer.address', peerAddress);
            }

            return config;
        } catch (error) {
            vscode.window.showErrorMessage('Failed to launch debug ' + error.message);
            VSCodeOutputAdapter.instance().error('Failed to launch debug ' + error.message);
            return;
        }
    }

    // tslint:disable-next-line no-empty
    public dispose(): void {
    }

    private getNewVersion(): string {
        const date: Date = new Date();
        const formattedDate: string = dateFormat(date, 'yyyymmddHHMM');
        return `${this.PREFIX}-${formattedDate}`;
    }

    private async getPeersToInstallOn(): Promise<Array<string>> {
        const connectionRegistry: FabricConnectionRegistryEntry = new FabricConnectionRegistryEntry();
        connectionRegistry.name = this.runtime.getName();
        connectionRegistry.managedRuntime = true;

        await vscode.commands.executeCommand('blockchainExplorer.connectEntry', connectionRegistry);
        const connection: IFabricConnection = FabricConnectionManager.instance().getConnection();
        return connection.getAllPeerNames();
    }

}
