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
import { BlockchainExplorerProvider } from '../BlockchainExplorerProvider';
import { FabricRuntimeManager } from '../../fabric/FabricRuntimeManager';
import { FabricRuntime } from '../../fabric/FabricRuntime';
import { FabricGatewayRegistryEntry } from '../../fabric/FabricGatewayRegistryEntry';
import { VSCodeBlockchainOutputAdapter } from '../../logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../../logging/OutputAdapter';
import { ExtensionCommands } from '../../../ExtensionCommands';
import { BlockchainTreeItem } from '../model/BlockchainTreeItem';

export class RuntimeTreeItem extends BlockchainTreeItem {

    static async newRuntimeTreeItem(provider: BlockchainExplorerProvider, label: string, connection: FabricGatewayRegistryEntry, collapsableState: vscode.TreeItemCollapsibleState, command?: vscode.Command): Promise<RuntimeTreeItem> {
        const treeItem: RuntimeTreeItem = new RuntimeTreeItem(provider, label, connection, collapsableState);
        await treeItem.updateProperties();
        return treeItem;
    }

    contextValue: string = 'blockchain-runtime-item';

    private name: string;
    private runtime: FabricRuntime;
    private busyTicker: NodeJS.Timer;
    private busyTicks: number = 0;

    private constructor(provider: BlockchainExplorerProvider, public readonly label: string, public readonly connection: any, public readonly collapsableState: vscode.TreeItemCollapsibleState, public readonly command?: vscode.Command) {
        super(provider, label, collapsableState);
        const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
        this.runtime = runtimeManager.getRuntime();
        this.name = this.runtime.getName();
        this.runtime.on('busy', () => {
            this.safelyUpdateProperties();
        });
    }

    private safelyUpdateProperties(): void {
        const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();

        this.updateProperties().catch((error: Error) => {
            outputAdapter.log(LogType.ERROR, error.message, error.toString());
        });
    }

    private async updateProperties(): Promise<void> {
        const busy: boolean = this.runtime.isBusy();
        const created: boolean = await this.runtime.isCreated();
        const running: boolean = await this.runtime.isRunning();
        let newLabel: string = this.name + '  ';
        let newCommand: vscode.Command = this.command;
        let newContextLabel: string = this.contextValue;
        if (busy) {
            // Busy!
            this.enableBusyTicker();
            const busyStates: string[] = ['◐', '◓', '◑', '◒'];
            newLabel = `Local Fabric runtime is ${this.runtime.getState()}... `;
            newLabel += busyStates[this.busyTicks % 4];
            newCommand = null;
            newContextLabel = 'blockchain-runtime-item-busy';
        } else if (running) {
            // Running!
            this.disableBusyTicker();
            const connection: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
            connection.name = this.name;
            connection.managedRuntime = true;
            newLabel += '●';
            newCommand = {
                command: ExtensionCommands.CONNECT,
                title: '',
                arguments: [connection]
            };
            newContextLabel = 'blockchain-runtime-item-started';
        } else {
            // Not running!
            this.disableBusyTicker();
            newLabel = 'Local Fabric runtime is stopped. Click to start.';
            this.tooltip = 'Creates a local development runtime using Hyperledger Fabric Docker images';
            newCommand = {
                command: ExtensionCommands.START_FABRIC,
                title: '',
                arguments: [this]
            };
            if (created) {
                newContextLabel = 'blockchain-runtime-item-stopped';
            } else {
                newContextLabel = 'blockchain-runtime-item-removed';
            }
        }

        this.setLabel(newLabel);
        this.setCommand(newCommand);
        this.setContextValue(newContextLabel);
        this.refresh();
    }

    private setLabel(label: string): void {
        // label is readonly so make it less readonly
        (this as any).label = label;
    }

    private setCommand(command: vscode.Command): void {
        // command is readonly so make it less readonly
        (this as any).command = command;
    }

    private setContextValue(contextValue: string): void {
        this.contextValue = contextValue;
    }

    private enableBusyTicker(): void {
        if (!this.busyTicker) {
            this.busyTicker = setInterval(() => {
                this.busyTicks++;
                this.safelyUpdateProperties();
            }, 500);
            this.busyTicks = 0;
        }
    }

    private disableBusyTicker(): void {
        if (this.busyTicker) {
            clearInterval(this.busyTicker);
            this.busyTicker = null;
            this.busyTicks = 0;
        }
    }
}
