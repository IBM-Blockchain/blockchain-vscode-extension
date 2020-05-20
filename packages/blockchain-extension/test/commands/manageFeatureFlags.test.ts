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

// tslint:disable no-unused-expression

import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as vscode from 'vscode';
import { FeatureFlagManager, IFeatureFlag } from '../../extension/util/FeatureFlags';
import { TestUtil } from '../TestUtil';
import { ExtensionCommands } from '../../ExtensionCommands';
import { UserInputUtil } from '../../extension/commands/UserInputUtil';

chai.should();
chai.use(chaiAsPromised);
chai.use(sinonChai);

const FAKE_FEATURE: IFeatureFlag = {
    getName: (): string => 'fake',
    getDescription: (): string => 'some fake description',
    getContext: (): boolean => false
};

describe('manageFeatureFlags', () => {

    const sandbox: sinon.SinonSandbox = sinon.createSandbox();

    let showQuickPickItemStub: sinon.SinonStub;
    let enableStub: sinon.SinonStub;
    let disableStub: sinon.SinonStub;
    let enabledStub: sinon.SinonStub;

    before(async () => {
        await TestUtil.setupTests(sandbox);
    });

    beforeEach(() => {
        showQuickPickItemStub = sandbox.stub(UserInputUtil, 'showQuickPickItem').resolves(undefined);
        enableStub = sandbox.stub(FeatureFlagManager, 'enable').resolves();
        disableStub = sandbox.stub(FeatureFlagManager, 'disable').resolves();
        enabledStub = sandbox.stub(FeatureFlagManager, 'enabled').resolves(false);
        sandbox.stub(FeatureFlagManager, 'ALL').value([
            FeatureFlagManager.MICROFAB,
            FAKE_FEATURE
        ]);
    });

    afterEach(() => {
        sandbox.restore();
    });

    it('should handle the user cancelling', async () => {
        await vscode.commands.executeCommand(ExtensionCommands.MANAGE_FEATURE_FLAGS);
        showQuickPickItemStub.should.have.been.calledOnceWithExactly('Enable or disable experimental features', [{
            data: FeatureFlagManager.MICROFAB,
            label: FeatureFlagManager.MICROFAB.getName(),
            description: FeatureFlagManager.MICROFAB.getDescription(),
            picked: false
        }, {
            data: FAKE_FEATURE,
            label: FAKE_FEATURE.getName(),
            description: FAKE_FEATURE.getDescription(),
            picked: false
        }], true);
        enableStub.should.not.have.been.called;
        disableStub.should.not.have.been.called;
    });

    it('should mark any enabled flags as picked', async () => {
        enabledStub.withArgs(FeatureFlagManager.MICROFAB).resolves(true);
        await vscode.commands.executeCommand(ExtensionCommands.MANAGE_FEATURE_FLAGS);
        showQuickPickItemStub.should.have.been.calledOnceWithExactly('Enable or disable experimental features', [{
            data: FeatureFlagManager.MICROFAB,
            label: FeatureFlagManager.MICROFAB.getName(),
            description: FeatureFlagManager.MICROFAB.getDescription(),
            picked: true
        }, {
            data: FAKE_FEATURE,
            label: FAKE_FEATURE.getName(),
            description: FAKE_FEATURE.getDescription(),
            picked: false
        }], true);
        enableStub.should.not.have.been.called;
        disableStub.should.not.have.been.called;
    });

    it('should handle the user enabling a flag', async () => {
        showQuickPickItemStub.resolves([{
            data: FeatureFlagManager.MICROFAB,
            label: FeatureFlagManager.MICROFAB.getName(),
            description: FeatureFlagManager.MICROFAB.getDescription()
        }]);
        await vscode.commands.executeCommand(ExtensionCommands.MANAGE_FEATURE_FLAGS);
        enableStub.should.have.been.calledOnceWithExactly(FeatureFlagManager.MICROFAB);
        disableStub.should.have.been.calledOnceWithExactly(FAKE_FEATURE);
    });

    it('should handle the user disabling a flag', async () => {
        showQuickPickItemStub.resolves([]);
        await vscode.commands.executeCommand(ExtensionCommands.MANAGE_FEATURE_FLAGS);
        enableStub.should.not.have.been.called;
        disableStub.should.have.been.calledTwice;
        disableStub.should.have.been.calledWithExactly(FeatureFlagManager.MICROFAB);
        disableStub.should.have.been.calledWithExactly(FAKE_FEATURE);
    });

});
