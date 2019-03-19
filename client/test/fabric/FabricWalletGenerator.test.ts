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
import { FabricWallet } from '../../src/fabric/FabricWallet';
import { FabricWalletGenerator } from '../../src/fabric/FabricWalletGenerator';
import { UserInputUtil } from '../../src/commands/UserInputUtil';

chai.use(sinonChai);
// tslint:disable no-unused-expression

describe('FabricWalletGenerator', () => {

    const rootPath: string = path.dirname(__dirname);
    let mySandBox: sinon.SinonSandbox;
    let ensureDirStub: sinon.SinonStub;
    let pathExistsStub: sinon.SinonStub;

    describe('createLocalWallet', () => {

        beforeEach(async () => {
            mySandBox = sinon.createSandbox();

            mySandBox.stub(UserInputUtil, 'getDirPath').resolves(path.join(rootPath, '../../test/data/walletDir'));
            ensureDirStub = mySandBox.stub(fs, 'ensureDir').resolves();
            pathExistsStub = mySandBox.stub(fs, 'pathExists');
        });

        afterEach(async () => {
            mySandBox.restore();
        });

        it('should create a local file system wallet', async () => {
            pathExistsStub.resolves(false);

            const wallet: FabricWallet = await FabricWalletGenerator.instance().createLocalWallet('CongaConnection');
            wallet.connectionName.should.equal('CongaConnection');
            wallet.walletPath.should.equal(path.join(rootPath, '../../test/data/walletDir/CongaConnection/wallet'));
            ensureDirStub.should.have.been.calledOnce;

        });

        it('should not overwrite an existing file system wallet', async () => {
            pathExistsStub.resolves(true);

            const wallet: FabricWallet = await FabricWalletGenerator.instance().createLocalWallet('CongaConnection');
            wallet.connectionName.should.equal('CongaConnection');
            wallet.walletPath.should.equal(path.join(rootPath, '../../test/data/walletDir/CongaConnection/wallet'));
            ensureDirStub.should.not.have.been.called;

        });
    });

    describe('getNewWallet', () => {
        it('should get a new wallet', () => {
            const walletPath: string = path.join(rootPath, '../../test/data/walletDir/myWallet/wallet');
            const wallet: FabricWallet = FabricWalletGenerator.instance().getNewWallet('myWallet', walletPath);

            wallet.connectionName.should.equal('myWallet');
            wallet.walletPath.should.equal(walletPath);
        });
    });
});
