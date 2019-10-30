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
import * as sinonChai from 'sinon-chai';
import * as chai from 'chai';
import * as sinon from 'sinon';
import { TestUtil } from '../TestUtil';
import * as vscode from 'vscode';
import { SettingConfigurations, FileConfigurations } from '../../configurations';
import { FabricWalletUtil } from '../../extension/fabric/FabricWalletUtil';
import * as fs from 'fs-extra';
import * as path from 'path';
import { FabricWalletRegistry } from '../../extension/registries/FabricWalletRegistry';

chai.use(sinonChai);
// tslint:disable no-unused-expression

describe('FabricWalletUtil', () => {

    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();
    let getConfigurationStub: sinon.SinonStub;
    let getSettingsStub: sinon.SinonStub;
    let updateSettingsStub: sinon.SinonStub;
    let fsCopyStub: sinon.SinonStub;
    let fsRemoveStub: sinon.SinonStub;
    let walletA: any;
    let walletB: any;
    let addSpy: sinon.SinonSpy;
    before(async () => {
        await FabricWalletRegistry.instance().clear();
        await TestUtil.setupTests(mySandBox);
    });

    describe('tidyWalletSettings', () => {

        beforeEach(async () => {

            await FabricWalletRegistry.instance().clear();
            await fs.remove(path.join(TestUtil.EXTENSION_TEST_DIR, FabricWalletUtil.LOCAL_WALLET));

            walletA = {
                name: 'walletA',
                walletPath: 'fabric-dir/walletA'
            };
            walletB = {
                managedWallet: false,
                name: 'walletB',
                walletPath: 'fabric-dir/wallets/walletB'
            };

            getSettingsStub = mySandBox.stub();
            updateSettingsStub = mySandBox.stub();
            getConfigurationStub = mySandBox.stub(vscode.workspace, 'getConfiguration');
            getConfigurationStub.returns({
                get: getSettingsStub,
                update: updateSettingsStub
            });
            getSettingsStub.withArgs(SettingConfigurations.OLD_FABRIC_WALLETS).returns([walletA, walletB]);
            getSettingsStub.withArgs(SettingConfigurations.EXTENSION_DIRECTORY).returns(TestUtil.EXTENSION_TEST_DIR);
            fsCopyStub = mySandBox.stub(fs, 'copy').resolves();
            fsRemoveStub = mySandBox.stub(fs, 'remove').resolves();

            addSpy = mySandBox.spy(FabricWalletRegistry.instance(), 'add');
        });

        afterEach(async () => {
            mySandBox.restore();
        });

        it('should remove managedWallet boolean from wallets in user settings', async () => {
            await FabricWalletUtil.tidyWalletSettings();

            getSettingsStub.should.have.been.calledWith(SettingConfigurations.OLD_FABRIC_WALLETS);
            fsCopyStub.should.not.have.been.called;
            addSpy.should.have.been.calledTwice;
            addSpy.getCall(0).should.have.been.calledWithExactly(walletA);
            addSpy.getCall(1).should.have.been.calledWithExactly({name: walletB.name, walletPath: walletB.walletPath});
            await FabricWalletRegistry.instance().getAll().should.eventually.deep.equal([{ name: walletA.name, walletPath: walletA.walletPath }, { name: walletB.name, walletPath: walletB.walletPath }]);
        });

        it('should migrate wallets to the correct directory', async () => {
            walletA.walletPath = path.join(TestUtil.EXTENSION_TEST_DIR, 'anotherWallet', 'walletA');
            await FabricWalletUtil.tidyWalletSettings();

            const dest: string = path.join(TestUtil.EXTENSION_TEST_DIR, FileConfigurations.FABRIC_WALLETS, walletA.name);
            fsCopyStub.should.have.been.calledOnceWithExactly(walletA.walletPath, dest);
            fsRemoveStub.should.have.been.calledOnceWithExactly(walletA.walletPath);
            addSpy.should.have.been.calledTwice;
            addSpy.getCall(0).should.have.been.calledWithExactly(walletA);
            addSpy.getCall(1).should.have.been.calledWithExactly({name: walletB.name, walletPath: walletB.walletPath});

            await FabricWalletRegistry.instance().getAll().should.eventually.deep.equal([{ name: walletA.name, walletPath: walletA.walletPath }, { name: walletB.name, walletPath: walletB.walletPath }]);
        });

        it('should not create registry if already exists', async () => {
            walletA.walletPath = path.join(TestUtil.EXTENSION_TEST_DIR, 'anotherWallet', 'walletA');

            await FabricWalletRegistry.instance().add(walletA);
            addSpy.resetHistory();

            await FabricWalletUtil.tidyWalletSettings();

            const dest: string = path.join(TestUtil.EXTENSION_TEST_DIR, FileConfigurations.FABRIC_WALLETS, walletA.name);
            fsCopyStub.should.have.been.calledOnceWithExactly(walletA.walletPath, dest);
            fsRemoveStub.should.have.been.calledOnceWithExactly(walletA.walletPath);
            addSpy.getCall(0).should.have.been.calledWithExactly({name: walletB.name, walletPath: walletB.walletPath});
            await FabricWalletRegistry.instance().getAll().should.eventually.deep.equal([{ name: walletA.name, walletPath: walletA.walletPath }, { name: walletB.name, walletPath: walletB.walletPath }]);
        });

        it(`should not migrate a wallet if there is an issue migrating it`, async () => {
            walletA.walletPath = path.join(TestUtil.EXTENSION_TEST_DIR, 'anotherWallet', 'walletA');
            const error: Error = new Error('a problem');
            fsCopyStub.rejects(error);

            const dest: string = path.join(TestUtil.EXTENSION_TEST_DIR, FileConfigurations.FABRIC_WALLETS, walletA.name);
            await FabricWalletUtil.tidyWalletSettings().should.be.rejectedWith(`Issue copying ${walletA.walletPath} to ${dest}: ${error.message}`);

            fsCopyStub.should.have.been.calledOnceWithExactly(walletA.walletPath, dest);
            fsRemoveStub.should.not.have.been.called;
        });

        it(`should migrate ${FabricWalletUtil.LOCAL_WALLET_DISPLAY_NAME} to the correct directory`, async () => {
            await fs.ensureDir(path.join(TestUtil.EXTENSION_TEST_DIR, FabricWalletUtil.LOCAL_WALLET));
            getSettingsStub.withArgs(SettingConfigurations.OLD_FABRIC_WALLETS).returns([]);
            await FabricWalletUtil.tidyWalletSettings();
            addSpy.getCall(0).should.have.been.calledWithExactly({name: FabricWalletUtil.LOCAL_WALLET, walletPath: path.join(TestUtil.EXTENSION_TEST_DIR, FileConfigurations.FABRIC_WALLETS, FabricWalletUtil.LOCAL_WALLET), managedWallet: true});

            fsCopyStub.should.have.been.calledOnceWithExactly(path.join(TestUtil.EXTENSION_TEST_DIR, FabricWalletUtil.LOCAL_WALLET), path.join(TestUtil.EXTENSION_TEST_DIR, FileConfigurations.FABRIC_WALLETS, FabricWalletUtil.LOCAL_WALLET));
            fsRemoveStub.should.have.been.calledOnceWithExactly(path.join(TestUtil.EXTENSION_TEST_DIR, FabricWalletUtil.LOCAL_WALLET));
        });

        it(`should not migrate ${FabricWalletUtil.LOCAL_WALLET_DISPLAY_NAME} if there is an issue migrating it`, async () => {
            await fs.ensureDir(path.join(TestUtil.EXTENSION_TEST_DIR, FabricWalletUtil.LOCAL_WALLET));
            getSettingsStub.withArgs(SettingConfigurations.OLD_FABRIC_WALLETS).returns([]);
            const error: Error = new Error('a problem');
            fsCopyStub.rejects(error);
            await FabricWalletUtil.tidyWalletSettings().should.be.rejectedWith(`Issue copying ${path.join(TestUtil.EXTENSION_TEST_DIR, FabricWalletUtil.LOCAL_WALLET)} to ${path.join(TestUtil.EXTENSION_TEST_DIR, FileConfigurations.FABRIC_WALLETS, FabricWalletUtil.LOCAL_WALLET)}: ${error.message}`);
            addSpy.getCall(0).should.have.been.calledWithExactly({name: FabricWalletUtil.LOCAL_WALLET, walletPath: path.join(TestUtil.EXTENSION_TEST_DIR, FileConfigurations.FABRIC_WALLETS, FabricWalletUtil.LOCAL_WALLET), managedWallet: true});
            fsCopyStub.should.have.been.calledOnceWithExactly(path.join(TestUtil.EXTENSION_TEST_DIR, FabricWalletUtil.LOCAL_WALLET), path.join(TestUtil.EXTENSION_TEST_DIR, FileConfigurations.FABRIC_WALLETS, FabricWalletUtil.LOCAL_WALLET));

            fsRemoveStub.should.not.have.been.called;
        });
    });

    describe('getWalletPath', () => {
        it('should get the wallet path', () => {
            const result: string = FabricWalletUtil.getWalletPath('myWallet');

            result.should.equal(path.join(TestUtil.EXTENSION_TEST_DIR, FileConfigurations.FABRIC_WALLETS, 'myWallet'));
        });
    });
});
