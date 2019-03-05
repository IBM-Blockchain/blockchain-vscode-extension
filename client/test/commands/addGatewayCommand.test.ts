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
import * as path from 'path';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';

import { TestUtil } from '../TestUtil';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { FabricGatewayHelper } from '../../src/fabric/FabricGatewayHelper';
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../../src/logging/OutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';

// tslint:disable no-unused-expression
const should: Chai.Should = chai.should();
chai.should();
chai.use(sinonChai);

describe('AddGatewayCommand', () => {
    let mySandBox: sinon.SinonSandbox;
    let logSpy: sinon.SinonSpy;
    let showInputBoxStub: sinon.SinonStub;
    let browseEditStub: sinon.SinonStub;
    let showIdentityOptionsStub: sinon.SinonStub;
    const rootPath: string = path.dirname(__dirname);
    let copyConnectionProfileStub: sinon.SinonStub;

    before(async () => {
        await TestUtil.setupTests();
        await TestUtil.storeGatewaysConfig();
    });

    after(async () => {
        await TestUtil.restoreGatewaysConfig();
    });

    describe('addGateway', () => {

        beforeEach(async () => {
            mySandBox = sinon.createSandbox();
            // reset the available gateways
            await vscode.workspace.getConfiguration().update('fabric.gateways', [], vscode.ConfigurationTarget.Global);

            logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
            showInputBoxStub = mySandBox.stub(vscode.window, 'showInputBox');
            browseEditStub = mySandBox.stub(UserInputUtil, 'browseEdit');
            showIdentityOptionsStub = mySandBox.stub(UserInputUtil, 'showAddIdentityOptionsQuickPick');
            copyConnectionProfileStub = mySandBox.stub(FabricGatewayHelper, 'copyConnectionProfile');
            copyConnectionProfileStub.onFirstCall().resolves(path.join('blockchain', 'extension', 'directory', 'gatewayOne', 'connection.json'));
            copyConnectionProfileStub.onSecondCall().resolves(path.join('blockchain', 'extension', 'directory', 'gatewayTwo', 'connection.json'));

        });

        afterEach(async () => {
            mySandBox.restore();
        });

        it('should test a completed connection can be added via certificate and privateKey', async () => {

            showInputBoxStub.onFirstCall().resolves('myGateway');
            browseEditStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionOne/connection.json'));
            showIdentityOptionsStub.onFirstCall().resolves(UserInputUtil.CERT_KEY);

            const executeCommandStub: sinon.SinonStub = mySandBox.stub(vscode.commands, 'executeCommand');
            executeCommandStub.callThrough();
            executeCommandStub.withArgs(ExtensionCommands.ADD_GATEWAY_IDENTITY, sinon.match.any).resolves({
                name: 'myGateway',
                connectionProfilePath: path.join('blockchain', 'extension', 'directory', 'gatewayOne', 'connection.json'),
                walletPath: path.join(rootPath, '../../test/data/walletDir/emptyWallet')
            });

            await vscode.commands.executeCommand(ExtensionCommands.ADD_GATEWAY);

            const gateways: Array<any> = vscode.workspace.getConfiguration().get('fabric.gateways');

            gateways.length.should.equal(1);
            gateways[0].should.deep.equal({
                name: 'myGateway',
                connectionProfilePath: path.join('blockchain', 'extension', 'directory', 'gatewayOne', 'connection.json'),
                walletPath: path.join(rootPath, '../../test/data/walletDir/emptyWallet')
            });

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'addGateway');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new gateway');
        });

        it('should test a partially completed connection can be added if no identity is given', async () => {

            showInputBoxStub.onFirstCall().resolves('myGateway');
            browseEditStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionOne/connection.json'));
            showIdentityOptionsStub.onFirstCall().resolves(UserInputUtil.CERT_KEY);

            showInputBoxStub.onThirdCall().resolves('myMSPID');

            const executeCommandStub: sinon.SinonStub = mySandBox.stub(vscode.commands, 'executeCommand');
            executeCommandStub.callThrough();
            executeCommandStub.withArgs(ExtensionCommands.ADD_GATEWAY_IDENTITY, sinon.match.any).resolves({});

            await vscode.commands.executeCommand(ExtensionCommands.ADD_GATEWAY);

            const gateways: Array<any> = vscode.workspace.getConfiguration().get('fabric.gateways');

            gateways.length.should.equal(1);
            gateways[0].should.deep.equal({
                name: 'myGateway',
                connectionProfilePath: path.join('blockchain', 'extension', 'directory', 'gatewayOne', 'connection.json'),
                walletPath: FabricGatewayHelper.WALLET_PATH_DEFAULT
            });

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'addGateway');
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new gateway');
        });

        it('should test multiple gateways can be added', async () => {

            const executeCommandStub: sinon.SinonStub = mySandBox.stub(vscode.commands, 'executeCommand');
            executeCommandStub.callThrough();

            // Stub first gateway details
            showInputBoxStub.onFirstCall().resolves('myGatewayOne'); // First gateway name
            browseEditStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionOne/connection.json')); // First gateway connection profile
            showIdentityOptionsStub.onFirstCall().resolves(UserInputUtil.CERT_KEY); // First gateway, create wallet and add ID
            executeCommandStub.withArgs(ExtensionCommands.ADD_GATEWAY_IDENTITY, sinon.match.any).resolves({
                name: 'myGatewayOne',
                connectionProfilePath: path.join('blockchain', 'extension', 'directory', 'gatewayOne', 'connection.json'),
                walletPath: path.join(rootPath, '../../test/data/walletDir/emptyWallet')
            });

            await vscode.commands.executeCommand(ExtensionCommands.ADD_GATEWAY);

            // Stub second gateway details
            showInputBoxStub.reset();
            showInputBoxStub.onFirstCall().resolves('myGatewayTwo'); // Second gateway name
            browseEditStub.reset();
            browseEditStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionTwo/connection.json')); // Second gateway connection profile
            showIdentityOptionsStub.reset();
            showIdentityOptionsStub.onFirstCall().resolves(UserInputUtil.CERT_KEY); // First gateway, create wallet and add ID

            executeCommandStub.reset();
            executeCommandStub.callThrough();
            executeCommandStub.withArgs(ExtensionCommands.ADD_GATEWAY_IDENTITY, sinon.match.any).resolves({
                name: 'myGatewayTwo',
                connectionProfilePath: path.join('blockchain', 'extension', 'directory', 'gatewayTwo', 'connection.json'),
                walletPath: path.join(rootPath, '../../test/data/walletDir/emptyWallet')
            });

            await vscode.commands.executeCommand(ExtensionCommands.ADD_GATEWAY);

            const gateways: Array<any> = vscode.workspace.getConfiguration().get('fabric.gateways');

            gateways.length.should.equal(2);
            gateways[0].should.deep.equal({
                name: 'myGatewayOne',
                connectionProfilePath: path.join('blockchain', 'extension', 'directory', 'gatewayOne', 'connection.json'),
                walletPath: path.join(rootPath, '../../test/data/walletDir/emptyWallet')
            });

            gateways[1].should.deep.equal({
                name: 'myGatewayTwo',
                connectionProfilePath: path.join('blockchain', 'extension', 'directory', 'gatewayTwo', 'connection.json'),
                walletPath: path.join(rootPath, '../../test/data/walletDir/emptyWallet')
            });

            executeCommandStub.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'addGateway');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new gateway');
            logSpy.getCall(2).should.have.been.calledWith(LogType.INFO, undefined, 'addGateway');
            logSpy.getCall(3).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new gateway');
        });

        it('should test a connection can be cancelled when naming the connection', async () => {

            showInputBoxStub.onFirstCall().resolves();

            const executeCommandSpy: sinon.SinonSpy = mySandBox.spy(vscode.commands, 'executeCommand');

            // execute a command to force the extension activation
            await vscode.commands.executeCommand(ExtensionCommands.ADD_GATEWAY);

            const gateways: Array<any> = vscode.workspace.getConfiguration().get('fabric.gateways');

            gateways.length.should.equal(0);
        });

        it('should test a connection can be cancelled when adding profile', async () => {

            showInputBoxStub.onFirstCall().resolves('myGateway');
            browseEditStub.onSecondCall().resolves();

            const executeCommandSpy: sinon.SinonSpy = mySandBox.spy(vscode.commands, 'executeCommand');

            // execute a command to force the extension activation
            await vscode.commands.executeCommand(ExtensionCommands.ADD_GATEWAY);

            const gateways: Array<any> = vscode.workspace.getConfiguration().get('fabric.gateways');

            gateways.length.should.equal(1);
            gateways[0].should.deep.equal({
                name: 'myGateway',
                connectionProfilePath: FabricGatewayHelper.CONNECTION_PROFILE_PATH_DEFAULT,
                walletPath: FabricGatewayHelper.WALLET_PATH_DEFAULT
            });

            executeCommandSpy.callCount.should.equal(3);
            executeCommandSpy.getCall(0).should.have.been.calledWith(ExtensionCommands.ADD_GATEWAY);
            executeCommandSpy.getCall(1).should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
            executeCommandSpy.getCall(2).should.have.been.calledWith(ExtensionCommands.REFRESH_LOCAL_OPS);

        });

        it('should test a connection can be cancelled when choosing how to add identity', async () => {

            showInputBoxStub.onFirstCall().resolves('myGateway');
            browseEditStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionOne/connection.json'));
            showIdentityOptionsStub.onFirstCall().resolves();

            // execute a command to force the extension activation
            await vscode.commands.executeCommand(ExtensionCommands.ADD_GATEWAY);

            const gateways: Array<any> = vscode.workspace.getConfiguration().get('fabric.gateways');

            gateways.length.should.equal(1);
            gateways[0].should.deep.equal({
                name: 'myGateway',
                connectionProfilePath: path.join('blockchain', 'extension', 'directory', 'gatewayOne', 'connection.json'),
                walletPath: FabricGatewayHelper.WALLET_PATH_DEFAULT
            });
        });

        it('should test a connection can be cancelled when giving an identity', async () => {

            showInputBoxStub.onFirstCall().resolves('myGateway');
            browseEditStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionOne/connection.json'));
            showIdentityOptionsStub.onFirstCall().resolves(UserInputUtil.CERT_KEY);

            const executeCommandStub: sinon.SinonStub = mySandBox.stub(vscode.commands, 'executeCommand');
            executeCommandStub.callThrough();
            executeCommandStub.withArgs(ExtensionCommands.ADD_GATEWAY_IDENTITY, sinon.match.any).resolves();

            // execute a command to force the extension activation
            await vscode.commands.executeCommand(ExtensionCommands.ADD_GATEWAY);

            const gateways: Array<any> = vscode.workspace.getConfiguration().get('fabric.gateways');

            gateways.length.should.equal(1);
            gateways[0].should.deep.equal({
                name: 'myGateway',
                connectionProfilePath: path.join('blockchain', 'extension', 'directory', 'gatewayOne', 'connection.json'),
                walletPath: FabricGatewayHelper.WALLET_PATH_DEFAULT
            });
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'addGateway');
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new gateway');
        });

        it('should test a connection can be completed when giving a wallet path', async () => {

            showInputBoxStub.onFirstCall().resolves('myGateway');
            browseEditStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionOne/connection.json'));
            browseEditStub.onSecondCall().resolves(path.join(rootPath, '../../test/data/walletDir/emptyWallet'));
            showIdentityOptionsStub.onFirstCall().resolves(UserInputUtil.WALLET);

            // execute a command to force the extension activation
            await vscode.commands.executeCommand(ExtensionCommands.ADD_GATEWAY);

            const gateways: Array<any> = vscode.workspace.getConfiguration().get('fabric.gateways');

            gateways.length.should.equal(1);
            gateways[0].should.deep.equal({
                name: 'myGateway',
                connectionProfilePath: path.join('blockchain', 'extension', 'directory', 'gatewayOne', 'connection.json'),
                walletPath: path.join(rootPath, '../../test/data/walletDir/emptyWallet')
            });
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'addGateway');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new gateway');
        });

        it('should test a connection can be cancelled when giving a wallet path', async () => {

            showInputBoxStub.onFirstCall().resolves('myGateway');
            browseEditStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionOne/connection.json'));
            browseEditStub.onSecondCall().resolves();
            showIdentityOptionsStub.onFirstCall().resolves(UserInputUtil.WALLET);

            // execute a command to force the extension activation
            await vscode.commands.executeCommand(ExtensionCommands.ADD_GATEWAY);

            const gateways: Array<any> = vscode.workspace.getConfiguration().get('fabric.gateways');

            gateways.length.should.equal(1);
            gateways[0].should.deep.equal({
                name: 'myGateway',
                connectionProfilePath: path.join('blockchain', 'extension', 'directory', 'gatewayOne', 'connection.json'),
                walletPath: FabricGatewayHelper.WALLET_PATH_DEFAULT
            });
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'addGateway');
            logSpy.should.not.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new gateway');
        });

    });
});
