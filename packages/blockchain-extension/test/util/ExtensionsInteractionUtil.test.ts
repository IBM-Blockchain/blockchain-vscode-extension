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
import { ExtensionsInteractionUtil } from '../../extension/util/ExtensionsInteractionUtil';

// tslint:disable no-unused-expression
chai.use(sinonChai);

describe('ExtensionsInteractionUtil Test', () => {

    let mySandBox: sinon.SinonSandbox;
    let executeCommandStub: sinon.SinonStub;
    let getExtensionStub: sinon.SinonStub;

    before(async () => {
        mySandBox = sinon.createSandbox();
    });

    beforeEach(() => {
        executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand').callThrough();
        getExtensionStub = mySandBox.stub(vscode.extensions, 'getExtension').callThrough();
    });

    afterEach(() => {
        mySandBox.restore();
    });

    describe('#cloudAccountGetAccessToken', () => {
        let loginStub: sinon.SinonStub;
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

        it('should handle ibmcloud-account not activated', async () => {
            chai.should().equal(undefined, accessToken);
            isLoggedInStub.onFirstCall().resolves(false);
            cloudExtensionStub.isActive = false;
            getExtensionStub.withArgs('IBM.ibmcloud-account').returns(cloudExtensionStub);

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

});
