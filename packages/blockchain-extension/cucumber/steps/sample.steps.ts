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
import { SampleView } from '../../extension/webview/SampleView';
import { CommandUtil } from '../../extension/util/CommandUtil';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import {FileConfigurations} from 'ibm-blockchain-platform-common';

// tslint:disable:no-unused-expression

chai.use(sinonChai);
chai.use(chaiAsPromised);

module.exports = function(): any {
    /**
     * Given
     */

    this.Given(/I have cloned the repository '(.*?)' and I have opened the '(.*?)' '(.*?)' (contract|application) called '(.*?)' with namespace '(.*?)'/, this.timeout, async (repositoryName: string, language: string, sampleName: string, _contractApplication: string, contractName: string, namespace: string) => {
        const tmpRepo: string = path.join(this.cucumberDir, 'tmp', FileConfigurations.REPOSITORIES);
        const pathToCheck: string = path.join(tmpRepo, repositoryName);
        const exists: boolean = await fs.pathExists(pathToCheck);
        let webview: SampleView;
        if (!exists) {
            await fs.ensureDir(pathToCheck);
            webview = await this.sampleHelper.cloneSample(repositoryName, namespace);

        } else {
            webview = new SampleView(null, repositoryName, namespace);
        }
        await this.sampleHelper.openContract(webview, namespace.toLowerCase(), language.toLowerCase(), contractName);
        this.contractDirectory = path.join(pathToCheck, 'chaincode', namespace.toLowerCase(), language.toLowerCase());

        if (language === 'JavaScript') {
            const fileContents: any = await fs.readJson(path.join(pathToCheck, 'chaincode', namespace.toLowerCase(), language.toLowerCase(), 'package.json'));
            fileContents.name = sampleName.toLowerCase();
            await fs.writeJson(path.join(pathToCheck, 'chaincode', namespace.toLowerCase(), language.toLowerCase(), 'package.json'), fileContents);

        } else if (language === 'TypeScript') {
            const fileContents: any = await fs.readJson(path.join(pathToCheck, 'chaincode', namespace.toLowerCase(), language.toLowerCase(), 'package.json'));
            fileContents.name = sampleName.toLowerCase();
            await fs.writeJson(path.join(pathToCheck, 'chaincode', namespace.toLowerCase(), language.toLowerCase(), 'package.json'), fileContents);
            const sampleDirectory: any = path.join(pathToCheck, 'chaincode', namespace.toLowerCase(), language.toLowerCase());
            await CommandUtil.sendCommandWithOutput('npm', ['install'], sampleDirectory, undefined, VSCodeBlockchainOutputAdapter.instance(), false);

        } else if (language === 'Go') {
            const srcFolder: string = path.join(pathToCheck, 'chaincode', namespace.toLowerCase(), 'src');
            await fs.mkdir(srcFolder);
            const oldPath: string = path.join(pathToCheck, 'chaincode', namespace.toLowerCase(), language.toLowerCase());
            const newPath: string = path.join(pathToCheck, 'chaincode', namespace.toLowerCase(), 'src', sampleName.toLowerCase());
            await fs.rename(oldPath, newPath);
            this.contractDirectory = path.join(pathToCheck, 'chaincode', namespace.toLowerCase(), 'src', sampleName.toLowerCase());
            process.env.GOPATH = path.join(pathToCheck, 'chaincode', namespace.toLowerCase());
        }
        this.contractName = sampleName.toLowerCase();
        this.namespace = namespace;
        this.contractVersion = '1.0.0';
        this.contractLanguage = language;
    });
};
