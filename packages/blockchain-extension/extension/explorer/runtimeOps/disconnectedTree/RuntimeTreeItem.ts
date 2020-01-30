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
import { BlockchainExplorerProvider } from '../../BlockchainExplorerProvider';
import { VSCodeBlockchainOutputAdapter } from '../../../logging/VSCodeBlockchainOutputAdapter';
import { FabricEnvironmentTreeItem } from './FabricEnvironmentTreeItem';
import { FabricEnvironmentRegistryEntry, LogType } from 'ibm-blockchain-platform-common';
import { LocalEnvironment } from '../../../fabric/environments/LocalEnvironment';
import { ManagedAnsibleEnvironment } from '../../../fabric/environments/ManagedAnsibleEnvironment';
import { EnvironmentFactory } from '../../../fabric/environments/EnvironmentFactory';

export class RuntimeTreeItem extends FabricEnvironmentTreeItem {

    static async newRuntimeTreeItem(provider: BlockchainExplorerProvider, label: string, environmentRegistryEntry: FabricEnvironmentRegistryEntry, command: vscode.Command): Promise<RuntimeTreeItem> {
        const treeItem: RuntimeTreeItem = new RuntimeTreeItem(provider, label, environmentRegistryEntry, command);
        await treeItem.updateProperties();
        return treeItem;
    }

    contextValue: string = 'blockchain-runtime-item';
    private name: string;
    private runtime: ManagedAnsibleEnvironment | LocalEnvironment;
    private busyTicker: NodeJS.Timer;
    private busyTicks: number = 0;

    private constructor(provider: BlockchainExplorerProvider, public readonly label: string, environmentRegistryEntry: FabricEnvironmentRegistryEntry, public readonly command: vscode.Command) {
        super(provider, label, environmentRegistryEntry, command);
        this.name = label;
        this.runtime = EnvironmentFactory.getEnvironment(environmentRegistryEntry) as ManagedAnsibleEnvironment | LocalEnvironment;
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
        if (busy) {
            // Busy!
            this.enableBusyTicker();
            const busyStates: string[] = ['◐', '◓', '◑', '◒'];
            newLabel = `${this.name} runtime is ${this.runtime.getState()}... `;
            newLabel += busyStates[this.busyTicks % 4];
            this.tooltip = `The local development runtime is ${this.runtime.getState()}...`;
        } else if (running) {
            // Running!
            this.disableBusyTicker();
            newLabel = `${this.name}  ●`;
            this.tooltip = 'The local development runtime is running';
        } else {
            // Not running!
            this.disableBusyTicker();
            newLabel = `${this.name}  ○ (click to start)`;
            this.tooltip = 'Creates a local development runtime using Hyperledger Fabric Docker images';
        }

        this.setLabel(newLabel);
        this.refresh();
    }

    private setLabel(label: string): void {
        // label is readonly so make it less readonly
        (this as any).label = label;
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
