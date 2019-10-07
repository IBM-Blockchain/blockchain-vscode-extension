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
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as fs from 'fs-extra';
import { FabricWallet } from '../../extension/fabric/FabricWallet';
import { FabricWalletGenerator } from '../../extension/fabric/FabricWalletGenerator';
import { FabricWalletRegistryEntry } from '../../extension/registries/FabricWalletRegistryEntry';
import { FabricWalletRegistry } from '../../extension/registries/FabricWalletRegistry';
import { FabricWalletUtil } from '../../extension/fabric/FabricWalletUtil';
import { FileSystemUtil } from '../../extension/util/FileSystemUtil';

chai.use(sinonChai);
// tslint:disable no-unused-expression

describe('FabricWalletGenerator', () => {

    const rootPath: string = path.dirname(__dirname);
    let mySandBox: sinon.SinonSandbox;
    let ensureDirStub: sinon.SinonStub;
    let pathExistsStub: sinon.SinonStub;
    let removeStub: sinon.SinonStub;

    describe('getWallet', () => {

        beforeEach(async () => {
            mySandBox = sinon.createSandbox();

            mySandBox.stub(FileSystemUtil, 'getDirPath').returns(path.join(rootPath, '../../test/data/walletDir'));
            ensureDirStub = mySandBox.stub(fs, 'ensureDir').resolves();
            pathExistsStub = mySandBox.stub(fs, 'pathExists');

            await FabricWalletRegistry.instance().clear();

            const fabricWalletRegistryEntry: FabricWalletRegistryEntry = new FabricWalletRegistryEntry();
            fabricWalletRegistryEntry.managedWallet = false;
            fabricWalletRegistryEntry.name = 'CongaWallet';
            fabricWalletRegistryEntry.walletPath = path.join(rootPath, '../../test/data/walletDir/wallets/CongaWallet');

            await FabricWalletRegistry.instance().add(fabricWalletRegistryEntry);
        });

        afterEach(async () => {
            mySandBox.restore();
        });

        it('should create a local file system wallet', async () => {
            await FabricWalletRegistry.instance().clear();
            pathExistsStub.resolves(false);

            const wallet: FabricWallet = await FabricWalletGenerator.instance().getWallet('CongaWallet');
            wallet.walletPath.should.equal(path.join(rootPath, '../../test/data/walletDir/wallets/CongaWallet'));
            ensureDirStub.should.have.been.called;
        });

        it('should not overwrite an existing file system wallet', async () => {
            pathExistsStub.resolves(true);

            const wallet: FabricWallet = await FabricWalletGenerator.instance().getWallet('CongaWallet');
            wallet.walletPath.should.equal(path.join(rootPath, '../../test/data/walletDir/wallets/CongaWallet'));
            ensureDirStub.should.not.have.been.called;
        });

        it('create the local fabric wallet', async () => {
            const wallet: FabricWallet = await FabricWalletGenerator.instance().getWallet(FabricWalletUtil.LOCAL_WALLET);

            wallet.walletPath.should.equal(path.join(rootPath, `../../test/data/walletDir/wallets/${FabricWalletUtil.LOCAL_WALLET}`));
            ensureDirStub.should.have.been.called;
        });
    });

    describe('deleteLocalWallet', () => {

        beforeEach(async () => {
            mySandBox = sinon.createSandbox();

            mySandBox.stub(FileSystemUtil, 'getDirPath').returns(path.join(rootPath, '../../test/data/wallets/walletDir'));
            pathExistsStub = mySandBox.stub(fs, 'pathExists');
            removeStub = mySandBox.stub(fs, 'remove').resolves();
        });

        afterEach(async () => {
            mySandBox.restore();
        });

        it('should delete a local file system wallet that exists', async () => {
            pathExistsStub.resolves(true);

            await FabricWalletGenerator.instance().deleteLocalWallet('CongaWallet');
            removeStub.should.have.been.calledOnce;

        });

        it('should not delete a local file system wallet that does not exist', async () => {
            pathExistsStub.resolves(false);

            await FabricWalletGenerator.instance().deleteLocalWallet('CongaWallet');
            removeStub.should.not.have.been.called;

        });

    });
});
