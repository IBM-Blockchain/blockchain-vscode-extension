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
import { ConnectionTreeItem } from './ConnectionTreeItem';
import { BlockchainExplorerProvider } from '../BlockchainExplorerProvider';
import { FabricRuntimeManager } from '../../fabric/FabricRuntimeManager';
import { FabricRuntime } from '../../fabric/FabricRuntime';

export class RuntimeTreeItem extends ConnectionTreeItem {

    static async newRuntimeTreeItem(provider: BlockchainExplorerProvider, label: string, connection: any, collapsableState: vscode.TreeItemCollapsibleState, command?: vscode.Command) {
        const treeItem: RuntimeTreeItem = new RuntimeTreeItem(provider, label, connection, collapsableState);
        await treeItem.updateProperties();
        return treeItem;
    }

    contextValue = 'blockchain-runtime-item';

    private name: string;
    private runtime: FabricRuntime;
    private busyTicker: NodeJS.Timer;
    private busyTicks: number = 0;

    private constructor(provider: BlockchainExplorerProvider, public readonly label: string, public readonly connection: any, public readonly collapsableState: vscode.TreeItemCollapsibleState, public readonly command?: vscode.Command) {
        super(provider, label, connection, collapsableState, command);
        const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
        this.runtime = runtimeManager.get(label);
        this.name = this.runtime.getName();
        this.runtime.on('busy', () => {
            this.safelyUpdateProperties();
        });
    }

    public getName(): string {
        return this.name;
    }

    private safelyUpdateProperties() {
        this.updateProperties().catch((error) => vscode.window.showErrorMessage(error.message));
    }

    private async updateProperties() {
        const busy: boolean = this.runtime.isBusy();
        const running: boolean = await this.runtime.isRunning();
        const developmentMode: boolean = this.runtime.isDevelopmentMode();
        let newLabel: string = this.name + '  ';
        let newCommand: vscode.Command = this.command;
        let newContextLabel: string = this.contextValue;
        if (busy) {
            // Busy!
            this.enableBusyTicker();
            const busyStates: string[] = [ '◐', '◓', '◑', '◒' ];
            newLabel += busyStates[this.busyTicks % 4];
            newCommand = null;
            newContextLabel = 'blockchain-runtime-item-busy';
        } else if (running) {
            // Running!
            this.disableBusyTicker();
            newLabel += '●';
            newCommand = {
                command: 'blockchainExplorer.connectEntry',
                title: '',
                arguments: [this.name]
            };
            newContextLabel = 'blockchain-runtime-item-started';
        } else {
            // Not running!
            this.disableBusyTicker();
            newLabel += '○';
            newCommand = {
                command: 'blockchainExplorer.startFabricRuntime',
                title: '',
                arguments: [this]
            };
            newContextLabel = 'blockchain-runtime-item-stopped';
        }
        if (developmentMode) {
            newLabel += '  ∞';
        }
        this.setLabel(newLabel);
        this.setCommand(newCommand);
        this.setContextValue(newContextLabel);
        this.refresh();
    }

    private setLabel(label: string) {
        // label is readonly so make it less readonly
        (this as any).label = label;
    }

    private setCommand(command: vscode.Command) {
        // command is readonly so make it less readonly
        (this as any).command = command;
    }

    private setContextValue(contextValue: string) {
        this.contextValue = contextValue;
    }

    private enableBusyTicker() {
        if (!this.busyTicker) {
            this.busyTicker = setInterval(() => {
                this.busyTicks++;
                this.safelyUpdateProperties();
            }, 500);
            this.busyTicks = 0;
        }
    }

    private disableBusyTicker() {
        if (this.busyTicker) {
            clearInterval(this.busyTicker);
            this.busyTicker = null;
            this.busyTicks = 0;
        }
    }

}
