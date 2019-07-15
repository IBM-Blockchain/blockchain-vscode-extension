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
import * as Mocha from 'mocha';
import * as glob from 'glob';

export async function run(testsRoot: string, cb: (error: any, failures?: number) => void): Promise<void> {
    console.log('running tests');

    try {
        console.log('finding files', testsRoot);
        let files: string[] = glob.sync('**/**.test.js', {cwd: testsRoot});
        console.log('found lots of files');

        files = files.sort((fileA: string, fileB: string) => {
            if (fileA < fileB) {
                return 1;
            }
            if (fileA > fileB) {
                return -1;
            }

            return 0;
        });

        let failedTests: number = 0;

        function chunkArray(myArray: any[], chunkSize: number): any[] {
            let index: number = 0;
            const arrayLength: number = myArray.length;
            const tempArray: any[] = [];

            for (index = 0; index < arrayLength; index += chunkSize) {
                const myChunk: any[] = myArray.slice(index, index + chunkSize);
                tempArray.push(myChunk);
            }

            return tempArray;
        }

        function runMocha(mocha: Mocha): Promise<any> {
            return new Promise((resolve: any, error: any): any => {
                mocha.run((failures: any) => {
                    failedTests += failures;
                    if (failures > 0) {
                        error(new Error(`${failures} tests failed.`));
                    } else {
                        resolve();
                    }
                });
            });
        }

        let results: any[] = chunkArray(files, 10);

        if (process.env.BATCH_NUMBER) {
            results = [results[process.env.BATCH_NUMBER]];
        } else {
            results = [files];
        }

        for (const result of results) {
            // Create the mocha test
            const mocha: Mocha = new Mocha({
                ui: 'bdd',
                timeout: 60000,
                fullStackTrace: true
            });
            mocha.useColors(true);

            console.log('Running chunk');

            // Add files to the test suite
            for (const file of result) {
                console.log('adding file', file);
                mocha.addFile(path.resolve(testsRoot, file));
            }

            try {
                await runMocha(mocha);
            } catch (err) {
                cb(err);
            }
        }

        cb(null, failedTests);
    } catch (error) {
        console.log(error);
        cb(error);
    }
}
