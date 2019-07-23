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
// tslint:disable no-console
import * as Cucumber from 'cucumber';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as chai from 'chai';
import { TestUtil } from '../test/TestUtil';

// tslint:disable-next-line:typedef
const reporter = require('cucumber-html-reporter');
chai.should();
chai.use(require('chai-as-promised'));

let jsonResult: any;

/**
 * Programmatically execute Cucumber against the specified feature source.
 * @param {string} featureSource The feature source.
 * @return {Promise} A promise that is resolved when complete, or rejected with an
 * error.
 */
async function runCucumberTest(): Promise<any> {
    const featurePath: string = path.resolve(__dirname, '..', '..', 'cucumber', 'features');

    let featureFiles: string[] = fs.readdirSync(featurePath);
    featureFiles = featureFiles.filter((file: string) => {
        return file.includes('.feature');
    });

    const features: any[] = [];
    const otherFeatures: any = [];

    let tags: string = '';

    if (process.env.OTHER_FABRIC) {
        tags = '@otherFabric';
    } else {
        tags = 'not @otherFabric';
    }

    for (const file of featureFiles) {
        const featureSource: any = fs.readFileSync(path.join(featurePath, file), 'utf8');

        const feature: any = Cucumber.FeatureParser.parse({
            scenarioFilter: new Cucumber.ScenarioFilter({
                tagExpression: tags
            }),
            source: featureSource, // For some reason, we need to read the source of the feature (as well as provide the path
            uri: path.join(featurePath, file)
        });

        if (file === 'create.feature') {
            features[0] = feature;
        } else if (file === 'package.feature') {
            features[1] = feature;
        } else if (file === 'install.feature') {
            features[2] = feature;
        } else if (file === 'instantiate.feature') {
            features[3] = feature;
        } else if (file === 'upgrade.feature') {
            features[4] = feature;
        } else if (file === 'transaction.feature') {
            features[5] = feature;
        } else if (file === 'transaction.feature') {
            features[6] = feature;
        } else {
            otherFeatures.push(feature);
        }
    }

    features.push(...otherFeatures);

    // Load the support functions.
    Cucumber.clearSupportCodeFns();
    Cucumber.defineSupportCode((context: any) => {
        const stepdefs: any = require('./steps/index');
        stepdefs.call(context);
    });
    const supportCodeLibrary: any = Cucumber.SupportCodeLibraryBuilder.build({
        cwd: '/',
        fns: Cucumber.getSupportCodeFns()
    });

    const jsonOptions: any = {
        colorsEnabled: true,
        cwd: '/',
        log: (data: any): any => {
            if (data) {
                jsonResult = data;
            }
        },
        supportCodeLibrary: supportCodeLibrary
    };

    const jsonFormatter: any = Cucumber.FormatterBuilder.build('json', jsonOptions);

    const prettyOptions: any = {
        colorsEnabled: true,
        cwd: '/',
        log: (data: any): any => {
            // tslint:disable-next-line:no-console
            console.log(data);

        },
        supportCodeLibrary: supportCodeLibrary
    };

    const prettyFormatter: any = Cucumber.FormatterBuilder.build('pretty', prettyOptions);

    const runtime: any = new Cucumber.Runtime({
        features: features,
        listeners: [jsonFormatter, prettyFormatter],
        supportCodeLibrary: supportCodeLibrary
    });
    return runtime.start();
}

export async function run(testsRoot: string, clb: (error: any, failures?: number) => void): Promise<void> {
    console.log(testsRoot);
    try {

        const result: any = await runCucumberTest();

        // clean up after test run
        await TestUtil.restoreGatewaysConfig();
        await TestUtil.restoreRuntimesConfig();
        await TestUtil.restoreExtensionDirectoryConfig();
        await TestUtil.restoreRepositoriesConfig();
        await TestUtil.restoreWalletsConfig();
        await fs.remove(path.join(__dirname, '..', '..', '..', 'cucumber', 'tmp', 'contracts'));

        await fs.ensureFileSync(path.join(__dirname, '..', '..', 'cucumber', 'cucumber-report.json'));
        await fs.writeFileSync(path.join(__dirname, '..', '..', 'cucumber', 'cucumber-report.json'), jsonResult);

        await reporter.generate({
            theme: 'bootstrap',
            name: 'IBM Blockchain Platform Extension',
            jsonFile: path.join(__dirname, '..', '..', 'cucumber', 'cucumber-report.json'),
            output: path.join(__dirname, '..', '..', 'cucumber', 'cucumber-report.html'),
            reportSuiteAsScenarios: true,
            launchReport: false
        });

        if (result) {
            clb(null, 0);
        } else {
            clb(null, 1);
        }

    } catch (error) {
        // tslint:disable-next-line:no-console
        console.log('Error:', error);
        clb(error);
    }
}
