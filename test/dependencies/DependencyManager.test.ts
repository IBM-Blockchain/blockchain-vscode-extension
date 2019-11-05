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
import * as fs from 'fs-extra';
import * as path from 'path';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { version as currentExtensionVersion, dependencies as extDeps } from '../../package.json';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';
import { DependencyManager } from '../../extension/dependencies/DependencyManager';
import { CommandUtil } from '../../extension/util/CommandUtil';
import { VSCodeBlockchainOutputAdapter } from '../../extension/logging/VSCodeBlockchainOutputAdapter';
import { TemporaryCommandRegistry } from '../../extension/dependencies/TemporaryCommandRegistry';
import { LogType } from '../../extension/logging/OutputAdapter';
import Axios from 'axios';
import { TestUtil } from '../TestUtil';
import { GlobalState, ExtensionData, DEFAULT_EXTENSION_DATA } from '../../extension/util/GlobalState.js';
import { Dependencies } from '../../extension/dependencies/Dependencies';

chai.should();
chai.use(chaiAsPromised);
chai.use(sinonChai);
const should: Chai.Should = chai.should();

// tslint:disable no-unused-expression
describe('DependencyManager Tests', () => {
    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();
    let getExtensionLocalFabricSetting: sinon.SinonStub;
    beforeEach(async () => {
        getExtensionLocalFabricSetting = mySandBox.stub(ExtensionUtil, 'getExtensionLocalFabricSetting').returns(true);
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
        let extensionKindStub: sinon.SinonStub;
        let electronStub: sinon.SinonStub;

        beforeEach(async () => {
            logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');

            mySandBox.stub(TemporaryCommandRegistry.instance(), 'createTempCommands');
            mySandBox.stub(TemporaryCommandRegistry.instance(), 'restoreCommands');

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

            extensionKindStub = mySandBox.stub(vscode.extensions, 'getExtension').callThrough();
            // needed as the older version we need to run against doesn't have this api
            (vscode as any).ExtensionKind = { Workspace: 2 };

            extensionKindStub.onThirdCall().returns({ extensionKind: 1 });
            mySandBox.stub(process.versions, 'node').value('10.16.0');

            if (!process.versions['electron']) {
                process.versions['electron'] = '';
            }

            electronStub = mySandBox.stub(process.versions, 'electron' as any).value('');
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

            sendCommandStub.should.have.been.calledWith('npm', ['rebuild', 'grpc', '--target=4.1.5', '--runtime=electron', '--update-binary', '--fallback-to-build', `--target_arch=x64`, '--dist-url=https://atom.io/download/electron'], sinon.match.string, null, sinon.match.instanceOf(VSCodeBlockchainOutputAdapter));

            const origPath: string = path.join(basePath, `node-v69-linux-x64-glibc`);
            const newPath: string = path.join(basePath, `electron-v4.1-linux-x64-glibc`);

            removeStub.should.have.been.calledWith(origPath);
            renameStub.should.have.been.calledWith(newPath, origPath);
            existsStub.should.have.been.called;

            writeFileStub.should.have.been.called;
            utimesFileStub.should.have.been.called;
        });

        it('should install the dependencies using npm command on Linux remote', async () => {
            extensionKindStub.onThirdCall().returns({ extensionKind: 2 });
            mySandBox.stub(process, 'platform').value('linux');

            const sendCommandStub: sinon.SinonStub = mySandBox.stub(CommandUtil, 'sendCommandWithOutput').resolves();
            const dependencyManager: DependencyManager = DependencyManager.instance();

            mySandBox.stub(process, 'arch').value('x64');

            await dependencyManager.installNativeDependencies();

            dependencyManager['dependencies'].length.should.equal(1);
            dependencyManager['dependencies'][0].should.equal('grpc');

            sendCommandStub.should.have.been.calledWith('npm', ['rebuild', 'grpc', '--target=10.16.0', '--runtime=node', '--update-binary', '--fallback-to-build', `--target_arch=x64`], sinon.match.string, null, sinon.match.instanceOf(VSCodeBlockchainOutputAdapter));

            existsStub.should.not.have.been.called;

            writeFileStub.should.have.been.called;
            utimesFileStub.should.have.been.called;
        });

        it('should install the dependencies using npm command on Linux with known electron version', async () => {
            mySandBox.stub(process, 'platform').value('linux');

            electronStub.value('6.0.9');

            const sendCommandStub: sinon.SinonStub = mySandBox.stub(CommandUtil, 'sendCommandWithOutput').resolves();
            const dependencyManager: DependencyManager = DependencyManager.instance();

            mySandBox.stub(process, 'arch').value('x64');

            await dependencyManager.installNativeDependencies();

            dependencyManager['dependencies'].length.should.equal(1);
            dependencyManager['dependencies'][0].should.equal('grpc');

            sendCommandStub.should.have.been.calledWith('npm', ['rebuild', 'grpc', '--target=6.0.9', '--runtime=electron', '--update-binary', '--fallback-to-build', `--target_arch=x64`, '--dist-url=https://atom.io/download/electron'], sinon.match.string, null, sinon.match.instanceOf(VSCodeBlockchainOutputAdapter));

            removeStub.should.not.have.been.called;
            renameStub.should.not.have.been.called;
            existsStub.should.not.have.been.called;

            writeFileStub.should.have.been.called;
            utimesFileStub.should.have.been.called;
        });

        it('should install the dependencies using npm command on Mac', async () => {
            mySandBox.stub(process, 'platform').value('darwin');

            const sendCommandStub: sinon.SinonStub = mySandBox.stub(CommandUtil, 'sendCommandWithOutput').resolves();
            const dependencyManager: DependencyManager = DependencyManager.instance();

            mySandBox.stub(process, 'arch').value('x64');

            await dependencyManager.installNativeDependencies();

            dependencyManager['dependencies'].length.should.equal(1);
            dependencyManager['dependencies'][0].should.equal('grpc');

            sendCommandStub.should.have.been.calledWith('npm', ['rebuild', 'grpc', '--target=4.1.5', '--runtime=electron', '--update-binary', '--fallback-to-build', `--target_arch=x64`, '--dist-url=https://atom.io/download/electron'], sinon.match.string, null, sinon.match.instanceOf(VSCodeBlockchainOutputAdapter));

            const origPath: string = path.join(basePath, `node-v69-darwin-x64-unknown`);
            const newPath: string = path.join(basePath, `electron-v4.1-darwin-x64-unknown`);

            removeStub.should.have.been.calledWith(origPath);
            renameStub.should.have.been.calledWith(newPath, origPath);
            existsStub.should.have.been.called;

            writeFileStub.should.have.been.called;
            utimesFileStub.should.have.been.called;
        });

        it('should install the dependencies using npm command on Mac remote', async () => {
            extensionKindStub.onThirdCall().returns({ extensionKind: 2 });
            mySandBox.stub(process, 'platform').value('darwin');

            const sendCommandStub: sinon.SinonStub = mySandBox.stub(CommandUtil, 'sendCommandWithOutput').resolves();
            const dependencyManager: DependencyManager = DependencyManager.instance();

            mySandBox.stub(process, 'arch').value('x64');

            await dependencyManager.installNativeDependencies();

            dependencyManager['dependencies'].length.should.equal(1);
            dependencyManager['dependencies'][0].should.equal('grpc');

            sendCommandStub.should.have.been.calledWith('npm', ['rebuild', 'grpc', '--target=10.16.0', '--runtime=node', '--update-binary', '--fallback-to-build', `--target_arch=x64`], sinon.match.string, null, sinon.match.instanceOf(VSCodeBlockchainOutputAdapter));

            existsStub.should.not.have.been.called;

            writeFileStub.should.have.been.called;
            utimesFileStub.should.have.been.called;
        });

        it('should install the dependencies using npm.cmd script on Windows', async () => {
            mySandBox.stub(process, 'platform').value('win32');
            mySandBox.stub(process, 'arch').value('x64');

            const sendCommandStub: sinon.SinonStub = mySandBox.stub(CommandUtil, 'sendCommandWithOutput').resolves();
            const dependencyManager: DependencyManager = DependencyManager.instance();

            await dependencyManager.installNativeDependencies();

            dependencyManager['dependencies'].length.should.equal(1);
            dependencyManager['dependencies'][0].should.equal('grpc');

            sendCommandStub.should.have.been.calledWith('npm', ['rebuild', 'grpc', '--target=4.1.5', '--runtime=electron', '--update-binary', '--fallback-to-build', `--target_arch=x64`, '--dist-url=https://atom.io/download/electron'], sinon.match.string, null, sinon.match.instanceOf(VSCodeBlockchainOutputAdapter), sinon.match.truthy);

            const origPath: string = path.join(basePath, `node-v69-win32-x64-unknown`);
            const newPath: string = path.join(basePath, `electron-v4.1-win32-x64-unknown`);

            removeStub.should.have.been.calledWith(origPath);
            renameStub.should.have.been.calledWith(newPath, origPath);

            writeFileStub.should.have.been.called;
            utimesFileStub.should.have.been.called;
        });

        it('should install the dependencies using npm.cmd script on Windows remote', async () => {
            extensionKindStub.onThirdCall().returns({ extensionKind: 2 });
            mySandBox.stub(process, 'platform').value('win32');
            mySandBox.stub(process, 'arch').value('x64');

            const sendCommandStub: sinon.SinonStub = mySandBox.stub(CommandUtil, 'sendCommandWithOutput').resolves();
            const dependencyManager: DependencyManager = DependencyManager.instance();

            await dependencyManager.installNativeDependencies();

            dependencyManager['dependencies'].length.should.equal(1);
            dependencyManager['dependencies'][0].should.equal('grpc');

            sendCommandStub.should.have.been.calledWith('npm', ['rebuild', 'grpc', '--target=10.16.0', '--runtime=node', '--update-binary', '--fallback-to-build', `--target_arch=x64`], sinon.match.string, null, sinon.match.instanceOf(VSCodeBlockchainOutputAdapter), sinon.match.truthy);

            existsStub.should.not.have.been.called;

            writeFileStub.should.have.been.called;
            utimesFileStub.should.have.been.called;
        });

        it('should handle errors', async () => {
            mySandBox.stub(process, 'arch').value('x64');

            const sendCommandStub: sinon.SinonStub = mySandBox.stub(CommandUtil, 'sendCommandWithOutput').rejects({ message: 'some error' });

            const dependencyManager: DependencyManager = DependencyManager.instance();

            await dependencyManager.installNativeDependencies().should.have.been.rejectedWith(`some error`);

            dependencyManager['dependencies'].length.should.equal(1);
            dependencyManager['dependencies'][0].should.equal('grpc');

            sendCommandStub.should.have.been.calledWith('npm', ['rebuild', 'grpc', '--target=4.1.5', '--runtime=electron', '--update-binary', '--fallback-to-build', `--target_arch=x64`, '--dist-url=https://atom.io/download/electron'], sinon.match.string, null, sinon.match.instanceOf(VSCodeBlockchainOutputAdapter));

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

            sendCommandStub.should.have.been.calledWith('npm', ['rebuild', 'grpc', '--target=4.1.5', '--runtime=electron', '--update-binary', '--fallback-to-build', `--target_arch=x64`, '--dist-url=https://atom.io/download/electron'], sinon.match.string, null, sinon.match.instanceOf(VSCodeBlockchainOutputAdapter), sinon.match.truthy);

            const origPath: string = path.join(basePath, `node-v69-win32-x64-unknown`);
            const newPath: string = path.join(basePath, `electron-v4.1-win32-x64-unknown`);

            removeStub.should.not.have.been.called;
            renameStub.should.have.been.calledWith(newPath, origPath);

            writeFileStub.should.have.been.called;
            utimesFileStub.should.have.been.called;
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

            sendCommandStub.should.have.been.calledWith('npm', ['rebuild', 'grpc', '--target=4.2.5', '--runtime=electron', '--update-binary', '--fallback-to-build', `--target_arch=x64`, '--dist-url=https://atom.io/download/electron'], sinon.match.string, null, sinon.match.instanceOf(VSCodeBlockchainOutputAdapter), sinon.match.truthy);

            const origPath: string = path.join(basePath, `node-v69-win32-x64-unknown`);
            const newPath: string = path.join(basePath, `electron-v4.2-win32-x64-unknown`);

            removeStub.should.have.been.calledWith(origPath);
            renameStub.should.have.been.calledWith(newPath, origPath);

            writeFileStub.should.have.been.called;
            utimesFileStub.should.have.been.called;
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

    describe('hasPreReqsInstalled', () => {
        let getPreReqVersionsStub: sinon.SinonStub;

        beforeEach(async () => {
            getPreReqVersionsStub = mySandBox.stub(DependencyManager.prototype, 'getPreReqVersions');
        });

        afterEach(async () => {
            mySandBox.restore();
        });

        it(`should return false if there's no Node version`, async () => {
            const dependencies: any = {
                node: {
                    name: 'Node.js',
                    version: undefined
                }
            };

            getPreReqVersionsStub.resolves(dependencies);

            const dependencyManager: DependencyManager = DependencyManager.instance();
            const result: boolean = await dependencyManager.hasPreReqsInstalled();

            result.should.equal(false);
            getPreReqVersionsStub.should.have.been.calledOnce;

        });

        it(`should return false if Node version isn't between 8 and 11`, async () => {
            const dependencies: any = {
                node: {
                    name: 'Node.js',
                    version: '12',
                    requiredVersion: Dependencies.NODEJS_REQUIRED
                }
            };

            getPreReqVersionsStub.resolves(dependencies);

            const dependencyManager: DependencyManager = DependencyManager.instance();
            const result: boolean = await dependencyManager.hasPreReqsInstalled();

            result.should.equal(false);
            getPreReqVersionsStub.should.have.been.calledOnce;

        });

        it(`should return false if there's no npm version`, async () => {
            const dependencies: any = {
                node: {
                    name: 'Node.js',
                    version: '8.12.0',
                    requiredVersion: Dependencies.NODEJS_REQUIRED
                },
                npm: {
                    name: 'npm',
                    version: undefined
                }
            };

            getPreReqVersionsStub.resolves(dependencies);

            const dependencyManager: DependencyManager = DependencyManager.instance();
            const result: boolean = await dependencyManager.hasPreReqsInstalled();

            result.should.equal(false);
            getPreReqVersionsStub.should.have.been.calledOnce;

        });

        it(`should return false if npm version is less than required version`, async () => {
            const dependencies: any = {
                node: {
                    name: 'Node.js',
                    version: '8.12.0',
                    requiredVersion: Dependencies.NODEJS_REQUIRED
                },
                npm: {
                    name: 'npm',
                    version: '4.0.0',
                    requiredVersion: Dependencies.NPM_REQUIRED
                }
            };

            getPreReqVersionsStub.resolves(dependencies);

            const dependencyManager: DependencyManager = DependencyManager.instance();
            const result: boolean = await dependencyManager.hasPreReqsInstalled();

            result.should.equal(false);
            getPreReqVersionsStub.should.have.been.calledOnce;

        });

        it(`should return false if there's no Docker version`, async () => {
            const dependencies: any = {
                node: {
                    name: 'Node.js',
                    version: '8.12.0',
                    requiredVersion: Dependencies.NODEJS_REQUIRED
                },
                npm: {
                    name: 'npm',
                    version: '6.4.1',
                    requiredVersion: Dependencies.NPM_REQUIRED
                },
                docker: {
                    name: 'Docker',
                    version: undefined
                }
            };

            getPreReqVersionsStub.resolves(dependencies);

            const dependencyManager: DependencyManager = DependencyManager.instance();
            const result: boolean = await dependencyManager.hasPreReqsInstalled();

            result.should.equal(false);
            getPreReqVersionsStub.should.have.been.calledOnce;

        });

        it(`should return false if Docker version is less than required version`, async () => {
            const dependencies: any = {
                node: {
                    name: 'Node.js',
                    version: '8.12.0',
                    requiredVersion: Dependencies.NODEJS_REQUIRED
                },
                npm: {
                    name: 'npm',
                    version: '6.4.1',
                    requiredVersion: Dependencies.NPM_REQUIRED
                },
                docker: {
                    name: 'Docker',
                    version: '16.0.0',
                    requiredVersion: Dependencies.DOCKER_REQUIRED
                }
            };

            getPreReqVersionsStub.resolves(dependencies);

            const dependencyManager: DependencyManager = DependencyManager.instance();
            const result: boolean = await dependencyManager.hasPreReqsInstalled();

            result.should.equal(false);
            getPreReqVersionsStub.should.have.been.calledOnce;

        });

        it(`should return false if there's no Docker Compose version`, async () => {
            const dependencies: any = {
                node: {
                    name: 'Node.js',
                    version: '8.12.0',
                    requiredVersion: Dependencies.NODEJS_REQUIRED
                },
                npm: {
                    name: 'npm',
                    version: '6.4.1',
                    requiredVersion: Dependencies.NPM_REQUIRED
                },
                docker: {
                    name: 'Docker',
                    version: '18.1.2',
                    requiredVersion: Dependencies.DOCKER_REQUIRED
                },
                dockerCompose: {
                    name: 'Docker Compose',
                    version: undefined
                }
            };

            getPreReqVersionsStub.resolves(dependencies);

            const dependencyManager: DependencyManager = DependencyManager.instance();
            const result: boolean = await dependencyManager.hasPreReqsInstalled();

            result.should.equal(false);
            getPreReqVersionsStub.should.have.been.calledOnce;

        });

        it(`should return false if Docker Compose version is less than required version`, async () => {
            const dependencies: any = {
                node: {
                    name: 'Node.js',
                    version: '8.12.0',
                    requiredVersion: Dependencies.NODEJS_REQUIRED
                },
                npm: {
                    name: 'npm',
                    version: '6.4.1',
                    requiredVersion: Dependencies.NPM_REQUIRED
                },
                docker: {
                    name: 'Docker',
                    version: '18.1.2',
                    requiredVersion: Dependencies.DOCKER_REQUIRED
                },
                dockerCompose: {
                    name: 'Docker Compose',
                    version: '1.1.2',
                    requiredVersion: Dependencies.DOCKER_COMPOSE_REQUIRED
                }
            };

            getPreReqVersionsStub.resolves(dependencies);

            const dependencyManager: DependencyManager = DependencyManager.instance();
            const result: boolean = await dependencyManager.hasPreReqsInstalled();

            result.should.equal(false);
            getPreReqVersionsStub.should.have.been.calledOnce;

        });

        it(`should return false if they haven't confirmed to have system requirements`, async () => {
            const dependencies: any = {
                node: {
                    name: 'Node.js',
                    version: '8.12.0',
                    requiredVersion: Dependencies.NODEJS_REQUIRED
                },
                npm: {
                    name: 'npm',
                    version: '6.4.1',
                    requiredVersion: Dependencies.NPM_REQUIRED
                },
                docker: {
                    name: 'Docker',
                    version: '18.1.2',
                    requiredVersion: Dependencies.DOCKER_REQUIRED
                },
                dockerCompose: {
                    name: 'Docker Compose',
                    version: '1.21.1',
                    requiredVersion: Dependencies.DOCKER_COMPOSE_REQUIRED
                },
                systemRequirements: {
                    name: 'System Requirements',
                    complete: undefined
                }
            };

            getPreReqVersionsStub.resolves(dependencies);

            const dependencyManager: DependencyManager = DependencyManager.instance();
            const result: boolean = await dependencyManager.hasPreReqsInstalled();

            result.should.equal(false);
            getPreReqVersionsStub.should.have.been.calledOnce;

        });

        it(`should return true if all prereqs have been met`, async () => {
            mySandBox.stub(process, 'platform').value('linux'); // We don't have any Linux only prereqs, so this is okay.

            const dependencies: any = {
                node: {
                    name: 'Node.js',
                    version: '8.12.0',
                    requiredVersion: Dependencies.NODEJS_REQUIRED
                },
                npm: {
                    name: 'npm',
                    version: '6.4.1',
                    requiredVersion: Dependencies.NPM_REQUIRED
                },
                docker: {
                    name: 'Docker',
                    version: '18.1.2',
                    requiredVersion: Dependencies.DOCKER_REQUIRED
                },
                dockerCompose: {
                    name: 'Docker Compose',
                    version: '1.21.1',
                    requiredVersion: Dependencies.DOCKER_COMPOSE_REQUIRED
                },
                systemRequirements: {
                    name: 'System Requirements',
                    complete: true
                }
            };

            getPreReqVersionsStub.resolves(dependencies);

            const dependencyManager: DependencyManager = DependencyManager.instance();
            const result: boolean = await dependencyManager.hasPreReqsInstalled();

            result.should.equal(true);
            getPreReqVersionsStub.should.have.been.calledOnce;

        });

        it(`should return true if all non-local fabric prereqs have been met`, async () => {
            getExtensionLocalFabricSetting.returns(false);
            mySandBox.stub(process, 'platform').value('linux'); // We don't have any Linux only prereqs, so this is okay.

            const dependencies: any = {
                node: {
                    name: 'Node.js',
                    version: '8.12.0',
                    requiredVersion: Dependencies.NODEJS_REQUIRED
                },
                npm: {
                    name: 'npm',
                    version: '6.4.1',
                    requiredVersion: Dependencies.NPM_REQUIRED
                },
                systemRequirements: {
                    name: 'System Requirements',
                    complete: true
                }
            };

            getPreReqVersionsStub.resolves(dependencies);

            const dependencyManager: DependencyManager = DependencyManager.instance();
            const result: boolean = await dependencyManager.hasPreReqsInstalled();

            result.should.equal(true);
            getPreReqVersionsStub.should.have.been.calledOnce;

        });

        it(`should be able to pass dependencies to the function`, async () => {

            getExtensionLocalFabricSetting.returns(false);
            mySandBox.stub(process, 'platform').value('linux'); // We don't have any Linux only prereqs, so this is okay.

            const dependencies: any = {
                node: {
                    name: 'Node.js',
                    version: '8.12.0',
                    requiredVersion: Dependencies.NODEJS_REQUIRED
                },
                npm: {
                    name: 'npm',
                    version: '6.4.1',
                    requiredVersion: Dependencies.NPM_REQUIRED
                },
                docker: {
                    name: 'Docker',
                    version: '18.1.2',
                    requiredVersion: Dependencies.DOCKER_REQUIRED
                },
                dockerCompose: {
                    name: 'Docker Compose',
                    version: '1.21.1',
                    requiredVersion: Dependencies.DOCKER_COMPOSE_REQUIRED
                },
                systemRequirements: {
                    name: 'System Requirements',
                    complete: true
                }
            };

            const dependencyManager: DependencyManager = DependencyManager.instance();
            const result: boolean = await dependencyManager.hasPreReqsInstalled(dependencies);

            result.should.equal(true);
            getPreReqVersionsStub.should.not.have.been.called;

        });

        describe('Windows', () => {
            it(`should return false if there's no OpenSSL version (Windows)`, async () => {
                mySandBox.stub(process, 'platform').value('win32');

                const dependencies: any = {
                    node: {
                        name: 'Node.js',
                        version: '8.12.0',
                        requiredVersion: Dependencies.NODEJS_REQUIRED
                    },
                    npm: {
                        name: 'npm',
                        version: '6.4.1',
                        requiredVersion: Dependencies.NPM_REQUIRED
                    },
                    docker: {
                        name: 'Docker',
                        version: '18.1.2',
                        requiredVersion: Dependencies.DOCKER_REQUIRED
                    },
                    dockerCompose: {
                        name: 'Docker Compose',
                        version: '1.21.1',
                        requiredVersion: Dependencies.DOCKER_COMPOSE_REQUIRED
                    },
                    systemRequirements: {
                        name: 'System Requirements',
                        complete: true
                    },
                    openssl: {
                        name: 'OpenSSL',
                        version: undefined
                    }
                };

                getPreReqVersionsStub.resolves(dependencies);

                const dependencyManager: DependencyManager = DependencyManager.instance();
                const result: boolean = await dependencyManager.hasPreReqsInstalled();

                result.should.equal(false);
                getPreReqVersionsStub.should.have.been.calledOnce;

            });

            it(`should return false if version of OpenSSL is not equal to the required version (Windows)`, async () => {
                mySandBox.stub(process, 'platform').value('win32');

                const dependencies: any = {
                    node: {
                        name: 'Node.js',
                        version: '8.12.0',
                        requiredVersion: Dependencies.NODEJS_REQUIRED
                    },
                    npm: {
                        name: 'npm',
                        version: '6.4.1',
                        requiredVersion: Dependencies.NPM_REQUIRED
                    },
                    docker: {
                        name: 'Docker',
                        version: '18.1.2',
                        requiredVersion: Dependencies.DOCKER_REQUIRED
                    },
                    dockerCompose: {
                        version: '1.21.1',
                        requiredVersion: Dependencies.DOCKER_COMPOSE_REQUIRED
                    },
                    systemRequirements: {
                        name: 'System Requirements',
                        complete: true
                    },
                    openssl: {
                        name: 'OpenSSL',
                        version: '1.0.6',
                        requiredVersion: Dependencies.OPENSSL_REQUIRED
                    }
                };

                getPreReqVersionsStub.resolves(dependencies);

                const dependencyManager: DependencyManager = DependencyManager.instance();
                const result: boolean = await dependencyManager.hasPreReqsInstalled();

                result.should.equal(false);
                getPreReqVersionsStub.should.have.been.calledOnce;

            });

            it(`should return false if there's no version of the build tools (Windows)`, async () => {
                mySandBox.stub(process, 'platform').value('win32');

                const dependencies: any = {
                    node: {
                        name: 'Node.js',
                        version: '8.12.0',
                        requiredVersion: Dependencies.NODEJS_REQUIRED
                    },
                    npm: {
                        name: 'npm',
                        version: '6.4.1',
                        requiredVersion: Dependencies.NPM_REQUIRED
                    },
                    docker: {
                        name: 'Docker',
                        version: '18.1.2',
                        requiredVersion: Dependencies.DOCKER_REQUIRED
                    },
                    dockerCompose: {
                        name: 'Docker Compose',
                        version: '1.21.1',
                        requiredVersion: Dependencies.DOCKER_COMPOSE_REQUIRED
                    },
                    systemRequirements: {
                        name: 'System Requirements',
                        complete: true
                    },
                    openssl: {
                        name: 'OpenSSL',
                        version: '1.0.2',
                        requiredVersion: Dependencies.OPENSSL_REQUIRED
                    },
                    buildTools: {
                        name: 'C++ Build Tools',
                        version: undefined
                    }
                };

                getPreReqVersionsStub.resolves(dependencies);

                const dependencyManager: DependencyManager = DependencyManager.instance();
                const result: boolean = await dependencyManager.hasPreReqsInstalled();

                result.should.equal(false);
                getPreReqVersionsStub.should.have.been.calledOnce;

            });

            it(`should return false if the user hasn't confirmed the Docker for Windows setup (Windows)`, async () => {
                mySandBox.stub(process, 'platform').value('win32');

                const dependencies: any = {
                    node: {
                        name: 'Node.js',
                        version: '8.12.0',
                        requiredVersion: Dependencies.NODEJS_REQUIRED
                    },
                    npm: {
                        name: 'npm',
                        version: '6.4.1',
                        requiredVersion: Dependencies.NPM_REQUIRED
                    },
                    docker: {
                        name: 'Docker',
                        version: '18.1.2',
                        requiredVersion: Dependencies.DOCKER_REQUIRED
                    },
                    dockerCompose: {
                        name: 'Docker Compose',
                        version: '1.21.1',
                        requiredVersion: Dependencies.DOCKER_COMPOSE_REQUIRED
                    },
                    systemRequirements: {
                        name: 'System Requirements',
                        complete: true
                    },
                    openssl: {
                        name: 'OpenSSL',
                        version: '1.0.2',
                        requiredVersion: Dependencies.OPENSSL_REQUIRED
                    },
                    buildTools: {
                        name: 'C++ Build Tools',
                        version: '1.2.3'
                    },
                    dockerForWindows: {
                        name: 'Docker for Windows',
                        complete: undefined
                    }
                };

                getPreReqVersionsStub.resolves(dependencies);

                const dependencyManager: DependencyManager = DependencyManager.instance();
                const result: boolean = await dependencyManager.hasPreReqsInstalled();

                result.should.equal(false);
                getPreReqVersionsStub.should.have.been.calledOnce;

            });

            it(`should return true if all Windows prereqs have been met (Windows)`, async () => {
                mySandBox.stub(process, 'platform').value('win32');

                const dependencies: any = {
                    node: {
                        name: 'Node.js',
                        version: '8.12.0',
                        requiredVersion: Dependencies.NODEJS_REQUIRED
                    },
                    npm: {
                        name: 'npm',
                        version: '6.4.1',
                        requiredVersion: Dependencies.NPM_REQUIRED
                    },
                    docker: {
                        name: 'Docker',
                        version: '18.1.2',
                        requiredVersion: Dependencies.DOCKER_REQUIRED
                    },
                    dockerCompose: {
                        name: 'Docker Compose',
                        version: '1.21.1',
                        requiredVersion: Dependencies.DOCKER_COMPOSE_REQUIRED
                    },
                    systemRequirements: {
                        name: 'System Requirements',
                        complete: true
                    },
                    openssl: {
                        name: 'OpenSSL',
                        version: '1.0.2',
                        requiredVersion: Dependencies.OPENSSL_REQUIRED
                    },
                    buildTools: {
                        name: 'C++ Build Tools',
                        version: '1.2.3'
                    },
                    dockerForWindows: {
                        name: 'Docker for Windows',
                        complete: true
                    }
                };

                getPreReqVersionsStub.resolves(dependencies);

                const dependencyManager: DependencyManager = DependencyManager.instance();
                const result: boolean = await dependencyManager.hasPreReqsInstalled();

                result.should.equal(true);
                getPreReqVersionsStub.should.have.been.calledOnce;

            });

            it(`should return true if all non-local fabric Windows prereqs have been met (Windows)`, async () => {

                getExtensionLocalFabricSetting.returns(false);
                mySandBox.stub(process, 'platform').value('win32');

                const dependencies: any = {
                    node: {
                        name: 'Node.js',
                        version: '8.12.0',
                        requiredVersion: Dependencies.NODEJS_REQUIRED
                    },
                    npm: {
                        name: 'npm',
                        version: '6.4.1',
                        requiredVersion: Dependencies.NPM_REQUIRED
                    },
                    systemRequirements: {
                        name: 'System Requirements',
                        complete: true
                    },
                    dockerForWindows: {
                        name: 'Docker for Windows',
                        complete: true
                    }
                };

                getPreReqVersionsStub.resolves(dependencies);

                const dependencyManager: DependencyManager = DependencyManager.instance();
                const result: boolean = await dependencyManager.hasPreReqsInstalled();

                result.should.equal(true);
                getPreReqVersionsStub.should.have.been.calledOnce;

            });
        });

        describe('Mac', () => {
            it(`should return false if there's no version of Xcode installed (Mac)`, async () => {
                mySandBox.stub(process, 'platform').value('darwin');

                const dependencies: any = {
                    node: {
                        name: 'Node.js',
                        version: '8.12.0',
                        requiredVersion: Dependencies.NODEJS_REQUIRED
                    },
                    npm: {
                        name: 'npm',
                        version: '6.4.1',
                        requiredVersion: Dependencies.NPM_REQUIRED
                    },
                    docker: {
                        name: 'Docker',
                        version: '18.1.2',
                        requiredVersion: Dependencies.DOCKER_REQUIRED
                    },
                    dockerCompose: {
                        name: 'Docker Compose',
                        version: '1.21.1',
                        requiredVersion: Dependencies.DOCKER_COMPOSE_REQUIRED
                    },
                    systemRequirements: {
                        name: 'System Requirements',
                        complete: true
                    },
                    xcode: {
                        name: 'Xcode',
                        version: undefined
                    }
                };

                getPreReqVersionsStub.resolves(dependencies);

                const dependencyManager: DependencyManager = DependencyManager.instance();
                const result: boolean = await dependencyManager.hasPreReqsInstalled();

                result.should.equal(false);
                getPreReqVersionsStub.should.have.been.calledOnce;

            });

            it(`should return true if all Mac prereqs have been met (Mac)`, async () => {
                mySandBox.stub(process, 'platform').value('darwin');

                const dependencies: any = {
                    node: {
                        name: 'Node.js',
                        version: '8.12.0',
                        requiredVersion: Dependencies.NODEJS_REQUIRED
                    },
                    npm: {
                        name: 'npm',
                        version: '6.4.1',
                        requiredVersion: Dependencies.NPM_REQUIRED
                    },
                    docker: {
                        name: 'Docker',
                        version: '18.1.2',
                        requiredVersion: Dependencies.DOCKER_REQUIRED
                    },
                    dockerCompose: {
                        name: 'Docker Compose',
                        version: '1.21.1',
                        requiredVersion: Dependencies.DOCKER_COMPOSE_REQUIRED
                    },
                    systemRequirements: {
                        name: 'System Requirements',
                        complete: true
                    },
                    xcode: {
                        name: 'Xcode',
                        version: '1234'
                    }
                };

                getPreReqVersionsStub.resolves(dependencies);

                const dependencyManager: DependencyManager = DependencyManager.instance();
                const result: boolean = await dependencyManager.hasPreReqsInstalled();

                result.should.equal(true);
                getPreReqVersionsStub.should.have.been.calledOnce;

            });
        });

        describe('optional dependencies', () => {

            it(`should return false if the optional Go dependency hasn't been installed`, async () => {
                mySandBox.stub(process, 'platform').value('linux');

                const dependencies: any = {
                    node: {
                        name: 'Node.js',
                        version: '8.12.0',
                        requiredVersion: Dependencies.NODEJS_REQUIRED
                    },
                    npm: {
                        name: 'npm',
                        version: '6.4.1',
                        requiredVersion: Dependencies.NPM_REQUIRED
                    },
                    docker: {
                        name: 'Docker',
                        version: '18.1.2',
                        requiredVersion: Dependencies.DOCKER_REQUIRED
                    },
                    dockerCompose: {
                        name: 'Docker Compose',
                        version: '1.21.1',
                        requiredVersion: Dependencies.DOCKER_COMPOSE_REQUIRED
                    },
                    systemRequirements: {
                        name: 'System Requirements',
                        complete: true
                    },
                    go: {
                        name: 'Go',
                        version: undefined
                    }
                };

                getPreReqVersionsStub.resolves(dependencies);

                const dependencyManager: DependencyManager = DependencyManager.instance();
                const result: boolean = await dependencyManager.hasPreReqsInstalled(undefined, true);

                result.should.equal(false);
                getPreReqVersionsStub.should.have.been.calledOnce;

            });

            it(`should return false if the optional Go dependency isn't greater than the required version`, async () => {
                mySandBox.stub(process, 'platform').value('linux');

                const dependencies: any = {
                    node: {
                        name: 'Node.js',
                        version: '8.12.0',
                        requiredVersion: Dependencies.NODEJS_REQUIRED
                    },
                    npm: {
                        name: 'npm',
                        version: '6.4.1',
                        requiredVersion: Dependencies.NPM_REQUIRED
                    },
                    docker: {
                        name: 'Docker',
                        version: '18.1.2',
                        requiredVersion: Dependencies.DOCKER_REQUIRED
                    },
                    dockerCompose: {
                        name: 'Docker Compose',
                        version: '1.21.1',
                        requiredVersion: Dependencies.DOCKER_COMPOSE_REQUIRED
                    },
                    systemRequirements: {
                        name: 'System Requirements',
                        complete: true
                    },
                    go: {
                        name: 'Go',
                        version: '1.0.0',
                        requiredVersion: Dependencies.GO_REQUIRED
                    }
                };

                getPreReqVersionsStub.resolves(dependencies);

                const dependencyManager: DependencyManager = DependencyManager.instance();
                const result: boolean = await dependencyManager.hasPreReqsInstalled(undefined, true);

                result.should.equal(false);
                getPreReqVersionsStub.should.have.been.calledOnce;

            });

            it(`should return false if the optional Go Extension hasn't been installed`, async () => {
                mySandBox.stub(process, 'platform').value('linux');

                const dependencies: any = {
                    node: {
                        name: 'Node.js',
                        version: '8.12.0',
                        requiredVersion: Dependencies.NODEJS_REQUIRED
                    },
                    npm: {
                        name: 'npm',
                        version: '6.4.1',
                        requiredVersion: Dependencies.NPM_REQUIRED
                    },
                    docker: {
                        name: 'Docker',
                        version: '18.1.2',
                        requiredVersion: Dependencies.DOCKER_REQUIRED
                    },
                    dockerCompose: {
                        name: 'Docker Compose',
                        version: '1.21.1',
                        requiredVersion: Dependencies.DOCKER_COMPOSE_REQUIRED
                    },
                    systemRequirements: {
                        name: 'System Requirements',
                        complete: true
                    },
                    go: {
                        name: 'Go',
                        version: '2.0.0',
                        requiredVersion: Dependencies.GO_REQUIRED
                    },
                    goExtension: {
                        name: 'Go Extension',
                        version: undefined
                    }
                };

                getPreReqVersionsStub.resolves(dependencies);

                const dependencyManager: DependencyManager = DependencyManager.instance();
                const result: boolean = await dependencyManager.hasPreReqsInstalled(undefined, true);

                result.should.equal(false);
                getPreReqVersionsStub.should.have.been.calledOnce;

            });

            it(`should return false if the optional Java dependency hasn't been installed`, async () => {
                mySandBox.stub(process, 'platform').value('linux');

                const dependencies: any = {
                    node: {
                        name: 'Node.js',
                        version: '8.12.0',
                        requiredVersion: Dependencies.NODEJS_REQUIRED
                    },
                    npm: {
                        name: 'npm',
                        version: '6.4.1',
                        requiredVersion: Dependencies.NPM_REQUIRED
                    },
                    docker: {
                        name: 'Docker',
                        version: '18.1.2',
                        requiredVersion: Dependencies.DOCKER_REQUIRED
                    },
                    dockerCompose: {
                        name: 'Docker Compose',
                        version: '1.21.1',
                        requiredVersion: Dependencies.DOCKER_COMPOSE_REQUIRED
                    },
                    systemRequirements: {
                        name: 'System Requirements',
                        complete: true
                    },
                    go: {
                        name: 'Go',
                        version: '2.0.0',
                        requiredVersion: Dependencies.GO_REQUIRED
                    },
                    goExtension: {
                        name: 'Go Extension',
                        version: '1.0.0'
                    },
                    java: {
                        name: 'Java OpenJDK 8',
                        version: undefined
                    }

                };

                getPreReqVersionsStub.resolves(dependencies);

                const dependencyManager: DependencyManager = DependencyManager.instance();
                const result: boolean = await dependencyManager.hasPreReqsInstalled(undefined, true);

                result.should.equal(false);
                getPreReqVersionsStub.should.have.been.calledOnce;

            });

            it(`should return false if the optional Java dependency doesn't satisfy the required version`, async () => {
                mySandBox.stub(process, 'platform').value('linux');

                const dependencies: any = {
                    node: {
                        name: 'Node.js',
                        version: '8.12.0',
                        requiredVersion: Dependencies.NODEJS_REQUIRED
                    },
                    npm: {
                        name: 'npm',
                        version: '6.4.1',
                        requiredVersion: Dependencies.NPM_REQUIRED
                    },
                    docker: {
                        name: 'Docker',
                        version: '18.1.2',
                        requiredVersion: Dependencies.DOCKER_REQUIRED
                    },
                    dockerCompose: {
                        name: 'Docker Compose',
                        version: '1.21.1',
                        requiredVersion: Dependencies.DOCKER_COMPOSE_REQUIRED
                    },
                    systemRequirements: {
                        name: 'System Requirements',
                        complete: true
                    },
                    go: {
                        name: 'Go',
                        version: '2.0.0',
                        requiredVersion: Dependencies.GO_REQUIRED
                    },
                    goExtension: {
                        name: 'Go Extension',
                        version: '1.0.0'
                    },
                    java: {
                        name: 'Java OpenJDK 8',
                        version: '1.7.1',
                        requiredVersion: Dependencies.JAVA_REQUIRED
                    }
                };

                getPreReqVersionsStub.resolves(dependencies);

                const dependencyManager: DependencyManager = DependencyManager.instance();
                const result: boolean = await dependencyManager.hasPreReqsInstalled(undefined, true);

                result.should.equal(false);
                getPreReqVersionsStub.should.have.been.calledOnce;

            });

            it(`should return false if the optional Java Language Support Extension hasn't been installed`, async () => {
                mySandBox.stub(process, 'platform').value('linux');

                const dependencies: any = {
                    node: {
                        name: 'Node.js',
                        version: '8.12.0',
                        requiredVersion: Dependencies.NODEJS_REQUIRED
                    },
                    npm: {
                        name: 'npm',
                        version: '6.4.1',
                        requiredVersion: Dependencies.NPM_REQUIRED
                    },
                    docker: {
                        name: 'Docker',
                        version: '18.1.2',
                        requiredVersion: Dependencies.DOCKER_REQUIRED
                    },
                    dockerCompose: {
                        name: 'Docker Compose',
                        version: '1.21.1',
                        requiredVersion: Dependencies.DOCKER_COMPOSE_REQUIRED
                    },
                    systemRequirements: {
                        name: 'System Requirements',
                        complete: true
                    },
                    go: {
                        name: 'Go',
                        version: '2.0.0',
                        requiredVersion: Dependencies.GO_REQUIRED
                    },
                    goExtension: {
                        name: 'Go Extension',
                        version: '1.0.0'
                    },
                    java: {
                        name: 'Java OpenJDK 8',
                        version: '1.8.0',
                        requiredVersion: Dependencies.JAVA_REQUIRED
                    },
                    javaLanguageExtension: {
                        name: 'Java Language Support Extension',
                        version: undefined
                    }
                };

                getPreReqVersionsStub.resolves(dependencies);

                const dependencyManager: DependencyManager = DependencyManager.instance();
                const result: boolean = await dependencyManager.hasPreReqsInstalled(undefined, true);

                result.should.equal(false);
                getPreReqVersionsStub.should.have.been.calledOnce;

            });

            it(`should return false if the optional Java Debugger Extension hasn't been installed`, async () => {
                mySandBox.stub(process, 'platform').value('linux');

                const dependencies: any = {
                    node: {
                        name: 'Node.js',
                        version: '8.12.0',
                        requiredVersion: Dependencies.NODEJS_REQUIRED
                    },
                    npm: {
                        name: 'npm',
                        version: '6.4.1',
                        requiredVersion: Dependencies.NPM_REQUIRED
                    },
                    docker: {
                        name: 'Docker',
                        version: '18.1.2',
                        requiredVersion: Dependencies.DOCKER_REQUIRED
                    },
                    dockerCompose: {
                        name: 'Docker Compose',
                        version: '1.21.1',
                        requiredVersion: Dependencies.DOCKER_COMPOSE_REQUIRED
                    },
                    systemRequirements: {
                        name: 'System Requirements',
                        complete: true
                    },
                    go: {
                        name: 'Go',
                        version: '2.0.0',
                        requiredVersion: Dependencies.GO_REQUIRED
                    },
                    goExtension: {
                        name: 'Go Extension',
                        version: '1.0.0'
                    },
                    java: {
                        name: 'Java OpenJDK 8',
                        version: '1.8.0',
                        requiredVersion: Dependencies.JAVA_REQUIRED
                    },
                    javaLanguageExtension: {
                        name: 'Java Language Support Extension',
                        version: '1.0.0'
                    },
                    javaDebuggerExtension: {
                        name: 'Java Debugger Extension',
                        version: undefined
                    }
                };

                getPreReqVersionsStub.resolves(dependencies);

                const dependencyManager: DependencyManager = DependencyManager.instance();
                const result: boolean = await dependencyManager.hasPreReqsInstalled(undefined, true);

                result.should.equal(false);
                getPreReqVersionsStub.should.have.been.calledOnce;

            });

            it(`should return false if the optional Java Test Runner Extension hasn't been installed`, async () => {
                mySandBox.stub(process, 'platform').value('linux');

                const dependencies: any = {
                    node: {
                        name: 'Node.js',
                        version: '8.12.0',
                        requiredVersion: Dependencies.NODEJS_REQUIRED
                    },
                    npm: {
                        name: 'npm',
                        version: '6.4.1',
                        requiredVersion: Dependencies.NPM_REQUIRED
                    },
                    docker: {
                        name: 'Docker',
                        version: '18.1.2',
                        requiredVersion: Dependencies.DOCKER_REQUIRED
                    },
                    dockerCompose: {
                        name: 'Docker Compose',
                        version: '1.21.1',
                        requiredVersion: Dependencies.DOCKER_COMPOSE_REQUIRED
                    },
                    systemRequirements: {
                        name: 'System Requirements',
                        complete: true
                    },
                    go: {
                        name: 'Go',
                        version: '2.0.0',
                        requiredVersion: Dependencies.GO_REQUIRED
                    },
                    goExtension: {
                        name: 'Go Extension',
                        version: '1.0.0'
                    },
                    java: {
                        name: 'Java OpenJDK 8',
                        version: '1.8.0',
                        requiredVersion: Dependencies.JAVA_REQUIRED
                    },
                    javaLanguageExtension: {
                        name: 'Java Language Support Extension',
                        version: '1.0.0'
                    },
                    javaDebuggerExtension: {
                        name: 'Java Debugger Extension',
                        version: '1.0.0'
                    },
                    javaTestRunnerExtension: {
                        name: 'Java Test Runner Extension',
                        version: undefined
                    }
                };

                getPreReqVersionsStub.resolves(dependencies);

                const dependencyManager: DependencyManager = DependencyManager.instance();
                const result: boolean = await dependencyManager.hasPreReqsInstalled(undefined, true);

                result.should.equal(false);
                getPreReqVersionsStub.should.have.been.calledOnce;

            });

            it(`should return true if all the optional prereqs have been installed`, async () => {
                mySandBox.stub(process, 'platform').value('linux');

                const dependencies: any = {
                    node: {
                        name: 'Node.js',
                        version: '8.12.0',
                        requiredVersion: Dependencies.NODEJS_REQUIRED
                    },
                    npm: {
                        name: 'npm',
                        version: '6.4.1',
                        requiredVersion: Dependencies.NPM_REQUIRED
                    },
                    docker: {
                        name: 'Docker',
                        version: '18.1.2',
                        requiredVersion: Dependencies.DOCKER_REQUIRED
                    },
                    dockerCompose: {
                        name: 'Docker Compose',
                        version: '1.21.1',
                        requiredVersion: Dependencies.DOCKER_COMPOSE_REQUIRED
                    },
                    systemRequirements: {
                        name: 'System Requirements',
                        complete: true
                    },
                    go: {
                        name: 'Go',
                        version: '2.0.0',
                        requiredVersion: Dependencies.GO_REQUIRED
                    },
                    goExtension: {
                        name: 'Go Extension',
                        version: '1.0.0'
                    },
                    java: {
                        name: 'Java OpenJDK 8',
                        version: '1.8.0',
                        requiredVersion: Dependencies.JAVA_REQUIRED
                    },
                    javaLanguageExtension: {
                        name: 'Java Language Support Extension',
                        version: '1.0.0'
                    },
                    javaDebuggerExtension: {
                        name: 'Java Debugger Extension',
                        version: '1.0.0'
                    },
                    javaTestRunnerExtension: {
                        name: 'Java Test Runner Extension',
                        version: '1.0.0'
                    }
                };

                getPreReqVersionsStub.resolves(dependencies);

                const dependencyManager: DependencyManager = DependencyManager.instance();
                const result: boolean = await dependencyManager.hasPreReqsInstalled(undefined, true);

                result.should.equal(true);
                getPreReqVersionsStub.should.have.been.calledOnce;

            });

        });
    });

    describe('getPreReqVersions', () => {

        let sendCommandStub: sinon.SinonStub;
        let extensionData: ExtensionData;
        let dependencyManager: DependencyManager;
        before(async () => {
            await TestUtil.setupTests(mySandBox);
        });

        beforeEach(async () => {

            extensionData = DEFAULT_EXTENSION_DATA;
            extensionData.preReqPageShown = true;
            extensionData.dockerForWindows = false;
            extensionData.systemRequirements = false;
            extensionData.version = currentExtensionVersion;
            extensionData.generatorVersion = extDeps['generator-fabric'];

            await GlobalState.update(extensionData);

            dependencyManager = DependencyManager.instance();

            sendCommandStub = mySandBox.stub(CommandUtil, 'sendCommand');
            sendCommandStub.resolves();

        });

        afterEach(async () => {
            mySandBox.restore();
        });

        it('should get extension context if not passed to dependency manager', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            sendCommandStub.withArgs('node -v').resolves('v8.12.0');

            const _dependencyManager: DependencyManager = DependencyManager.instance();
            const result: any = await _dependencyManager.getPreReqVersions();
            result.node.version.should.equal('8.12.0');
        });

        it('should get version of node', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            sendCommandStub.withArgs('node -v').resolves('v8.12.0');

            const result: any = await dependencyManager.getPreReqVersions();
            result.node.version.should.equal('8.12.0');
        });

        it('should not get version of node if command not found', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            sendCommandStub.withArgs('node -v').resolves('-bash: node: command not found');

            const result: any = await dependencyManager.getPreReqVersions();
            should.not.exist(result.node.version);
        });

        it('should not get version of node if unexpected format is returned', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            sendCommandStub.withArgs('node -v').resolves('something v1.2.3');

            const result: any = await dependencyManager.getPreReqVersions();
            should.not.exist(result.node.version);
        });

        it('should get version of npm', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            sendCommandStub.withArgs('npm -v').resolves('6.4.1');

            const result: any = await dependencyManager.getPreReqVersions();
            result.npm.version.should.equal('6.4.1');
        });

        it('should not get version of npm if command not found', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            sendCommandStub.withArgs('npm -v').resolves('-bash: npm: command not found');

            const result: any = await dependencyManager.getPreReqVersions();
            should.not.exist(result.npm.version);
        });

        it('should not get version of npm if unexpected format is returned', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            sendCommandStub.withArgs('npm -v').resolves('something v1.2.3');

            const result: any = await dependencyManager.getPreReqVersions();
            should.not.exist(result.npm.version);
        });

        it('should get version of Docker', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            sendCommandStub.withArgs('docker -v').resolves('Docker version 18.06.1-ce, build e68fc7a');

            const result: any = await dependencyManager.getPreReqVersions();
            result.docker.version.should.equal('18.6.1');
        });

        it('should not get version of Docker if command not found', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            sendCommandStub.withArgs('docker -v').resolves('-bash: /usr/local/bin/docker: No such file or directory');

            const result: any = await dependencyManager.getPreReqVersions();
            should.not.exist(result.docker.version);
        });

        it('should not get version of Docker if unexpected format is returned', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            sendCommandStub.withArgs('docker -v').resolves('version 1-2-3, community edition');

            const result: any = await dependencyManager.getPreReqVersions();
            should.not.exist(result.docker.version);
        });

        it('should get version of Docker Compose', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            sendCommandStub.withArgs('docker-compose -v').resolves('docker-compose version 1.22.0, build f46880f');

            const result: any = await dependencyManager.getPreReqVersions();
            result.dockerCompose.version.should.equal('1.22.0');
        });

        it('should not get version of Docker Compose if command not found', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            sendCommandStub.withArgs('docker-compose -v').resolves('-bash: docker-compose: command not found');

            const result: any = await dependencyManager.getPreReqVersions();
            should.not.exist(result.dockerCompose.version);
        });

        it('should not get version of Docker Compose if unexpected format is returned', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            sendCommandStub.withArgs('docker-compose -v').resolves('version 1-2-3, something');

            const result: any = await dependencyManager.getPreReqVersions();
            should.not.exist(result.dockerCompose.version);
        });

        it('should get version of Go', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            sendCommandStub.withArgs('go version').resolves('go version go1.12.7 darwin/amd64');

            const result: any = await dependencyManager.getPreReqVersions();
            result.go.version.should.equal('1.12.7');
        });

        it('should not get version of Go if command not found', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            sendCommandStub.withArgs('go version').resolves('-bash: go: command not found');

            const result: any = await dependencyManager.getPreReqVersions();
            should.not.exist(result.go.version);
        });

        it('should not get version of Go if unexpected format is returned', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            sendCommandStub.withArgs('go version').resolves('go version go-version-one.two.three x64');

            const result: any = await dependencyManager.getPreReqVersions();
            should.not.exist(result.go.version);
        });

        it('should get version of Go Extension', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            const getExtensionStub: sinon.SinonStub = mySandBox.stub(vscode.extensions, 'getExtension');
            getExtensionStub.withArgs('ms-vscode.Go').returns({
                packageJSON: {
                    version: '1.0.0'
                }
            });

            const result: any = await dependencyManager.getPreReqVersions();
            result.goExtension.version.should.equal('1.0.0');
        });

        it('should not get version of Go Extension if it cannot be found', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            const getExtensionStub: sinon.SinonStub = mySandBox.stub(vscode.extensions, 'getExtension');
            getExtensionStub.withArgs('ms-vscode.Go').returns(undefined);

            const result: any = await dependencyManager.getPreReqVersions();
            should.not.exist(result.goExtension.version);
        });

        it('should get version of Java', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');
            sendCommandStub.withArgs('java -version 2>&1').resolves('openjdk version "1.8.0_212"');

            const result: any = await dependencyManager.getPreReqVersions();
            result.java.version.should.equal('1.8.0');
        });

        it('should not get version of Java if it cannot be found', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');
            sendCommandStub.withArgs('java -version 2>&1').resolves('command not found');

            const result: any = await dependencyManager.getPreReqVersions();
            should.not.exist(result.java.version);
        });

        it('should not get version of Java if unexpected format is returned', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            sendCommandStub.withArgs('java -version 2>&1').resolves('openjdk version "version one.two.three"');

            const result: any = await dependencyManager.getPreReqVersions();
            should.not.exist(result.java.version);
        });

        it('should get version of Java Language Extension', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            const getExtensionStub: sinon.SinonStub = mySandBox.stub(vscode.extensions, 'getExtension');
            getExtensionStub.withArgs('redhat.java').returns({
                packageJSON: {
                    version: '2.0.0'
                }
            });

            const result: any = await dependencyManager.getPreReqVersions();
            result.javaLanguageExtension.version.should.equal('2.0.0');
        });

        it('should not get version of Java Language Extension if it cannot be found', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            const getExtensionStub: sinon.SinonStub = mySandBox.stub(vscode.extensions, 'getExtension');
            getExtensionStub.withArgs('redhat.java').returns(undefined);

            const result: any = await dependencyManager.getPreReqVersions();
            should.not.exist(result.javaLanguageExtension.version);
        });

        it('should get version of Java Debugger Extension', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            const getExtensionStub: sinon.SinonStub = mySandBox.stub(vscode.extensions, 'getExtension');
            getExtensionStub.withArgs('vscjava.vscode-java-debug').returns({
                packageJSON: {
                    version: '3.0.0'
                }
            });

            const result: any = await dependencyManager.getPreReqVersions();
            result.javaDebuggerExtension.version.should.equal('3.0.0');
        });

        it('should not get version of Java Debugger Extension if it cannot be found', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            const getExtensionStub: sinon.SinonStub = mySandBox.stub(vscode.extensions, 'getExtension');
            getExtensionStub.withArgs('vscjava.vscode-java-debug').returns(undefined);

            const result: any = await dependencyManager.getPreReqVersions();
            should.not.exist(result.javaDebuggerExtension.version);
        });

        it('should get version of Java Test Runner Extension', async () => {
            const getExtensionStub: sinon.SinonStub = mySandBox.stub(vscode.extensions, 'getExtension');
            getExtensionStub.withArgs('vscjava.vscode-java-test').returns({
                packageJSON: {
                    version: '2.0.0'
                }
            });

            const result: any = await dependencyManager.getPreReqVersions();
            result.javaTestRunnerExtension.version.should.equal('2.0.0');
        });

        it('should not get version of Java Test Runner Extension if it cannot be found', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            const getExtensionStub: sinon.SinonStub = mySandBox.stub(vscode.extensions, 'getExtension');
            getExtensionStub.withArgs('vscjava.vscode-java-test').returns(undefined);

            const result: any = await dependencyManager.getPreReqVersions();
            should.not.exist(result.javaTestRunnerExtension.version);
        });

        it('should return true if user has agreed to system requirements', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            const newExtensionData: ExtensionData = DEFAULT_EXTENSION_DATA;

            newExtensionData.preReqPageShown = true;
            newExtensionData.dockerForWindows = false;
            newExtensionData.systemRequirements = true;
            newExtensionData.version = currentExtensionVersion;
            newExtensionData.generatorVersion = extDeps['generator-fabric'];
            await GlobalState.update(newExtensionData);

            const result: any = await dependencyManager.getPreReqVersions();
            result.systemRequirements.complete.should.equal(true);
        });

        it(`should return false if user hasn't agreed to system requirements`, async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            const newExtensionData: ExtensionData = DEFAULT_EXTENSION_DATA;
            newExtensionData.preReqPageShown = true;
            newExtensionData.dockerForWindows = false;
            newExtensionData.systemRequirements = false;
            newExtensionData.version = currentExtensionVersion;
            newExtensionData.generatorVersion = extDeps['generator-fabric'];
            await GlobalState.update(newExtensionData);

            const result: any = await dependencyManager.getPreReqVersions();
            result.systemRequirements.complete.should.equal(false);
        });

        it('should only get non-local fabric versions', async () => {
            getExtensionLocalFabricSetting.returns(false);

            mySandBox.stub(process, 'platform').value('some_other_platform');
            await dependencyManager.getPreReqVersions();

            sendCommandStub.should.not.have.been.calledWith('docker -v');
            sendCommandStub.should.not.have.been.calledWith('docker-compose -v');
        });

        describe('Windows', () => {

            it('should get version of OpenSSL', async () => {
                mySandBox.stub(process, 'platform').value('win32');

                sendCommandStub.withArgs('openssl version -v').resolves('OpenSSL 1.0.2k  26 Jan 2017');

                const result: any = await dependencyManager.getPreReqVersions();
                result.openssl.version.should.equal('1.0.2');
            });

            it('should not get version of OpenSSL if command not found', async () => {
                mySandBox.stub(process, 'platform').value('win32');

                sendCommandStub.withArgs('openssl version -v').resolves('openssl not recognized');

                const result: any = await dependencyManager.getPreReqVersions();
                should.not.exist(result.openssl.version);
            });

            it('should not get version of OpenSSL if unexpected format is returned', async () => {
                mySandBox.stub(process, 'platform').value('win32');

                sendCommandStub.withArgs('openssl version -v').resolves('OpenSSL version 1.2.3');

                const result: any = await dependencyManager.getPreReqVersions();
                should.not.exist(result.openssl.version);
            });

            it('should get version of Windows Build Tools', async () => {
                mySandBox.stub(process, 'platform').value('win32');

                sendCommandStub.withArgs('npm ls -g windows-build-tools').resolves('windows-build-tools@5.2.2');

                const result: any = await dependencyManager.getPreReqVersions();
                result.buildTools.version.should.equal('5.2.2');
            });

            it('should not get version of Windows Build Tools if command not found', async () => {
                mySandBox.stub(process, 'platform').value('win32');

                sendCommandStub.withArgs('npm ls -g windows-build-tools').resolves('command not found');

                const result: any = await dependencyManager.getPreReqVersions();
                should.not.exist(result.buildTools.version);
            });

            it('should not get version of Windows Build Tools if unexpected format is returned', async () => {
                mySandBox.stub(process, 'platform').value('win32');

                sendCommandStub.withArgs('npm ls -g windows-build-tools').resolves('windows-build-tools@version-1.2.3');

                const result: any = await dependencyManager.getPreReqVersions();
                should.not.exist(result.buildTools.version);
            });

            it('should return true if user has agreed to Docker setup', async () => {
                mySandBox.stub(process, 'platform').value('win32');

                const newExtensionData: ExtensionData = DEFAULT_EXTENSION_DATA;
                newExtensionData.preReqPageShown = true;
                newExtensionData.dockerForWindows = true;
                newExtensionData.systemRequirements = false;
                newExtensionData.version = currentExtensionVersion;
                newExtensionData.generatorVersion = extDeps['generator-fabric'];
                await GlobalState.update(newExtensionData);

                const result: any = await dependencyManager.getPreReqVersions();
                result.dockerForWindows.complete.should.equal(true);
            });

            it(`should return false if user hasn't agreed to Docker setup`, async () => {
                mySandBox.stub(process, 'platform').value('win32');

                const newExtensionData: ExtensionData = DEFAULT_EXTENSION_DATA;
                newExtensionData.preReqPageShown = true;
                newExtensionData.dockerForWindows = false;
                newExtensionData.systemRequirements = false;
                newExtensionData.version = currentExtensionVersion;
                newExtensionData.generatorVersion = extDeps['generator-fabric'];
                await GlobalState.update(newExtensionData);

                const result: any = await dependencyManager.getPreReqVersions();
                result.dockerForWindows.complete.should.equal(false);
            });

            it('should only get non-local fabric versions for Windows', async () => {
                getExtensionLocalFabricSetting.returns(false);

                mySandBox.stub(process, 'platform').value('win32');
                await dependencyManager.getPreReqVersions();

                sendCommandStub.should.not.have.been.calledWith('docker -v');
                sendCommandStub.should.not.have.been.calledWith('docker-compose -v');
                sendCommandStub.should.not.have.been.calledWith('openssl version -v');
                sendCommandStub.should.not.have.been.calledWith('npm ls -g windows-build-tools');
            });

        });

        describe('Mac', () => {

            it('should get version of Xcode', async () => {
                mySandBox.stub(process, 'platform').value('darwin');

                sendCommandStub.withArgs('xcode-select -p').resolves('/some/path');
                sendCommandStub.withArgs('xcode-select -v').resolves('xcode-select version 2354.');

                const result: any = await dependencyManager.getPreReqVersions();
                result.xcode.version.should.equal('2354');
            });

            it('should not get version of Xcode if command not found', async () => {
                mySandBox.stub(process, 'platform').value('darwin');

                sendCommandStub.withArgs('xcode-select -p').resolves('command not found');

                const result: any = await dependencyManager.getPreReqVersions();
                should.not.exist(result.xcode.version);
            });

        });

    });
});
