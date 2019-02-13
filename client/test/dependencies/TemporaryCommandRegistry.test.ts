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
import { ExtensionCommands } from '../../ExtensionCommands';

chai.should();
chai.use(sinonChai);

// tslint:disable no-unused-expression
describe('TemporaryCommandRegistry Tests', () => {

    let mySandBox: sinon.SinonSandbox;

    before(async () => {
        await TestUtil.setupTests();
    });

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();

        if (ExtensionUtil.isActive()) {
            await myExtension.deactivate();
        }
    });

    afterEach(() => {
        mySandBox.restore();
    });

    it('should delay execution of commands until after commands have been restored', async () => {
        const commandSpy: sinon.SinonSpy = mySandBox.spy(vscode.commands, 'executeCommand');
        const tempRegistry: TemporaryCommandRegistry = TemporaryCommandRegistry.instance();

        const context: vscode.ExtensionContext = ExtensionUtil.getExtensionContext();

        tempRegistry.createTempCommands();

        await vscode.commands.executeCommand(ExtensionCommands.REFRESH_GATEWAYS);

        tempRegistry.restoreCommands();
        await myExtension.registerCommands(context);
        await tempRegistry.executeStoredCommands();

        commandSpy.should.have.been.calledTwice;
    });
});
