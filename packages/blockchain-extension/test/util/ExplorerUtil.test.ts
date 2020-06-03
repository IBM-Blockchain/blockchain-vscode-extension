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
import { FabricGatewayRegistryEntry, FabricEnvironmentRegistry, FabricEnvironmentRegistryEntry, EnvironmentType, FabricWalletRegistryEntry } from 'ibm-blockchain-platform-common';
import { ExplorerUtil } from '../../extension/util/ExplorerUtil';

chai.use(sinonChai);

// tslint:disable no-unused-expression
describe('gatewayExplorer', () => {

    let mySandBox: sinon.SinonSandbox;
    let fabricEnvironmentRegistryGetStub: sinon.SinonStub;

    const myEnvironment: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry({
        name: 'myEnvironment'
    });

    const myGateway: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry({
        name: 'myGateway',
        associatedWallet: '',
        fromEnvironment: myEnvironment.name
    });

    const myWallet: FabricWalletRegistryEntry = new FabricWalletRegistryEntry({
        name: 'myWallet',
        walletPath: 'some/file/path',
        environmentGroups: [myEnvironment.name]
    });

    const localEnvIcons: { light: string | vscode.Uri; dark: string | vscode.Uri } = {
        light: path.join(__filename, '..', '..', '..', '..', 'resources', 'light', 'laptop.svg'),
        dark: path.join(__filename, '..', '..', '..', '..', 'resources', 'dark', 'laptop.svg')
    };

    const ibmCloudEnvIcons: { light: string | vscode.Uri; dark: string | vscode.Uri } = {
        light: path.join(__filename, '..', '..', '..', '..', 'resources', 'light', 'ibm-cloud.svg'),
        dark: path.join(__filename, '..', '..', '..', '..', 'resources', 'dark', 'ibm-cloud.svg')
    };

    const otherEnvIcons: { light: string | vscode.Uri; dark: string | vscode.Uri } = {
        light: path.join(__filename, '..', '..', '..', '..', 'resources', 'light', 'network--3.svg'),
        dark: path.join(__filename, '..', '..', '..', '..', 'resources', 'dark', 'network--3.svg')
    };

    beforeEach(() => {
        mySandBox = sinon.createSandbox();
        fabricEnvironmentRegistryGetStub = mySandBox.stub(FabricEnvironmentRegistry.instance(), 'get');
    });

    afterEach(() => {
        mySandBox.restore();
    });

    it('should get the correct icon for a gateway from a local environment', async () => {
        myEnvironment.environmentType = EnvironmentType.LOCAL_ENVIRONMENT;
        fabricEnvironmentRegistryGetStub.resolves(myEnvironment);
        await ExplorerUtil.getGroupIcon(myGateway.fromEnvironment).should.eventually.deep.equal(localEnvIcons);
    });

    it('should get the correct icon for a wallet from a local environment', async () => {
        myEnvironment.environmentType = EnvironmentType.LOCAL_ENVIRONMENT;
        fabricEnvironmentRegistryGetStub.resolves(myEnvironment);
        await ExplorerUtil.getGroupIcon(myWallet.environmentGroups[0]).should.eventually.deep.equal(localEnvIcons);
    });

    it('should get the correct icon for a gateway from an ops tools environment', async () => {
        myEnvironment.environmentType = EnvironmentType.OPS_TOOLS_ENVIRONMENT;
        fabricEnvironmentRegistryGetStub.resolves(myEnvironment);
        await ExplorerUtil.getGroupIcon(myGateway.fromEnvironment).should.eventually.deep.equal(ibmCloudEnvIcons);
    });

    it('should get the correct icon for a wallet from an ops tools environment', async () => {
        myEnvironment.environmentType = EnvironmentType.OPS_TOOLS_ENVIRONMENT;
        fabricEnvironmentRegistryGetStub.resolves(myEnvironment);
        await ExplorerUtil.getGroupIcon(myWallet.environmentGroups[0]).should.eventually.deep.equal(ibmCloudEnvIcons);
    });

    it('should get the correct icon for a gateway from a saas environment', async () => {
        myEnvironment.environmentType = EnvironmentType.SAAS_OPS_TOOLS_ENVIRONMENT;
        fabricEnvironmentRegistryGetStub.resolves(myEnvironment);
        await ExplorerUtil.getGroupIcon(myGateway.fromEnvironment).should.eventually.deep.equal(ibmCloudEnvIcons);
    });

    it('should get the correct icon for a wallet from a saas environment', async () => {
        myEnvironment.environmentType = EnvironmentType.SAAS_OPS_TOOLS_ENVIRONMENT;
        fabricEnvironmentRegistryGetStub.resolves(myEnvironment);
        await ExplorerUtil.getGroupIcon(myWallet.environmentGroups[0]).should.eventually.deep.equal(ibmCloudEnvIcons);
    });

    it(`should get the correct icon for a gateway from an 'other' environment`, async () => {
        myEnvironment.environmentType = EnvironmentType.ENVIRONMENT;
        fabricEnvironmentRegistryGetStub.resolves(myEnvironment);
        await ExplorerUtil.getGroupIcon(myGateway.fromEnvironment).should.eventually.deep.equal(otherEnvIcons);
    });

    it(`should get the correct icon for a wallet from an 'other' environment`, async () => {
        myEnvironment.environmentType = EnvironmentType.ENVIRONMENT;
        fabricEnvironmentRegistryGetStub.resolves(myEnvironment);
        await ExplorerUtil.getGroupIcon(myWallet.environmentGroups[0]).should.eventually.deep.equal(otherEnvIcons);
    });
});
