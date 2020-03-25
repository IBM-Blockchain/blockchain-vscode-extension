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

import * as path from 'path';
import * as fs from 'fs-extra';
import {Helper} from './Helper';
import {SmartContractPackage} from '../../src';
import {SmartContractType} from '../../src';
import * as child_process from 'child_process';

import stripAnsi = require('strip-ansi');

export class PackageHelper {

    public static async packageContract(projectPath: string, label: string, type: SmartContractType, language: string): Promise<string> {

        if (language === 'typescript') {
            await this.runCommand('npm', ['install'], projectPath);
            await this.runCommand('npm', ['run', 'build'], projectPath);
        } else if (language === 'java') {
            await this.runCommand('./gradlew', ['installDist'], projectPath);
            projectPath = path.join(projectPath, 'build', 'install', 'fabcar');
        } else if (language === 'go') {
            await this.runCommand('go', ['mod', 'vendor'], projectPath);
        }

        const contractPackage: SmartContractPackage = await SmartContractPackage.createSmartContractPackage({
            smartContractPath: projectPath,
            smartContractType: type,
            label: label
        });

        await fs.ensureDir(Helper.PACKAGE_DIR);

        const packagePath: string = path.join(Helper.PACKAGE_DIR, `${label}.tar.gz`);
        await fs.writeFile(packagePath, contractPackage.smartContractPackage);
        return packagePath;
    }

    public static getPackageFileList(contractBuffer: Buffer): Promise<string[]> {
        const contractPackage: SmartContractPackage = new SmartContractPackage(contractBuffer);
        return contractPackage.getFileNames();
    }

    private static async runCommand(command: string, args: string[], cwd: string): Promise<void> {
        const options: any = {
            cwd
        };

        const child: child_process.ChildProcess = child_process.spawn(command, args, options);
        // @ts-ignore
        child.stdout.on('data', (data: string | Buffer) => {
            const str: string = stripAnsi(data.toString());
            // tslint:disable-next-line:no-console
            str.replace(/[\r\n]+$/, '').split(/[\r\n]+/).forEach((line: string) => console.log(line));
        });
        // @ts-ignore
        child.stderr.on('data', (data: string | Buffer) => {
            const str: string = stripAnsi(data.toString());
            // tslint:disable-next-line:no-console
            str.replace(/[\r\n]+$/, '').split(/[\r\n]+/).forEach((line: string) => console.log(line));
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
}
