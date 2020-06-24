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
import Axios from 'axios';
import { TestUtil } from '../TestUtil';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';
import { ExtensionsInteractionUtil } from '../../extension/util/ExtensionsInteractionUtil';

// tslint:disable no-unused-expression
chai.should();
chai.use(sinonChai);

import { FabricEnvironmentRegistry, FabricEnvironmentRegistryEntry, EnvironmentType, LogType } from 'ibm-blockchain-platform-common';

describe('logInAndDiscoverCommand', () => {
    let mySandBox: sinon.SinonSandbox;
    let logSpy: sinon.SinonSpy;
    let axiosGetStub: sinon.SinonStub;
    let originalSaaSName: string;
    let getAccessTokenStub: sinon.SinonStub;
    let resourcesResponseMock: any;
    let consoleStatusMock: any;
    let urlSaaS: string;
    let getIbpResourcesStub: sinon.SinonStub;

    before(async () => {
        mySandBox = sinon.createSandbox();
        await TestUtil.setupTests(mySandBox);
    });

    describe('logInAndDiscover', () => {

        beforeEach(async () => {
            await FabricEnvironmentRegistry.instance().clear();

            logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');

            getIbpResourcesStub = mySandBox.stub(ExtensionsInteractionUtil, 'cloudAccountGetIbpResources');
            axiosGetStub = mySandBox.stub(Axios, 'get');
            urlSaaS = 'https://my.SaaS.OpsTool.url';
            originalSaaSName = 'myBlockchainPlatform';
            const accessToken: string = 'some token';
            getAccessTokenStub = mySandBox.stub(ExtensionsInteractionUtil, 'cloudAccountGetAccessToken').resolves(accessToken);

            resourcesResponseMock = [
                {
                    resource_plan_id: 'blockchain-standard',
                    name: originalSaaSName,
                    guid: 'someGUID1',
                    dashboard_url: 'https://some.dashboard.url1/some/path'
                }, {
                    resource_plan_id: 'blockchain-standard',
                    name: 'myEnv',
                    guid: 'someGUID1',
                    dashboard_url: 'https://some.dashboard.url2/some/path'
                }
            ];

            consoleStatusMock = {
                status: 200,
                data: {
                    endpoint: urlSaaS
                }
            };
        });

        afterEach(async () => {
            mySandBox.restore();
        });

        it('should successfully add discovered environments', async () => {
            axiosGetStub.resolves(consoleStatusMock);
            getIbpResourcesStub.resolves(resourcesResponseMock);

            await vscode.commands.executeCommand(ExtensionCommands.LOG_IN_AND_DISCOVER);

            const environments: Array<FabricEnvironmentRegistryEntry> = await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(2);
            environments[0].should.deep.equal({
                name: resourcesResponseMock[0].name,
                url: urlSaaS,
                environmentType: EnvironmentType.SAAS_OPS_TOOLS_ENVIRONMENT
            });
            environments[1].should.deep.equal({
                name: resourcesResponseMock[1].name,
                url: urlSaaS,
                environmentType: EnvironmentType.SAAS_OPS_TOOLS_ENVIRONMENT
            });

            getIbpResourcesStub.should.have.been.calledOnce;
            getAccessTokenStub.should.have.been.calledOnce;
            axiosGetStub.should.have.been.calledTwice;

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Log in and discover');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Automatically added 2 environment(s) from IBM Cloud');
        });

        it('should handle discovering an environment with the same name as an existing one', async () => {
            const sameNameErrorMessage: string = 'An environment with this name already exists or is too similar.';
            const myEnv: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry({
                name: 'myEnv'
            });
            await FabricEnvironmentRegistry.instance().add(myEnv);

            axiosGetStub.resolves(consoleStatusMock);

            getIbpResourcesStub.resolves(resourcesResponseMock);

            await vscode.commands.executeCommand(ExtensionCommands.LOG_IN_AND_DISCOVER);

            const environments: Array<FabricEnvironmentRegistryEntry> = await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(2);
            environments[0].should.deep.equal({
                name: originalSaaSName,
                url: urlSaaS,
                environmentType: EnvironmentType.SAAS_OPS_TOOLS_ENVIRONMENT
            });
            environments[1].should.deep.equal(myEnv);

            getIbpResourcesStub.should.have.been.calledOnce;
            getAccessTokenStub.should.have.been.calledOnce;
            axiosGetStub.should.have.been.calledOnce;

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Log in and discover');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Failed to add a new environment: ${sameNameErrorMessage}`, `Failed to add a new environment: Error: ${sameNameErrorMessage}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.SUCCESS, 'Automatically added 1 environment(s) from IBM Cloud');
        });

        it('should handle no access token', async () => {
            getIbpResourcesStub.resolves(resourcesResponseMock);
            getAccessTokenStub.resolves();

            await vscode.commands.executeCommand(ExtensionCommands.LOG_IN_AND_DISCOVER);

            const environments: Array<FabricEnvironmentRegistryEntry> = await FabricEnvironmentRegistry.instance().getAll();
            chai.should().equal(0, environments.length);

            getIbpResourcesStub.should.have.been.calledOnce;
            getAccessTokenStub.should.have.been.calledOnce;
            axiosGetStub.should.not.have.been.called;

            logSpy.getCalls().length.should.equal(1);
            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Log in and discover');
        });

        it('should handle no api endpoint', async () => {
            const getApiEndpointStub: sinon.SinonStub = mySandBox.stub(ExtensionsInteractionUtil, 'cloudAccountGetApiEndpoint');
            getApiEndpointStub.callThrough();
            getApiEndpointStub.onSecondCall().resolves();

            axiosGetStub.resolves(consoleStatusMock);
            getIbpResourcesStub.resolves(resourcesResponseMock);

            await vscode.commands.executeCommand(ExtensionCommands.LOG_IN_AND_DISCOVER);

            const environments: Array<FabricEnvironmentRegistryEntry> = await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(1);
            environments[0].should.deep.equal({
                name: originalSaaSName,
                url: urlSaaS,
                environmentType: EnvironmentType.SAAS_OPS_TOOLS_ENVIRONMENT
            });

            getIbpResourcesStub.should.have.been.calledOnce;
            getAccessTokenStub.should.have.been.calledOnce;
            getApiEndpointStub.should.have.been.calledTwice;
            axiosGetStub.should.have.been.calledOnce;

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Log in and discover');
            logSpy.getCall(1).should.have.been.calledWith(LogType.SUCCESS, 'Automatically added 1 environment(s) from IBM Cloud');
        });

        it('should hanlde error when fetching console status', async () => {
            const consoleErrorMessage: string = `Got status 500. Please make sure the IBM Blockchain Platform Console deployment has finished before adding environment.`;

            axiosGetStub.onFirstCall().resolves({
                status: 500
            });
            axiosGetStub.onSecondCall().resolves(consoleStatusMock);
            getIbpResourcesStub.resolves(resourcesResponseMock);

            await vscode.commands.executeCommand(ExtensionCommands.LOG_IN_AND_DISCOVER);

            const environments: Array<FabricEnvironmentRegistryEntry> = await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(1);
            environments[0].should.deep.equal({
                name: resourcesResponseMock[1].name,
                url: urlSaaS,
                environmentType: EnvironmentType.SAAS_OPS_TOOLS_ENVIRONMENT
            });

            getIbpResourcesStub.should.have.been.calledOnce;
            getAccessTokenStub.should.have.been.calledOnce;
            axiosGetStub.should.have.been.calledTwice;

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Log in and discover');
            logSpy.getCall(1).should.have.been.calledWith(LogType.ERROR, `Failed to add a new environment: ${consoleErrorMessage}`, `Failed to add a new environment: Error: ${consoleErrorMessage}`);
            logSpy.getCall(2).should.have.been.calledWith(LogType.SUCCESS, 'Automatically added 1 environment(s) from IBM Cloud');
        });

        it('should return if there are no IBP resources', async () => {
            axiosGetStub.resolves(consoleStatusMock);
            getIbpResourcesStub.resolves([]);
            const executeCommandSpy: sinon.SinonSpy = mySandBox.spy(vscode.commands, 'executeCommand');

            await vscode.commands.executeCommand(ExtensionCommands.LOG_IN_AND_DISCOVER);

            const environments: Array<FabricEnvironmentRegistryEntry> = await FabricEnvironmentRegistry.instance().getAll();
            environments.length.should.equal(0);

            getIbpResourcesStub.should.have.been.calledOnce;
            getAccessTokenStub.should.not.have.been.called;
            axiosGetStub.should.not.have.been.called;
            executeCommandSpy.should.have.been.calledWith(ExtensionCommands.REFRESH_ENVIRONMENTS);

            logSpy.getCall(0).should.have.been.calledWith(LogType.INFO, undefined, 'Log in and discover');
        });
    });
});
