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

chai.should();
chai.use(sinonChai);

describe('AddConnectionCommand', () => {
    let mySandBox: sinon.SinonSandbox;

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

        });

        afterEach(() => {
            mySandBox.restore();
        });

        it('should test a completed connection can be added', async () => {
            const showInputBoxStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showInputBox');
            const browseEditStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'browseEdit');
            mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);
            const rootPath: string = path.dirname(__dirname);

            showInputBoxStub.onFirstCall().resolves('myConnection');
            browseEditStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionOne/connection.json'));
            browseEditStub.onSecondCall().resolves(path.join(rootPath, '../../test/data/connectionOne/credentials/certificate'));
            browseEditStub.onThirdCall().resolves(path.join(rootPath, '../../test/data/connectionOne/credentials/privateKey'));

            const executeCommandSpy: sinon.SinonSpy = mySandBox.spy(vscode.commands, 'executeCommand');

            await vscode.commands.executeCommand('blockchainExplorer.addConnectionEntry');

            const connections: Array<any> = vscode.workspace.getConfiguration().get('fabric.connections');

            connections.length.should.equal(1);
            connections[0].should.deep.equal({
                name: 'myConnection',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                identities: [{
                    certificatePath: path.join(rootPath, '../../test/data/connectionOne/credentials/certificate'),
                    privateKeyPath: path.join(rootPath, '../../test/data/connectionOne/credentials/privateKey')
                }]
            });

            executeCommandSpy.should.have.been.calledWith('blockchainExplorer.refreshEntry');
        });

        it('should test an uncompleted connection can be added', async () => {
            const showInputBoxStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showInputBox');
            const browseEditStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'browseEdit');

            const rootPath: string = path.dirname(__dirname);

            showInputBoxStub.onFirstCall().resolves('myConnection');
            browseEditStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionOne/connection.json'));

            const executeCommandSpy: sinon.SinonSpy = mySandBox.spy(vscode.commands, 'executeCommand');

            await vscode.commands.executeCommand('blockchainExplorer.addConnectionEntry');

            const connections: Array<any> = vscode.workspace.getConfiguration().get('fabric.connections');

            connections.length.should.equal(1);
            connections[0].should.deep.equal({
                name: 'myConnection',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                identities: [{
                    certificatePath: FabricConnectionHelper.CERTIFICATE_PATH_DEFAULT,
                    privateKeyPath: FabricConnectionHelper.PRIVATE_KEY_PATH_DEFAULT
                }]
            });

            executeCommandSpy.should.have.been.calledWith('blockchainExplorer.refreshEntry');
        });

        it('should test another connection can be added', async () => {
            const showInputBoxStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showInputBox');
            const browseEditStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'browseEdit');
            const rootPath: string = path.dirname(__dirname);
            mySandBox.stub(ParsedCertificate, 'validPEM').returns(null);

            showInputBoxStub.onFirstCall().resolves('myConnection');
            browseEditStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionOne/connection.json'));
            browseEditStub.onSecondCall().resolves(path.join(rootPath, '../../test/data/connectionOne/credentials/certificate'));
            browseEditStub.onThirdCall().resolves(path.join(rootPath, '../../test/data/connectionOne/credentials/privateKey'));

            const executeCommandSpy: sinon.SinonSpy = mySandBox.spy(vscode.commands, 'executeCommand');

            // execute a command to force the extension activation
            await vscode.commands.executeCommand('blockchainExplorer.addConnectionEntry');

            let connections: Array<any> = vscode.workspace.getConfiguration().get('fabric.connections');

            connections.length.should.equal(1);
            connections[0].should.deep.equal({
                name: 'myConnection',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                identities: [{
                    certificatePath: path.join(rootPath, '../../test/data/connectionOne/credentials/certificate'),
                    privateKeyPath: path.join(rootPath, '../../test/data/connectionOne/credentials/privateKey')
                }]
            });

            showInputBoxStub.onSecondCall().resolves('myConnection2');
            browseEditStub.onCall(3).resolves(path.join(rootPath, '../../test/data/connectionTwo/connection.json'));
            browseEditStub.onCall(4).resolves(path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'));
            browseEditStub.onCall(5).resolves(path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey'));

            // execute a command to force the extension activation
            await vscode.commands.executeCommand('blockchainExplorer.addConnectionEntry');

            executeCommandSpy.callCount.should.equal(10);

            let calledWithValue: string;
            for (let x: number = 0; x < 10; x++) {
                if (x % 5 === 0) {
                    calledWithValue = 'blockchainExplorer.addConnectionEntry';
                } else {
                    calledWithValue = 'blockchainExplorer.refreshEntry';
                }
                executeCommandSpy.getCall(x).should.have.been.calledWith(calledWithValue);
            }

            connections = vscode.workspace.getConfiguration().get('fabric.connections');

            connections.length.should.equal(2);
            connections[0].should.deep.equal({
                name: 'myConnection',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                identities: [{
                    certificatePath: path.join(rootPath, '../../test/data/connectionOne/credentials/certificate'),
                    privateKeyPath: path.join(rootPath, '../../test/data/connectionOne/credentials/privateKey')
                }]
            });
            connections[1].should.deep.equal({
                name: 'myConnection2',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
                identities: [{
                    certificatePath: path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'),
                    privateKeyPath: path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey')
                }]
            });
        });

        it('should test a connection can be cancelled when naming connection', async () => {
            const showInputBoxStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showInputBox');

            showInputBoxStub.onFirstCall().resolves();

            const executeCommandSpy: sinon.SinonSpy = mySandBox.spy(vscode.commands, 'executeCommand');

            // execute a command to force the extension activation
            await vscode.commands.executeCommand('blockchainExplorer.addConnectionEntry');

            const connections: Array<any> = vscode.workspace.getConfiguration().get('fabric.connections');

            connections.length.should.equal(0);

            executeCommandSpy.callCount.should.equal(1);
            executeCommandSpy.getCall(0).should.have.been.calledWith('blockchainExplorer.addConnectionEntry');
        });

        it('should test a connection can be cancelled when adding profile', async () => {
            const showInputBoxStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showInputBox');
            const browseEditStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'browseEdit');

            showInputBoxStub.onFirstCall().resolves('myConnection');
            browseEditStub.onSecondCall().resolves();

            const executeCommandSpy: sinon.SinonSpy = mySandBox.spy(vscode.commands, 'executeCommand');

            // execute a command to force the extension activation
            await vscode.commands.executeCommand('blockchainExplorer.addConnectionEntry');

            const connections: Array<any> = vscode.workspace.getConfiguration().get('fabric.connections');

            connections.length.should.equal(1);
            connections[0].should.deep.equal({
                name: 'myConnection',
                connectionProfilePath: FabricConnectionHelper.CONNECTION_PROFILE_PATH_DEFAULT,
                identities: [{
                    certificatePath: FabricConnectionHelper.CERTIFICATE_PATH_DEFAULT,
                    privateKeyPath: FabricConnectionHelper.PRIVATE_KEY_PATH_DEFAULT
                }]
            });

            executeCommandSpy.callCount.should.equal(2);
            executeCommandSpy.getCall(0).should.have.been.calledWith('blockchainExplorer.addConnectionEntry');

        });

        it('should test a connection can be cancelled when adding certificate', async () => {
            const showInputBoxStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showInputBox');
            const browseEditStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'browseEdit');

            const rootPath: string = path.dirname(__dirname);

            showInputBoxStub.onFirstCall().resolves('myConnection');
            browseEditStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionOne/connection.json'));
            browseEditStub.onSecondCall().resolves();

            // execute a command to force the extension activation
            await vscode.commands.executeCommand('blockchainExplorer.addConnectionEntry');

            const connections: Array<any> = vscode.workspace.getConfiguration().get('fabric.connections');

            connections.length.should.equal(1);
            connections[0].should.deep.equal({
                name: 'myConnection',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                identities: [{
                    certificatePath: FabricConnectionHelper.CERTIFICATE_PATH_DEFAULT,
                    privateKeyPath: FabricConnectionHelper.PRIVATE_KEY_PATH_DEFAULT
                }]
            });
        });

        it('should test a connection can be cancelled when adding private key', async () => {
            const showInputBoxStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showInputBox');
            const browseEditStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'browseEdit');

            const rootPath: string = path.dirname(__dirname);

            showInputBoxStub.onFirstCall().resolves('myConnection');
            browseEditStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionOne/connection.json'));
            browseEditStub.onSecondCall().resolves(path.join(rootPath, '../../test/data/connectionOne/credentials/certificate'));
            browseEditStub.onThirdCall().resolves();

            await vscode.commands.executeCommand('blockchainExplorer.addConnectionEntry');

            const connections: Array<any> = vscode.workspace.getConfiguration().get('fabric.connections');

            connections.length.should.equal(1);
            connections[0].should.deep.equal({
                name: 'myConnection',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                identities: [{
                    certificatePath: path.join(rootPath, '../../test/data/connectionOne/credentials/certificate'),
                    privateKeyPath: FabricConnectionHelper.PRIVATE_KEY_PATH_DEFAULT
                }]
            });
        });

        it('should throw an error if certificate is invalid', async () => {
            const showInputBoxStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showInputBox');
            const browseEditStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'browseEdit');
            mySandBox.stub(ParsedCertificate, 'validPEM').throws({message: 'Could not validate certificate: invalid pem'});
            const rootPath: string = path.dirname(__dirname);
            const errorSpy: sinon.SinonSpy = mySandBox.spy(vscode.window, 'showErrorMessage');
            showInputBoxStub.onFirstCall().resolves('myConnection');
            browseEditStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionOne/connection.json'));
            browseEditStub.onSecondCall().resolves(path.join(rootPath, '../../test/data/connectionOne/credentials/certificate'));

            await vscode.commands.executeCommand('blockchainExplorer.addConnectionEntry');

            errorSpy.should.have.been.calledWith('Failed to add a new connection: Could not validate certificate: invalid pem');
        });

        it('should throw an error if private key is invalid', async () => {
            const showInputBoxStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showInputBox');
            const browseEditStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'browseEdit');
            mySandBox.stub(ParsedCertificate, 'validPEM').onSecondCall().throws({message: 'Could not validate private key: invalid pem'});
            const rootPath: string = path.dirname(__dirname);
            const errorSpy: sinon.SinonSpy = mySandBox.spy(vscode.window, 'showErrorMessage');
            showInputBoxStub.onFirstCall().resolves('myConnection');
            browseEditStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionOne/connection.json'));
            browseEditStub.onSecondCall().resolves(path.join(rootPath, '../../test/data/connectionOne/credentials/certificate'));
            browseEditStub.onThirdCall().resolves(path.join(rootPath, '../../test/data/connectionOne/credentials/privateKey'));

            await vscode.commands.executeCommand('blockchainExplorer.addConnectionEntry');

            errorSpy.should.have.been.calledWith('Failed to add a new connection: Could not validate private key: invalid pem');
        });
    });
});
