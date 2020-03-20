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

import { commands } from 'vscode';

export class TimerUtil {

    public static setInterval(commandsToExecute: {command: string, args: any[]}[], timeout: number): NodeJS.Timeout {
        return setInterval(() => {
            for (const current of commandsToExecute) {
                commands.executeCommand(current.command, ...current.args);
            }
        }, timeout);
    }

    public static cancelInterval(timeoutObject: NodeJS.Timeout): void {
        clearInterval(timeoutObject);
    }

    /** Delay for a set number of ms; this code is added in order to workaround the VSCode issue
     * https://github.com/Microsoft/vscode/issues/52778
     *
     * See comment on this post for discussion.
     * @param {number} milliseconds milliseconds to pause for
     */
    public static async sleep(milliseconds: number): Promise<void> {
        await new Promise((resolve: any): any => setTimeout(resolve, milliseconds));
    }
}
