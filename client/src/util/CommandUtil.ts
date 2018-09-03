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

import * as child_process from 'child_process';
import stripAnsi = require('strip-ansi');

import * as childProcessPromise from 'child-process-promise';
import { ConsoleOutputAdapter } from '../logging/ConsoleOutputAdapter';
import { OutputAdapter } from '../logging/OutputAdapter';

const exec = childProcessPromise.exec;

export class CommandUtil {

    // Send shell command
    public static async sendCommand(command: string, cwd ?: string): Promise<string> {
        const result: childProcessPromise.childProcessPromise = await exec(command, {cwd: cwd});
        return result.stdout.trim();
    }

    public static async sendCommandWithOutput(command: string, args: Array<string>, cwd?: string, env?: any, outputAdapter?: OutputAdapter): Promise<void> {
        if (!outputAdapter) {
            outputAdapter = ConsoleOutputAdapter.instance();
        }

        const child: child_process.ChildProcess = child_process.spawn(command, args, {
            cwd,
            env
        });
        child.stdout.on('data', (data) => {
            const str = stripAnsi(data.toString());
            str.replace(/\n$/, '').split('\n').forEach((line) => outputAdapter.log(`${line}`));
        });
        child.stderr.on('data', (data) => {
            const str = stripAnsi(data.toString());
            str.replace(/\n$/, '').split('\n').forEach((line) => outputAdapter.error(`${line}`));
        });
        return new Promise<void>((resolve, reject) => {
            child.on('error', reject);
            child.on('exit', (code) => {
                if (code) {
                    return reject(new Error(`Failed to execute command "${command}" with  arguments "${args}" return code ${code}`));
                }
                resolve();
            });
        });
    }
}
