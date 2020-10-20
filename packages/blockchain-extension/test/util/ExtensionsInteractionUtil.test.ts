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
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as vscode from 'vscode';
import Axios from 'axios';
import { ExtensionsInteractionUtil } from '../../extension/util/ExtensionsInteractionUtil';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from 'ibm-blockchain-platform-common';

// tslint:disable no-unused-expression
chai.use(sinonChai);

describe('ExtensionsInteractionUtil Test', () => {

    let mySandBox: sinon.SinonSandbox;
    let executeCommandStub: sinon.SinonStub;
    let getExtensionStub: sinon.SinonStub;
    let getCommandsStub: sinon.SinonStub;

    before(async () => {
        mySandBox = sinon.createSandbox();
    });

    beforeEach(() => {
        executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand').callThrough();
        getExtensionStub = mySandBox.stub(vscode.extensions, 'getExtension').callThrough();
        getCommandsStub = mySandBox.stub(vscode.commands, 'getCommands').callThrough();
    });

    afterEach(() => {
        mySandBox.restore();
    });

    describe('#cloudAccountGetAccessToken', () => {
        let loginStub: sinon.SinonStub;
        let pingStub: sinon.SinonStub;
        let selectAccountStub: sinon.SinonStub;
        let isLoggedInStub: sinon.SinonStub;
        let accountSelectedStub: sinon.SinonStub;
        let getAccessTokenStub: sinon.SinonStub;
        let activateStub: sinon.SinonStub;
        let cloudExtensionStub: any;
        let accessToken: string;

        beforeEach(() => {
            isLoggedInStub = mySandBox.stub().resolves(true);
            accountSelectedStub = mySandBox.stub().resolves(true);
            getAccessTokenStub = mySandBox.stub().resolves('some token');
            activateStub = mySandBox.stub().resolves();
            cloudExtensionStub = {
                isActive: true,
                activate: activateStub,
                exports: {
                            loggedIn: isLoggedInStub,
                            accountSelected: accountSelectedStub,
                            getAccessToken: getAccessTokenStub
                         }
            };
            getExtensionStub.withArgs('IBM.ibmcloud-account').returns(cloudExtensionStub);

            selectAccountStub = executeCommandStub.withArgs('ibmcloud-account.selectAccount');
            selectAccountStub.resolves(true);
            loginStub = executeCommandStub.withArgs('ibmcloud-account.login');
            loginStub.resolves(true);
            pingStub = executeCommandStub.withArgs('ibmcloud-account.ping');
            pingStub.resolves();
            accessToken = undefined;
        });

        it('should get token when not logged in', async () => {
            chai.should().equal(undefined, accessToken);
            isLoggedInStub.onFirstCall().resolves(false);

            try {
                accessToken = await ExtensionsInteractionUtil.cloudAccountGetAccessToken();
            } catch (e) {
                chai.assert.isNull(e, 'there should not have been an error!');
            }
            accessToken.should.equal('some token');
            getExtensionStub.should.have.been.calledOnce;
            isLoggedInStub.should.have.been.calledOnce;
            accountSelectedStub.should.have.not.been.called;
            getAccessTokenStub.should.have.been.calledOnce;
            activateStub.should.have.not.been.called;
            selectAccountStub.should.have.not.been.called;
            loginStub.should.have.been.called;
        });

        it('should get token when already logged in but account not selected', async () => {
            chai.should().equal(undefined, accessToken);
            accountSelectedStub.onFirstCall().resolves(false);

            try {
                accessToken = await ExtensionsInteractionUtil.cloudAccountGetAccessToken();
            } catch (e) {
                chai.assert.isNull(e, 'there should not have been an error!');
            }
            accessToken.should.equal('some token');
            getExtensionStub.should.have.been.calledOnce;
            isLoggedInStub.should.have.been.calledOnce;
            accountSelectedStub.should.have.been.calledOnce;
            getAccessTokenStub.should.have.been.calledOnce;
            activateStub.should.have.not.been.called;
            selectAccountStub.should.have.been.called;
            loginStub.should.have.not.been.called;
        });

        it('should get token when already logged in and account selected', async () => {
            chai.should().equal(undefined, accessToken);

            try {
                accessToken = await ExtensionsInteractionUtil.cloudAccountGetAccessToken();
            } catch (e) {
                chai.assert.isNull(e, 'there should not have been an error!');
            }
            accessToken.should.equal('some token');
            getExtensionStub.should.have.been.calledOnce;
            isLoggedInStub.should.have.been.calledOnce;
            accountSelectedStub.should.have.been.calledOnce;
            getAccessTokenStub.should.have.been.calledOnce;
            activateStub.should.have.not.been.called;
            selectAccountStub.should.have.not.been.called;
            loginStub.should.have.not.been.called;
        });

        it('should handle user not loggin in and gracefuly return', async () => {
            chai.should().equal(undefined, accessToken);
            isLoggedInStub.onFirstCall().resolves(false);
            loginStub.resolves(false);

            try {
                accessToken = await ExtensionsInteractionUtil.cloudAccountGetAccessToken();
            } catch (e) {
                chai.assert.isNull(e, 'there should not have been an error!');
            }
            chai.should().equal(undefined, accessToken);
            getExtensionStub.should.have.been.calledOnce;
            isLoggedInStub.should.have.been.calledOnce;
            accountSelectedStub.should.have.not.been.called;
            getAccessTokenStub.should.have.not.been.called;
            activateStub.should.have.not.been.called;
            selectAccountStub.should.have.not.been.called;
            loginStub.should.have.been.called;
        });

        it('should return without asking for user input if user not logged in and userInteraction is false ', async () => {
            chai.should().equal(undefined, accessToken);
            isLoggedInStub.onFirstCall().resolves(false);

            try {
                accessToken = await ExtensionsInteractionUtil.cloudAccountGetAccessToken( false );
            } catch (e) {
                chai.assert.isNull(e, 'there should not have been an error!');
            }
            chai.should().equal(undefined, accessToken);
            getExtensionStub.should.have.been.calledOnce;
            isLoggedInStub.should.have.been.calledOnce;
            accountSelectedStub.should.have.not.been.called;
            getAccessTokenStub.should.have.not.been.called;
            activateStub.should.have.not.been.called;
            selectAccountStub.should.have.not.been.called;
            loginStub.should.have.not.been.called;
        });

        it('should handle user not selecting account and gracefuly return', async () => {
            chai.should().equal(undefined, accessToken);
            accountSelectedStub.onFirstCall().resolves(false);
            selectAccountStub.resolves(false);

            try {
                accessToken = await ExtensionsInteractionUtil.cloudAccountGetAccessToken();
            } catch (e) {
                chai.assert.isNull(e, 'there should not have been an error!');
            }
            chai.should().equal(undefined, accessToken);
            getExtensionStub.should.have.been.calledOnce;
            isLoggedInStub.should.have.been.calledOnce;
            accountSelectedStub.should.have.been.calledOnce;
            getAccessTokenStub.should.have.not.been.calledOnce;
            activateStub.should.have.not.been.called;
            selectAccountStub.should.have.been.called;
            loginStub.should.have.not.been.called;
        });

        it('should return without asking for user input if no account selected and userInteraction is false ', async () => {
            chai.should().equal(undefined, accessToken);
            accountSelectedStub.onFirstCall().resolves(false);

            try {
                accessToken = await ExtensionsInteractionUtil.cloudAccountGetAccessToken(false);
            } catch (e) {
                chai.assert.isNull(e, 'there should not have been an error!');
            }
            chai.should().equal(undefined, accessToken);
            getExtensionStub.should.have.been.calledOnce;
            isLoggedInStub.should.have.been.calledOnce;
            accountSelectedStub.should.have.been.calledOnce;
            getAccessTokenStub.should.have.not.been.calledOnce;
            activateStub.should.have.not.been.called;
            selectAccountStub.should.have.not.been.called;
            loginStub.should.have.not.been.called;
        });

        it('should handle ibmcloud-account not activated when ping is available', async () => {
            chai.should().equal(undefined, accessToken);
            isLoggedInStub.onFirstCall().resolves(false);
            cloudExtensionStub.isActive = false;
            getExtensionStub.withArgs('IBM.ibmcloud-account').returns(cloudExtensionStub);
            getCommandsStub.resetBehavior();
            getCommandsStub.returns(['ibmcloud-account.ping']);

            try {
                accessToken = await ExtensionsInteractionUtil.cloudAccountGetAccessToken();
            } catch (e) {
                chai.assert.isNull(e, 'there should not have been an error!');
            }
            accessToken.should.equal('some token');
            getExtensionStub.should.have.been.calledOnce;
            isLoggedInStub.should.have.been.calledOnce;
            accountSelectedStub.should.have.not.been.called;
            getAccessTokenStub.should.have.been.calledOnce;
            executeCommandStub.should.have.been.calledWithExactly('ibmcloud-account.ping');
            activateStub.should.not.have.been.called;
            selectAccountStub.should.have.not.been.called;
            loginStub.should.have.been.calledOnce;
        });

        it('should handle ibmcloud-account not activated when ping not available', async () => {
            chai.should().equal(undefined, accessToken);
            isLoggedInStub.onFirstCall().resolves(false);
            cloudExtensionStub.isActive = false;
            getExtensionStub.withArgs('IBM.ibmcloud-account').returns(cloudExtensionStub);
            getCommandsStub.resetBehavior();
            getCommandsStub.returns([]);

            try {
                accessToken = await ExtensionsInteractionUtil.cloudAccountGetAccessToken();
            } catch (e) {
                chai.assert.isNull(e, 'there should not have been an error!');
            }
            accessToken.should.equal('some token');
            getExtensionStub.should.have.been.calledOnce;
            isLoggedInStub.should.have.been.calledOnce;
            accountSelectedStub.should.have.not.been.called;
            getAccessTokenStub.should.have.been.calledOnce;
            executeCommandStub.should.not.have.been.calledWithExactly('ibmcloud-account.ping');
            activateStub.should.have.been.called;
            selectAccountStub.should.have.not.been.called;
            loginStub.should.have.been.calledOnce;
        });

        it('should throw if ibmcloud-account not installed', async () => {
            chai.should().equal(undefined, accessToken);
            getExtensionStub.withArgs('IBM.ibmcloud-account').returns(undefined);
            const expectedError: Error = new Error('IBM Cloud Account extension must be installed');

            try {
                accessToken = await ExtensionsInteractionUtil.cloudAccountGetAccessToken();
            } catch (e) {
                e.toString().should.deep.equal(expectedError.toString());
            }

            chai.should().equal(undefined, accessToken);
            getExtensionStub.should.have.been.calledOnce;
            isLoggedInStub.should.have.not.been.called;
            accountSelectedStub.should.have.not.been.called;
            getAccessTokenStub.should.have.not.been.called;
            activateStub.should.have.not.been.called;
            selectAccountStub.should.have.not.been.called;
            loginStub.should.have.not.been.called;
        });

        it('should throw if error returned from ibmcloud-account', async () => {
            chai.should().equal(undefined, accessToken);
            const error: Error = new Error('some error');
            getAccessTokenStub.rejects(error);

            try {
                accessToken = await ExtensionsInteractionUtil.cloudAccountGetAccessToken();
            } catch (e) {
                e.should.deep.equal(error);
            }
            chai.should().equal(undefined, accessToken);
            getExtensionStub.should.have.been.calledOnce;
            isLoggedInStub.should.have.been.calledOnce;
            accountSelectedStub.should.have.been.calledOnce;
            getAccessTokenStub.should.have.been.calledOnce;
            activateStub.should.have.not.been.called;
            selectAccountStub.should.have.not.been.called;
            loginStub.should.have.not.been.called;
        });

    });

    describe('#cloudAccountIsLoggedIn', () => {
        let isLoggedInStub: sinon.SinonStub;
        let activateStub: sinon.SinonStub;
        let cloudExtensionStub: any;
        let isLoggedIn: boolean;

        beforeEach(() => {
            isLoggedInStub = mySandBox.stub().resolves(true);
            activateStub = mySandBox.stub().resolves();
            cloudExtensionStub = {
                isActive: true,
                activate: activateStub,
                exports: {
                            loggedIn: isLoggedInStub,
                         }
            };
            getExtensionStub.withArgs('IBM.ibmcloud-account').returns(cloudExtensionStub);

            isLoggedIn = undefined;
        });

        it('should return login status', async () => {
            chai.should().equal(undefined, isLoggedIn);

            try {
                isLoggedIn = await ExtensionsInteractionUtil.cloudAccountIsLoggedIn();
            } catch (e) {
                chai.assert.isNull(e, 'there should not have been an error!');
            }
            isLoggedIn.should.be.true;
            getExtensionStub.should.have.been.calledOnce;
            isLoggedInStub.should.have.been.calledOnce;
            activateStub.should.not.have.been.called;
        });

        it('should activate cloud extension if not active', async () => {
            chai.should().equal(undefined, isLoggedIn);
            cloudExtensionStub.isActive = false;

            try {
                isLoggedIn = await ExtensionsInteractionUtil.cloudAccountIsLoggedIn();
            } catch (e) {
                chai.assert.isNull(e, 'there should not have been an error!');
            }
            isLoggedIn.should.be.true;
            getExtensionStub.should.have.been.calledOnce;
            isLoggedInStub.should.have.been.calledOnce;
            activateStub.should.have.been.called;
        });

        it('should error if no cloud extension', async () => {
            chai.should().equal(undefined, isLoggedIn);
            getExtensionStub.withArgs('IBM.ibmcloud-account').returns(undefined);
            const expectedError: Error = new Error('IBM Cloud Account extension must be installed');

            try {
                isLoggedIn = await ExtensionsInteractionUtil.cloudAccountIsLoggedIn();
            } catch (e) {
                e.toString().should.deep.equal(expectedError.toString());
            }

            chai.should().equal(undefined, isLoggedIn);
            getExtensionStub.should.have.been.calledOnce;
            isLoggedInStub.should.not.have.been.calledOnce;
            activateStub.should.not.have.been.called;
        });
    });

    describe('#cloudAccountHasSelectedAccount', () => {
        let hasAccountSelectedStub: sinon.SinonStub;
        let activateStub: sinon.SinonStub;
        let cloudExtensionStub: any;
        let hasAccountSelected: boolean;

        beforeEach(() => {
            hasAccountSelectedStub = mySandBox.stub().resolves(true);
            activateStub = mySandBox.stub().resolves();
            cloudExtensionStub = {
                isActive: true,
                activate: activateStub,
                exports: {
                            accountSelected: hasAccountSelectedStub,
                         }
            };
            getExtensionStub.withArgs('IBM.ibmcloud-account').returns(cloudExtensionStub);

            hasAccountSelected = undefined;
        });

        it('should return account selected status', async () => {
            chai.should().equal(undefined, hasAccountSelected);

            try {
                hasAccountSelected = await ExtensionsInteractionUtil.cloudAccountHasSelectedAccount();
            } catch (e) {
                chai.assert.isNull(e, 'there should not have been an error!');
            }
            hasAccountSelected.should.be.true;
            getExtensionStub.should.have.been.calledOnce;
            hasAccountSelectedStub.should.have.been.calledOnce;
            activateStub.should.not.have.been.called;
        });

        it('should activate cloud extension if not active', async () => {
            chai.should().equal(undefined, hasAccountSelected);
            cloudExtensionStub.isActive = false;

            try {
                hasAccountSelected = await ExtensionsInteractionUtil.cloudAccountHasSelectedAccount();
            } catch (e) {
                chai.assert.isNull(e, 'there should not have been an error!');
            }
            hasAccountSelected.should.be.true;
            getExtensionStub.should.have.been.calledOnce;
            hasAccountSelectedStub.should.have.been.calledOnce;
            activateStub.should.have.been.called;
        });

        it('should error if no cloud extension', async () => {
            chai.should().equal(undefined, hasAccountSelected);
            getExtensionStub.withArgs('IBM.ibmcloud-account').returns(undefined);
            const expectedError: Error = new Error('IBM Cloud Account extension must be installed');

            try {
                hasAccountSelected = await ExtensionsInteractionUtil.cloudAccountHasSelectedAccount();
            } catch (e) {
                e.toString().should.deep.equal(expectedError.toString());
            }

            chai.should().equal(undefined, hasAccountSelected);
            getExtensionStub.should.have.been.calledOnce;
            hasAccountSelectedStub.should.not.have.been.calledOnce;
            activateStub.should.not.have.been.called;
        });
    });

    describe('#cloudAccountAnyIbpResources', () => {
        let cloudAccountGetAccessTokenStub: sinon.SinonStub;
        let axiosGetStub: sinon.SinonStub;
        let logSpy: sinon.SinonSpy;
        let anyIbpResources: boolean;

        beforeEach(() => {
            cloudAccountGetAccessTokenStub = mySandBox.stub(ExtensionsInteractionUtil, 'cloudAccountGetAccessToken').resolves('some token');
            axiosGetStub = mySandBox.stub(Axios, 'get');
            logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
            anyIbpResources = undefined;
        });

        it('should return if there are any ibp resources', async () => {
            const resourceMockOne: any = {
                data: {
                    next_url: 'https://who.cares.url/',
                    resources: [{
                                    resource_plan_id: 'some-resource',
                                    name: 'myResource',
                                    guid: 'someGUID1',
                                    dashboard_url: 'https://some.dashboard.url1/some/path'
                                }]
                }
            };

            const resourceMockTwo: any = {
                data: {
                    next_url: null,
                    resources: [{
                                    resource_plan_id: 'blockchain-standard',
                                    name: 'myBlockchainPlatform',
                                    guid: 'someGUID1',
                                    dashboard_url: 'https://some.dashboard.url1/some/path'
                                }]
                }
            };

            axiosGetStub.onFirstCall().resolves(resourceMockOne);
            axiosGetStub.onSecondCall().resolves(resourceMockTwo);

            chai.should().equal(undefined, anyIbpResources);

            try {
                anyIbpResources = await ExtensionsInteractionUtil.cloudAccountAnyIbpResources();
            } catch (e) {
                chai.assert.isNull(e, 'there should not have been an error!');
            }

            anyIbpResources.should.be.true;
            cloudAccountGetAccessTokenStub.should.have.been.calledOnce;
            axiosGetStub.should.have.been.calledTwice;
            logSpy.should.not.have.been.called;
        });

        it('should return out if no access token', async () => {
            cloudAccountGetAccessTokenStub.resolves(undefined);

            chai.should().equal(undefined, anyIbpResources);

            try {
                anyIbpResources = await ExtensionsInteractionUtil.cloudAccountAnyIbpResources();
            } catch (e) {
                chai.assert.isNull(e, 'there should not have been an error!');
            }

            chai.should().equal(undefined, anyIbpResources);
            cloudAccountGetAccessTokenStub.should.have.been.calledOnce;
            axiosGetStub.should.not.have.been.called;
            logSpy.should.not.have.been.called;
        });

        it('should should handle error when fetching resources', async () => {
            const error: Error = new Error('computer says no');
            axiosGetStub.rejects(error);

            chai.should().equal(undefined, anyIbpResources);

            try {
                anyIbpResources = await ExtensionsInteractionUtil.cloudAccountAnyIbpResources();
            } catch (e) {
                chai.assert.isNull(e, 'there should not have been an error!');
            }

            anyIbpResources.should.be.false;
            cloudAccountGetAccessTokenStub.should.have.been.calledOnce;
            axiosGetStub.should.have.been.calledOnce;
            logSpy.should.have.been.calledOnceWithExactly(LogType.ERROR, `Error fetching IBP resources: ${error.message}`, `Error fetching IBP resources: ${error.toString()}`);
        });
    });

    describe('#cloudAccountGetIbpResources', () => {
        let cloudAccountGetAccessTokenStub: sinon.SinonStub;
        let axiosGetStub: sinon.SinonStub;
        let logSpy: sinon.SinonSpy;
        let ibpResources: any;

        beforeEach(() => {
            cloudAccountGetAccessTokenStub = mySandBox.stub(ExtensionsInteractionUtil, 'cloudAccountGetAccessToken').resolves('some token');
            axiosGetStub = mySandBox.stub(Axios, 'get');
            logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
            ibpResources = undefined;
        });

        it('should return ibp resources', async () => {
            const resourceMockOne: any = {
                data: {
                    next_url: 'https://who.cares.url/',
                    resources: [{
                                    resource_plan_id: 'some-resource',
                                    name: 'myResource',
                                    guid: 'someGUID1',
                                    dashboard_url: 'https://some.dashboard.url1/some/path'
                                }]
                }
            };

            const resourceMockTwo: any = {
                data: {
                    next_url: null,
                    resources: [{
                                    resource_plan_id: 'blockchain-standard',
                                    name: 'myBlockchainPlatform',
                                    guid: 'someGUID1',
                                    dashboard_url: 'https://some.dashboard.url1/some/path'
                                }]
                }
            };

            axiosGetStub.onFirstCall().resolves(resourceMockOne);
            axiosGetStub.onSecondCall().resolves(resourceMockTwo);

            chai.should().equal(undefined, ibpResources);

            try {
                ibpResources = await ExtensionsInteractionUtil.cloudAccountGetIbpResources();
            } catch (e) {
                chai.assert.isNull(e, 'there should not have been an error!');
            }

            ibpResources.should.deep.equal(resourceMockTwo.data.resources);
            cloudAccountGetAccessTokenStub.should.have.been.calledOnce;
            axiosGetStub.should.have.been.calledTwice;
            logSpy.should.not.have.been.called;
        });

        it('should return out if no access token', async () => {
            cloudAccountGetAccessTokenStub.resolves(undefined);

            chai.should().equal(undefined, ibpResources);

            try {
                ibpResources = await ExtensionsInteractionUtil.cloudAccountGetIbpResources();
            } catch (e) {
                chai.assert.isNull(e, 'there should not have been an error!');
            }

            chai.should().equal(undefined, ibpResources);
            cloudAccountGetAccessTokenStub.should.have.been.calledOnce;
            axiosGetStub.should.not.have.been.called;
            logSpy.should.not.have.been.called;
        });

        it('should should handle error when fetching resources', async () => {
            const error: Error = new Error('computer says no');
            axiosGetStub.rejects(error);

            chai.should().equal(undefined, ibpResources);

            try {
                ibpResources = await ExtensionsInteractionUtil.cloudAccountGetIbpResources();
            } catch (e) {
                chai.assert.isNull(e, 'there should not have been an error!');
            }

            ibpResources.should.deep.equal([]);
            cloudAccountGetAccessTokenStub.should.have.been.calledOnce;
            axiosGetStub.should.have.been.calledOnce;
            logSpy.should.have.been.calledOnceWithExactly(LogType.ERROR, `Error fetching IBP resources: ${error.message}`, `Error fetching IBP resources: ${error.toString()}`);
        });
    });

    describe('#cloudAccountGetApiEndpoint', () => {
        let axiosGetStub: sinon.SinonStub;
        let logSpy: sinon.SinonSpy;
        let apiEndpoint: any;
        let mockIbpInstance: any;
        let consoleStatusMock: any;
        let originalSaaSName: string;
        let urlSaaS: string;

        beforeEach(() => {
            axiosGetStub = mySandBox.stub(Axios, 'get');
            logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
            apiEndpoint = undefined;

            urlSaaS = 'https://my.SaaS.OpsTool.url';
            originalSaaSName = 'myBlockchainPlatform';
            mockIbpInstance = {
                resource_plan_id: 'blockchain-standard',
                name: originalSaaSName,
                guid: 'someGUID1',
                dashboard_url: 'https://some.dashboard.url1/some/path'
            };
            consoleStatusMock = {
                status: 200,
                data: {
                    endpoint: urlSaaS
                }
            };
        });

        it('should return an api endpoint', async () => {
            chai.should().equal(undefined, apiEndpoint);
            axiosGetStub.resolves(consoleStatusMock);

            try {
                apiEndpoint = await ExtensionsInteractionUtil.cloudAccountGetApiEndpoint(mockIbpInstance, 'some token');
            } catch (e) {
                chai.assert.isNull(e, 'there should not have been an error!');
            }

            apiEndpoint.should.deep.equal(consoleStatusMock.data.endpoint);
            logSpy.should.not.have.been.called;
        });

        it('should throw error if bad status', async () => {
            const consoleErrorMessage: string = `Got status 500. Please make sure the IBM Blockchain Platform Console deployment has finished before adding environment.`;

            axiosGetStub.onFirstCall().resolves({
                status: 500
            });

            chai.should().equal(undefined, apiEndpoint);
            axiosGetStub.resolves(consoleStatusMock);

            try {
                apiEndpoint = await ExtensionsInteractionUtil.cloudAccountGetApiEndpoint(mockIbpInstance, 'some token');
            } catch (e) {
                e.message.should.equal(consoleErrorMessage);
            }

            chai.should().equal(undefined, apiEndpoint);
        });
    });

});
