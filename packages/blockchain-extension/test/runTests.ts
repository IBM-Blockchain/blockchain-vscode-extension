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
import { runTests, downloadAndUnzipVSCode, resolveCliPathFromVSCodeExecutablePath } from 'vscode-test';
import * as fs from 'fs-extra';
import * as cp from 'child_process';

async function main(): Promise<void> {
    try {
        let version: string = 'stable';
        if (process.env.VERSION) {
            version = process.env.VERSION;
        }
        // The folder containing the Extension Manifest package.json
        // Passed to `--extensionDevelopmentPath`
        const extensionDevelopmentPath: string = path.resolve(__dirname, '..', '..');

        // The path to the extension test runner script
        // Passed to --extensionTestsPath
        const extensionTestsPath: string = path.resolve(__dirname);

        console.log('downloading vscode');
        const vscodeExecutablePath: string = await downloadAndUnzipVSCode(version);

        const cliPath: string = resolveCliPathFromVSCodeExecutablePath(vscodeExecutablePath);

        const vsixPath: string = path.resolve(process.env.JSON_DIR, 'ibmcloud_account_0_0_1_vscode_1_35_1.vsix');
        cp.spawnSync(cliPath, ['--install-extension', vsixPath], {
            encoding: 'utf-8',
            stdio: 'inherit'
        });

        // Download VS Code, unzip it and run the integration test
        console.log('setting up tests');

        await runTests({ extensionDevelopmentPath, extensionTestsPath, version: version });

        // need to make sure the tests actually ran properly
        const pathToCheck: string = path.resolve(__dirname, '..', '..', 'coverage', 'coverage.json');
        const exists: boolean = await fs.pathExists(pathToCheck);
        if (!exists) {
            throw new Error('coverage does not exist so tests failed');
        }

    } catch (err) {
        console.error('Failed to run tests', err);
        process.exit(1);
    }
}

main();
