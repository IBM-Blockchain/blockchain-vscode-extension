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
import { BlockchainTreeItem } from './BlockchainTreeItem';
import { BlockchainExplorerProvider } from '../BlockchainExplorerProvider';
import { FabricGatewayRegistryEntry } from '../../fabric/FabricGatewayRegistryEntry';
import { FabricRuntimeManager } from '../../fabric/FabricRuntimeManager';
import { FabricRuntime } from '../../fabric/FabricRuntime';
import { VSCodeBlockchainOutputAdapter } from '../../logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../../logging/OutputAdapter';

export class LocalGatewayTreeItem extends BlockchainTreeItem {

    static async newLocalGatewayTreeItem(provider: BlockchainExplorerProvider, label: string, gateway: FabricGatewayRegistryEntry, collapsableState: vscode.TreeItemCollapsibleState, command?: vscode.Command): Promise<LocalGatewayTreeItem> {
        const treeItem: LocalGatewayTreeItem = new LocalGatewayTreeItem(provider, label, gateway, collapsableState, command);
        await treeItem.updateProperties();
        return treeItem;
    }

    contextValue: string = 'blockchain-local-gateway-item';

    private name: string;
    private runtime: FabricRuntime;
    private busyTicker: NodeJS.Timer;
    private busyTicks: number = 0;

    constructor(provider: BlockchainExplorerProvider, public readonly label: string, public gateway: FabricGatewayRegistryEntry, public readonly collapsableState: vscode.TreeItemCollapsibleState, public readonly command?: vscode.Command) {
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
        const developmentMode: boolean = this.runtime.isDevelopmentMode();
        let newLabel: string = this.name + '  ';
        let newCommand: vscode.Command = this.command;
        let newContextLabel: string = this.contextValue;
        if (busy) {
            // Busy!
            this.enableBusyTicker();
            const busyStates: string[] = ['◐', '◓', '◑', '◒'];
            newLabel += busyStates[this.busyTicks % 4];
            this.tooltip = `${this.label}`;
            newCommand = null;
            newContextLabel = 'blockchain-local-gateway-item-busy';
        } else if (running) {
            // Running!
            this.disableBusyTicker();
            const gateway: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
            gateway.name = this.name;
            gateway.managedRuntime = true;
            newLabel += '●';
            this.tooltip = 'Local Fabric is running';

            newContextLabel = 'blockchain-local-gateway-item-started';
        } else {
            // Not running!
            this.disableBusyTicker();
            newLabel += '○';
            this.tooltip = 'Local Fabric is not running';

            if (created) {
                newContextLabel = 'blockchain-local-gateway-item-stopped';
            } else {
                newContextLabel = 'blockchain-local-gateway-item-removed';
            }
        }
        if (developmentMode) {
            newLabel += '  ∞';
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
