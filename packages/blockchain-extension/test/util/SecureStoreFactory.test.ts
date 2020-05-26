
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

import { SecureStore } from '../../extension/util/SecureStore';
import { SecureStoreFactory } from '../../extension/util/SecureStoreFactory';
import { KeytarSecureStore } from '../../extension/util/KeytarSecureStore';
import { ModuleUtil } from '../../extension/util/ModuleUtil';
import { FileSystemSecureStore } from '../../extension/util/FileSystemSecureStore';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as path from 'path';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { SettingConfigurations } from '../../configurations';
import { FileSystemUtil } from 'ibm-blockchain-platform-common';

chai.should();
chai.use(chaiAsPromised);

describe('SecureStoreFactory', () => {

    let sandbox: sinon.SinonSandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('#getSecureStore', () => {

        it('should return a keytar secure store if keytar is available', async () => {
            sandbox.stub(ModuleUtil, 'getCoreNodeModule').withArgs('keytar').returns({ fake: 'keytar' });
            const secureStore: SecureStore = await SecureStoreFactory.getSecureStore();
            secureStore.should.be.an.instanceOf(KeytarSecureStore);
            secureStore['keytar'].should.deep.equal({ fake: 'keytar' });
        });

        it('should return a file system secure store if keytar is not available', async () => {
            sandbox.stub(ModuleUtil, 'getCoreNodeModule').withArgs('keytar').returns(undefined);
            const secureStore: SecureStore = await SecureStoreFactory.getSecureStore();
            secureStore.should.be.an.instanceOf(FileSystemSecureStore);
            const extensionDirectory: string = vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_DIRECTORY);
            const resolvedExtensionDirectory: string = FileSystemUtil.getDirPath(extensionDirectory);
            const storePath: string = path.join(resolvedExtensionDirectory, 'ibm-blockchain-platform.store');
            secureStore['path'].should.equal(storePath);
        });

    });

});
