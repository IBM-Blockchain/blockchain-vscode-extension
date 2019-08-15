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
import { SettingConfigurations } from '../../SettingConfigurations';
import { FabricWalletUtil } from '../../src/fabric/FabricWalletUtil';
import * as fs from 'fs-extra';

chai.use(sinonChai);
// tslint:disable no-unused-expression

describe('Fabric Wallet Util tests', () => {

    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();
    let getConfigurationStub: sinon.SinonStub;
    let getSettingsStub: sinon.SinonStub;
    let updateSettingsStub: sinon.SinonStub;
    let fsCopyStub: sinon.SinonStub;
    let fsRemoveStub: sinon.SinonStub;
    let fsExistsStub: sinon.SinonStub;
    let walletA: any;
    let walletB: any;

    before(async () => {
        await TestUtil.setupTests(mySandBox);
    });

    beforeEach(async () => {

        walletA = {
            name: 'walletA',
            walletPath: 'fabric-dir/wallet'
        };
        walletB = {
            managedWallet: false,
            name: 'walletB',
            walletPath: 'fabric-dir/wallets/wallet'
        };

        getSettingsStub = mySandBox.stub();
        updateSettingsStub = mySandBox.stub();
        getConfigurationStub = mySandBox.stub(vscode.workspace, 'getConfiguration');
        getConfigurationStub.returns({
            get: getSettingsStub,
            update: updateSettingsStub
        });
        getSettingsStub.withArgs(SettingConfigurations.FABRIC_WALLETS).returns([walletA, walletB]);
        getSettingsStub.withArgs(SettingConfigurations.EXTENSION_DIRECTORY).returns('fabric-dir');
        fsCopyStub = mySandBox.stub(fs, 'copy').resolves();
        fsRemoveStub = mySandBox.stub(fs, 'remove').resolves();
        fsExistsStub = mySandBox.stub(fs, 'pathExists').resolves(false);
    });

    afterEach(async () => {
        mySandBox.restore();
    });

    it('should remove managedWallet boolean from wallets in user settings', async () => {
        await FabricWalletUtil.tidyWalletSettings();

        getSettingsStub.should.have.been.calledWith(SettingConfigurations.FABRIC_WALLETS);
        updateSettingsStub.should.have.been.calledWithExactly(SettingConfigurations.FABRIC_WALLETS,
            [
                {
                    name: 'walletA',
                    walletPath: 'fabric-dir/wallets/wallet'
                },
                {
                    name: 'walletB',
                    walletPath: 'fabric-dir/wallets/wallet'
                }
            ], vscode.ConfigurationTarget.Global);
    });

    it('should migrate wallets to the correct directory', async () => {
        await FabricWalletUtil.tidyWalletSettings();

        updateSettingsStub.should.have.been.calledWithExactly(SettingConfigurations.FABRIC_WALLETS,
            [
                {
                    name: 'walletA',
                    walletPath: 'fabric-dir/wallets/wallet'
                },
                {
                    name: 'walletB',
                    walletPath: 'fabric-dir/wallets/wallet'
                }
            ], vscode.ConfigurationTarget.Global);
        fsCopyStub.should.have.been.calledOnceWithExactly('fabric-dir/wallet', 'fabric-dir/wallets/wallet');
        fsRemoveStub.should.have.been.calledOnceWithExactly('fabric-dir/wallet');
    });

    it(`should not migrate a wallet if there is an issue migrating it`, async () => {
        const error: Error = new Error('a problem');
        fsCopyStub.rejects(error);
        await FabricWalletUtil.tidyWalletSettings().should.be.rejectedWith(`Issue copying ${walletA.walletPath} to fabric-dir/wallets/wallet: ${error.message}`);

        fsCopyStub.should.have.been.calledOnceWithExactly(walletA.walletPath, `fabric-dir/wallets/wallet`);
        fsRemoveStub.should.not.have.been.called;
    });

    it(`should migrate ${FabricWalletUtil.LOCAL_WALLET} to the correct directory`, async () => {
        getSettingsStub.withArgs(SettingConfigurations.FABRIC_WALLETS).returns([]);
        fsExistsStub.resolves(true);
        await FabricWalletUtil.tidyWalletSettings();

        fsCopyStub.should.have.been.calledOnceWithExactly(`fabric-dir/${FabricWalletUtil.LOCAL_WALLET}`, `fabric-dir/wallets/${FabricWalletUtil.LOCAL_WALLET}`);
        fsRemoveStub.should.have.been.calledOnceWithExactly(`fabric-dir/${FabricWalletUtil.LOCAL_WALLET}`);
    });

    it(`should not migrate ${FabricWalletUtil.LOCAL_WALLET} if there is an issue migrating it`, async () => {
        getSettingsStub.withArgs(SettingConfigurations.FABRIC_WALLETS).returns([]);
        fsExistsStub.resolves(true);
        const error: Error = new Error('a problem');
        fsCopyStub.rejects(error);
        await FabricWalletUtil.tidyWalletSettings().should.be.rejectedWith(`Issue copying fabric-dir/${FabricWalletUtil.LOCAL_WALLET} to fabric-dir/wallets/${FabricWalletUtil.LOCAL_WALLET}: ${error.message}`);

        fsCopyStub.should.have.been.calledOnceWithExactly(`fabric-dir/${FabricWalletUtil.LOCAL_WALLET}`, `fabric-dir/wallets/${FabricWalletUtil.LOCAL_WALLET}`);
        fsRemoveStub.should.not.have.been.called;
    });

});
