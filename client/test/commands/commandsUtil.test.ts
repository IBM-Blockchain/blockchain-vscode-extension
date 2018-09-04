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
import { CommandsUtil } from '../../src/commands/commandsUtil';

chai.use(sinonChai);

describe('Commands Utility Function Tests', () => {

    let mySandBox;
    let quickPickStub;
    const connections: Array<any> = [];

    before(async () => {
        await TestUtil.setupTests();
    });

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();

        const rootPath = path.dirname(__dirname);

        connections.push({
            name: 'myConnectionA',
            connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
            identities: [{
                certificatePath: path.join(rootPath, '../../test/data/connectionOne/credentials/certificate'),
                privateKeyPath: path.join(rootPath, '../../test/data/connectionOne/credentials/privateKey')
            }]
        });

        connections.push({
            name: 'myConnectionB',
            connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
            identities: [{
                certificatePath: path.join(rootPath, '../../test/data/connectionTwo/credentials/certificate'),
                privateKeyPath: path.join(rootPath, '../../test/data/connectionTwo/credentials/privateKey')
            }]
        });

        await vscode.workspace.getConfiguration().update('fabric.connections', connections, vscode.ConfigurationTarget.Global);

        quickPickStub = mySandBox.stub(vscode.window, 'showQuickPick');
    });

    afterEach(() => {
        mySandBox.restore();
    });

    describe('showConnectionQuickPickBox', () => {
        it('should show connections in the quickpick box', async () => {
            quickPickStub.resolves('connectionOne');
            const result: string = await CommandsUtil.showConnectionQuickPickBox('choose a connection');

            result.should.equal('connectionOne');
            quickPickStub.should.have.been.calledWith(sinon.match.any, {
                ignoreFocusOut: false,
                canPickMany: false,
                placeHolder: 'choose a connection'
            });
        });
    });

    describe('showIdentityConnectionQuickPickBox', () => {

        it('should show identity connections in the quickpick box', async () => {
            quickPickStub.resolves('Admin@org1.example.com');
            const result: string = await CommandsUtil.showIdentityConnectionQuickPickBox('choose a connection', connections[0]);

            result.should.equal('Admin@org1.example.com');
            quickPickStub.should.have.been.calledWith(sinon.match.any, {
                ignoreFocusOut: false,
                canPickMany: false,
                placeHolder: 'choose a connection'
            });
        });
    });

    describe('showInputBox', () => {
        it('should show the input box', async () => {
            const inputStub = mySandBox.stub(vscode.window, 'showInputBox').resolves('my answer');

            const result = await CommandsUtil.showInputBox('a question');
            result.should.equal('my answer');
            inputStub.should.have.been.calledWith({prompt: 'a question'});
        });
    });
});
