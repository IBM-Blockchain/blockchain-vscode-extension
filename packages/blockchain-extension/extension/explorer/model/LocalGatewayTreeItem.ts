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
import { VSCodeBlockchainOutputAdapter } from '../../logging/VSCodeBlockchainOutputAdapter';
import { ExtensionCommands } from '../../../ExtensionCommands';
import { LogType, FabricGatewayRegistryEntry, FabricEnvironmentRegistryEntry, FabricEnvironmentRegistry } from 'ibm-blockchain-platform-common';
import { LocalEnvironment } from '../../fabric/environments/LocalEnvironment';
import { ManagedAnsibleEnvironment } from '../../fabric/environments/ManagedAnsibleEnvironment';
import { EnvironmentFactory } from '../../fabric/environments/EnvironmentFactory';

export class LocalGatewayTreeItem extends BlockchainTreeItem {

    static async newLocalGatewayTreeItem(provider: BlockchainExplorerProvider, label: string, gateway: FabricGatewayRegistryEntry, collapsableState: vscode.TreeItemCollapsibleState, command?: vscode.Command): Promise<LocalGatewayTreeItem> {
        const environmentEntry: FabricEnvironmentRegistryEntry = await FabricEnvironmentRegistry.instance().get(gateway.fromEnvironment);

        const treeItem: LocalGatewayTreeItem = new LocalGatewayTreeItem(provider, label, gateway, collapsableState, environmentEntry, command);
        await treeItem.updateProperties();
        return treeItem;
    }

    contextValue: string = 'blockchain-local-gateway-item';

    public readonly name: string;
    private runtime: ManagedAnsibleEnvironment | LocalEnvironment;
    private busyTicker: NodeJS.Timer;
    private busyTicks: number = 0;

    constructor(provider: BlockchainExplorerProvider, public readonly label: string, public gateway: FabricGatewayRegistryEntry, public readonly collapsableState: vscode.TreeItemCollapsibleState, public environmentEntry: FabricEnvironmentRegistryEntry, public readonly command?: vscode.Command ) {
        super(provider, label, collapsableState);
        this.runtime = EnvironmentFactory.getEnvironment(environmentEntry) as ManagedAnsibleEnvironment | LocalEnvironment;
        this.name = label;

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
        const running: boolean = await this.runtime.isRunning();
        let newLabel: string = this.name + '  ';
        let newTooltip: string;
        let newCommand: vscode.Command = this.command;
        if (busy) {
            // Busy!
            this.enableBusyTicker();
            const busyStates: string[] = ['◐', '◓', '◑', '◒'];
            const currentBusyState: string = busyStates[this.busyTicks % 4];
            newLabel += currentBusyState;
            newTooltip = `${this.name}  ${currentBusyState}
ⓘ Associated wallet:
${this.gateway.fromEnvironment} - ${this.gateway.associatedWallet} Wallet`;
            newCommand = null;
        } else if (running) {
            // Running!
            this.disableBusyTicker();
            newLabel += '●';
            newTooltip = `${this.name} is running
ⓘ Associated wallet:
${this.gateway.fromEnvironment} - ${this.gateway.associatedWallet} Wallet`;
            newCommand = {
                command: ExtensionCommands.CONNECT_TO_GATEWAY,
                title: '',
                arguments: [this.gateway]
            };
        } else {
            // Not running!
            this.disableBusyTicker();
            newLabel += '○';
            newTooltip = `${this.name} is not running
ⓘ Associated wallet:
${this.gateway.fromEnvironment} - ${this.gateway.associatedWallet} Wallet`;
            newCommand = {
                command: ExtensionCommands.CONNECT_TO_GATEWAY,
                title: '',
                arguments: [this.gateway]
            };
        }

        this.setLabel(newLabel);
        this.setTooltip(newTooltip);
        this.setCommand(newCommand);
        this.refresh();
    }

    private setLabel(label: string): void {
        // label is readonly so make it less readonly
        (this as any).label = label;
    }

    private setTooltip(tooltip: string): void {
        (this as any).tooltip = tooltip;
    }

    private setCommand(command: vscode.Command): void {
        // command is readonly so make it less readonly
        (this as any).command = command;
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
