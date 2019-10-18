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
import * as path from 'path';
import * as vscode from 'vscode';
import * as sinonChai from 'sinon-chai';
import { FileSystemUtil } from '../../extension/util/FileSystemUtil';

chai.use(sinonChai);

// tslint:disable no-unused-expression
describe('FileSystemUtil', () => {
    describe('getDirPath', () => {
        it('should replace ~ with the users home directory', () => {
            const packageDirOriginal: string = '~/smartContractDir';
            const packageDirNew: string = FileSystemUtil.getDirPath(packageDirOriginal);
            packageDirNew.should.not.contain('~');
        });

        it('should not replace if not ~', () => {
            const packageDirOriginal: string = '/banana/smartContractDir';
            const packageDirNew: string = FileSystemUtil.getDirPath(packageDirOriginal);
            packageDirNew.should.equal(packageDirOriginal);
        });
    });

    describe('readFile', () => {
        it('should read file using vscode file system', async () => {
            const filePath: vscode.Uri = vscode.Uri.file(path.join(__dirname, '../../../test/data/other/textFile.txt'));

            const result: string = await FileSystemUtil.readFile(filePath);
            result.should.equal('Hello');
        });
    });

    describe('readJSONFile', () => {
        it('should read a json file using vscode file system', async () => {
            const filePath: vscode.Uri = vscode.Uri.file(path.join(__dirname, '../../../test/data/other/jsonFile.json'));

            const result: any = await FileSystemUtil.readJSONFile(filePath);
            result.name.should.deep.equal('bob');
        });
    });
});
