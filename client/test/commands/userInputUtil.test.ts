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
import { TestUtil } from '../TestUtil';
import { UserInputUtil } from '../../src/commands/userInputUtil';
import { FabricRuntimeRegistry } from '../../src/fabric/FabricRuntimeRegistry';
import { FabricRuntimeRegistryEntry } from '../../src/fabric/FabricRuntimeRegistryEntry';
import * as myExtension from '../../src/extension';

import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as fs_extra from 'fs-extra';
import { CommandUtil } from '../../src/util/CommandUtil';
chai.should();
chai.use(sinonChai);

describe('User Input Utility Function Tests', () => {

    let mySandBox;
    let quickPickStub;
    const connections: Array<any> = [];
    const runtimeRegistry: FabricRuntimeRegistry = FabricRuntimeRegistry.instance();
    let USER_PACKAGE_DIRECTORY;

    before(async () => {
        USER_PACKAGE_DIRECTORY = await vscode.workspace.getConfiguration().get('fabric.package.directory');
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

        await runtimeRegistry.clear();
        await runtimeRegistry.add(new FabricRuntimeRegistryEntry({ name: 'local_fabric1', developmentMode: false }));
        await runtimeRegistry.add(new FabricRuntimeRegistryEntry({ name: 'local_fabric2', developmentMode: true }));

        quickPickStub = mySandBox.stub(vscode.window, 'showQuickPick');
    });

    afterEach(async () => {
        mySandBox.restore();
        await runtimeRegistry.clear();
    });

    after(async () => {
        await vscode.workspace.getConfiguration().update('fabric.package.directory', USER_PACKAGE_DIRECTORY, vscode.ConfigurationTarget.Global);
    });

    describe('showConnectionQuickPickBox', () => {
        it('should show connections in the quickpick box', async () => {
            quickPickStub.resolves('connectionOne');
            const result: string = await UserInputUtil.showConnectionQuickPickBox('choose a connection');

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
            const result: string = await UserInputUtil.showIdentityConnectionQuickPickBox('choose a connection', connections[0]);

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

            const result = await UserInputUtil.showInputBox('a question');
            result.should.equal('my answer');
            inputStub.should.have.been.calledWith({prompt: 'a question'});
        });
    });

    describe('showRuntimeQuickPickBox', () => {
        it('should show runtimes in the quickpick box', async () => {
            quickPickStub.resolves('local_fabric2');
            const result: string = await UserInputUtil.showRuntimeQuickPickBox('choose a runtime');

            result.should.equal('local_fabric2');
            quickPickStub.should.have.been.calledWith(sinon.match.any, {
                ignoreFocusOut: false,
                canPickMany: false,
                placeHolder: 'choose a runtime'
            });
        });
    });

    describe('showSmartContractPackagesQuickPickBox', () => {

        it('show quick pick box for smart contract packages', async () => {

            quickPickStub.resolves('smartContractPackageBlue');

            const result = await UserInputUtil.showSmartContractPackagesQuickPickBox('Choose the smart contract package that you want to delete');

            result.should.deep.equal('smartContractPackageBlue');
            quickPickStub.should.have.been.calledWith(sinon.match.any, {
                ignoreFocusOut: false,
                canPickMany: true,
                placeHolder: 'Choose the smart contract package that you want to delete'
            });
        });
    });
});
