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
import * as child_process from 'child_process';
import stripAnsi = require('strip-ansi');

import * as childProcessPromise from 'child-process-promise';
import { ConsoleOutputAdapter } from '../logging/ConsoleOutputAdapter';
import { OutputAdapter } from '../logging/OutputAdapter';
import { LogType } from '../logging/OutputAdapter';
import * as request from 'request';

const exec: any = childProcessPromise.exec;

export class CommandUtil {

    // Send shell command
    public static async sendCommand(command: string, cwd?: string): Promise<string> {
        const result: childProcessPromise.childProcessPromise = await exec(command, { cwd: cwd });
        return result.stdout.trim();
    }

    public static async sendCommandWithProgress(command: string, cwd: string, message: string): Promise<string> {
        return vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Blockchain Extension',
            cancellable: false
        }, async (progress: vscode.Progress<{ message: string }>): Promise<string> => {
            progress.report({ message });
            return this.sendCommand(command, cwd);
        });
    }

    public static async sendCommandWithOutput(command: string, args: Array<string>, cwd?: string, env?: any, outputAdapter?: OutputAdapter, shell: boolean = false): Promise<void> {
        if (!outputAdapter) {
            outputAdapter = ConsoleOutputAdapter.instance();
        }

        const options: any = {
            cwd,
            env,
            shell
        };

        const child: child_process.ChildProcess = child_process.spawn(command, args, options);
        child.stdout.on('data', (data: string | Buffer) => {
            const str: string = stripAnsi(data.toString());
            str.replace(/[\r\n]+$/, '').split(/[\r\n]+/).forEach((line: string) => outputAdapter.log(LogType.INFO, undefined, line));
        });
        child.stderr.on('data', (data: string | Buffer) => {
            const str: string = stripAnsi(data.toString());
            str.replace(/[\r\n]+$/, '').split(/[\r\n]+/).forEach((line: string) => outputAdapter.log(LogType.INFO, undefined, line));
        });

        return new Promise<void>((resolve: any, reject: any): any => {
            child.on('error', reject);
            child.on('exit', (code: string) => {
                if (code) {
                    return reject(new Error(`Failed to execute command "${command}" with  arguments "${args.join(', ')}" return code ${code}`));
                }
                resolve();
            });
        });
    }

    public static async sendCommandWithOutputAndProgress(command: string, args: Array<string>, message: string, cwd?: string, env?: any, outputAdapter?: OutputAdapter, shell: boolean = false): Promise<void> {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Blockchain Extension',
            cancellable: false
        }, async (progress: vscode.Progress<{ message: string }>): Promise<void> => {
            progress.report({ message });
            await this.sendCommandWithOutput(command, args, cwd, env, outputAdapter, shell);
        });
    }

    public static sendRequestWithOutput(url: string, outputAdapter?: OutputAdapter): void {
        if (!outputAdapter) {
            outputAdapter = ConsoleOutputAdapter.instance();
        }
        request.get(url)
            .on('data', (response: request.Response) => {
                const str: string = stripAnsi(response.toString());
                str.replace(/[\r\n]+$/, '').split(/[\r\n]+/).forEach((line: string) => {
                    line = line.replace(/^[\s]+/, '');
                    outputAdapter.log(LogType.INFO, undefined, line);
                });
            })
            .on('error', (error: any) => {
                const str: string = stripAnsi(error.toString());
                str.replace(/[\r\n]+$/, '').split(/[\r\n]+/).forEach((line: string) => {
                    line = line.replace(/^[\s]+/, '');
                    outputAdapter.log(LogType.ERROR, undefined, line);
                });
            });
    }
}
