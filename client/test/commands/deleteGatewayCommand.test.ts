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
import * as fs from 'fs-extra';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as myExtension from '../../src/extension';
import { BlockchainTreeItem } from '../../src/explorer/model/BlockchainTreeItem';
import { TestUtil } from '../TestUtil';
import { FabricGatewayRegistry } from '../../src/fabric/FabricGatewayRegistry';
import { BlockchainGatewayExplorerProvider } from '../../src/explorer/gatewayExplorer';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricRuntimeManager } from '../../src/fabric/FabricRuntimeManager';

chai.should();
chai.use(sinonChai);
// tslint:disable no-unused-expression

describe('DeleteGatewayCommand', () => {

    before(async () => {
        await TestUtil.setupTests();
        await TestUtil.storeGatewaysConfig();
    });

    after(async () => {
        await TestUtil.restoreGatewaysConfig();
    });

    describe('deleteGateway', () => {

        let mySandBox: sinon.SinonSandbox;
        let warningStub: sinon.SinonStub;
        let quickPickStub: sinon.SinonStub;
        let gateways: Array<any>;
        let myGatewayA: any;
        let myGatewayB: any;
        const rootPath: string = path.dirname(__dirname);

        beforeEach(async () => {
            mySandBox = sinon.createSandbox();
            warningStub = mySandBox.stub(UserInputUtil, 'showConfirmationWarningMessage').resolves(true);

            // reset the available gateways
            await vscode.workspace.getConfiguration().update('fabric.gateways', [], vscode.ConfigurationTarget.Global);

            gateways = [];

            myGatewayA = {
                name: 'myGatewayA',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json')
            };
            gateways.push(myGatewayA);

            myGatewayB = {
                name: 'myGatewayB',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json')
            };
            gateways.push(myGatewayB);

            await vscode.workspace.getConfiguration().update('fabric.gateways', gateways, vscode.ConfigurationTarget.Global);

            quickPickStub = mySandBox.stub(vscode.window, 'showQuickPick').resolves({
                label: 'myGatewayB',
                data: FabricGatewayRegistry.instance().get('myGatewayB')
            });

            mySandBox.stub(FabricRuntimeManager.instance(), 'getGatewayRegistryEntries').resolves([]);
        });

        afterEach(() => {
            mySandBox.restore();
        });

        it('should test a connection can be deleted from the command', async () => {

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_GATEWAY);

            gateways = vscode.workspace.getConfiguration().get('fabric.gateways');

            gateways.length.should.equal(1);
            gateways[0].should.deep.equal(myGatewayA);
        });

        it('should test a connection can be deleted from tree', async () => {
            const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = myExtension.getBlockchainGatewayExplorerProvider();

            const allChildren: Array<BlockchainTreeItem> = await blockchainGatewayExplorerProvider.getChildren();

            const connectionToDelete: BlockchainTreeItem = allChildren[0];
            await vscode.commands.executeCommand(ExtensionCommands.DELETE_GATEWAY, connectionToDelete);

            gateways = vscode.workspace.getConfiguration().get('fabric.gateways');

            gateways.length.should.equal(1);
            gateways[0].should.deep.equal(myGatewayB);
        });

        it('should test delete connection can be cancelled', async () => {
            quickPickStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_GATEWAY);

            gateways = vscode.workspace.getConfiguration().get('fabric.gateways');

            gateways.length.should.equal(2);
        });

        it('should handle no from confirmation message', async () => {
            warningStub.resolves(false);

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_GATEWAY);

            gateways = vscode.workspace.getConfiguration().get('fabric.gateways');

            gateways.length.should.equal(2);
            gateways[0].should.deep.equal(myGatewayA);
            gateways[1].should.deep.equal(myGatewayB);
        });

        it('should delete the local gateway directory if the extension owns it', async () => {
            const myGatewayC: any = {
                name: 'myGatewayC',
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json')
            };
            gateways.push(myGatewayC);
            await vscode.workspace.getConfiguration().update('fabric.gateways', gateways, vscode.ConfigurationTarget.Global);

            quickPickStub.resolves({
                label: 'myGatewayC',
                data: FabricGatewayRegistry.instance().get('myGatewayC')
            });

            const getDirPathStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'getDirPath').returns('fabric-vscode');
            const fsRemoveStub: sinon.SinonStub = mySandBox.stub(fs, 'remove').resolves();

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_GATEWAY);
            gateways = vscode.workspace.getConfiguration().get('fabric.gateways');
            gateways.length.should.equal(2);
            gateways[0].should.deep.equal(myGatewayA);
            gateways[1].should.deep.equal(myGatewayB);

            getDirPathStub.should.have.been.calledOnce;
            fsRemoveStub.should.have.been.calledOnceWith(path.join('fabric-vscode', 'myGatewayC'));

        });
    });
});
