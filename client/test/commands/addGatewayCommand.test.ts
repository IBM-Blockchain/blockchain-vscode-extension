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
import { FabricGatewayRegistry } from '../../src/fabric/FabricGatewayRegistry';

// tslint:disable no-unused-expression
chai.should();
chai.use(sinonChai);

describe('AddGatewayCommand', () => {
    const rootPath: string = path.dirname(__dirname);
    let mySandBox: sinon.SinonSandbox;
    let logSpy: sinon.SinonSpy;
    let showInputBoxStub: sinon.SinonStub;
    let browseStub: sinon.SinonStub;
    let copyConnectionProfileStub: sinon.SinonStub;
    let executeCommandSpy: sinon.SinonSpy;

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
            browseStub = mySandBox.stub(UserInputUtil, 'browse');
            copyConnectionProfileStub = mySandBox.stub(FabricGatewayHelper, 'copyConnectionProfile');
            copyConnectionProfileStub.onFirstCall().resolves(path.join('blockchain', 'extension', 'directory', 'gatewayOne', 'connection.json'));
            copyConnectionProfileStub.onSecondCall().resolves(path.join('blockchain', 'extension', 'directory', 'gatewayTwo', 'connection.json'));
            executeCommandSpy = mySandBox.spy(vscode.commands, 'executeCommand');
        });

        afterEach(async () => {
            mySandBox.restore();
        });

        it('should test a gateway can be added', async () => {
            showInputBoxStub.onFirstCall().resolves('myGateway');
            browseStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionOne/connection.json'));

            await vscode.commands.executeCommand(ExtensionCommands.ADD_GATEWAY);

            const gateways: Array<any> = vscode.workspace.getConfiguration().get('fabric.gateways');

            gateways.length.should.equal(1);
            gateways[0].should.deep.equal({
                name: 'myGateway',
                connectionProfilePath: path.join('blockchain', 'extension', 'directory', 'gatewayOne', 'connection.json')
            });
            executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
            copyConnectionProfileStub.should.have.been.calledOnce;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'addGateway');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new gateway');
        });

        it('should test multiple gateways can be added', async () => {
            // Stub first gateway details
            showInputBoxStub.onFirstCall().resolves('myGatewayOne'); // First gateway name
            browseStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionOne/connection.json')); // First gateway connection profile
            await vscode.commands.executeCommand(ExtensionCommands.ADD_GATEWAY);

            // Stub second gateway details
            showInputBoxStub.reset();
            showInputBoxStub.onFirstCall().resolves('myGatewayTwo'); // Second gateway name
            browseStub.reset();
            browseStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionTwo/connection.json')); // Second gateway connection profile

            await vscode.commands.executeCommand(ExtensionCommands.ADD_GATEWAY);

            const gateways: Array<any> = vscode.workspace.getConfiguration().get('fabric.gateways');

            gateways.length.should.equal(2);
            gateways[0].should.deep.equal({
                name: 'myGatewayOne',
                connectionProfilePath: path.join('blockchain', 'extension', 'directory', 'gatewayOne', 'connection.json')
            });

            gateways[1].should.deep.equal({
                name: 'myGatewayTwo',
                connectionProfilePath: path.join('blockchain', 'extension', 'directory', 'gatewayTwo', 'connection.json')
            });

            executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_GATEWAYS);
            copyConnectionProfileStub.should.have.been.calledTwice;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'addGateway');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new gateway');
            logSpy.getCall(2).should.have.been.calledWith(LogType.INFO, undefined, 'addGateway');
            logSpy.getCall(3).should.have.been.calledWith(LogType.SUCCESS, 'Successfully added a new gateway');
        });

        it('should test adding a gateway can be cancelled when giving a gateway name', async () => {
            showInputBoxStub.onFirstCall().resolves();

            await vscode.commands.executeCommand(ExtensionCommands.ADD_GATEWAY);

            const gateways: Array<any> = vscode.workspace.getConfiguration().get('fabric.gateways');
            gateways.length.should.equal(0);
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'addGateway');
        });

        it('should test adding a gateway can be cancelled when giving a connection profile', async () => {
            showInputBoxStub.onFirstCall().resolves('myGateway');
            browseStub.onFirstCall().resolves();

            await vscode.commands.executeCommand(ExtensionCommands.ADD_GATEWAY);

            browseStub.should.have.been.calledOnce;
            const gateways: Array<any> = vscode.workspace.getConfiguration().get('fabric.gateways');
            gateways.length.should.equal(0);
            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'addGateway');
        });

        it('should handle errors when adding a gateway', async () => {
            showInputBoxStub.onFirstCall().resolves('myGateway');
            browseStub.onFirstCall().resolves(path.join(rootPath, '../../test/data/connectionOne/connection.json'));
            mySandBox.stub(FabricGatewayRegistry.instance(), 'add').rejects({ message: 'already exists'});

            await vscode.commands.executeCommand(ExtensionCommands.ADD_GATEWAY);

            const gateways: Array<any> = vscode.workspace.getConfiguration().get('fabric.gateways');

            gateways.length.should.equal(0);
            logSpy.should.have.been.calledTwice;
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'addGateway');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Failed to add a new connection: already exists`);
        });
    });
});
