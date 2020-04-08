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

import { runTests } from 'vscode-test';
import * as cp from 'child_process';
import { downloadAndUnzipVSCode, resolveCliPathFromVSCodeExecutablePath } from 'vscode-test';

async function main(): Promise<void> {
    try {
        let version: string = 'stable';
        if (process.env.VERSION) {
            version = process.env.VERSION;
        }
        process.env.MAP_OPSTOOLS_URL = process.argv[2];
        process.env.MAP_OPSTOOLS_KEY = process.argv[3];
        process.env.MAP_OPSTOOLS_SECRET = process.argv[4];

        // The folder containing the Extension Manifest package.json
        // Passed to `--extensionDevelopmentPath`
        const extensionDevelopmentPath: string = path.resolve(__dirname, '..', '..');

        // The path to the extension test runner script
        // Passed to --extensionTestsPath
        const extensionTestsPath: string = path.resolve(__dirname);

        const workspacePath: string = path.resolve(__dirname, '..', '..', 'cucumber', 'data', 'cucumber.code-workspace');

        const vscodeExecutablePath: string = await downloadAndUnzipVSCode(version);

        const cliPath: string = resolveCliPathFromVSCodeExecutablePath(vscodeExecutablePath);

        // Use cp.spawn / cp.exec for custom setup
        cp.spawnSync(cliPath, ['--install-extension', 'oshri6688.javascript-test-runner'], {
            encoding: 'utf-8',
            stdio: 'inherit'
        });
        const vsixPath: string = path.resolve(process.env.JSON_DIR, 'ibmcloud_account_0_0_1_vscode_1_35_1.vsix');
        cp.spawnSync(cliPath, ['--install-extension', vsixPath], {
            encoding: 'utf-8',
            stdio: 'inherit'
        });

        // Download VS Code, unzip it and run the integration test
        await runTests({
            extensionDevelopmentPath,
            extensionTestsPath,
            launchArgs: [workspacePath],
            version: version
        });
    } catch (err) {
        // tslint:disable-next-line: no-console
        console.error('Failed to run tests', err);
        process.exit(1);
    }
}

// tslint:disable-next-line: no-floating-promises
main();
