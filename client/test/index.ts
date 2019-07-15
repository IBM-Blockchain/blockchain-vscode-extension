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
import * as Mocha from 'mocha';
import * as glob from 'glob';

// tslint:disable no-var-requires
const istanbul: any = require('istanbul');
const remapIstanbul: any = require('remap-istanbul');

export async function run(testsRoot: string, cb: (error: any, failures?: number) => void): Promise<void> {
    console.log('running tests');

    // Linux: prevent a weird NPE when mocha on Linux requires the window size from the TTY
    // Since we are not running in a tty environment, we just implementt he method statically
    const tty: any = require('tty');
    if (!tty.getWindowSize) {
        tty.getWindowSize = (): number[] => {
            return [80, 75];
        };
    }

    const mocha: Mocha = new Mocha({
        ui: 'bdd',
        useColors: true,
        timeout: 60000
    });

    function _readCoverOptions(): ITestRunnerOptions {
        const coverConfigPath: string = path.join(testsRoot, '..', '..', 'coverconfig.json');
        let coverConfig: ITestRunnerOptions;
        if (fs.existsSync(coverConfigPath)) {
            const configContent: string = fs.readFileSync(coverConfigPath, 'utf-8');
            coverConfig = JSON.parse(configContent);
        }
        return coverConfig;
    }

    try {
        console.log('setting up coverage');
        const coverOptions: ITestRunnerOptions = _readCoverOptions();
        if (coverOptions && coverOptions.enabled) {
            // Setup coverage pre-test, including post-test hook to report
            const coverageRunner: CoverageRunner = new CoverageRunner(coverOptions, testsRoot);
            coverageRunner.setupCoverage();
        }

        console.log('finding files', testsRoot);
        const files: string[] = glob.sync('**/**.test.js', { cwd: testsRoot });
        console.log('found lots of files');

        let failedTests: number = 0;

        function runMocha(): Promise<any> {
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

        // Add files to the test suite
        for (const file of files) {
            console.log('adding file', file);
            mocha.addFile(path.resolve(testsRoot, file));
        }

        try {
            await runMocha();
        } catch (err) {
            cb(err);
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

    private coverageVar: string = '$$cov_' + new Date().getTime() + '$$';
    private transformer: any = undefined;
    private matchFn: any = undefined;
    private instrumenter: any = undefined;

    constructor(private options: ITestRunnerOptions, private testsRoot: string) {
    }

    public setupCoverage(): void {
        // Set up Code Coverage, hooking require so that instrumented code is returned
        const self: CoverageRunner = this;
        self.instrumenter = new istanbul.Instrumenter({ coverageVariable: self.coverageVar });
        const sourceRoot: string = path.join(self.testsRoot, self.options.relativeSourcePath);

        // Glob source files
        const srcFiles: Array<string> = glob.sync('**/*.js', {
            cwd: sourceRoot,
            ignore: self.options.ignorePatterns,
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

        self.matchFn = (file: string): boolean => {
            return fileMap[file];
        };
        self.matchFn.files = Object.keys(fileMap);

        // Hook up to the Require function so that when this is called, if any of our source files
        // are required, the instrumented version is pulled in instead. These instrumented versions
        // write to a global coverage variable with hit counts whenever they are accessed
        self.transformer = self.instrumenter.instrumentSync.bind(self.instrumenter);
        const hookOpts: { verbose: boolean, extensions: Array<string> } = { verbose: false, extensions: ['.js'] };
        istanbul.hook.hookRequire(self.matchFn, self.transformer, hookOpts);

        // initialize the global variable to stop mocha from complaining about leaks
        global[self.coverageVar] = {};

        // Hook the process exit event to handle reporting
        // Only report coverage if the process is exiting successfully
        process.on('exit', () => {
            self.reportCoverage();
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
        const self: CoverageRunner = this;
        istanbul.hook.unhookRequire();
        let cov: any;
        if (typeof global[self.coverageVar] === 'undefined' || Object.keys(global[self.coverageVar]).length === 0) {
            console.error('No coverage information was collected, exit without writing coverage information');
            return;
        } else {
            cov = global[self.coverageVar];
        }

        // Files that are not touched by code ran by the test runner is manually instrumented, to
        // illustrate the missing coverage.
        self.matchFn.files.forEach((file: string) => {
            if (!cov[file]) {
                self.transformer(fs.readFileSync(file, 'utf-8'), file);

                // When instrumenting the code, istanbul will give each FunctionDeclaration a value of 1 in coverState.s,
                // presumably to compensate for function hoisting. We need to reset this, as the function was not hoisted,
                // as it was never loaded.
                Object.keys(self.instrumenter.coverState.s).forEach((key: string) => {
                    self.instrumenter.coverState.s[key] = 0;
                });

                cov[file] = self.instrumenter.coverState;
            }
        });

        const reportingDir: string = path.join(self.testsRoot, self.options.relativeCoverageDir);
        const includePid: boolean = self.options.includePid;
        const pidExt: string = includePid ? ('-' + process.pid) : '';
        const coverageFile: string = path.resolve(reportingDir, 'coverage' + pidExt + '.json');

        this.mkDirIfExists(reportingDir); // yes, do this again since some test runners could clean the dir initially created

        fs.writeFileSync(coverageFile, JSON.stringify(cov), 'utf8');

        const remappedCollector: any = remapIstanbul.remap(cov, {
            warn: (warning: any): void => {
                // We expect some warnings as any JS file without a typescript mapping will cause this.
                // By default, we'll skip printing these to the console as it clutters it up
                if (self.options.verbose) {
                    console.warn(warning);
                }
            }
        });

        const reporter: any = new istanbul.Reporter(undefined, reportingDir);
        const reportTypes: Array<string> = (self.options.reports instanceof Array) ? self.options.reports : ['lcov'];
        reporter.addAll(reportTypes);
        reporter.write(remappedCollector, true, () => {
            console.log(`reports written to ${reportingDir}`);
        });
    }

    private mkDirIfExists(dir: string): void {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
    }
}
