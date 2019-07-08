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
import * as fs from 'fs-extra';

import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { ExtensionUtil } from '../../src/util/ExtensionUtil';
import { DependencyManager } from '../../src/dependencies/DependencyManager';
import { CommandUtil } from '../../src/util/CommandUtil';
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';
import { TemporaryCommandRegistry } from '../../src/dependencies/TemporaryCommandRegistry';
import { TestUtil } from '../TestUtil';
import { LogType } from '../../src/logging/OutputAdapter';

chai.should();
chai.use(chaiAsPromised);
chai.use(sinonChai);

// tslint:disable no-unused-expression
describe('DependencyManager Tests', () => {
    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();

    before(async () => {
        await TestUtil.setupTests(mySandBox);
    });

    describe('hasNativeDependenciesInstalled', () => {

        afterEach(() => {
            mySandBox.restore();
        });

        it('should return true if the dependencies are installed', async () => {
            mySandBox.stub(fs, 'readFile').resolves(JSON.stringify({activationEvents: ['myActivationOne', 'myActivationTwo']}));
            const dependencyManager: DependencyManager = DependencyManager.instance();
            mySandBox.stub(dependencyManager, 'requireNativeDependencies').resolves();
            await dependencyManager.hasNativeDependenciesInstalled().should.eventually.equal(true);
        });

        it('should return false if the dependencies are not installed', async () => {
            mySandBox.stub(fs, 'readFile').resolves(JSON.stringify({activationEvents: ['*']}));

            const dependencyManager: DependencyManager = DependencyManager.instance();

            await dependencyManager.hasNativeDependenciesInstalled().should.eventually.equal(false);
        });

        it(`should return false if native dependencies can't be required`, async () => {

            const logSpy: sinon.SinonSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');

            const error: Error = new Error(`gRPC error`);

            const dependencyManager: DependencyManager = DependencyManager.instance();
            mySandBox.stub(DependencyManager.instance(), 'requireNativeDependencies').throws(error);
            await dependencyManager.hasNativeDependenciesInstalled().should.eventually.equal(false);
            logSpy.should.have.been.calledWithExactly(LogType.INFO, undefined, `Error requiring dependency: ${error.message}`);

        });
    });

    describe('requireNativeDependencies', () => {

        let logSpy: sinon.SinonSpy;
        beforeEach(async () => {
            logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
        });

        afterEach(() => {
            mySandBox.restore();
        });

        it('should require all native dependencies', async () => {
            mySandBox.stub(fs, 'readFile').resolves(JSON.stringify({nativeDependencies: {
                grpc: {}
            }}));

            const dependencyManager: DependencyManager = DependencyManager.instance();
            await dependencyManager.requireNativeDependencies();

            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `Attempting to require dependency: grpc`);

        });
    });

    describe('installNativeDependencies', () => {

        beforeEach(async () => {
            await ExtensionUtil.activateExtension();
        });

        afterEach(() => {
            mySandBox.restore();
        });

        it('should install the dependencies using npm command on Linux/MacOS', async () => {
            mySandBox.stub(process, 'platform').value('linux');
            const removeStub: sinon.SinonStub = mySandBox.stub(fs, 'remove').resolves();
            const renameStub: sinon.SinonStub = mySandBox.stub(fs, 'rename').resolves();
            const writeFileStub: sinon.SinonStub = mySandBox.stub(fs, 'writeFile').resolves();
            const utimesFileStub: sinon.SinonStub = mySandBox.stub(fs, 'utimes').resolves();

            const tempCommandCreateCommandsStub: sinon.SinonStub = mySandBox.stub(TemporaryCommandRegistry.instance(), 'createTempCommands');
            const tempCommandRegistryStub: sinon.SinonStub = mySandBox.stub(TemporaryCommandRegistry.instance(), 'restoreCommands');

            const sendCommandStub: sinon.SinonStub = mySandBox.stub(CommandUtil, 'sendCommandWithOutput').resolves();
            const dependencyManager: DependencyManager = DependencyManager.instance();

            mySandBox.stub(process, 'arch').value('x64');

            await dependencyManager.installNativeDependencies();

            dependencyManager['dependencies'].length.should.equal(1);
            dependencyManager['dependencies'][0].moduleName.should.equal('grpc');

            sendCommandStub.should.have.been.calledWith('npm', ['rebuild', 'grpc', '--target=4.2.5', '--runtime=electron', '--dist-url=https://atom.io/download/electron', '--update-binary', '--fallback-to-build', `--target_arch=x64`], sinon.match.string, null, sinon.match.instanceOf(VSCodeBlockchainOutputAdapter));
            removeStub.should.have.been.called;
            renameStub.should.have.been.called;

            writeFileStub.should.have.been.called;
            utimesFileStub.should.have.been.called;

            tempCommandCreateCommandsStub.should.have.been.called;
            tempCommandRegistryStub.should.have.been.called;
        });

        it('should install the dependencies using npm.cmd script on Windows', async () => {
            mySandBox.stub(process, 'platform').value('win32');
            mySandBox.stub(process, 'arch').value('x64');
            const removeStub: sinon.SinonStub = mySandBox.stub(fs, 'remove').resolves();
            const renameStub: sinon.SinonStub = mySandBox.stub(fs, 'rename').resolves();
            const writeFileStub: sinon.SinonStub = mySandBox.stub(fs, 'writeFile').resolves();
            const utimesFileStub: sinon.SinonStub = mySandBox.stub(fs, 'utimes').resolves();

            const tempCommandCreateCommandsStub: sinon.SinonStub = mySandBox.stub(TemporaryCommandRegistry.instance(), 'createTempCommands');
            const tempCommandRegistryStub: sinon.SinonStub = mySandBox.stub(TemporaryCommandRegistry.instance(), 'restoreCommands');

            const sendCommandStub: sinon.SinonStub = mySandBox.stub(CommandUtil, 'sendCommandWithOutput').resolves();
            const dependencyManager: DependencyManager = DependencyManager.instance();

            await dependencyManager.installNativeDependencies();

            dependencyManager['dependencies'].length.should.equal(1);
            dependencyManager['dependencies'][0].moduleName.should.equal('grpc');

            sendCommandStub.should.have.been.calledWith('npm', ['rebuild', 'grpc', '--target=4.2.5', '--runtime=electron', '--dist-url=https://atom.io/download/electron', '--update-binary', '--fallback-to-build', `--target_arch=x64`], sinon.match.string, null, sinon.match.instanceOf(VSCodeBlockchainOutputAdapter), sinon.match.truthy);
            removeStub.should.have.been.called;
            renameStub.should.have.been.called;

            writeFileStub.should.have.been.called;
            utimesFileStub.should.have.been.called;

            tempCommandCreateCommandsStub.should.have.been.called;
            tempCommandRegistryStub.should.have.been.called;
        });

        it('should handle errors', async () => {
            mySandBox.stub(process, 'arch').value('x64');

            const logSpy: sinon.SinonSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
            const sendCommandStub: sinon.SinonStub = mySandBox.stub(CommandUtil, 'sendCommandWithOutput').rejects({message: 'some error'});

            mySandBox.stub(TemporaryCommandRegistry.instance(), 'createTempCommands');

            const dependencyManager: DependencyManager = DependencyManager.instance();

            await dependencyManager.installNativeDependencies().should.have.been.rejectedWith(`some error`);

            dependencyManager['dependencies'].length.should.equal(1);
            dependencyManager['dependencies'][0].moduleName.should.equal('grpc');

            sendCommandStub.should.have.been.calledWith('npm', ['rebuild', 'grpc', '--target=4.2.5', '--runtime=electron', '--dist-url=https://atom.io/download/electron', '--update-binary', '--fallback-to-build', `--target_arch=x64`], sinon.match.string, null, sinon.match.instanceOf(VSCodeBlockchainOutputAdapter));

            logSpy.should.have.been.calledWith(LogType.ERROR, 'Could not rebuild native dependencies some error. Please ensure that you have node and npm installed');
        });
    });
});
