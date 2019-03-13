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
import * as vscode from 'vscode';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { TestUtil } from '../TestUtil';
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../../src/logging/OutputAdapter';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricWalletRegistry } from '../../src/fabric/FabricWalletRegistry';

// tslint:disable no-unused-expression
const should: Chai.Should = chai.should();
chai.should();
chai.use(sinonChai);

describe('AddGatewayCommand', () => {
    let mySandBox: sinon.SinonSandbox;
    let logSpy: sinon.SinonSpy;
    let showInputBoxStub: sinon.SinonStub;
    let browseEditStub: sinon.SinonStub;
    let walletName: string;

    before(async () => {
        await TestUtil.setupTests();
        await TestUtil.storeWalletsConfig();
    });

    after(async () => {
        await TestUtil.restoreWalletsConfig();
    });

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
        logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');

        await vscode.workspace.getConfiguration().update('fabric.wallets', [], vscode.ConfigurationTarget.Global);
        showInputBoxStub = mySandBox.stub(vscode.window, 'showInputBox');
        browseEditStub = mySandBox.stub(UserInputUtil, 'browseEdit');
    });

    afterEach(async () => {
        mySandBox.restore();
    });

    it('should add a new wallet', async () => {
        walletName = 'purpleWallet';
        showInputBoxStub.resolves(walletName);
        browseEditStub.resolves('/some/path');

        await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET);

        const wallets: Array<any> = vscode.workspace.getConfiguration().get('fabric.wallets');

        wallets.length.should.equal(1);
        wallets[0].should.deep.equal({
            name: 'purpleWallet',
            walletPath: '/some/path'
        });
        logSpy.should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new wallet');
    });

    it('should handle the user cancelling providing a wallet name', async () => {
        showInputBoxStub.resolves();

        await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET);
        browseEditStub.should.not.have.been.called;
        logSpy.should.not.have.been.calledWith(LogType.SUCCESS);
    });

    it('should handle the user cancelling providing a wallet path', async () => {
        showInputBoxStub.resolves('test');
        browseEditStub.resolves();

        await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET);
        logSpy.should.not.have.been.calledWith(LogType.SUCCESS);
    });

    it('should handle errors adding a new wallet', async () => {
        const walletRegistryAddStub: sinon.SinonStub = mySandBox.stub(
            FabricWalletRegistry.instance(), 'add').rejects( { message: 'something terrible has happened'});
        showInputBoxStub.resolves('test');
        browseEditStub.resolves('/some/path');

        await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET);

        const wallets: Array<any> = vscode.workspace.getConfiguration().get('fabric.wallets');
        wallets.length.should.equal(0);
        walletRegistryAddStub.should.have.been.calledOnce;
        logSpy.should.have.been.calledWith(LogType.ERROR, 'Failed to add a new wallet: something terrible has happened', 'Failed to add a new wallet: something terrible has happened');
    });

});
