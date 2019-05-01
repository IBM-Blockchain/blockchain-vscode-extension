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
import * as vscode from 'vscode';

import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { ExtensionUtil } from '../../src/util/ExtensionUtil';
import * as fs from 'fs-extra';

import * as chaiAsPromised from 'chai-as-promised';
import { SettingConfigurations } from '../../SettingConfigurations';

const should: Chai.Should = chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);
// tslint:disable no-unused-expression
describe('ExtensionUtil Tests', () => {

    let mySandBox: sinon.SinonSandbox;
    const workspaceFolder: any = {
        name: 'myFolder',
        uri: vscode.Uri.file('myPath')
    };
    beforeEach(() => {
        mySandBox = sinon.createSandbox();
    });

    afterEach(() => {
        mySandBox.restore();
    });

    describe('getPackageJSON', () => {
        it('should get the packageJSON', async () => {
            await ExtensionUtil.activateExtension();
            const packageJSON: any = ExtensionUtil.getPackageJSON();
            packageJSON.name.should.equal('ibm-blockchain-platform');
        });
    });

    describe('activateExtension', () => {
        it('should activate the extension', async () => {
            await ExtensionUtil.activateExtension();

            const isActive: boolean = vscode.extensions.getExtension('IBMBlockchain.ibm-blockchain-platform').isActive;
            isActive.should.equal(true);
        });
    });

    describe('getExtensionPath', () => {
        it('should get the extension path', () => {
            const path: string = ExtensionUtil.getExtensionPath();
            path.should.contain('blockchain-vscode-extension');
        });
    });

    describe('loadJSON', () => {
        it('should return parsed workspace package.json', async () => {

            mySandBox.stub(fs, 'readFile').resolves(`{
                "name": "mySmartContract",
                "version": "0.0.1"
            }`);

            const result: any = await ExtensionUtil.loadJSON(workspaceFolder, 'package.json');
            result.should.deep.equal({
                name: 'mySmartContract',
                version: '0.0.1'
            });
        });

        it('should handle errors', async () => {

            mySandBox.stub(fs, 'readFile').throws({message: 'Cannot read file'});

            await ExtensionUtil.loadJSON(workspaceFolder, 'package.json').should.be.rejectedWith('error reading package.json from project Cannot read file');

        });
    });

    describe('getContractNameAndVersion', () => {
        it('should get contract name and version', async () => {

            mySandBox.stub(ExtensionUtil, 'loadJSON').resolves({name: 'projectName', version: '0.0.3'});

            const result: any = await ExtensionUtil.getContractNameAndVersion(workspaceFolder);
            result.should.deep.equal({
                name: 'projectName',
                version: '0.0.3'
            });
        });

        it('should handle errors', async () => {

            mySandBox.stub(ExtensionUtil, 'loadJSON').throws({message: 'error reading package.json from project Cannot read file'});
            should.equal(await ExtensionUtil.getContractNameAndVersion(workspaceFolder), undefined);
        });
    });

    describe('migrateSettingConfigurations', () => {
        let getConfigurationStub: sinon.SinonStub;
        let workspaceConfigurationGetStub: sinon.SinonStub;
        let workspaceConfigurationUpdateStub: sinon.SinonStub;

        beforeEach(() => {
            getConfigurationStub = mySandBox.stub(vscode.workspace, 'getConfiguration');
            workspaceConfigurationGetStub = mySandBox.stub();
            workspaceConfigurationUpdateStub = mySandBox.stub();
        });
        it('should ignore migration if old configuration values no longer exist', async () => {
            getConfigurationStub.returns({
                get: workspaceConfigurationGetStub,
                update: workspaceConfigurationUpdateStub
            });

            await ExtensionUtil.migrateSettingConfigurations();
            workspaceConfigurationGetStub.callCount.should.equal(4);
            workspaceConfigurationUpdateStub.should.not.have.been.called;
        });

        it('should migration old configuration values to new values', async () => {
            workspaceConfigurationGetStub.returns([]);
            getConfigurationStub.returns({
                get: workspaceConfigurationGetStub,
                update: workspaceConfigurationUpdateStub
            });

            workspaceConfigurationGetStub.onCall(0).returns([
                {
                    name: 'myGateway',
                    connectionProfilePath: 'blockchain/extension/directory/gatewayOne/connection.json',
                    associatedWallet: ''
                }
            ]);

            workspaceConfigurationGetStub.onCall(2).returns([
                {
                    managedWallet: false,
                    name: 'myWallet',
                    walletPath: '/some/path'
                }
            ]);

            workspaceConfigurationGetStub.onCall(4).returns([
                {
                    name: 'hyperledger/fabric-samples',
                    path: '/sample/path/fabric-samples'
                }
            ]);

            workspaceConfigurationGetStub.onCall(6).returns('some_directory');

            await ExtensionUtil.migrateSettingConfigurations();
            workspaceConfigurationGetStub.callCount.should.equal(7);
            workspaceConfigurationUpdateStub.callCount.should.equal(4);
            workspaceConfigurationUpdateStub.getCall(0).should.have.been.calledWithExactly(SettingConfigurations.FABRIC_GATEWAYS, [
                {
                    name: 'myGateway',
                    connectionProfilePath: 'blockchain/extension/directory/gatewayOne/connection.json',
                    associatedWallet: ''
                }
            ], vscode.ConfigurationTarget.Global);

            workspaceConfigurationUpdateStub.getCall(1).should.have.been.calledWithExactly(SettingConfigurations.FABRIC_WALLETS, [
                {
                    managedWallet: false,
                    name: 'myWallet',
                    walletPath: '/some/path'
                }
            ], vscode.ConfigurationTarget.Global);

            workspaceConfigurationUpdateStub.getCall(2).should.have.been.calledWithExactly(SettingConfigurations.EXTENSION_REPOSITORIES, [
                {
                    name: 'hyperledger/fabric-samples',
                    path: '/sample/path/fabric-samples'
                }
            ], vscode.ConfigurationTarget.Global);

            workspaceConfigurationUpdateStub.getCall(3).should.have.been.calledWithExactly(SettingConfigurations.EXTENSION_DIRECTORY, 'some_directory', vscode.ConfigurationTarget.Global);

        });

        it('should ignore migration if values already exist in new config', async () => {
            getConfigurationStub.returns({
                get: workspaceConfigurationGetStub,
                update: workspaceConfigurationUpdateStub
            });

            workspaceConfigurationGetStub.onCall(0).returns([
                {
                    name: 'myGateway',
                    connectionProfilePath: 'blockchain/extension/directory/gatewayOne/connection.json',
                    associatedWallet: ''
                }
            ]);

            workspaceConfigurationGetStub.onCall(1).returns([
                {
                    name: 'alreadyStoredGateway',
                    connectionProfilePath: 'blockchain/extension/directory/gatewayOne/connection.json',
                    associatedWallet: ''
                }
            ]);

            workspaceConfigurationGetStub.onCall(2).returns([
                {
                    managedWallet: false,
                    name: 'myWallet',
                    walletPath: '/some/path'
                }
            ]);

            workspaceConfigurationGetStub.onCall(3).returns([
                {
                    managedWallet: false,
                    name: 'alreadyStoredWallet',
                    walletPath: '/some/path'
                }
            ]);

            workspaceConfigurationGetStub.onCall(4).returns([
                {
                    name: 'hyperledger/fabric-samples',
                    path: '/sample/path/fabric-samples'
                }
            ]);

            workspaceConfigurationGetStub.onCall(5).returns([
                {
                    name: 'hyperledger/fabric-samples',
                    path: '/already/stored/fabric-samples'
                }
            ]);

            workspaceConfigurationGetStub.onCall(6).returns(undefined);

            await ExtensionUtil.migrateSettingConfigurations();
            workspaceConfigurationGetStub.callCount.should.equal(7);
            workspaceConfigurationUpdateStub.callCount.should.equal(0);

        });

    });
});
