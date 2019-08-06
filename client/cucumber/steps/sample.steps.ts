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
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as fs from 'fs-extra';
import * as path from 'path';
import { SampleView } from '../../src/webview/SampleView';

// tslint:disable:no-unused-expression

chai.use(sinonChai);
chai.use(chaiAsPromised);

module.exports = function(): any {
    /**
     * Given
     */

    this.Given(/I have cloned the repository '(.*?)' and I have opened the '(.*?)' '(.*?)' (contract|application) called '(.*?)'/, this.timeout, async (repositoryName: string, language: string, sampleName: string, _contractApplication: string, contractName: string) => {
        const tmpRepo: string = path.join(__dirname, '..', '..', '..', 'cucumber', 'tmp', 'repositories');
        const shortRepoName: string = repositoryName.split('/')[1];
        const pathToCheck: string = path.join(tmpRepo, shortRepoName);
        const exists: boolean = await fs.pathExists(pathToCheck);
        let result: any;
        let webview: SampleView;
        if (!exists) {
            result = await this.sampleHelper.cloneSample(repositoryName, sampleName);
            webview = result.sampleView;

        } else {
            webview = new SampleView(null, repositoryName, sampleName);
        }
        await this.sampleHelper.openContract(webview, sampleName.toLowerCase(), language.toLowerCase(), contractName);
        this.contractName = sampleName.toLowerCase();
        this.contractVersion = '1.0.0';
        this.contractLanguage = language;
        this.contractDirectory = path.join(pathToCheck, 'chaincode', sampleName.toLowerCase(), language.toLowerCase());
    });
};
