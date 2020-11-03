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
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { version as currentExtensionVersion, dependencies as extDeps } from '../../package.json';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';
import { DependencyManager } from '../../extension/dependencies/DependencyManager';
import { CommandUtil } from '../../extension/util/CommandUtil';
import { TestUtil } from '../TestUtil';
import { GlobalState, ExtensionData, DEFAULT_EXTENSION_DATA } from '../../extension/util/GlobalState.js';
import { Dependencies, defaultDependencies, DependencyProperties } from '../../extension/dependencies/Dependencies';
import * as semver from 'semver';
import * as OS from 'os';

chai.should();
chai.use(chaiAsPromised);
chai.use(sinonChai);
const should: Chai.Should = chai.should();

const validDependencies: Dependencies = {
    docker: {
        ...defaultDependencies.required.docker,
        version: '18.1.2',
    },
    dockerCompose: {
        ...defaultDependencies.required.dockerCompose,
        version: '1.21.1',
    },
    systemRequirements: {
        ...defaultDependencies.required.systemRequirements,
        complete: true
    },
    node: {
        ...defaultDependencies.optional.node,
        version: '10.15.3',
    },
    npm: {
        ...defaultDependencies.optional.npm,
        version: '6.4.1',
    },
    go: {
        ...defaultDependencies.optional.go,
        version: '2.0.0',
    },
    goExtension: {
        ...defaultDependencies.optional.goExtension,
        version: '1.0.0'
    },
    java: {
        ...defaultDependencies.optional.java,
        version: '1.8.0',
    },
    javaLanguageExtension: {
        ...defaultDependencies.optional.javaLanguageExtension,
        version: '1.0.0'
    },
    javaDebuggerExtension: {
        ...defaultDependencies.optional.javaDebuggerExtension,
        version: '1.0.0'
    },
    javaTestRunnerExtension: {
        ...defaultDependencies.optional.javaTestRunnerExtension,
        version: '1.0.0'
    },
    nodeTestRunnerExtension: {
        ...defaultDependencies.optional.nodeTestRunnerExtension,
        version: '1.0.0'
    },
    ibmCloudAccountExtension: {
        ...defaultDependencies.optional.ibmCloudAccountExtension,
        version: '1.0.0',
    },
};

// tslint:disable no-unused-expression
describe('DependencyManager Tests', () => {
    const mySandBox: sinon.SinonSandbox = sinon.createSandbox();
    let getExtensionLocalFabricSetting: sinon.SinonStub;

    beforeEach(async () => {
        getExtensionLocalFabricSetting = mySandBox.stub(ExtensionUtil, 'getExtensionLocalFabricSetting').returns(true);
    });

    afterEach(async () => {
        mySandBox.restore();
    });

    describe('isValidDependency', () => {
        let semverSatisfiesStub: sinon.SinonStub;
        let dependencyManager: DependencyManager;

        beforeEach(async () => {
            mySandBox.stub(process, 'platform').value('linux'); // We don't have any Linux only prereqs, so this is okay.
            dependencyManager = DependencyManager.instance();
            getExtensionLocalFabricSetting.returns(false);
            semverSatisfiesStub = mySandBox.stub(semver, 'satisfies').returns(false);
        });

        it(`should return false when dependency version is incorrect, absent or incomplete`, async () => {
            const dependenciesWithoutVersions: object = [defaultDependencies.required, defaultDependencies.optional];
            const dependenciesKeys: string[] = Object.getOwnPropertyNames(dependenciesWithoutVersions);

            for (let i: number = 0; i < dependenciesKeys.length; i++) {
                const result: boolean = dependencyManager.isValidDependency(dependenciesWithoutVersions[dependenciesKeys[i]]);
                try {
                    result.should.equal(false);
                } catch (error) {
                    throw new Error(`Dependency ${dependenciesKeys[i]} should not be valid - ${error.message}`);
                }
            }
        });

        it(`should return true when dependency version is correct, present or complete`, async () => {
            semverSatisfiesStub.returns(true);
            const dependenciesKeys: string[] = Object.getOwnPropertyNames(validDependencies);

            for (let i: number = 0; i < dependenciesKeys.length; i++) {
                const result: boolean = dependencyManager.isValidDependency(validDependencies[dependenciesKeys[i]]);
                try {
                    result.should.equal(true);
                } catch (error) {
                    throw new Error(`Dependency ${dependenciesKeys[i]} should be valid - ${error.message}`);
                }
            }
        });

        it(`should be able to handle unknown dependencies`, async () => {
            const dependencies: any = {
                docker: {
                    name: 'some_dependency',
                    version: '0.0.1',
                }
            };

            const result: boolean = dependencyManager.isValidDependency(dependencies);

            result.should.equal(false);
        });

    });

    describe('hasPreReqsInstalled', () => {
        let getPreReqVersionsStub: sinon.SinonStub;

        beforeEach(async () => {
            getPreReqVersionsStub = mySandBox.stub(DependencyManager.prototype, 'getPreReqVersions');
        });

        it(`should return false if there's no Docker version`, async () => {
            const dependencies: Dependencies = {
                ...validDependencies,
                docker: {
                    ...defaultDependencies.required.docker,
                    version: undefined,
                }
            };

            getPreReqVersionsStub.resolves(dependencies);

            const dependencyManager: DependencyManager = DependencyManager.instance();
            const result: boolean = await dependencyManager.hasPreReqsInstalled();

            result.should.equal(false);
            getPreReqVersionsStub.should.have.been.calledOnce;

        });

        it(`should return false if Docker version is less than required version`, async () => {
            const dependencies: Dependencies = {
                ...validDependencies,
                docker: {
                    ...defaultDependencies.required.docker,
                    version: '16.0.0',
                }
            };

            getPreReqVersionsStub.resolves(dependencies);

            const dependencyManager: DependencyManager = DependencyManager.instance();
            const result: boolean = await dependencyManager.hasPreReqsInstalled();

            result.should.equal(false);
            getPreReqVersionsStub.should.have.been.calledOnce;

        });

        it(`should return false if there's no Docker Compose version`, async () => {
            const dependencies: Dependencies = {
                ...validDependencies,
                dockerCompose: {
                    ...defaultDependencies.required.dockerCompose,
                    version: undefined,
                }
            };

            getPreReqVersionsStub.resolves(dependencies);

            const dependencyManager: DependencyManager = DependencyManager.instance();
            const result: boolean = await dependencyManager.hasPreReqsInstalled();

            result.should.equal(false);
            getPreReqVersionsStub.should.have.been.calledOnce;

        });

        it(`should return false if Docker Compose version is less than required version`, async () => {
            const dependencies: Dependencies = {
                ...validDependencies,
                dockerCompose: {
                    ...defaultDependencies.required.dockerCompose,
                    version: '1.1.2',
                }
            };

            getPreReqVersionsStub.resolves(dependencies);

            const dependencyManager: DependencyManager = DependencyManager.instance();
            const result: boolean = await dependencyManager.hasPreReqsInstalled();

            result.should.equal(false);
            getPreReqVersionsStub.should.have.been.calledOnce;

        });

        it(`should return false if they haven't confirmed to have system requirements`, async () => {
            const dependencies: Dependencies = {
                ...validDependencies,
                systemRequirements: {
                    ...defaultDependencies.required.systemRequirements,
                    complete: undefined,
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
                docker: {
                    ...defaultDependencies.required.docker,
                    version: '18.1.2',
                },
                dockerCompose: {
                    ...defaultDependencies.required.dockerCompose,
                    version: '1.21.1',
                },
                systemRequirements: {
                    ...defaultDependencies.required.systemRequirements,
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

            const dependencyManager: DependencyManager = DependencyManager.instance();
            const result: boolean = await dependencyManager.hasPreReqsInstalled(validDependencies);

            result.should.equal(true);
            getPreReqVersionsStub.should.not.have.been.called;

        });

        describe('Windows', () => {
            it(`should return false if there's no OpenSSL version (Windows)`, async () => {
                mySandBox.stub(process, 'platform').value('win32');

                const dependencies: Dependencies = {
                    ...validDependencies,
                    openssl: {
                        ...defaultDependencies.required.openssl,
                        version: undefined,
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

                const dependencies: Dependencies = {
                    ...validDependencies,
                    openssl: {
                        ...defaultDependencies.required.openssl,
                        version: '1.0.6',
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

                const dependencies: Dependencies = {
                    ...validDependencies,
                    dockerForWindows: {
                        ...defaultDependencies.required.dockerForWindows,
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
                    docker: {
                        ...defaultDependencies.required.docker,
                        version: '18.1.2',
                    },
                    dockerCompose: {
                        ...defaultDependencies.required.dockerCompose,
                        version: '1.21.1',
                    },
                    systemRequirements: {
                        ...defaultDependencies.required.systemRequirements,
                        complete: true
                    },
                    openssl: {
                        ...defaultDependencies.required.openssl,
                        version: '1.0.2',
                    },
                    dockerForWindows: {
                        ...defaultDependencies.required.dockerForWindows,
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
                };

                getPreReqVersionsStub.resolves(dependencies);

                const dependencyManager: DependencyManager = DependencyManager.instance();
                const result: boolean = await dependencyManager.hasPreReqsInstalled();

                result.should.equal(true);
                getPreReqVersionsStub.should.have.been.calledOnce;

            });
        });

        describe('Mac', () => {
            it(`should return true if all Mac prereqs have been met (Mac)`, async () => {
                mySandBox.stub(process, 'platform').value('darwin');

                const dependencies: any = {
                    docker: {
                        ...defaultDependencies.required.docker,
                        version: '18.1.2',
                    },
                    dockerCompose: {
                        ...defaultDependencies.required.dockerCompose,
                        version: '1.21.1',
                    },
                    systemRequirements: {
                        ...defaultDependencies.required.systemRequirements,
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

        describe('optional dependencies', () => {

            it(`should return false the optional Node dependency hasn't been installed`, async () => {
                const dependencies: Dependencies = {
                    ...validDependencies,
                    node: {
                        ...defaultDependencies.optional.node,
                        version: undefined,
                    }
                };

                getPreReqVersionsStub.resolves(dependencies);

                const dependencyManager: DependencyManager = DependencyManager.instance();
                const result: boolean = await dependencyManager.hasPreReqsInstalled(undefined, true);

                result.should.equal(false);
                getPreReqVersionsStub.should.have.been.calledOnce;

            });

            it(`should return false if wrong Node version`, async () => {
                const dependencies: Dependencies = {
                    ...validDependencies,
                    node: {
                        ...defaultDependencies.optional.node,
                        version: '8.12.0',
                    }
                };

                getPreReqVersionsStub.resolves(dependencies);

                const dependencyManager: DependencyManager = DependencyManager.instance();
                const resultNode8: boolean = await dependencyManager.hasPreReqsInstalled(undefined, true);
                resultNode8.should.equal(false);

                dependencies.node.version = '10.15.2';
                const resultNode10low: boolean = await dependencyManager.hasPreReqsInstalled(undefined, true);
                resultNode10low.should.equal(false);

                dependencies.node.version = '11.1.1';
                const resultNode11: boolean = await dependencyManager.hasPreReqsInstalled(undefined, true);
                resultNode11.should.equal(false);

                dependencies.node.version = '12.13.0';
                const resultNode12low: boolean = await dependencyManager.hasPreReqsInstalled(undefined, true);
                resultNode12low.should.equal(false);

                dependencies.node.version = '13.0.0';
                const resultNode13: boolean = await dependencyManager.hasPreReqsInstalled(undefined, true);
                resultNode13.should.equal(false);

                getPreReqVersionsStub.callCount.should.equal(5);

            });

            it(`should return false if the optional npm dependency hasn't been installed`, async () => {
                const dependencies: Dependencies = {
                    ...validDependencies,
                    npm: {
                        ...defaultDependencies.optional.npm,
                        version: undefined,
                    }
                };

                getPreReqVersionsStub.resolves(dependencies);

                const dependencyManager: DependencyManager = DependencyManager.instance();
                const result: boolean = await dependencyManager.hasPreReqsInstalled(undefined, true);

                result.should.equal(false);
                getPreReqVersionsStub.should.have.been.calledOnce;

            });

            it(`should return false if the optional npm dependency version is less than required version`, async () => {
                const dependencies: Dependencies = {
                    ...validDependencies,
                    npm: {
                        ...defaultDependencies.optional.npm,
                        version: '4.0.0',
                    }
                };

                getPreReqVersionsStub.resolves(dependencies);

                const dependencyManager: DependencyManager = DependencyManager.instance();
                const result: boolean = await dependencyManager.hasPreReqsInstalled(undefined, true);

                result.should.equal(false);
                getPreReqVersionsStub.should.have.been.calledOnce;

            });

            it(`should return false if the optional Go dependency hasn't been installed`, async () => {
                mySandBox.stub(process, 'platform').value('linux');

                const dependencies: Dependencies = {
                    ...validDependencies,
                    go: {
                        ...defaultDependencies.optional.go,
                        version: undefined,
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

                const dependencies: Dependencies = {
                    ...validDependencies,
                    go: {
                        ...defaultDependencies.optional.go,
                        version: '1.0.0',
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

                const dependencies: Dependencies = {
                    ...validDependencies,
                    goExtension: {
                        ...defaultDependencies.optional.goExtension,
                        version: undefined,
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

                const dependencies: Dependencies = {
                    ...validDependencies,
                    java: {
                        ...defaultDependencies.optional.java,
                        version: undefined,
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

                const dependencies: Dependencies = {
                    ...validDependencies,
                    java: {
                        ...defaultDependencies.optional.java,
                        version: '1.7.1',
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

                const dependencies: Dependencies = {
                    ...validDependencies,
                    javaLanguageExtension: {
                        ...defaultDependencies.optional.javaLanguageExtension,
                        version: undefined,
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

                const dependencies: Dependencies = {
                    ...validDependencies,
                    javaDebuggerExtension: {
                        ...defaultDependencies.optional.javaDebuggerExtension,
                        version: undefined,
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

                const dependencies: Dependencies = {
                    ...validDependencies,
                    javaTestRunnerExtension: {
                        ...defaultDependencies.optional.javaTestRunnerExtension,
                        version: undefined,
                    }
                };

                getPreReqVersionsStub.resolves(dependencies);

                const dependencyManager: DependencyManager = DependencyManager.instance();
                const result: boolean = await dependencyManager.hasPreReqsInstalled(undefined, true);

                result.should.equal(false);
                getPreReqVersionsStub.should.have.been.calledOnce;

            });

            it(`should return false if the optional Node Test Runner Extension hasn't been installed`, async () => {
                mySandBox.stub(process, 'platform').value('linux');

                const dependencies: Dependencies = {
                    ...validDependencies,
                    nodeTestRunnerExtension: {
                        ...defaultDependencies.optional.nodeTestRunnerExtension,
                        version: undefined,
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

                getPreReqVersionsStub.resolves(validDependencies);

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
        let totalmemStub: sinon.SinonStub;
        before(async () => {
            await TestUtil.setupTests(mySandBox);
        });

        beforeEach(async () => {

            extensionData = DEFAULT_EXTENSION_DATA;
            extensionData.preReqPageShown = true;
            extensionData.dockerForWindows = false;
            extensionData.version = currentExtensionVersion;
            extensionData.generatorVersion = extDeps['generator-fabric'];

            totalmemStub = mySandBox.stub(OS, 'totalmem');
            totalmemStub.returns(4294967296);

            await GlobalState.update(extensionData);

            dependencyManager = DependencyManager.instance();

            sendCommandStub = mySandBox.stub(CommandUtil, 'sendCommand');
            sendCommandStub.resolves();

        });

        it('should get extension context if not passed to dependency manager', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            sendCommandStub.withArgs('node -v').resolves('v10.15.3');

            const _dependencyManager: DependencyManager = DependencyManager.instance();
            const result: Dependencies = await _dependencyManager.getPreReqVersions();
            result.node.version.should.equal('10.15.3');
            totalmemStub.should.have.been.calledOnce;
        });

        it('should get version of node', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            sendCommandStub.withArgs('node -v').resolves('v10.15.3');

            const result: Dependencies = await dependencyManager.getPreReqVersions();
            result.node.version.should.equal('10.15.3');
            totalmemStub.should.have.been.calledOnce;
        });

        it('should not get version of node if command not found', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            sendCommandStub.withArgs('node -v').resolves('-bash: node: command not found');

            const result: Dependencies = await dependencyManager.getPreReqVersions();
            should.not.exist(result.node.version);
            totalmemStub.should.have.been.calledOnce;
        });

        it('should not get version of node if unexpected format is returned', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            sendCommandStub.withArgs('node -v').resolves('something v1.2.3');

            const result: Dependencies = await dependencyManager.getPreReqVersions();
            should.not.exist(result.node.version);
            totalmemStub.should.have.been.calledOnce;
        });

        it('should get version of npm', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            sendCommandStub.withArgs('npm -v').resolves('6.4.1');

            const result: Dependencies = await dependencyManager.getPreReqVersions();
            result.npm.version.should.equal('6.4.1');
            totalmemStub.should.have.been.calledOnce;
        });

        it('should not get version of npm if command not found', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            sendCommandStub.withArgs('npm -v').resolves('-bash: npm: command not found');

            const result: Dependencies = await dependencyManager.getPreReqVersions();
            should.not.exist(result.npm.version);
            totalmemStub.should.have.been.calledOnce;
        });

        it('should not get version of npm if unexpected format is returned', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            sendCommandStub.withArgs('npm -v').resolves('something v1.2.3');

            const result: Dependencies = await dependencyManager.getPreReqVersions();
            should.not.exist(result.npm.version);
            totalmemStub.should.have.been.calledOnce;
        });

        it('should get version of Docker', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            sendCommandStub.withArgs('docker -v').resolves('Docker version 18.06.1-ce, build e68fc7a');

            const result: Dependencies = await dependencyManager.getPreReqVersions();
            result.docker.version.should.equal('18.6.1');
            totalmemStub.should.have.been.calledOnce;
        });

        it('should not get version of Docker if command not found', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            sendCommandStub.withArgs('docker -v').resolves('-bash: /usr/local/bin/docker: No such file or directory');

            const result: Dependencies = await dependencyManager.getPreReqVersions();
            should.not.exist(result.docker.version);
            totalmemStub.should.have.been.calledOnce;
        });

        it('should not get version of Docker if unexpected format is returned', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            sendCommandStub.withArgs('docker -v').resolves('version 1-2-3, community edition');

            const result: Dependencies = await dependencyManager.getPreReqVersions();
            should.not.exist(result.docker.version);
            totalmemStub.should.have.been.calledOnce;
        });

        it('should get version of Docker Compose', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            sendCommandStub.withArgs('docker-compose -v').resolves('docker-compose version 1.22.0, build f46880f');

            const result: Dependencies = await dependencyManager.getPreReqVersions();
            result.dockerCompose.version.should.equal('1.22.0');
            totalmemStub.should.have.been.calledOnce;
        });

        it('should not get version of Docker Compose if command not found', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            sendCommandStub.withArgs('docker-compose -v').resolves('-bash: docker-compose: command not found');

            const result: Dependencies = await dependencyManager.getPreReqVersions();
            should.not.exist(result.dockerCompose.version);
            totalmemStub.should.have.been.calledOnce;
        });

        it('should not get version of Docker Compose if unexpected format is returned', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            sendCommandStub.withArgs('docker-compose -v').resolves('version 1-2-3, something');

            const result: Dependencies = await dependencyManager.getPreReqVersions();
            should.not.exist(result.dockerCompose.version);
            totalmemStub.should.have.been.calledOnce;
        });

        it('should get version of Go', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            sendCommandStub.withArgs('go version').resolves('go version go1.12.7 darwin/amd64');

            const result: Dependencies = await dependencyManager.getPreReqVersions();
            result.go.version.should.equal('1.12.7');
            totalmemStub.should.have.been.calledOnce;
        });

        it('should not get version of Go if command not found', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            sendCommandStub.withArgs('go version').resolves('-bash: go: command not found');

            const result: Dependencies = await dependencyManager.getPreReqVersions();
            should.not.exist(result.go.version);
            totalmemStub.should.have.been.calledOnce;
        });

        it('should not get version of Go if unexpected format is returned', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            sendCommandStub.withArgs('go version').resolves('go version go-version-one.two.three x64');

            const result: Dependencies = await dependencyManager.getPreReqVersions();
            should.not.exist(result.go.version);
            totalmemStub.should.have.been.calledOnce;
        });

        it('should get version of Go Extension', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            const getExtensionStub: sinon.SinonStub = mySandBox.stub(vscode.extensions, 'getExtension');
            getExtensionStub.withArgs(DependencyProperties.GO_LANGUAGE_EXTENSION).returns({
                packageJSON: {
                    version: '1.0.0'
                }
            });

            const result: Dependencies = await dependencyManager.getPreReqVersions();
            result.goExtension.version.should.equal('1.0.0');
            totalmemStub.should.have.been.calledOnce;
        });

        it('should not get version of Go Extension if it cannot be found', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            const getExtensionStub: sinon.SinonStub = mySandBox.stub(vscode.extensions, 'getExtension');
            getExtensionStub.withArgs(DependencyProperties.GO_LANGUAGE_EXTENSION).returns(undefined);

            const result: Dependencies = await dependencyManager.getPreReqVersions();
            should.not.exist(result.goExtension.version);
            totalmemStub.should.have.been.calledOnce;
        });

        it('should get version of Java', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');
            sendCommandStub.withArgs('java -version 2>&1').resolves('openjdk version "1.8.0_212"');

            const result: Dependencies = await dependencyManager.getPreReqVersions();
            result.java.version.should.equal('1.8.0');
            totalmemStub.should.have.been.calledOnce;
        });

        it('should not get version of Java if it cannot be found', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');
            sendCommandStub.withArgs('java -version 2>&1').resolves('command not found');

            const result: Dependencies = await dependencyManager.getPreReqVersions();
            should.not.exist(result.java.version);
            totalmemStub.should.have.been.calledOnce;
        });

        it('should not get version of Java if unexpected format is returned', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            sendCommandStub.withArgs('java -version 2>&1').resolves('openjdk version "version one.two.three"');

            const result: Dependencies = await dependencyManager.getPreReqVersions();
            should.not.exist(result.java.version);
            totalmemStub.should.have.been.calledOnce;
        });

        it('should get version of Java Language Extension', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            const getExtensionStub: sinon.SinonStub = mySandBox.stub(vscode.extensions, 'getExtension');
            getExtensionStub.withArgs(DependencyProperties.JAVA_LANGUAGE_EXTENSION).returns({
                packageJSON: {
                    version: '2.0.0'
                }
            });

            const result: Dependencies = await dependencyManager.getPreReqVersions();
            result.javaLanguageExtension.version.should.equal('2.0.0');
            totalmemStub.should.have.been.calledOnce;
        });

        it('should not get version of Java Language Extension if it cannot be found', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            const getExtensionStub: sinon.SinonStub = mySandBox.stub(vscode.extensions, 'getExtension');
            getExtensionStub.withArgs(DependencyProperties.JAVA_LANGUAGE_EXTENSION).returns(undefined);

            const result: Dependencies = await dependencyManager.getPreReqVersions();
            should.not.exist(result.javaLanguageExtension.version);
            totalmemStub.should.have.been.calledOnce;
        });

        it('should get version of Java Debugger Extension', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            const getExtensionStub: sinon.SinonStub = mySandBox.stub(vscode.extensions, 'getExtension');
            getExtensionStub.withArgs(DependencyProperties.JAVA_DEBUG_EXTENSION).returns({
                packageJSON: {
                    version: '3.0.0'
                }
            });

            const result: Dependencies = await dependencyManager.getPreReqVersions();
            result.javaDebuggerExtension.version.should.equal('3.0.0');
            totalmemStub.should.have.been.calledOnce;
        });

        it('should not get version of Java Debugger Extension if it cannot be found', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            const getExtensionStub: sinon.SinonStub = mySandBox.stub(vscode.extensions, 'getExtension');
            getExtensionStub.withArgs(DependencyProperties.JAVA_DEBUG_EXTENSION).returns(undefined);

            const result: Dependencies = await dependencyManager.getPreReqVersions();
            should.not.exist(result.javaDebuggerExtension.version);
            totalmemStub.should.have.been.calledOnce;
        });

        it('should get version of Java Test Runner Extension', async () => {
            const getExtensionStub: sinon.SinonStub = mySandBox.stub(vscode.extensions, 'getExtension');
            getExtensionStub.withArgs(DependencyProperties.JAVA_TEST_RUNNER_EXTENSION).returns({
                packageJSON: {
                    version: '2.0.0'
                }
            });

            const result: Dependencies = await dependencyManager.getPreReqVersions();
            result.javaTestRunnerExtension.version.should.equal('2.0.0');
            totalmemStub.should.have.been.calledOnce;
        });

        it('should not get version of Java Test Runner Extension if it cannot be found', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            const getExtensionStub: sinon.SinonStub = mySandBox.stub(vscode.extensions, 'getExtension');
            getExtensionStub.withArgs(DependencyProperties.JAVA_TEST_RUNNER_EXTENSION).returns(undefined);

            const result: Dependencies = await dependencyManager.getPreReqVersions();
            should.not.exist(result.javaTestRunnerExtension.version);
            totalmemStub.should.have.been.calledOnce;
        });

        it('should get version of Node Test Runner Extension', async () => {
            const getExtensionStub: sinon.SinonStub = mySandBox.stub(vscode.extensions, 'getExtension');
            getExtensionStub.withArgs(DependencyProperties.NODEJS_TEST_RUNNER_EXTENSION).returns({
                packageJSON: {
                    version: '2.0.0'
                }
            });

            const result: any = await dependencyManager.getPreReqVersions();
            result.nodeTestRunnerExtension.version.should.equal('2.0.0');
            totalmemStub.should.have.been.calledOnce;
        });

        it('should not get version of Node Test Runner Extension if it cannot be found', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            const getExtensionStub: sinon.SinonStub = mySandBox.stub(vscode.extensions, 'getExtension');
            getExtensionStub.withArgs(DependencyProperties.NODEJS_TEST_RUNNER_EXTENSION).returns(undefined);

            const result: any = await dependencyManager.getPreReqVersions();
            should.not.exist(result.nodeTestRunnerExtension.version);
            totalmemStub.should.have.been.calledOnce;
        });

        it('should get version of IBM Cloud Account Extension', async () => {
            const getExtensionStub: sinon.SinonStub = mySandBox.stub(vscode.extensions, 'getExtension');
            getExtensionStub.withArgs(DependencyProperties.IBM_CLOUD_ACCOUNT_EXTENSION).returns({
                packageJSON: {
                    version: '2.0.0'
                }
            });

            const result: any = await dependencyManager.getPreReqVersions();
            result.ibmCloudAccountExtension.version.should.equal('2.0.0');
            totalmemStub.should.have.been.calledOnce;
        });

        it('should not get version of IBM Cloud Account Extension if it cannot be found', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            const getExtensionStub: sinon.SinonStub = mySandBox.stub(vscode.extensions, 'getExtension');
            getExtensionStub.withArgs(DependencyProperties.IBM_CLOUD_ACCOUNT_EXTENSION).returns(undefined);

            const result: any = await dependencyManager.getPreReqVersions();
            should.not.exist(result.ibmCloudAccountExtension.version);
            totalmemStub.should.have.been.calledOnce;
        });

        it('should return true if the computer resources meet the system requirements', async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            const newExtensionData: ExtensionData = DEFAULT_EXTENSION_DATA;

            newExtensionData.preReqPageShown = true;
            newExtensionData.dockerForWindows = false;
            newExtensionData.version = currentExtensionVersion;
            newExtensionData.generatorVersion = extDeps['generator-fabric'];
            await GlobalState.update(newExtensionData);

            const result: Dependencies = await dependencyManager.getPreReqVersions();
            result.systemRequirements.complete.should.equal(true);
            totalmemStub.should.have.been.calledOnce;
        });

        it(`should return false if the computer resources doesn't meet the system requirements`, async () => {
            mySandBox.stub(process, 'platform').value('some_other_platform');

            totalmemStub.returns(4294967295);

            const newExtensionData: ExtensionData = DEFAULT_EXTENSION_DATA;
            newExtensionData.preReqPageShown = true;
            newExtensionData.dockerForWindows = false;
            newExtensionData.version = currentExtensionVersion;
            newExtensionData.generatorVersion = extDeps['generator-fabric'];
            await GlobalState.update(newExtensionData);

            const result: Dependencies = await dependencyManager.getPreReqVersions();
            result.systemRequirements.complete.should.equal(false);
            totalmemStub.should.have.been.calledOnce;
        });

        it('should only get non-local fabric versions', async () => {
            getExtensionLocalFabricSetting.returns(false);

            mySandBox.stub(process, 'platform').value('some_other_platform');
            await dependencyManager.getPreReqVersions();

            sendCommandStub.should.not.have.been.calledWith('docker -v');
            sendCommandStub.should.not.have.been.calledWith('docker-compose -v');
        });

        describe('Windows', () => {
            let existsStub: sinon.SinonStub;
            beforeEach(async () => {
                existsStub = mySandBox.stub(fs, 'pathExists');
            });

            it('should check if OpenSSL (64-bit) is installed', async () => {
                mySandBox.stub(process, 'platform').value('win32');

                existsStub.withArgs(`C:\\OpenSSL-Win64`).resolves(true);
                sendCommandStub.withArgs(`C:\\OpenSSL-Win64\\bin\\openssl.exe version`).resolves('OpenSSL 1.1.1d  26 Jan 2017');

                const result: Dependencies = await dependencyManager.getPreReqVersions();
                result.openssl.version.should.equal('1.1.1');
                totalmemStub.should.have.been.calledOnce;
            });

            it('should not get version of OpenSSL if command not found', async () => {
                mySandBox.stub(process, 'platform').value('win32');

                existsStub.withArgs(`C:\\OpenSSL-Win64`).resolves(true);
                sendCommandStub.withArgs(`C:\\OpenSSL-Win64\\bin\\openssl.exe version`).resolves('openssl not recognized');

                const result: Dependencies = await dependencyManager.getPreReqVersions();
                should.not.exist(result.openssl.version);
                totalmemStub.should.have.been.calledOnce;
            });

            it('should not get version of OpenSSL if installation path(s) not found', async () => {
                mySandBox.stub(process, 'platform').value('win32');

                existsStub.withArgs(`C:\\OpenSSL-Win64`).resolves(false);

                const result: Dependencies = await dependencyManager.getPreReqVersions();
                should.not.exist(result.openssl.version);
                totalmemStub.should.have.been.calledOnce;
            });

            it('should not get version of OpenSSL if unexpected format is returned', async () => {
                mySandBox.stub(process, 'platform').value('win32');

                existsStub.withArgs(`C:\\OpenSSL-Win64`).resolves(true);
                sendCommandStub.withArgs(`C:\\OpenSSL-Win64\\bin\\openssl.exe version`).resolves('OpenSSL version 1.2.3');

                const result: Dependencies = await dependencyManager.getPreReqVersions();
                should.not.exist(result.openssl.version);
                totalmemStub.should.have.been.calledOnce;
            });

            it('should return true if user has agreed to Docker setup', async () => {
                mySandBox.stub(process, 'platform').value('win32');

                const newExtensionData: ExtensionData = DEFAULT_EXTENSION_DATA;
                newExtensionData.preReqPageShown = true;
                newExtensionData.dockerForWindows = true;
                newExtensionData.version = currentExtensionVersion;
                newExtensionData.generatorVersion = extDeps['generator-fabric'];
                await GlobalState.update(newExtensionData);

                const result: Dependencies = await dependencyManager.getPreReqVersions();
                result.dockerForWindows.complete.should.equal(true);
                totalmemStub.should.have.been.calledOnce;
            });

            it(`should return false if user hasn't agreed to Docker setup`, async () => {
                mySandBox.stub(process, 'platform').value('win32');

                const newExtensionData: ExtensionData = DEFAULT_EXTENSION_DATA;
                newExtensionData.preReqPageShown = true;
                newExtensionData.dockerForWindows = false;
                newExtensionData.version = currentExtensionVersion;
                newExtensionData.generatorVersion = extDeps['generator-fabric'];
                await GlobalState.update(newExtensionData);

                const result: Dependencies = await dependencyManager.getPreReqVersions();
                result.dockerForWindows.complete.should.equal(false);
                totalmemStub.should.have.been.calledOnce;
            });

            it('should only get non-local fabric versions for Windows', async () => {
                getExtensionLocalFabricSetting.returns(false);

                mySandBox.stub(process, 'platform').value('win32');
                await dependencyManager.getPreReqVersions();

                sendCommandStub.should.not.have.been.calledWith('docker -v');
                sendCommandStub.should.not.have.been.calledWith('docker-compose -v');
                sendCommandStub.should.not.have.been.calledWith('openssl version -v');
            });

        });

        describe('Mac', () => {

            it('should continue to get version if Java path exists', async () => {
                // Test for issue #1657 fix
                mySandBox.stub(process, 'platform').value('darwin');
                const pathExistsStub: sinon.SinonStub = mySandBox.stub(fs, 'pathExists').withArgs('/Library/Java/JavaVirtualMachines').resolves(true);
                sendCommandStub.withArgs('java -version 2>&1').resolves('openjdk version "1.8.0_212"');

                const result: Dependencies = await dependencyManager.getPreReqVersions();
                pathExistsStub.should.have.been.calledOnce;
                result.java.version.should.equal('1.8.0');
                totalmemStub.should.have.been.calledOnce;
            });

            it('should not continue to get version if Java path doesnt exist', async () => {
                // Test for issue #1657 fix
                mySandBox.stub(process, 'platform').value('darwin');
                const pathExistsStub: sinon.SinonStub = mySandBox.stub(fs, 'pathExists').withArgs('/Library/Java/JavaVirtualMachines').resolves(false);
                sendCommandStub.withArgs('java -version 2>&1');

                const result: Dependencies = await dependencyManager.getPreReqVersions();
                pathExistsStub.should.have.been.calledOnce;
                sendCommandStub.should.not.have.been.calledWith('java -version 2>&1');
                should.not.exist(result.java.version);
                totalmemStub.should.have.been.calledOnce;
            });

        });

    });

    describe('getPackageJsonPath', () => {
        afterEach(async () => {
            mySandBox.restore();
        });

        it('should get package json path', async () => {
            const getExtensionPathStub: sinon.SinonStub = mySandBox.stub(ExtensionUtil, 'getExtensionPath').returns('./test/dir/');
            const dependencyManager: DependencyManager = DependencyManager.instance();
            const packagePath: string = dependencyManager.getPackageJsonPath();
            getExtensionPathStub.should.have.been.calledOnce;
            packagePath.includes('/test/dir/package.json').should.equal(true);
        });
    });

    describe('getRawPackageJson', () => {
        afterEach(async () => {
            mySandBox.restore();
        });

        it('should get raw package json', async () => {
            const dependencyManager: DependencyManager = DependencyManager.instance();
            const getPackageJsonPathStub: sinon.SinonStub = mySandBox.stub(dependencyManager, 'getPackageJsonPath').returns('/some/path');
            const readFileStub: sinon.SinonStub = mySandBox.stub(fs, 'readFile').resolves('{"some":"json"}');

            const rawJson: Dependencies = await dependencyManager.getRawPackageJson();

            getPackageJsonPathStub.should.have.been.calledOnce;
            readFileStub.should.have.been.calledOnceWithExactly('/some/path', 'utf8');
            rawJson.should.deep.equal({ some: 'json' });

        });
    });

    describe('writePackageJson', () => {
        afterEach(async () => {
            mySandBox.restore();
        });

        it('should write package json', async () => {
            const dependencyManager: DependencyManager = DependencyManager.instance();
            const getPackageJsonPathStub: sinon.SinonStub = mySandBox.stub(dependencyManager, 'getPackageJsonPath').returns('/some/path');
            const writeFileStub: sinon.SinonStub = mySandBox.stub(fs, 'writeFile').resolves();

            await dependencyManager.writePackageJson({ some: 'json' });

            getPackageJsonPathStub.should.have.been.calledOnce;
            const expectedJson: any = JSON.stringify({ some: 'json' }, null, 4);
            writeFileStub.should.have.been.calledOnceWithExactly('/some/path', expectedJson, 'utf8');

        });
    });

    describe('clearExtensionCache', () => {
        afterEach(async () => {
            mySandBox.restore();
        });

        it('should clear extension cache', async () => {
            const dependencyManager: DependencyManager = DependencyManager.instance();
            const getExtensionPathStub: sinon.SinonStub = mySandBox.stub(ExtensionUtil, 'getExtensionPath').returns('/some/path');
            const utimesStub: sinon.SinonStub = mySandBox.stub(fs, 'utimes').resolves();

            await dependencyManager.clearExtensionCache();

            getExtensionPathStub.should.have.been.calledOnce;
            utimesStub.should.have.been.calledOnce;
        });
    });
});
