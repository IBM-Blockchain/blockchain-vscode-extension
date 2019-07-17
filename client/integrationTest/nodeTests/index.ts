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

// tslint:disable no-var-requires
// tslint:disable typedef
import * as path from 'path';
import * as Mocha from 'mocha';
import * as glob from 'glob';

export async function run(testsRoot: string, clb: (error: any, failures?: number) => void): Promise<void> {
    // Create the mocha test
    const mocha = new Mocha({
        ui: 'bdd'
    });
    mocha.useColors(true);

    glob('**/**.test.js', {cwd: testsRoot}, (err, files) => {
        if (err) {
            return clb(err);
        }

        // Add files to the test suite
        files.forEach((f) => mocha.addFile(path.resolve(testsRoot, f)));

        try {
            // Run the mocha test
            mocha.run((failures) => {
                clb(null, failures);
            });
        } catch (err) {
            clb(err);
        }
    });
}
