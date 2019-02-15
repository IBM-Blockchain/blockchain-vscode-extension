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
import * as fs from 'fs-extra';
import { FabricRuntimeManager } from '../fabric/FabricRuntimeManager';
import { FabricRuntime } from '../fabric/FabricRuntime';
import * as dateFormat from 'dateformat';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { FabricConnectionManager } from '../fabric/FabricConnectionManager';
import { IFabricConnection } from '../fabric/IFabricConnection';
import { PackageRegistryEntry } from '../packages/PackageRegistryEntry';
import { ExtensionUtil } from '../util/ExtensionUtil';
import { FabricGatewayRegistryEntry } from '../fabric/FabricGatewayRegistryEntry';
import { LogType } from '../logging/OutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';

export class FabricDebugConfigurationProvider implements vscode.DebugConfigurationProvider {

    private PREFIX: string = 'vscode-debug';
    private runtime: FabricRuntime;

    public async resolveDebugConfiguration(folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration, token?: vscode.CancellationToken): Promise<vscode.DebugConfiguration> {
        const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
        try {
            this.runtime = FabricRuntimeManager.instance().get('local_fabric');

            const isRunning: boolean = await this.runtime.isRunning();

            if (!isRunning) {
                outputAdapter.log(LogType.ERROR, 'Please ensure "local_fabric" is running before trying to debug a smart contract');
                return;
            }

            if (!this.runtime.isDevelopmentMode()) {
                outputAdapter.log(LogType.ERROR, 'Please ensure "local_fabric" is in development mode before trying to debug a smart contract');
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

            const newPackage: PackageRegistryEntry = await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT, folder, newVersion) as PackageRegistryEntry;

            const peersToIntallOn: Array<string> = await this.getPeersToInstallOn();

            await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT, null, new Set(peersToIntallOn), newPackage);

            config.type = 'node2';

            if (!config.request) {
                config.request = 'launch';
            }

            if (!config.program) {
                config.program = path.join(folder.uri.fsPath, 'node_modules', '.bin', 'fabric-chaincode-node');
            }

            // Search for a TsConfig file. If we find one, then assume the project is a TypeScript project.
            const tsProject: Array<vscode.Uri> = await vscode.workspace.findFiles(new vscode.RelativePattern(folder, '**/tsconfig.json'), '**/node_modules/**', 1);

            if (tsProject.length > 0) {
                // Asssume it's a TypeScript project
                let dir: string = '';
                const tsConfigPath: string = tsProject[0].fsPath;
                const tsConfig: any = await fs.readJSON(tsConfigPath);

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
            outputAdapter.log(LogType.ERROR, `Failed to launch debug: ${error.message}`);
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
        const connectionRegistry: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
        connectionRegistry.name = this.runtime.getName();
        connectionRegistry.managedRuntime = true;

        await vscode.commands.executeCommand(ExtensionCommands.CONNECT, connectionRegistry);
        const connection: IFabricConnection = FabricConnectionManager.instance().getConnection();
        return connection.getAllPeerNames();
    }

}
