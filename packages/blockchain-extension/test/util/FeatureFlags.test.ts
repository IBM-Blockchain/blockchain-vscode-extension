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

import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { SettingConfigurations } from '../../extension/configurations';
import { FeatureFlagManager, FeatureFlag } from '../../extension/util/FeatureFlags';

chai.should();
chai.use(chaiAsPromised);

describe('FeatureFlag', () => {

    describe('#getName', () => {

        it('should return the name', () => {
            FeatureFlagManager.EXPORTAPPDATA.getName().should.equal('exportAppData');
        });

    });

    describe('#getDescription', () => {

        it('should return the description', () => {
            FeatureFlagManager.EXPORTAPPDATA.getDescription().should.equal('Export application data for the IBM Cloud Pak for Apps Blockchain Accelerator');
        });

    });

    describe('#getContext', () => {

        it('should return the context', () => {
            FeatureFlagManager.EXPORTAPPDATA.getContext().should.equal(true);
        });
    });

});

describe('FeatureFlags', () => {
    let mySandBox: sinon.SinonSandbox;
    let executeCommandSpy: sinon.SinonSpy;
    let getSettingsStub: sinon.SinonStub;
    let getConfigurationStub: sinon.SinonStub;

    async function get(): Promise<object> {
        const configuration: vscode.WorkspaceConfiguration = await vscode.workspace.getConfiguration();
        return configuration.get(SettingConfigurations.FEATURE_FLAGS);
    }

    async function set(featureFlags: object): Promise<void> {
        const configuration: vscode.WorkspaceConfiguration = await vscode.workspace.getConfiguration();
        await configuration.update(SettingConfigurations.FEATURE_FLAGS, featureFlags, vscode.ConfigurationTarget.Global);
    }

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
        executeCommandSpy = mySandBox.spy(vscode.commands, 'executeCommand');
        await set({});
    });

    afterEach(async () => {
        mySandBox.restore();
        await set({});
    });

    describe('#enable', () => {

        it('should enable a feature flag', async () => {
            const noContextFlag: FeatureFlag = new FeatureFlag('noContextFlag', 'My fake flag description', false);
            await FeatureFlagManager.enable(noContextFlag);
            get().should.eventually.deep.equal({
                noContextFlag: true
            });
        });

        it('should set a context to true when a feature flag with contextFlag is enabled', async () => {
            await FeatureFlagManager.enable(FeatureFlagManager.EXPORTAPPDATA);
            get().should.eventually.deep.equal({
                exportAppData: true
            });
            executeCommandSpy.should.have.been.calledWithExactly('setContext', 'exportAppData', true);
        });

    });

    describe('#disable', () => {

        it('should disable a feature flag', async () => {
            const noContextFlag: FeatureFlag = new FeatureFlag('noContextFlag', 'My fake flag description', false);
            await FeatureFlagManager.disable(noContextFlag);
            get().should.eventually.deep.equal({
                noContextFlag: false
            });
        });

        it('should set a context to false when a feature flag with contextFlag is enabled', async () => {
            await FeatureFlagManager.disable(FeatureFlagManager.EXPORTAPPDATA);
            get().should.eventually.deep.equal({
                exportAppData: false
            });
            executeCommandSpy.should.have.been.calledWithExactly('setContext', 'exportAppData', false);
        });

    });

    describe('#enabled', () => {

        it('should return true for an enabled feature flag', async () => {
            await set({
                exportAppData: true
            });
            await FeatureFlagManager.enabled(FeatureFlagManager.EXPORTAPPDATA).should.eventually.be.true;
        });

        it('should return false for an disabled feature flag', async () => {
            await set({
                exportAppData: false
            });
            await FeatureFlagManager.enabled(FeatureFlagManager.EXPORTAPPDATA).should.eventually.be.false;
        });

        it('should return false for a missing feature flag', async () => {
            await FeatureFlagManager.enabled(FeatureFlagManager.EXPORTAPPDATA).should.eventually.be.false;
        });

    });

    describe('#disabled', () => {

        it('should return true for an disabled feature flag', async () => {
            await set({
                exportAppData: false
            });
            await FeatureFlagManager.disabled(FeatureFlagManager.EXPORTAPPDATA).should.eventually.be.true;
        });

        it('should return true for a missing feature flag', async () => {
            await FeatureFlagManager.disabled(FeatureFlagManager.EXPORTAPPDATA).should.eventually.be.true;
        });

        it('should return false for an enabled feature flag', async () => {
            await set({
                exportAppData: true
            });
            await FeatureFlagManager.disabled(FeatureFlagManager.EXPORTAPPDATA).should.eventually.be.false;
        });

    });

    describe('#get', () => {

        beforeEach(async () => {
            getSettingsStub = mySandBox.stub();
            getSettingsStub.withArgs(SettingConfigurations.FEATURE_FLAGS).returns({
                exportAppData: false
            });

            getConfigurationStub = mySandBox.stub(vscode.workspace, 'getConfiguration');
            getConfigurationStub.returns({
                get: getSettingsStub,
                update: mySandBox.stub().callThrough()
            });
        });

        it('should get all feature flags from the settings configuration', async () => {
            await FeatureFlagManager.get().should.eventually.deep.equal({
                exportAppData: false
            });
        });
    });

});
