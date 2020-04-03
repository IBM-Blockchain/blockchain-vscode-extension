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

import * as sinon from 'sinon';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as path from 'path';
import { ListFilesInPackage } from '../src/ListFilesInPackage';
import * as fs from 'fs-extra';

chai.use(chaiAsPromised);

// tslint:disable no-unused-expression

describe('ListFilesInPackage', () => {
    let sandbox: sinon.SinonSandbox;
    const PACKAGE_TEST_DIR: string = path.join(__dirname, 'data', 'packages');
    const PACKAGE_PATH: string = path.join(PACKAGE_TEST_DIR, 'myContract@0.0.1.tar.gz');
    let expectedFileNames: string[];
    let readFileStub: sinon.SinonStub;

    beforeEach(async () => {
        sandbox = sinon.createSandbox();
    });

    afterEach(async () => {
        sandbox.restore();
    });

    describe('listFiles', () => {
        beforeEach(async () => {
            expectedFileNames = ['metadata.json', 'src/chaincode.js', 'src/chaincode.ts', 'src/package.json'];

            readFileStub = sandbox.stub(fs, 'readFile').callThrough();
        });

        it('should list files in package', async () => {
            const fileNames: string[] = await ListFilesInPackage.listFiles(PACKAGE_PATH);
            fileNames.should.deep.equal(expectedFileNames);
        });

        it('handle errors when listing files in the package', async () => {
            const error: Error = new Error('some error');
            readFileStub.rejects(error);
            await ListFilesInPackage.listFiles(PACKAGE_PATH).should.eventually.be.rejectedWith(error);
        });
    });

});
