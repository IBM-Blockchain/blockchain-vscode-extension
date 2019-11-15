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
import { ExtensionUtil } from '../util/ExtensionUtil';
import { ExtensionCommands } from '../../ExtensionCommands';

export class TemporaryCommandRegistry {

    public static instance(): TemporaryCommandRegistry {
        return this._instance;
    }

    private static _instance: TemporaryCommandRegistry = new TemporaryCommandRegistry();

    // Used to save/re-execute commands used before the extension has activated (e.g. delayed by dependency downloading).
    private delayedCommandsToExecute: Set<string>;
    private tempCommands: vscode.Disposable[]; // Need to save this to unregister/dispose the temporary commands.
    private delayExecution: boolean;
    private alternativeCommand: string;

    private constructor() {
    }

    public createTempCommands(delayExecution: boolean, alternativeCommand?: string): void {
        const commands: Array<any> = ExtensionUtil.getPackageJSON().actualActivationEvents.onCommand;

        this.tempCommands = [];
        this.delayedCommandsToExecute = new Set<string>();
        this.delayExecution = delayExecution;
        this.alternativeCommand = alternativeCommand; // Can be used to redirect a command to another

        // Add temp commands that invoke the real commands after download/install is complete (preventing an error message)
        commands.forEach((command: any) => {
            this.registerTempCommand(command);
        });
    }

    public restoreCommands(): void {
        this.tempCommands.forEach((command: vscode.Disposable) => {
            command.dispose();
        });
        this.tempCommands = [];
    }

    public async executeStoredCommands(): Promise<void> {
        for (const command of this.delayedCommandsToExecute) {
            await vscode.commands.executeCommand(command);
        }

        this.delayedCommandsToExecute.clear();
    }

    private registerTempCommand(command: string): void {

        if (command !== ExtensionCommands.OPEN_PRE_REQ_PAGE) {
            const disposableCommand: vscode.Disposable = vscode.commands.registerCommand(command, async () => {

                if (this.delayExecution) {
                    // Delay the command to run later
                    this.delayedCommandsToExecute.add(command);
                } else {
                    // Command called will run this.alternativeCommand instead
                    await vscode.commands.executeCommand(this.alternativeCommand);
                }

            });

            this.tempCommands.push(disposableCommand);
        }
    }
}
