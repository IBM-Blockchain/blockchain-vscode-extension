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
import * as fs from 'fs-extra';
import { createInstrumenter } from 'istanbul-lib-instrument';
import { hookRequire } from 'istanbul-lib-hook';
import { createSourceMapStore } from 'istanbul-lib-source-maps';
import { fromSource, fromMapFileSource } from 'convert-source-map';
import { createCoverageMap } from 'istanbul-lib-coverage';

export async function run(testsRoot: string, cb: (error: any, failures?: number) => void): Promise<void> {
    console.log('running tests');

    try {
        console.log('finding files', testsRoot);
        const files: string[] = glob.sync('**/**.test.js', { cwd: testsRoot });
        console.log('found lots of files');

        let failedTests: number = 0;

        function _readCoverOptions(): ITestRunnerOptions {
            const coverConfigPath: string = path.join(testsRoot, '..', '..', 'coverconfig.json');
            let coverConfig: ITestRunnerOptions;
            if (fs.existsSync(coverConfigPath)) {
                const configContent: string = fs.readFileSync(coverConfigPath, 'utf-8');
                coverConfig = JSON.parse(configContent);
            }
            return coverConfig;
        }

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

        const coverOptions: ITestRunnerOptions = _readCoverOptions();
        if (coverOptions && coverOptions.enabled) {
            // Setup coverage pre-test, including post-test hook to report
            const coverageRunner: CoverageRunner = new CoverageRunner(coverOptions, testsRoot);
            coverageRunner.setupCoverage();
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

interface ITestRunnerOptions {
    enabled?: boolean;
    relativeCoverageDir: string;
    relativeSourcePath: string;
    ignorePatterns: string[];
    includePid?: boolean;
    reports?: string[];
    verbose?: boolean;
}

class CoverageRunner {

    private coverageVar: string = '__coverage__';
    private transformer: any = undefined;
    private matchFn: any = undefined;
    private instrumenter: any = undefined;
    private sourceMapCache: any = undefined;

    constructor(private options: ITestRunnerOptions, private testsRoot: string) {
    }

    public setupCoverage(): void {
        // Set up Code Coverage, hooking require so that instrumented code is returned
        //  const self: CoverageRunner = this;
        // this.testsRoot = path.resolve(__dirname, '..', '..', 'src');
        // this.nyc = new nyc({cwd: this.testsRoot});
        // this.nyc.createTempDirectory();
        // this.nyc.addAllFiles();
        // this.instrumenter = this.nyc.instrumenter();

        this.instrumenter = createInstrumenter(this.options);
        this.sourceMapCache = createSourceMapStore();

        //  this.instrumenter.
        // self.instrumenter = new istanbul.Instrumenter({ coverageVariable: self.coverageVar });

        const sourceRoot: string = path.join(this.testsRoot, this.options.relativeSourcePath);

        // Glob source files
        const srcFiles: Array<string> = glob.sync('**/*.js', {
            cwd: sourceRoot,
            ignore: this.options.ignorePatterns,
        });

        // Create a match function - taken from the run-with-cover.js in istanbul.
        const decache: any = require('decache');
        const fileMap: any = {};
        srcFiles.forEach((file: string) => {
            const fullPath: string = path.join(sourceRoot, file);
            fileMap[fullPath] = true;

            // On Windows, extension is loaded pre-test hooks and this mean we lose
            // our chance to hook the Require call. In order to instrument the code
            // we have to decache the JS file so on next load it gets instrumented.
            // This doesn't impact tests, but is a concern if we had some integration
            // tests that relied on VSCode accessing our module since there could be
            // some shared global state that we lose.
            decache(fullPath);
        });

        this.matchFn = (file: string): boolean => {
            return fileMap[file];
        };
        this.matchFn.files = Object.keys(fileMap);

        function handleJs(code: any, options: any): any {
            // ensure the path has correct casing (see istanbuljs/nyc#269 and nodejs/node#6624)
            const filename: string = path.resolve(this.cwd, options.filename);
            const sourceMap: any = fromSource(code) || fromMapFileSource(code, path.dirname(filename));
            this.sourceMapCache.registerMap(filename, sourceMap.sourcemap);
            return this.instrumenter.instrumentSync(code, filename);
          }

        // Hook up to the Require function so that when this is called, if any of our source files
        // are required, the instrumented version is pulled in instead. These instrumented versions
        // write to a global coverage variable with hit counts whenever they are accessed
        this.transformer = handleJs.bind(this);
        const hookOpts: { verbose: boolean, extensions: Array<string> } = { verbose: true, extensions: ['.js'] };

        hookRequire(this.matchFn, this.transformer, hookOpts);

        // initialize the global variable to stop mocha from complaining about leaks
        global[this.coverageVar] = {};

        // Hook the process exit event to handle reporting
        // Only report coverage if the process is exiting successfully
        process.on('exit', () => {
            this.reportCoverage();
        });
    }

    /**
     * Writes a coverage report. Note that as this is called in the process exit callback, all calls must be synchronous.
     *
     * @returns {void}
     *
     * @memberOf CoverageRunner
     */
    public reportCoverage(): void {
        let cov: any;
        if (typeof global[this.coverageVar] === 'undefined' || Object.keys(global[this.coverageVar]).length === 0) {
            console.error('No coverage information was collected, exit without writing coverage information');
            return;
        } else {
            cov = global[this.coverageVar];
        }

        // Files that are not touched by code ran by the test runner is manually instrumented, to
        // illustrate the missing coverage.
        this.matchFn.files.forEach((file: string) => {
            if (!cov[file]) {
                this.transformer(fs.readFileSync(file, 'utf-8'), {filename: file});

                // When instrumenting the code, istanbul will give each FunctionDeclaration a value of 1 in coverState.s,
                // presumably to compensate for function hoisting. We need to reset this, as the function was not hoisted,
                // as it was never loaded.
                Object.keys(this.instrumenter.fileCoverage.s).forEach((key: string) => {
                    this.instrumenter.fileCoverage.s[key] = 0;
                });

                cov[file] = this.instrumenter.fileCoverage;
            }
        });

        const reportingDir: string = path.join(this.testsRoot, this.options.relativeCoverageDir);
        const includePid: boolean = this.options.includePid;
        const pidExt: string = includePid ? ('-' + process.pid) : '';
        const coverageFile: string = path.resolve(reportingDir, 'coverage' + pidExt + '.json');

        this.mkDirIfExists(reportingDir); // yes, do this again since some test runners could clean the dir initially created 

        const transformed: any = this.sourceMapCache.transformCoverage(
            createCoverageMap(cov)
        );

        cov =  transformed.map.data;

        fs.writeFileSync(coverageFile, JSON.stringify(cov), 'utf8');

        // const reporter: any = new istanbul.Reporter(undefined, reportingDir);
        // const reportTypes: Array<string> = (self.options.reports instanceof Array) ? self.options.reports : ['lcov'];
        // reporter.addAll(reportTypes);
        // reporter.write(remappedCollector, true, () => {
        //     console.log(`reports written to ${reportingDir}`);
        // });
    }

    private mkDirIfExists(dir: string): void {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
    }
}
