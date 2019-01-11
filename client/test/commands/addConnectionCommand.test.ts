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
import {TestUtil} from '../TestUtil';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { FabricConnectionHelper } from '../../src/fabric/FabricConnectionHelper';
import { ParsedCertificate } from '../../src/fabric/ParsedCertificate';
import { VSCodeOutputAdapter } from '../../src/logging/VSCodeOutputAdapter';
import { LogType } from '../../src/logging/OutputAdapter';
import { FabricWallet } from '../../src/fabric/FabricWallet';
import { FabricWalletGenerator } from '../../src/fabric/FabricWalletGenerator';

// tslint:disable no-unused-expression
const should: Chai.Should = chai.should();
chai.should();
chai.use(sinonChai);

describe('AddConnectionCommand', () => {
    let mySandBox: sinon.SinonSandbox;
    let logSpy: sinon.SinonSpy;
    let showInputBoxStub: sinon.SinonStub;
    let browseEditStub: sinon.SinonStub;
    let showIdentityOptionsStub: sinon.SinonStub;
    const rootPath: string = path.dirname(__dirname);
    let identityName: string;

    before(async () => {
        await TestUtil.setupTests();
        await TestUtil.storeConnectionsConfig();
    });

    after(async () => {
        await TestUtil.restoreConnectionsConfig();
    });

    describe('addConnection', () => {

        beforeEach(async () => {
            mySandBox = sinon.createSandbox();
            // reset the available connections
            await vscode.workspace.getConfiguration().update('fabric.connections', [], vscode.ConfigurationTarget.Global);

            logSpy = mySandBox.spy(VSCodeOutputAdapter.instance(), 'log');
            showInputBoxStub = mySandBox.stub(vscode.window, 'showInputBox');
            browseEditStub = mySandBox.stub(UserInputUtil, 'browseEdit');
            showIdentityOptionsStub = mySandBox.stub(UserInputUtil, 'showAddIdentityOptionsQuickPick');

        });

        afterEach(async () => {
            mySandBox.restore();
            await TestUtil.deleteTestFiles(path.join(rootPath, '../../test/data/walletDir/emptyWallet', identityName));
        });

        it('should test a completed connection can be added via certificate and privateKey', async () => {
            identityName = 'greenConga';
            mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);

            showInputBoxStub.onFirstCall().resolves('myConnection');
            browseEditStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionOne/connection.json'));
            showIdentityOptionsStub.onFirstCall().resolves(UserInputUtil.CERT_KEY);
            showInputBoxStub.onSecondCall().resolves(identityName);
            browseEditStub.onSecondCall().resolves(path.join(rootPath, '../../test/data/connectionOne/credentials/certificate'));
            browseEditStub.onThirdCall().resolves(path.join(rootPath, '../../test/data/connectionOne/credentials/privateKey'));

            const executeCommandSpy: sinon.SinonSpy = mySandBox.spy(vscode.commands, 'executeCommand');

            const testFabricWallet: FabricWallet = new FabricWallet('myConnection', path.join(rootPath, '../../test/data/walletDir/emptyWallet'));
            mySandBox.stub(testFabricWallet, 'importIdentity').resolves();

            mySandBox.stub(FabricWalletGenerator.instance(), 'createLocalWallet').resolves(testFabricWallet);

            await vscode.commands.executeCommand('blockchainExplorer.addConnectionEntry');

            const connections: Array<any> = vscode.workspace.getConfiguration().get('fabric.connections');

            connections.length.should.equal(1);
            connections[0].should.deep.equal({
                name: 'myConnection',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                walletPath: path.join(rootPath, '../../test/data/walletDir/emptyWallet')
            });

            executeCommandSpy.should.have.been.calledWith('blockchainExplorer.refreshEntry');
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'addConnection');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new connection');
        });

        it('should test a completed connection can be added via wallet file path', async () => {
            showInputBoxStub.onFirstCall().resolves('myConnection');
            browseEditStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionOne/connection.json'));
            showIdentityOptionsStub.onFirstCall().resolves(UserInputUtil.WALLET);
            browseEditStub.onSecondCall().resolves(path.join(rootPath, '../../test/data/walletDir/wallet'));

            const executeCommandSpy: sinon.SinonSpy = mySandBox.spy(vscode.commands, 'executeCommand');

            const testFabricWallet: FabricWallet = new FabricWallet('myConnection', path.join(rootPath, '../../test/data/walletDir/emptyWallet'));
            mySandBox.stub(testFabricWallet, 'importIdentity').resolves();

            mySandBox.stub(FabricWalletGenerator.instance(), 'createLocalWallet').resolves(testFabricWallet);

            await vscode.commands.executeCommand('blockchainConnectionsExplorer.addConnectionEntry');

            const connections: Array<any> = vscode.workspace.getConfiguration().get('fabric.connections');

            connections.length.should.equal(1);
            connections[0].should.deep.equal({
                name: 'myConnection',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                walletPath: path.join(rootPath, '../../test/data/walletDir/emptyWallet')
            });

            executeCommandSpy.should.have.been.calledWith('blockchainConnectionsExplorer.refreshEntry');
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'addConnection');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new connection');
        });

        it('should test a completed connection can be added via wallet file path', async () => {
            showInputBoxStub.onFirstCall().resolves('myConnection');
            browseEditStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionOne/connection.json'));
            showIdentityOptionsStub.onFirstCall().resolves(UserInputUtil.WALLET);
            browseEditStub.onSecondCall().resolves(path.join(rootPath, '../../test/data/walletDir/wallet'));

            const executeCommandSpy: sinon.SinonSpy = mySandBox.spy(vscode.commands, 'executeCommand');

            await vscode.commands.executeCommand('blockchainExplorer.addConnectionEntry');

            const connections: Array<any> = vscode.workspace.getConfiguration().get('fabric.connections');

            connections.length.should.equal(1);
            connections[0].should.deep.equal({
                name: 'myConnection',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                walletPath: path.join(rootPath, '../../test/data/walletDir/wallet')
            });

            executeCommandSpy.should.have.been.calledWith('blockchainExplorer.refreshEntry');
        });

        it('should test an uncompleted connection can be added', async () => {

            showInputBoxStub.onFirstCall().resolves('myConnection');
            browseEditStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionOne/connection.json'));

            const executeCommandSpy: sinon.SinonSpy = mySandBox.spy(vscode.commands, 'executeCommand');

            await vscode.commands.executeCommand('blockchainConnectionsExplorer.addConnectionEntry');

            const connections: Array<any> = vscode.workspace.getConfiguration().get('fabric.connections');

            connections.length.should.equal(1);
            connections[0].should.deep.equal({
                name: 'myConnection',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                walletPath: FabricConnectionHelper.WALLET_PATH_DEFAULT
            });

            executeCommandSpy.should.have.been.calledWith('blockchainConnectionsExplorer.refreshEntry');
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'addConnection');
            should.not.exist(logSpy.getCall(1));
        });

        it('should test another connection can be added', async () => {
            showInputBoxStub.onFirstCall().resolves('myConnection');
            browseEditStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionOne/connection.json'));
            showIdentityOptionsStub.onFirstCall().resolves(UserInputUtil.WALLET);
            browseEditStub.onSecondCall().resolves(path.join(rootPath, '../../test/data/walletDir/wallet'));

            const executeCommandSpy: sinon.SinonSpy = mySandBox.spy(vscode.commands, 'executeCommand');
            await vscode.commands.executeCommand('blockchainConnectionsExplorer.addConnectionEntry');

            let connections: Array<any> = vscode.workspace.getConfiguration().get('fabric.connections');

            connections.length.should.equal(1);
            connections[0].should.deep.equal({
                name: 'myConnection',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                walletPath: path.join(rootPath, '../../test/data/walletDir/wallet')
            });

            identityName = 'greenConga';
            mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);

            showInputBoxStub.onSecondCall().resolves('myConnection2');
            browseEditStub.onCall(2).resolves(path.join(rootPath, '../../test/data/connectionTwo/connection.json'));
            showIdentityOptionsStub.onSecondCall().resolves(UserInputUtil.CERT_KEY);
            showInputBoxStub.onCall(2).resolves(identityName);
            browseEditStub.onCall(3).resolves(path.join(rootPath, '../../test/data/connectionOne/credentials/certificate'));
            browseEditStub.onCall(4).resolves(path.join(rootPath, '../../test/data/connectionOne/credentials/privateKey'));

            const testFabricWallet: FabricWallet = new FabricWallet('myConnection2', path.join(rootPath, '../../test/data/walletDir/emptyWallet'));
            mySandBox.stub(testFabricWallet, 'importIdentity').resolves();
            mySandBox.stub(FabricWalletGenerator.instance(), 'createLocalWallet').resolves(testFabricWallet);

            await vscode.commands.executeCommand('blockchainConnectionsExplorer.addConnectionEntry');

            executeCommandSpy.callCount.should.equal(8);

            let calledWithValue: string;
            for (let x: number = 0; x < 8; x++) {
                if (x % 4 === 0) {
                    calledWithValue = 'blockchainConnectionsExplorer.addConnectionEntry';
                } else {
                    calledWithValue = 'blockchainConnectionsExplorer.refreshEntry';
                }
                executeCommandSpy.getCall(x).should.have.been.calledWith(calledWithValue);
            }

            connections = vscode.workspace.getConfiguration().get('fabric.connections');

            connections.length.should.equal(2);
            connections[0].should.deep.equal({
                name: 'myConnection',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                walletPath: path.join(rootPath, '../../test/data/walletDir/wallet')
            });
            connections[1].should.deep.equal({
                name: 'myConnection2',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
                walletPath: path.join(rootPath, '../../test/data/walletDir/emptyWallet')
            });

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'addConnection');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new connection');
            logSpy.getCall(2).should.have.been.calledWith(LogType.INFO, undefined, 'addConnection');
            logSpy.getCall(3).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new connection');
        });

        it('should test a connection can be cancelled when naming the connection', async () => {

            showInputBoxStub.onFirstCall().resolves();

            const executeCommandSpy: sinon.SinonSpy = mySandBox.spy(vscode.commands, 'executeCommand');

            // execute a command to force the extension activation
            await vscode.commands.executeCommand('blockchainConnectionsExplorer.addConnectionEntry');

            const connections: Array<any> = vscode.workspace.getConfiguration().get('fabric.connections');

            connections.length.should.equal(0);

            executeCommandSpy.callCount.should.equal(1);
            executeCommandSpy.getCall(0).should.have.been.calledWith('blockchainConnectionsExplorer.addConnectionEntry');
        });

        it('should test a connection can be cancelled when adding profile', async () => {

            showInputBoxStub.onFirstCall().resolves('myConnection');
            browseEditStub.onSecondCall().resolves();

            const executeCommandSpy: sinon.SinonSpy = mySandBox.spy(vscode.commands, 'executeCommand');

            // execute a command to force the extension activation
            await vscode.commands.executeCommand('blockchainConnectionsExplorer.addConnectionEntry');

            const connections: Array<any> = vscode.workspace.getConfiguration().get('fabric.connections');

            connections.length.should.equal(1);
            connections[0].should.deep.equal({
                name: 'myConnection',
                connectionProfilePath: FabricConnectionHelper.CONNECTION_PROFILE_PATH_DEFAULT,
                walletPath: FabricConnectionHelper.WALLET_PATH_DEFAULT
            });

            executeCommandSpy.callCount.should.equal(2);
            executeCommandSpy.getCall(0).should.have.been.calledWith('blockchainConnectionsExplorer.addConnectionEntry');

        });

        it('should test a connection can be cancelled when choosing how to add identity', async () => {

            showInputBoxStub.onFirstCall().resolves('myConnection');
            browseEditStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionOne/connection.json'));
            showIdentityOptionsStub.onFirstCall().resolves();

            // execute a command to force the extension activation
            await vscode.commands.executeCommand('blockchainExplorer.addConnectionEntry');

            const connections: Array<any> = vscode.workspace.getConfiguration().get('fabric.connections');

            connections.length.should.equal(1);
            connections[0].should.deep.equal({
                name: 'myConnection',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                walletPath: FabricConnectionHelper.WALLET_PATH_DEFAULT
            });
        });

        it('should test a connection can be cancelled when naming an identity', async () => {
            identityName = 'noName';
            showInputBoxStub.onFirstCall().resolves('myConnection');
            browseEditStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionOne/connection.json'));
            showIdentityOptionsStub.onFirstCall().resolves(UserInputUtil.CERT_KEY);
            showInputBoxStub.onSecondCall().resolves();

            // execute a command to force the extension activation
            await vscode.commands.executeCommand('blockchainExplorer.addConnectionEntry');

            const connections: Array<any> = vscode.workspace.getConfiguration().get('fabric.connections');

            connections.length.should.equal(1);
            connections[0].should.deep.equal({
                name: 'myConnection',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                walletPath: FabricConnectionHelper.WALLET_PATH_DEFAULT
            });
            browseEditStub.should.have.been.calledOnce;
        });

        it('should test a connection can be cancelled when adding certificate', async () => {

            showInputBoxStub.onFirstCall().resolves('myConnection');
            browseEditStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionOne/connection.json'));
            showIdentityOptionsStub.onFirstCall().resolves(UserInputUtil.CERT_KEY);
            showInputBoxStub.onSecondCall().resolves('greenConga');
            browseEditStub.onSecondCall().resolves();

            // execute a command to force the extension activation
            await vscode.commands.executeCommand('blockchainConnectionsExplorer.addConnectionEntry');

            const connections: Array<any> = vscode.workspace.getConfiguration().get('fabric.connections');

            connections.length.should.equal(1);
            connections[0].should.deep.equal({
                name: 'myConnection',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                walletPath: FabricConnectionHelper.WALLET_PATH_DEFAULT
            });
            browseEditStub.should.have.been.calledTwice;
        });

        it('should test a connection can be cancelled when adding private key', async () => {

            showInputBoxStub.onFirstCall().resolves('myConnection');
            browseEditStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionOne/connection.json'));
            showIdentityOptionsStub.onFirstCall().resolves(UserInputUtil.CERT_KEY);
            showInputBoxStub.onSecondCall().resolves('greenConga');
            browseEditStub.onSecondCall().resolves(path.join(rootPath, '../../test/data/connectionOne/credentials/certificate'));
            browseEditStub.onThirdCall().resolves();

            await vscode.commands.executeCommand('blockchainConnectionsExplorer.addConnectionEntry');

            const connections: Array<any> = vscode.workspace.getConfiguration().get('fabric.connections');

            connections.length.should.equal(1);
            connections[0].should.deep.equal({
                name: 'myConnection',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                walletPath: FabricConnectionHelper.WALLET_PATH_DEFAULT
            });
        });

        it('should test a connection can be cancelled when giving a wallet path', async () => {

            showInputBoxStub.onFirstCall().resolves('myConnection');
            browseEditStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionOne/connection.json'));
            showIdentityOptionsStub.onFirstCall().resolves(UserInputUtil.WALLET);
            browseEditStub.onSecondCall().resolves();

            // execute a command to force the extension activation
            await vscode.commands.executeCommand('blockchainExplorer.addConnectionEntry');

            const connections: Array<any> = vscode.workspace.getConfiguration().get('fabric.connections');

            connections.length.should.equal(1);
            connections[0].should.deep.equal({
                name: 'myConnection',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                walletPath: FabricConnectionHelper.WALLET_PATH_DEFAULT
            });
        });

        it('should throw an error if certificate is invalid', async () => {
            const error: Error = new Error('Could not validate certificate: invalid pem');
            mySandBox.stub(ParsedCertificate, 'validPEM').throws(error);

            showInputBoxStub.onFirstCall().resolves('myConnection');
            browseEditStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionOne/connection.json'));
            showIdentityOptionsStub.onFirstCall().resolves(UserInputUtil.CERT_KEY);
            showInputBoxStub.onSecondCall().resolves(identityName);
            browseEditStub.onSecondCall().resolves(path.join(rootPath, '../../test/data/connectionOne/credentials/certificate'));

            await vscode.commands.executeCommand('blockchainConnectionsExplorer.addConnectionEntry');

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'addConnection');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Failed to add a new connection: ${error.message}`, `Failed to add a new connection: ${error.toString()}`);
        });

        it('should throw an error if private key is invalid', async () => {
            const error: Error = new Error('Could not validate private key: invalid pem');
            mySandBox.stub(ParsedCertificate, 'validPEM').onSecondCall().throws(error);

            showInputBoxStub.onFirstCall().resolves('myConnection');
            browseEditStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionOne/connection.json'));
            showIdentityOptionsStub.onFirstCall().resolves(UserInputUtil.CERT_KEY);
            showInputBoxStub.onSecondCall().resolves(identityName);
            browseEditStub.onSecondCall().resolves(path.join(rootPath, '../../test/data/connectionOne/credentials/certificate'));
            browseEditStub.onThirdCall().resolves(path.join(rootPath, '../../test/data/connectionOne/credentials/privateKey'));

            await vscode.commands.executeCommand('blockchainConnectionsExplorer.addConnectionEntry');

            logSpy.should.have.been.calledWith(LogType.ERROR, `Failed to add a new connection: ${error.message}`, `Failed to add a new connection: ${error.toString()}`);
        });

        it('should handle no client section defined in the connection.json of the network', async () => {
            identityName = 'greenConga';
            mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);
            const errorSpy: sinon.SinonSpy = mySandBox.spy(vscode.window, 'showErrorMessage');

            showInputBoxStub.onFirstCall().resolves('myConnection');
            browseEditStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionOne/connection.json'));
            showIdentityOptionsStub.onFirstCall().resolves(UserInputUtil.CERT_KEY);
            showInputBoxStub.onSecondCall().resolves(identityName);
            browseEditStub.onSecondCall().resolves(path.join(rootPath, '../../test/data/connectionOne/credentials/certificate'));
            browseEditStub.onThirdCall().resolves(path.join(rootPath, '../../test/data/connectionOne/credentials/privateKey'));

            const executeCommandSpy: sinon.SinonSpy = mySandBox.spy(vscode.commands, 'executeCommand');

            const testFabricWallet: FabricWallet = new FabricWallet('myConnection', path.join(rootPath, '../../test/data/walletDir/emptyWallet'));

            mySandBox.stub(FabricWalletGenerator.instance(), 'createLocalWallet').resolves(testFabricWallet);
            const importStub: sinon.SinonStub = mySandBox.stub(testFabricWallet, 'importIdentity').onCall(0).rejects( {message: `Client.createUser parameter 'opts mspid' is required`} );
            showInputBoxStub.onThirdCall().resolves('Org1MSP');
            importStub.callThrough();

            await vscode.commands.executeCommand('blockchainExplorer.addConnectionEntry');

            const connections: Array<any> = vscode.workspace.getConfiguration().get('fabric.connections');

            connections.length.should.equal(1);
            connections[0].should.deep.equal({
                name: 'myConnection',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                walletPath: path.join(rootPath, '../../test/data/walletDir/emptyWallet')
            });

            executeCommandSpy.should.have.been.calledWith('blockchainExplorer.refreshEntry');
            errorSpy.should.not.have.been.called;
            showInputBoxStub.should.have.been.calledThrice;
            importStub.should.have.been.calledTwice;
        });

        it('should handle the user cancelling providing the mspid', async () => {
            identityName = 'greenConga';
            mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);
            const errorSpy: sinon.SinonSpy = mySandBox.spy(vscode.window, 'showErrorMessage');

            showInputBoxStub.onFirstCall().resolves('myConnection');
            browseEditStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionOne/connection.json'));
            showIdentityOptionsStub.onFirstCall().resolves(UserInputUtil.CERT_KEY);
            showInputBoxStub.onSecondCall().resolves(identityName);
            browseEditStub.onSecondCall().resolves(path.join(rootPath, '../../test/data/connectionOne/credentials/certificate'));
            browseEditStub.onThirdCall().resolves(path.join(rootPath, '../../test/data/connectionOne/credentials/privateKey'));

            const executeCommandSpy: sinon.SinonSpy = mySandBox.spy(vscode.commands, 'executeCommand');

            const testFabricWallet: FabricWallet = new FabricWallet('myConnection', path.join(rootPath, '../../test/data/walletDir/emptyWallet'));

            mySandBox.stub(FabricWalletGenerator.instance(), 'createLocalWallet').resolves(testFabricWallet);
            const importStub: sinon.SinonStub = mySandBox.stub(testFabricWallet, 'importIdentity').onCall(0).rejects( {message: `Client.createUser parameter 'opts mspid' is required`} );
            showInputBoxStub.onThirdCall().resolves();

            await vscode.commands.executeCommand('blockchainConnectionsExplorer.addConnectionEntry');

            const connections: Array<any> = vscode.workspace.getConfiguration().get('fabric.connections');

            connections.length.should.equal(1);
            connections[0].should.deep.equal({
                name: 'myConnection',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                walletPath: FabricConnectionHelper.WALLET_PATH_DEFAULT
            });

            executeCommandSpy.should.have.been.calledWith('blockchainConnectionsExplorer.refreshEntry');
            errorSpy.should.not.have.been.called;
            showInputBoxStub.should.have.been.calledThrice;
            importStub.should.have.been.calledOnce;
        });

        it('should handle the wallet import failing for some other reason', async () => {
            identityName = 'greenConga';
            mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);
            const errorSpy: sinon.SinonSpy = mySandBox.spy(vscode.window, 'showErrorMessage');

            showInputBoxStub.onFirstCall().resolves('myConnection');
            browseEditStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionOne/connection.json'));
            showIdentityOptionsStub.onFirstCall().resolves(UserInputUtil.CERT_KEY);
            showInputBoxStub.onSecondCall().resolves(identityName);
            browseEditStub.onSecondCall().resolves(path.join(rootPath, '../../test/data/connectionOne/credentials/certificate'));
            browseEditStub.onThirdCall().resolves(path.join(rootPath, '../../test/data/connectionOne/credentials/privateKey'));

            const executeCommandSpy: sinon.SinonSpy = mySandBox.spy(vscode.commands, 'executeCommand');

            const testFabricWallet: FabricWallet = new FabricWallet('myConnection', path.join(rootPath, '../../test/data/walletDir/emptyWallet'));

            mySandBox.stub(FabricWalletGenerator.instance(), 'createLocalWallet').resolves(testFabricWallet);
            const importStub: sinon.SinonStub = mySandBox.stub(testFabricWallet, 'importIdentity').onCall(0).rejects( {message: 'some other reason'} );

            await vscode.commands.executeCommand('blockchainConnectionsExplorer.addConnectionEntry');

            const connections: Array<any> = vscode.workspace.getConfiguration().get('fabric.connections');

            connections.length.should.equal(1);
            connections[0].should.deep.equal({
                name: 'myConnection',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                walletPath: FabricConnectionHelper.WALLET_PATH_DEFAULT
            });

            executeCommandSpy.should.have.been.calledWith('blockchainConnectionsExplorer.refreshEntry');
            errorSpy.should.have.been.calledWith('Failed to add a new connection: some other reason');
            showInputBoxStub.should.have.been.calledTwice;
            importStub.should.have.been.calledOnce;
        });
    });
});
