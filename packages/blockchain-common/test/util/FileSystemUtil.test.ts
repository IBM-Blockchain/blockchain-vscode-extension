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
import { FileSystemUtil } from '../../src/util/FileSystemUtil';

chai.use(sinonChai);

// tslint:disable no-unused-expression
describe('FileSystemUtil', () => {
    describe('getDirPath', () => {

        beforeEach(() => {
            delete process.env.CHE_PROJECTS_ROOT;
        });

        afterEach(() => {
            delete process.env.CHE_PROJECTS_ROOT;
        });

        it('should replace ~ with the users home directory', () => {
            const packageDirOriginal: string = '~/smartContractDir';
            const packageDirNew: string = FileSystemUtil.getDirPath(packageDirOriginal);
            packageDirNew.should.not.contain('~');
        });

        it('should replace ~ with the users projects directory on Eclipse Che', () => {
            process.env.CHE_PROJECTS_ROOT = '/projects';
            const packageDirOriginal: string = '~/smartContractDir';
            const packageDirNew: string = FileSystemUtil.getDirPath(packageDirOriginal);
            packageDirNew.should.equal('/projects/smartContractDir');
        });

        it('should not replace if not ~', () => {
            const packageDirOriginal: string = '/banana/smartContractDir';
            const packageDirNew: string = FileSystemUtil.getDirPath(packageDirOriginal);
            packageDirNew.should.equal(packageDirOriginal);
        });
    });
});
