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

chai.use(sinonChai);

describe('Fabric Wallet Util tests', () => {

    let mySandBox: sinon.SinonSandbox;
    let getConfigurationStub: sinon.SinonStub;
    let getSettingsStub: sinon.SinonStub;
    let updateSettingsStub: sinon.SinonStub;

    before(async () => {
        await TestUtil.setupTests();
    });

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
        getSettingsStub = mySandBox.stub();
        updateSettingsStub = mySandBox.stub();
        getConfigurationStub = mySandBox.stub(vscode.workspace, 'getConfiguration');
        getConfigurationStub.returns({
            get: getSettingsStub,
            update: updateSettingsStub
        });

        getSettingsStub.returns(
            [
                {
                    name: 'aNiceName',
                    walletPath: '/some/wallet/path'
                },
                {
                    managedWallet: false,
                    name: 'aNicerName',
                    walletPath: '/some/other/wallet/path'
                }
            ]
        );
    });

    afterEach(async () => {
        mySandBox.restore();
    });

    it('should remove managedWallet boolean from wallets in user settings', async () => {
        await FabricWalletUtil.tidyWalletSettings();

        getSettingsStub.should.have.been.calledOnceWithExactly(SettingConfigurations.FABRIC_WALLETS);
        updateSettingsStub.should.have.been.calledOnceWithExactly(SettingConfigurations.FABRIC_WALLETS,
            [
                {
                    name: 'aNiceName',
                    walletPath: '/some/wallet/path'
                },
                {
                    name: 'aNicerName',
                    walletPath: '/some/other/wallet/path'
                }
            ], vscode.ConfigurationTarget.Global);

    });

});
