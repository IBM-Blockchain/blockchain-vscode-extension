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
import * as myExtension from '../../src/extension';

import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { ExtensionUtil } from '../../src/util/ExtensionUtil';
import { TestUtil } from '../TestUtil';
import { TemporaryCommandRegistry } from '../../src/dependencies/TemporaryCommandRegistry';

chai.should();
chai.use(sinonChai);

// tslint:disable no-unused-expression
describe('TemporaryCommandRegistry Tests', () => {

    let mySandBox;

    before(async () => {
        await TestUtil.setupTests();
    });

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();

        if (ExtensionUtil.isActive()) {
            myExtension.deactivate();
        }
    });

    afterEach(() => {
        mySandBox.restore();
    });

    it('should delay execution of commands until after commands have been restored', async () => {
        const commandStub = mySandBox.spy(vscode.commands, 'executeCommand');
        const tempRegistry = TemporaryCommandRegistry.instance();

        const context = ExtensionUtil.getExtensionContext();

        tempRegistry.createTempCommands();

        await vscode.commands.executeCommand('blockchainExplorer.refreshEntry');

        tempRegistry.restoreCommands();
        await myExtension.registerCommands(context);
        await tempRegistry.executeStoredCommands();

        commandStub.should.have.been.calledTwice;
    });
});
