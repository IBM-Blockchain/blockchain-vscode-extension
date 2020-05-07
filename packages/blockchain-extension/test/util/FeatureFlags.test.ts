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
import { SettingConfigurations } from '../../extension/configurations';
import { FeatureFlagManager } from '../../extension/util/FeatureFlags';

chai.should();
chai.use(chaiAsPromised);

describe('FeatureFlag', () => {

    describe('#getName', () => {

        it('should return the name', () => {
            FeatureFlagManager.FABLET.getName().should.equal('fablet');
        });

    });

    describe('#getDescription', () => {

        it('should return the description', () => {
            FeatureFlagManager.FABLET.getDescription().should.equal('Enable connectivity to a Fablet instance');
        });

    });

});

describe('FeatureFlags', () => {

    async function get(): Promise<object> {
        const configuration: vscode.WorkspaceConfiguration = await vscode.workspace.getConfiguration();
        return configuration.get(SettingConfigurations.FEATURE_FLAGS);
    }

    async function set(featureFlags: object): Promise<void> {
        const configuration: vscode.WorkspaceConfiguration = await vscode.workspace.getConfiguration();
        await configuration.update(SettingConfigurations.FEATURE_FLAGS, featureFlags, vscode.ConfigurationTarget.Global);
    }

    beforeEach(async () => {
        await set({});
    });

    afterEach(async () => {
        await set({});
    });

    describe('#enable', () => {

        it('should enable a feature flag', async () => {
            await FeatureFlagManager.enable(FeatureFlagManager.FABLET);
            get().should.eventually.deep.equal({
                fablet: true
            });
        });

    });

    describe('#disable', () => {

        it('should enable a feature flag', async () => {
            await FeatureFlagManager.disable(FeatureFlagManager.FABLET);
            get().should.eventually.deep.equal({
                fablet: false
            });
        });

    });

    describe('#enabled', () => {

        it('should return true for an enabled feature flag', async () => {
            await set({
                fablet: true
            });
            await FeatureFlagManager.enabled(FeatureFlagManager.FABLET).should.eventually.be.true;
        });

        it('should return false for an disabled feature flag', async () => {
            await set({
                fablet: false
            });
            await FeatureFlagManager.enabled(FeatureFlagManager.FABLET).should.eventually.be.false;
        });

        it('should return false for a missing feature flag', async () => {
            await FeatureFlagManager.enabled(FeatureFlagManager.FABLET).should.eventually.be.false;
        });

    });

    describe('#disabled', () => {

        it('should return true for an disabled feature flag', async () => {
            await set({
                fablet: false
            });
            await FeatureFlagManager.disabled(FeatureFlagManager.FABLET).should.eventually.be.true;
        });

        it('should return true for a missing feature flag', async () => {
            await FeatureFlagManager.disabled(FeatureFlagManager.FABLET).should.eventually.be.true;
        });

        it('should return false for an enabled feature flag', async () => {
            await set({
                fablet: true
            });
            await FeatureFlagManager.disabled(FeatureFlagManager.FABLET).should.eventually.be.false;
        });

    });

});
