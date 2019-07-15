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
import * as glob from 'glob';

import { runTests, downloadAndUnzipVSCode} from 'vscode-test';

async function main(): Promise<void> {
    try {
        try {
            process.stdout['_handle'].setBlocking(true);
        } catch (error) {
            console.log(error);
        }
        try {
            process.stderr['_handle'].setBlocking(true);
        } catch (error) {
            console.log(error);
        }
        // The folder containing the Extension Manifest package.json
        // Passed to `--extensionDevelopmentPath`
        const extensionDevelopmentPath: string = path.resolve(__dirname, '..', '..');

        // The path to the extension test runner script
        // Passed to --extensionTestsPath
        const extensionTestsPath: string = path.resolve(__dirname);

        console.log('downloading vscode');
        await downloadAndUnzipVSCode('1.35.1');

        // Download VS Code, unzip it and run the integration test
        console.log('setting up tests');

        const testsRoot: string = __dirname;

        console.log('finding files', testsRoot);
        const files: string[] = glob.sync('**/**.test.js', { cwd: testsRoot });
        console.log('found lots of files', files);

        // function chunkArray(myArray: any[], chunkSize: number): any[] {
        //     let index: number = 0;
        //     const arrayLength: number = myArray.length;
        //     const tempArray: any[] = [];
        //
        //     for (index = 0; index < arrayLength; index += chunkSize) {
        //         const myChunk: any[] = myArray.slice(index, index + chunkSize);
        //         tempArray.push(myChunk);
        //     }
        //
        //     return tempArray;
        // }
        //
        // const results: any[] = chunkArray(files, 10);
        //
        // for (const result in results) {
        //     console.log('running batch ' + result);
        //     process.env.BATCH_NUMBER = result;
        await runTests({ extensionDevelopmentPath, extensionTestsPath, version: '1.35.1'});
        // }
    } catch (err) {
        console.error('Failed to run tests', err);
        process.exit(1);
    }
}

main();
