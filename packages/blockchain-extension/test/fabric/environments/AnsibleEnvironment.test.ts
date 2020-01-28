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
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import { TestUtil } from '../../TestUtil';
import * as path from 'path';
import * as fs from 'fs-extra';
import { AnsibleEnvironment } from '../../../extension/fabric/environments/AnsibleEnvironment';
import { FabricWalletGeneratorFactory } from '../../../extension/fabric/FabricWalletGeneratorFactory';
import { IFabricWallet, FabricIdentity, FabricWalletRegistry, IFabricWalletGenerator, FabricWalletRegistryEntry, FileSystemUtil, FabricEnvironmentRegistry, EnvironmentType, FileConfigurations } from 'ibm-blockchain-platform-common';
import { SettingConfigurations } from '../../../configurations';
import { FabricGateway } from '../../../extension/fabric/FabricGateway';
import { FabricWalletGenerator } from '../../../extension/fabric/FabricWalletGenerator';
import { FabricGatewayRegistryEntry } from '../../../extension/registries/FabricGatewayRegistryEntry';
import { FabricGatewayRegistry } from '../../../extension/registries/FabricGatewayRegistry';
import { FabricWallet } from 'ibm-blockchain-platform-wallet';

const should: Chai.Should = chai.should();
chai.use(chaiAsPromised);

// tslint:disable no-unused-expression
describe('AnsibleEnvironment', () => {

    const rootPath: string = path.dirname(__dirname);
    const environmentPath: string = path.resolve(rootPath, '..', '..', '..', 'test', 'data', 'nonManagedAnsible');
    const environmentDir: string = path.join(TestUtil.EXTENSION_TEST_DIR, FileConfigurations.FABRIC_ENVIRONMENTS);

    let environment: AnsibleEnvironment;
    let sandbox: sinon.SinonSandbox;

    before(async () => {
        await TestUtil.setupTests(sandbox);
        await fs.copy(environmentPath, path.join(environmentDir, 'nonManagedAnsible'));
        await FabricEnvironmentRegistry.instance().add({
            name: 'nonManagedAnsible',
            managedRuntime: false,
            associatedGateways: [],
            environmentType: EnvironmentType.ANSIBLE_ENVIRONMENT
        });

    });

    beforeEach(async () => {

        environment = new AnsibleEnvironment('nonManagedAnsible');
        environment['path'] = environmentPath;

        sandbox = sinon.createSandbox();
        await FabricWalletRegistry.instance().clear();
        await FabricGatewayRegistry.instance().clear();
    });

    afterEach(async () => {
        sandbox.restore();
    });

    describe('#importWalletsAndIdentities', () => {
        it('should create all wallets and import all identities', async () => {
            const mockFabricWalletGenerator: sinon.SinonStubbedInstance<IFabricWalletGenerator> = sandbox.createStubInstance(FabricWalletGenerator);
            sandbox.stub(FabricWalletGeneratorFactory, 'createFabricWalletGenerator').returns(mockFabricWalletGenerator);
            const mockFabricWallet: sinon.SinonStubbedInstance<IFabricWallet> = sandbox.createStubInstance(FabricWallet);
            mockFabricWalletGenerator.getWallet.returns(mockFabricWallet);
            await environment.importWalletsAndIdentities();
            mockFabricWalletGenerator.getWallet.should.have.been.calledOnceWithExactly('myWallet');
            mockFabricWallet.importIdentity.should.have.been.calledOnceWithExactly(sinon.match.string, sinon.match.string, 'admin', 'Org1MSP');
        });

        it('should import identities if wallet already exists', async () => {
            const walletEntry: FabricWalletRegistryEntry = new FabricWalletRegistryEntry();
            walletEntry.name = 'myWallet';
            await FabricWalletRegistry.instance().add(walletEntry);

            const mockFabricWalletGenerator: sinon.SinonStubbedInstance<IFabricWalletGenerator> = sandbox.createStubInstance(FabricWalletGenerator);
            sandbox.stub(FabricWalletGeneratorFactory, 'createFabricWalletGenerator').returns(mockFabricWalletGenerator);
            const mockFabricWallet: sinon.SinonStubbedInstance<IFabricWallet> = sandbox.createStubInstance(FabricWallet);
            mockFabricWalletGenerator.getWallet.returns(mockFabricWallet);
            await environment.importWalletsAndIdentities();
            mockFabricWalletGenerator.getWallet.should.have.been.calledOnceWithExactly('myWallet');
            mockFabricWallet.importIdentity.should.have.been.calledOnceWithExactly(sinon.match.string, sinon.match.string, 'admin', 'Org1MSP');
        });

    });

    describe('#importGateways', () => {
        it('should create all gateways', async () => {
            const extDir: string = vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_DIRECTORY);
            const homeExtDir: string = FileSystemUtil.getDirPath(extDir);

            await environment.importGateways();

            const gateways: FabricGateway[] = await environment.getGateways();
            gateways.should.have.lengthOf(3);
            for (const gateway of gateways) {
                const profileDirPath: string = path.join(homeExtDir, 'gateways', gateway.name);
                const profilePath: string = path.join(profileDirPath, path.basename(gateway.path));
                await fs.pathExists(profilePath).should.eventually.be.true;
                const registryEntry: FabricGatewayRegistryEntry = await FabricGatewayRegistry.instance().get(gateway.name);
                const wallet: string = (gateway.connectionProfile as any).wallet;
                if (!wallet) {
                    should.not.exist(registryEntry.associatedWallet);
                } else {
                    registryEntry.associatedWallet.should.equal((gateway.connectionProfile as any).wallet);
                }
            }
        });
    });

    describe('#getGateways', () => {

        it('should return an empty array if no gateways directory', async () => {
            sandbox.stub(fs, 'pathExists').resolves(false);
            await environment.getGateways().should.eventually.deep.equal([]);
        });

        it('should return all of the gateways', async () => {
            const gateways: FabricGateway[] = await environment.getGateways();
            gateways.sort((a: FabricGateway, b: FabricGateway) => {
                return a.name.localeCompare(b.name);
            });
            gateways.should.have.lengthOf(3);
            gateways.should.deep.equal([
                {
                    name: 'myGateway',
                    path: path.resolve(environmentPath, 'gateways', 'yofn.json'),
                    connectionProfile: {
                        name: 'myGateway',
                        version: '1.0.0',
                        client: {
                            organization: 'Org1',
                            connection: {
                                timeout: {
                                    peer: {
                                        endorser: '300'
                                    },
                                    orderer: '300'
                                }
                            }
                        },
                        organizations: {
                            Org1: {
                                mspid: 'Org1MSP',
                                peers: [
                                    'peer0.org1.example.com'
                                ],
                                certificateAuthorities: [
                                    'ca.org1.example.com'
                                ]
                            }
                        },
                        peers: {
                            'peer0.org1.example.com': {
                                url: 'grpc://localhost:17051'
                            }
                        },
                        certificateAuthorities: {
                            'ca.org1.example.com': {
                                url: 'http://localhost:17054',
                                caName: 'ca.org1.example.com'
                            }
                        }
                    }
                },
                {
                    name: 'yofn-org1',
                    path: path.resolve(environmentPath, 'gateways', 'org1', 'yofn.json'),
                    connectionProfile: {
                        name: 'yofn-org1',
                        version: '1.0.0',
                        wallet: 'org1-wallet',
                        client: {
                            organization: 'Org1',
                            connection: {
                                timeout: {
                                    peer: {
                                        endorser: '300'
                                    },
                                    orderer: '300'
                                }
                            }
                        },
                        organizations: {
                            Org1: {
                                mspid: 'Org1MSP',
                                peers: [
                                    'peer0.org1.example.com'
                                ],
                                certificateAuthorities: [
                                    'ca.org1.example.com'
                                ]
                            }
                        },
                        peers: {
                            'peer0.org1.example.com': {
                                url: 'grpc://localhost:17051'
                            }
                        },
                        certificateAuthorities: {
                            'ca.org1.example.com': {
                                url: 'http://localhost:17054',
                                caName: 'ca.org1.example.com'
                            }
                        }
                    }
                },
                {
                    name: 'yofn-org2',
                    path: path.resolve(environmentPath, 'gateways', 'org2', 'yofn.json'),
                    connectionProfile: {
                        name: 'yofn-org2',
                        version: '1.0.0',
                        wallet: 'org2-wallet',
                        client: {
                            organization: 'Org2',
                            connection: {
                                timeout: {
                                    peer: {
                                        endorser: '300'
                                    },
                                    orderer: '300'
                                }
                            }
                        },
                        organizations: {
                            Org2: {
                                mspid: 'Org2MSP',
                                peers: [
                                    'peer0.org2.example.com'
                                ],
                                certificateAuthorities: [
                                    'ca.org2.example.com'
                                ]
                            }
                        },
                        peers: {
                            'peer0.org2.example.com': {
                                url: 'grpc://localhost:17051'
                            }
                        },
                        certificateAuthorities: {
                            'ca.org2.example.com': {
                                url: 'http://localhost:17054',
                                caName: 'ca.org2.example.com'
                            }
                        }
                    }
                }
            ]);
        });
    });

    describe('#getWalletNames', () => {

        it('should return an empty array if no wallets directory', async () => {
            sandbox.stub(fs, 'pathExists').resolves(false);
            await environment.getWalletNames().should.eventually.deep.equal([]);
        });

        it('should return all of the wallet names', async () => {
            await environment.getWalletNames().should.eventually.deep.equal(['myWallet']);
        });

    });

    describe('#getIdentities', () => {

        it('should return an empty array if no wallet directory', async () => {
            sandbox.stub(fs, 'pathExists').resolves(false);
            await environment.getIdentities('myWallet').should.eventually.deep.equal([]);
        });

        it('should return all of the identities', async () => {
            await environment.getIdentities('myWallet').should.eventually.deep.equal([
                new FabricIdentity(
                    'admin',
                    'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNXRENDQWYrZ0F3SUJBZ0lVUU4zUlE1MFB6R0wrZFRBc2haeXJRNGc2MEFZd0NnWUlLb1pJemowRUF3SXcKY3pFTE1Ba0dBMVVFQmhNQ1ZWTXhFekFSQmdOVkJBZ1RDa05oYkdsbWIzSnVhV0V4RmpBVUJnTlZCQWNURFZOaApiaUJHY21GdVkybHpZMjh4R1RBWEJnTlZCQW9URUc5eVp6RXVaWGhoYlhCc1pTNWpiMjB4SERBYUJnTlZCQU1UCkUyTmhMbTl5WnpFdVpYaGhiWEJzWlM1amIyMHdIaGNOTVRrd05ERTRNVFl4TkRBd1doY05NakF3TkRFM01UWXgKT1RBd1dqQmRNUXN3Q1FZRFZRUUdFd0pWVXpFWE1CVUdBMVVFQ0JNT1RtOXlkR2dnUTJGeWIyeHBibUV4RkRBUwpCZ05WQkFvVEMwaDVjR1Z5YkdWa1oyVnlNUTh3RFFZRFZRUUxFd1pqYkdsbGJuUXhEakFNQmdOVkJBTVRCV0ZrCmJXbHVNRmt3RXdZSEtvWkl6ajBDQVFZSUtvWkl6ajBEQVFjRFFnQUVDSTNkbnI1ekx0b3VmbmF4N0l2bnRMQ3EKY0gyMlZveXhYck43RHNZTG1MOExIWHFkTE9STGRCMHlBeVQ5a3FqRVJlYVFGUys5eWY0RGhFUVh5YTRsaEtPQgpoakNCZ3pBT0JnTlZIUThCQWY4RUJBTUNCNEF3REFZRFZSMFRBUUgvQkFJd0FEQWRCZ05WSFE0RUZnUVUvR2x6CjB0TWowYkRxblZ2YXBRcG1MY0Fscmdnd0t3WURWUjBqQkNRd0lvQWdNRklUMFpYR1dhMzU1THlUNEJ6c2RHNGoKdy9RNHBkeTByTzUrdEtGVEY1SXdGd1lEVlIwUkJCQXdEb0lNWkRnek5UVTFaRGsxT1dNNU1Bb0dDQ3FHU000OQpCQU1DQTBjQU1FUUNJQ2VrdEcrejAxUkZHOTc2bStNWnJyckFZN0srckxVYXFPYmk1YStsSWs0ckFpQTBsMzN2CjU4dkFvMFhYbU9ncnQrUmQwWFZJbDZJUW1EVFFrZnNwT3RsVDV3PT0KLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo=',
                    'LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JR0hBZ0VBTUJNR0J5cUdTTTQ5QWdFR0NDcUdTTTQ5QXdFSEJHMHdhd0lCQVFRZ3RGK29wMGFWMWx1TTU0VGoKTVV1Rnhod3pSUmM3S1VMMDhjT0IyZFRjTG1HaFJBTkNBQVFJamQyZXZuTXUyaTUrZHJIc2krZTBzS3B3ZmJaVwpqTEZlczNzT3hndVl2d3NkZXAwczVFdDBIVElESlAyU3FNUkY1cEFWTDczSi9nT0VSQmZKcmlXRQotLS0tLUVORCBQUklWQVRFIEtFWS0tLS0tCg==',
                    'Org1MSP'
                )
            ]);
        });

    });

});
