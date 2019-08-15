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
import * as path from 'path';
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
import Axios from 'axios';

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
            mySandBox.stub(fs, 'readFile').resolves(JSON.stringify({ activationEvents: ['myActivationOne', 'myActivationTwo'] }));
            const dependencyManager: DependencyManager = DependencyManager.instance();
            mySandBox.stub(dependencyManager, 'requireNativeDependencies').resolves();
            await dependencyManager.hasNativeDependenciesInstalled().should.eventually.equal(true);
        });

        it('should return false if the dependencies are not installed', async () => {
            mySandBox.stub(fs, 'readFile').resolves(JSON.stringify({ activationEvents: ['*'] }));

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
            mySandBox.stub(fs, 'readFile').resolves(JSON.stringify({
                nativeDependencies: [
                    'grpc'
                ]
            }));

            const dependencyManager: DependencyManager = DependencyManager.instance();
            await dependencyManager.requireNativeDependencies();

            logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, `Attempting to require dependency: grpc`);

        });
    });

    describe('installNativeDependencies', () => {

        let axiosStub: sinon.SinonStub;
        let removeStub: sinon.SinonStub;
        let existsStub: sinon.SinonStub;
        let renameStub: sinon.SinonStub;
        let writeFileStub: sinon.SinonStub;
        let utimesFileStub: sinon.SinonStub;
        let basePath: string;
        let logSpy: sinon.SinonSpy;
        let tempCommandCreateCommandsStub: sinon.SinonStub;
        let tempCommandRegistryStub: sinon.SinonStub;

        beforeEach(async () => {
            await ExtensionUtil.activateExtension();

            logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');

            tempCommandCreateCommandsStub = mySandBox.stub(TemporaryCommandRegistry.instance(), 'createTempCommands');
            tempCommandRegistryStub = mySandBox.stub(TemporaryCommandRegistry.instance(), 'restoreCommands');

            mySandBox.stub(process.versions, 'modules').value('69');

            removeStub = mySandBox.stub(fs, 'remove').resolves();
            existsStub = mySandBox.stub(fs, 'pathExists').resolves(true);
            renameStub = mySandBox.stub(fs, 'rename').resolves();
            writeFileStub = mySandBox.stub(fs, 'writeFile').resolves();
            utimesFileStub = mySandBox.stub(fs, 'utimes').resolves();

            const extensionPath: string = ExtensionUtil.getExtensionPath();
            basePath = path.join(extensionPath, 'node_modules', 'grpc', 'src', 'node', 'extension_binary');

            axiosStub = mySandBox.stub(Axios, 'get');

            axiosStub.onSecondCall().rejects('some error');
            axiosStub.onThirdCall().resolves();

            const info: any = {
                data: [
                    { deps: { modules: '69' }, version: '4.2.5' },
                    { deps: { modules: '69' }, version: '4.1.5' },
                    { deps: { modules: '69' }, version: '4.1.6' }
                ]
            };
            axiosStub.withArgs('https://raw.githubusercontent.com/electron/releases/master/lite.json').resolves(info);

        });

        afterEach(() => {
            mySandBox.restore();
        });

        it('should install the dependencies using npm command on Linux', async () => {
            mySandBox.stub(process, 'platform').value('linux');

            const sendCommandStub: sinon.SinonStub = mySandBox.stub(CommandUtil, 'sendCommandWithOutput').resolves();
            const dependencyManager: DependencyManager = DependencyManager.instance();

            mySandBox.stub(process, 'arch').value('x64');

            await dependencyManager.installNativeDependencies();

            dependencyManager['dependencies'].length.should.equal(1);
            dependencyManager['dependencies'][0].should.equal('grpc');

            sendCommandStub.should.have.been.calledWith('npm', ['rebuild', 'grpc', '--target=4.1.5', '--runtime=electron', '--dist-url=https://atom.io/download/electron', '--update-binary', '--fallback-to-build', `--target_arch=x64`], sinon.match.string, null, sinon.match.instanceOf(VSCodeBlockchainOutputAdapter));

            const origPath: string = path.join(basePath, `node-v69-linux-x64-glibc`);
            const newPath: string = path.join(basePath, `electron-v4.1-linux-x64-glibc`);

            removeStub.should.have.been.calledWith(origPath);
            renameStub.should.have.been.calledWith(newPath, origPath);
            existsStub.should.have.been.called;

            writeFileStub.should.have.been.called;
            utimesFileStub.should.have.been.called;

            tempCommandCreateCommandsStub.should.have.been.called;
            tempCommandRegistryStub.should.have.been.called;
        });

        it('should install the dependencies using npm command on Mac', async () => {
            mySandBox.stub(process, 'platform').value('darwin');

            const sendCommandStub: sinon.SinonStub = mySandBox.stub(CommandUtil, 'sendCommandWithOutput').resolves();
            const dependencyManager: DependencyManager = DependencyManager.instance();

            mySandBox.stub(process, 'arch').value('x64');

            await dependencyManager.installNativeDependencies();

            dependencyManager['dependencies'].length.should.equal(1);
            dependencyManager['dependencies'][0].should.equal('grpc');

            sendCommandStub.should.have.been.calledWith('npm', ['rebuild', 'grpc', '--target=4.1.5', '--runtime=electron', '--dist-url=https://atom.io/download/electron', '--update-binary', '--fallback-to-build', `--target_arch=x64`], sinon.match.string, null, sinon.match.instanceOf(VSCodeBlockchainOutputAdapter));

            const origPath: string = path.join(basePath, `node-v69-darwin-x64-unknown`);
            const newPath: string = path.join(basePath, `electron-v4.1-darwin-x64-unknown`);

            removeStub.should.have.been.calledWith(origPath);
            renameStub.should.have.been.calledWith(newPath, origPath);
            existsStub.should.have.been.called;

            writeFileStub.should.have.been.called;
            utimesFileStub.should.have.been.called;

            tempCommandCreateCommandsStub.should.have.been.called;
            tempCommandRegistryStub.should.have.been.called;
        });

        it('should install the dependencies using npm.cmd script on Windows', async () => {
            mySandBox.stub(process, 'platform').value('win32');
            mySandBox.stub(process, 'arch').value('x64');

            const sendCommandStub: sinon.SinonStub = mySandBox.stub(CommandUtil, 'sendCommandWithOutput').resolves();
            const dependencyManager: DependencyManager = DependencyManager.instance();

            await dependencyManager.installNativeDependencies();

            dependencyManager['dependencies'].length.should.equal(1);
            dependencyManager['dependencies'][0].should.equal('grpc');

            sendCommandStub.should.have.been.calledWith('npm', ['rebuild', 'grpc', '--target=4.1.5', '--runtime=electron', '--dist-url=https://atom.io/download/electron', '--update-binary', '--fallback-to-build', `--target_arch=x64`], sinon.match.string, null, sinon.match.instanceOf(VSCodeBlockchainOutputAdapter), sinon.match.truthy);

            const origPath: string = path.join(basePath, `node-v69-win32-x64-unknown`);
            const newPath: string = path.join(basePath, `electron-v4.1-win32-x64-unknown`);

            removeStub.should.have.been.calledWith(origPath);
            renameStub.should.have.been.calledWith(newPath, origPath);

            writeFileStub.should.have.been.called;
            utimesFileStub.should.have.been.called;

            tempCommandCreateCommandsStub.should.have.been.called;
            tempCommandRegistryStub.should.have.been.called;
        });

        it('should handle errors', async () => {
            mySandBox.stub(process, 'arch').value('x64');

            const sendCommandStub: sinon.SinonStub = mySandBox.stub(CommandUtil, 'sendCommandWithOutput').rejects({ message: 'some error' });

            const dependencyManager: DependencyManager = DependencyManager.instance();

            await dependencyManager.installNativeDependencies().should.have.been.rejectedWith(`some error`);

            dependencyManager['dependencies'].length.should.equal(1);
            dependencyManager['dependencies'][0].should.equal('grpc');

            sendCommandStub.should.have.been.calledWith('npm', ['rebuild', 'grpc', '--target=4.1.5', '--runtime=electron', '--dist-url=https://atom.io/download/electron', '--update-binary', '--fallback-to-build', `--target_arch=x64`], sinon.match.string, null, sinon.match.instanceOf(VSCodeBlockchainOutputAdapter));

            logSpy.should.have.been.calledWith(LogType.ERROR, 'Could not rebuild native dependencies some error. Please ensure that you have node and npm installed');
        });

        it('should install the dependencies using npm.cmd script on Windows, no remove', async () => {
            mySandBox.stub(process, 'platform').value('win32');
            mySandBox.stub(process, 'arch').value('x64');

            existsStub.resolves(false);

            const sendCommandStub: sinon.SinonStub = mySandBox.stub(CommandUtil, 'sendCommandWithOutput').resolves();
            const dependencyManager: DependencyManager = DependencyManager.instance();

            await dependencyManager.installNativeDependencies();

            dependencyManager['dependencies'].length.should.equal(1);
            dependencyManager['dependencies'][0].should.equal('grpc');

            sendCommandStub.should.have.been.calledWith('npm', ['rebuild', 'grpc', '--target=4.1.5', '--runtime=electron', '--dist-url=https://atom.io/download/electron', '--update-binary', '--fallback-to-build', `--target_arch=x64`], sinon.match.string, null, sinon.match.instanceOf(VSCodeBlockchainOutputAdapter), sinon.match.truthy);

            const origPath: string = path.join(basePath, `node-v69-win32-x64-unknown`);
            const newPath: string = path.join(basePath, `electron-v4.1-win32-x64-unknown`);

            removeStub.should.not.have.been.called;
            renameStub.should.have.been.calledWith(newPath, origPath);

            writeFileStub.should.have.been.called;
            utimesFileStub.should.have.been.called;

            tempCommandCreateCommandsStub.should.have.been.called;
            tempCommandRegistryStub.should.have.been.called;
        });

        it('should use first version found if no prebuilt', async () => {
            mySandBox.stub(process, 'platform').value('win32');
            mySandBox.stub(process, 'arch').value('x64');

            axiosStub.onSecondCall().rejects('some error');
            axiosStub.onThirdCall().rejects('some error');

            const sendCommandStub: sinon.SinonStub = mySandBox.stub(CommandUtil, 'sendCommandWithOutput').resolves();
            const dependencyManager: DependencyManager = DependencyManager.instance();

            await dependencyManager.installNativeDependencies();

            dependencyManager['dependencies'].length.should.equal(1);
            dependencyManager['dependencies'][0].should.equal('grpc');

            sendCommandStub.should.have.been.calledWith('npm', ['rebuild', 'grpc', '--target=4.2.5', '--runtime=electron', '--dist-url=https://atom.io/download/electron', '--update-binary', '--fallback-to-build', `--target_arch=x64`], sinon.match.string, null, sinon.match.instanceOf(VSCodeBlockchainOutputAdapter), sinon.match.truthy);

            const origPath: string = path.join(basePath, `node-v69-win32-x64-unknown`);
            const newPath: string = path.join(basePath, `electron-v4.2-win32-x64-unknown`);

            removeStub.should.have.been.calledWith(origPath);
            renameStub.should.have.been.calledWith(newPath, origPath);

            writeFileStub.should.have.been.called;
            utimesFileStub.should.have.been.called;

            tempCommandCreateCommandsStub.should.have.been.called;
            tempCommandRegistryStub.should.have.been.called;
        });

        it('should throw error if finds no versions', async () => {
            mySandBox.stub(process, 'platform').value('win32');
            mySandBox.stub(process, 'arch').value('x64');

            axiosStub.withArgs('https://raw.githubusercontent.com/electron/releases/master/lite.json').resolves({ data: [] });

            const sendCommandStub: sinon.SinonStub = mySandBox.stub(CommandUtil, 'sendCommandWithOutput').resolves();
            const dependencyManager: DependencyManager = DependencyManager.instance();

            await dependencyManager.installNativeDependencies().should.be.eventually.rejectedWith(/Could not get electron verion, no matching electron versions for modules 69/);

            dependencyManager['dependencies'].length.should.equal(1);
            dependencyManager['dependencies'][0].should.equal('grpc');

            sendCommandStub.should.not.have.been.called;
        });

        it('should handle error from getting electron info', async () => {
            mySandBox.stub(process, 'platform').value('win32');
            mySandBox.stub(process, 'arch').value('x64');

            axiosStub.withArgs('https://raw.githubusercontent.com/electron/releases/master/lite.json').throws(new Error('some error'));

            const sendCommandStub: sinon.SinonStub = mySandBox.stub(CommandUtil, 'sendCommandWithOutput').resolves();
            const dependencyManager: DependencyManager = DependencyManager.instance();

            await dependencyManager.installNativeDependencies().should.be.eventually.rejectedWith(/Could not get electron verion, some error/);

            dependencyManager['dependencies'].length.should.equal(1);
            dependencyManager['dependencies'][0].should.equal('grpc');

            sendCommandStub.should.not.have.been.called;

        });
    });
});
