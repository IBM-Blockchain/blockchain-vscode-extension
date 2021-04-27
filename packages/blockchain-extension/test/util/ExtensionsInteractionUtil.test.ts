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
import { DependencyProperties } from '../../extension/dependencies/Dependencies';

// tslint:disable no-unused-expression
chai.use(sinonChai);

describe.only('ExtensionsInteractionUtil Test', () => {

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

    describe('#isIBMCloudExtensionInstalled', () => {
        let cloudExtensionStub: any;

        beforeEach(() => {
            cloudExtensionStub = {
            isActive: true,
            activate: mySandBox.stub(),
            exports: {
                        loggedIn: mySandBox.stub(),
                        accountSelected: mySandBox.stub(),
                        getAccessToken: mySandBox.stub()
                     }
            };
            getExtensionStub.withArgs(DependencyProperties.IBM_CLOUD_ACCOUNT_EXTENSION).returns(cloudExtensionStub);
        });

        it('returns true if installed', () => {
            ExtensionsInteractionUtil.isIBMCloudExtensionInstalled().should.equal(true);
        });

        it('returns false if not installed', () => {
            getExtensionStub.withArgs(DependencyProperties.IBM_CLOUD_ACCOUNT_EXTENSION).returns(undefined);
            ExtensionsInteractionUtil.isIBMCloudExtensionInstalled().should.equal(false);
        });
    });

    describe('#getIBMCloudExtension', () => {
        let pingStub: sinon.SinonStub;
        let activateStub: sinon.SinonStub;
        let cloudExtensionStub: any;
        let cloudAccount: any;

        beforeEach(() => {
            activateStub = mySandBox.stub().resolves();
            cloudExtensionStub = {
                isActive: true,
                activate: activateStub,
                exports: {
                            loggedIn: mySandBox.stub(),
                            accountSelected: mySandBox.stub(),
                            getAccessToken: mySandBox.stub()
                         }
            };
            getExtensionStub.withArgs(DependencyProperties.IBM_CLOUD_ACCOUNT_EXTENSION).returns(cloudExtensionStub);

            pingStub = executeCommandStub.withArgs('ibmcloud-account.ping');
            pingStub.resolves();
            cloudAccount = undefined;
        });

        it('should return the ibm cloud extension', async () => {
            chai.should().equal(undefined, cloudAccount);

            try {
                cloudAccount = await ExtensionsInteractionUtil.getIBMCloudExtension();
            } catch (e) {
                chai.assert.isNull(e, 'there should not have been an error!');
            }

            cloudAccount.should.equal(cloudExtensionStub.exports);
            getExtensionStub.should.have.been.calledOnce;
            activateStub.should.not.have.been.called;
        });

        it('should throw an error if the ibm cloud extension is not installed', async () => {
            chai.should().equal(undefined, cloudAccount);
            getExtensionStub.withArgs(DependencyProperties.IBM_CLOUD_ACCOUNT_EXTENSION).returns(undefined);
            const expectedError: Error = new Error('IBM Cloud Account extension must be installed');

            try {
                cloudAccount = await ExtensionsInteractionUtil.getIBMCloudExtension();
            } catch (e) {
                e.toString().should.deep.equal(expectedError.toString());
            }

            chai.should().equal(undefined, cloudAccount);
            getExtensionStub.should.have.been.calledOnce;
            activateStub.should.not.have.been.called;
        });

        it('should handle ibmcloud-account not activated when ping is available', async () => {
            chai.should().equal(undefined, cloudAccount);
            cloudExtensionStub.isActive = false;
            getExtensionStub.withArgs(DependencyProperties.IBM_CLOUD_ACCOUNT_EXTENSION).returns(cloudExtensionStub);
            getCommandsStub.resetBehavior();
            getCommandsStub.returns(['ibmcloud-account.ping']);

            try {
                cloudAccount = await ExtensionsInteractionUtil.getIBMCloudExtension();
            } catch (e) {
                chai.assert.isNull(e, 'there should not have been an error!');
            }

            cloudAccount.should.equal(cloudExtensionStub.exports);
            getExtensionStub.should.have.been.calledOnce;
            executeCommandStub.should.have.been.calledWithExactly('ibmcloud-account.ping');
            activateStub.should.not.have.been.called;
        });

        it('should handle ibmcloud-account not activated when ping not available', async () => {
            chai.should().equal(undefined, cloudAccount);
            cloudExtensionStub.isActive = false;
            getExtensionStub.withArgs(DependencyProperties.IBM_CLOUD_ACCOUNT_EXTENSION).returns(cloudExtensionStub);
            getCommandsStub.resetBehavior();
            getCommandsStub.returns([]);

            try {
                cloudAccount = await ExtensionsInteractionUtil.getIBMCloudExtension();
            } catch (e) {
                chai.assert.isNull(e, 'there should not have been an error!');
            }

            cloudAccount.should.equal(cloudExtensionStub.exports);
            getExtensionStub.should.have.been.calledOnce;
            executeCommandStub.should.not.have.been.calledWithExactly('ibmcloud-account.ping');
            activateStub.should.have.been.called;
        });
    });

    describe('#cloudAccoutEnsureLoggedIn', () => {
        let loginStub: sinon.SinonStub;
        let pingStub: sinon.SinonStub;
        let selectAccountStub: sinon.SinonStub;
        let isLoggedInStub: sinon.SinonStub;
        let accountSelectedStub: sinon.SinonStub;
        let activateStub: sinon.SinonStub;
        let cloudExtensionStub: any;
        let definitielyLoggedIn: boolean;

        beforeEach(() => {
            isLoggedInStub = mySandBox.stub().resolves(true);
            accountSelectedStub = mySandBox.stub().resolves(true);
            activateStub = mySandBox.stub().resolves();
            cloudExtensionStub = {
                isActive: true,
                activate: activateStub,
                loggedIn: isLoggedInStub,
                accountSelected: accountSelectedStub,
            };

            selectAccountStub = executeCommandStub.withArgs('ibmcloud-account.selectAccount');
            selectAccountStub.resolves(true);
            loginStub = executeCommandStub.withArgs('ibmcloud-account.login');
            loginStub.resolves(true);
            pingStub = executeCommandStub.withArgs('ibmcloud-account.ping');
            pingStub.resolves();
            definitielyLoggedIn = undefined;
        });

        it('should get log in if not logged in already and return true', async () => {
            chai.should().equal(undefined, definitielyLoggedIn);
            isLoggedInStub.onFirstCall().resolves(false);

            try {
                definitielyLoggedIn = await ExtensionsInteractionUtil.cloudAccountEnsureLoggedIn(cloudExtensionStub);
            } catch (e) {
                chai.assert.isNull(e, 'there should not have been an error!');
            }
            definitielyLoggedIn.should.equal(true);
            isLoggedInStub.should.have.been.calledOnce;
            accountSelectedStub.should.have.not.been.called;
            activateStub.should.have.not.been.called;
            selectAccountStub.should.have.not.been.called;
            loginStub.should.have.been.called;
        });

        it('should select an account when logged in and return true', async () => {
            chai.should().equal(undefined, definitielyLoggedIn);
            accountSelectedStub.onFirstCall().resolves(false);

            try {
                definitielyLoggedIn = await ExtensionsInteractionUtil.cloudAccountEnsureLoggedIn(cloudExtensionStub);
            } catch (e) {
                chai.assert.isNull(e, 'there should not have been an error!');
            }
            definitielyLoggedIn.should.equal(true);
            isLoggedInStub.should.have.been.calledOnce;
            accountSelectedStub.should.have.been.calledOnce;
            activateStub.should.have.not.been.called;
            selectAccountStub.should.have.been.called;
            loginStub.should.have.not.been.called;
        });

        it('should return true when already logged in and account selected', async () => {
            chai.should().equal(undefined, definitielyLoggedIn);

            try {
                definitielyLoggedIn = await ExtensionsInteractionUtil.cloudAccountEnsureLoggedIn(cloudExtensionStub);
            } catch (e) {
                chai.assert.isNull(e, 'there should not have been an error!');
            }
            definitielyLoggedIn.should.equal(true);
            isLoggedInStub.should.have.been.calledOnce;
            accountSelectedStub.should.have.been.calledOnce;
            activateStub.should.have.not.been.called;
            selectAccountStub.should.have.not.been.called;
            loginStub.should.have.not.been.called;
        });

        it('should handle user not logging in and return false', async () => {
            chai.should().equal(undefined, definitielyLoggedIn);
            isLoggedInStub.onFirstCall().resolves(false);
            loginStub.resolves(false);

            try {
                definitielyLoggedIn = await ExtensionsInteractionUtil.cloudAccountEnsureLoggedIn(cloudExtensionStub);
            } catch (e) {
                chai.assert.isNull(e, 'there should not have been an error!');
            }
            definitielyLoggedIn.should.equal(false);
            isLoggedInStub.should.have.been.calledOnce;
            accountSelectedStub.should.have.not.been.called;
            activateStub.should.have.not.been.called;
            selectAccountStub.should.have.not.been.called;
            loginStub.should.have.been.called;
        });

        it('should return false without asking for user input if user not logged in and userInteraction is false ', async () => {
            chai.should().equal(undefined, definitielyLoggedIn);
            isLoggedInStub.onFirstCall().resolves(false);

            try {
                definitielyLoggedIn = await ExtensionsInteractionUtil.cloudAccountEnsureLoggedIn(cloudExtensionStub, false);
            } catch (e) {
                chai.assert.isNull(e, 'there should not have been an error!');
            }
            definitielyLoggedIn.should.equal(false);
            isLoggedInStub.should.have.been.calledOnce;
            accountSelectedStub.should.have.not.been.called;
            activateStub.should.have.not.been.called;
            selectAccountStub.should.have.not.been.called;
            loginStub.should.have.not.been.called;
        });

        it('should handle user not selecting account and return false', async () => {
            chai.should().equal(undefined, definitielyLoggedIn);
            accountSelectedStub.onFirstCall().resolves(false);
            selectAccountStub.resolves(false);

            try {
                definitielyLoggedIn = await ExtensionsInteractionUtil.cloudAccountEnsureLoggedIn(cloudExtensionStub);
            } catch (e) {
                chai.assert.isNull(e, 'there should not have been an error!');
            }
            definitielyLoggedIn.should.equal(false);
            isLoggedInStub.should.have.been.calledOnce;
            accountSelectedStub.should.have.been.calledOnce;
            activateStub.should.have.not.been.called;
            selectAccountStub.should.have.been.called;
            loginStub.should.have.not.been.called;
        });

        it('should return false without asking for user input if no account selected and userInteraction is false ', async () => {
            chai.should().equal(undefined, definitielyLoggedIn);
            accountSelectedStub.onFirstCall().resolves(false);

            try {
                definitielyLoggedIn = await ExtensionsInteractionUtil.cloudAccountEnsureLoggedIn(cloudExtensionStub, false);
            } catch (e) {
                chai.assert.isNull(e, 'there should not have been an error!');
            }
            definitielyLoggedIn.should.equal(false);
            isLoggedInStub.should.have.been.calledOnce;
            accountSelectedStub.should.have.been.calledOnce;
            activateStub.should.have.not.been.called;
            selectAccountStub.should.have.not.been.called;
            loginStub.should.have.not.been.called;
        });
    });

    describe('#cloudAccountGetAccessToken', () => {
        let getAccessTokenStub: sinon.SinonStub;
        let ensureLoggedInStub: sinon.SinonStub;
        let cloudExtensionStub: any;
        let accessToken: string;

        beforeEach(() => {
            getAccessTokenStub = mySandBox.stub().resolves('some token');
            cloudExtensionStub = {
                isActive: true,
                exports: {
                   getAccessToken: getAccessTokenStub
                }
            };
            getExtensionStub.withArgs(DependencyProperties.IBM_CLOUD_ACCOUNT_EXTENSION).returns(cloudExtensionStub);
            ensureLoggedInStub = mySandBox.stub(ExtensionsInteractionUtil, 'cloudAccountEnsureLoggedIn');
            accessToken = undefined;
        });

        it('should get access token after ensuring the user is logged in', async () => {
            chai.should().equal(undefined, accessToken);
            ensureLoggedInStub.resolves(true);

            try {
                accessToken = await ExtensionsInteractionUtil.cloudAccountGetAccessToken();
            } catch (e) {
                chai.assert.isNull(e, 'there should not have been an error!');
            }
            accessToken.should.equal('some token');
            ensureLoggedInStub.should.have.been.calledOnce;
            getAccessTokenStub.should.have.been.calledOnce;
        });

        it('should not get access token if the user is definitely not logged in', async () => {
            chai.should().equal(undefined, accessToken);
            ensureLoggedInStub.resolves(false);

            try {
                accessToken = await ExtensionsInteractionUtil.cloudAccountGetAccessToken();
            } catch (e) {
                chai.assert.isNull(e, 'there should not have been an error!');
            }
            chai.should().equal(undefined, accessToken);
            ensureLoggedInStub.should.have.been.calledOnce;
            getAccessTokenStub.should.not.have.been.called;
        });

    });

    describe('#cloudAccountGetRefreshToken', () => {
        let getRefreshTokenStub: sinon.SinonStub;
        let ensureLoggedInStub: sinon.SinonStub;
        let cloudExtensionStub: any;
        let refreshToken: string;

        beforeEach(() => {
            getRefreshTokenStub = mySandBox.stub().resolves('some token');
            cloudExtensionStub = {
                isActive: true,
                exports: {
                   getRefreshToken: getRefreshTokenStub
                }
            };
            getExtensionStub.withArgs(DependencyProperties.IBM_CLOUD_ACCOUNT_EXTENSION).returns(cloudExtensionStub);
            ensureLoggedInStub = mySandBox.stub(ExtensionsInteractionUtil, 'cloudAccountEnsureLoggedIn');
            refreshToken = undefined;
        });

        it('should get refresh token after ensuring the user is logged in', async () => {
            chai.should().equal(undefined, refreshToken);
            ensureLoggedInStub.resolves(true);

            try {
                refreshToken = await ExtensionsInteractionUtil.cloudAccountGetRefreshToken();
            } catch (e) {
                chai.assert.isNull(e, 'there should not have been an error!');
            }
            refreshToken.should.equal('some token');
            ensureLoggedInStub.should.have.been.calledOnce;
            getRefreshTokenStub.should.have.been.calledOnce;
        });

        it('should not get refresh token if the user is definitely not logged in', async () => {
            chai.should().equal(undefined, refreshToken);
            ensureLoggedInStub.resolves(false);

            try {
                refreshToken = await ExtensionsInteractionUtil.cloudAccountGetRefreshToken();
            } catch (e) {
                chai.assert.isNull(e, 'there should not have been an error!');
            }
            chai.should().equal(undefined, refreshToken);
            ensureLoggedInStub.should.have.been.calledOnce;
            getRefreshTokenStub.should.not.have.been.called;
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
            getExtensionStub.withArgs(DependencyProperties.IBM_CLOUD_ACCOUNT_EXTENSION).returns(cloudExtensionStub);

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
            getExtensionStub.withArgs(DependencyProperties.IBM_CLOUD_ACCOUNT_EXTENSION).returns(undefined);
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
            getExtensionStub.withArgs(DependencyProperties.IBM_CLOUD_ACCOUNT_EXTENSION).returns(cloudExtensionStub);

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
            getExtensionStub.withArgs(DependencyProperties.IBM_CLOUD_ACCOUNT_EXTENSION).returns(undefined);
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

        it('should retry with additional header after error', async () => {
            chai.should().equal(undefined, apiEndpoint);
            axiosGetStub.resolves(consoleStatusMock);
            axiosGetStub.onFirstCall().rejects();
            mySandBox.stub(ExtensionsInteractionUtil, 'cloudAccountGetRefreshToken').resolves('some token');

            try {
                apiEndpoint = await ExtensionsInteractionUtil.cloudAccountGetApiEndpoint(mockIbpInstance, 'some token');
            } catch (e) {
                chai.assert.isNull(e, 'there should not have been an error!');
            }

            apiEndpoint.should.deep.equal(consoleStatusMock.data.endpoint);
            logSpy.should.not.have.been.called;
        });
    });

});
