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
import * as sinon from 'sinon';
import * as fs from 'fs-extra';
import * as path from 'path';
import { FabricGatewayHelper } from '../../src/fabric/FabricGatewayHelper';
import { UserInputUtil } from '../../src/commands/UserInputUtil';

const should: Chai.Should = chai.should();

// tslint:disable no-unused-expression
describe('FabricGatewayHelper', () => {

    let mySandBox: sinon.SinonSandbox;

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
    });

    afterEach(() => {
        mySandBox.restore();
    });

    describe('isCompleted', () => {
        it('should return false if connection profile is complete and wallet path is incomplete', async () => {
           const connectionProfilePathCompleteStub: sinon.SinonStub = mySandBox.stub(FabricGatewayHelper, 'connectionProfilePathComplete').returns(true);
           const walletPathCompleteStub: sinon.SinonStub = mySandBox.stub(FabricGatewayHelper, 'walletPathComplete').returns(false);
           const instance: any = {some: 'thing'};
           const result: boolean = FabricGatewayHelper.isCompleted(instance);
           result.should.equal(false);
           connectionProfilePathCompleteStub.should.have.been.calledOnceWithExactly(instance);
           walletPathCompleteStub.should.have.been.calledOnceWithExactly(instance);
        });
        it('should return false if connection profile is incomplete and wallet path is incomplete', async () => {
            const connectionProfilePathCompleteStub: sinon.SinonStub = mySandBox.stub(FabricGatewayHelper, 'connectionProfilePathComplete').returns(false);
            const walletPathCompleteStub: sinon.SinonStub = mySandBox.stub(FabricGatewayHelper, 'walletPathComplete').returns(false);
            const instance: any = {some: 'thing'};
            const result: boolean = FabricGatewayHelper.isCompleted(instance);
            result.should.equal(false);
            connectionProfilePathCompleteStub.should.have.been.calledOnceWithExactly(instance);
            walletPathCompleteStub.should.have.been.calledOnceWithExactly(instance);
         });

        it('should return false if connection profile is incomplete and wallet path is complete', async () => {
            const connectionProfilePathCompleteStub: sinon.SinonStub = mySandBox.stub(FabricGatewayHelper, 'connectionProfilePathComplete').returns(false);
            const walletPathCompleteStub: sinon.SinonStub = mySandBox.stub(FabricGatewayHelper, 'walletPathComplete').returns(true);
            const instance: any = {some: 'thing'};
            const result: boolean = FabricGatewayHelper.isCompleted(instance);
            result.should.equal(false);
            connectionProfilePathCompleteStub.should.have.been.calledOnceWithExactly(instance);
            walletPathCompleteStub.should.have.been.calledOnceWithExactly(instance);
         });

        it('should return true if connection profile is complete and wallet path is complete', async () => {
            const connectionProfilePathCompleteStub: sinon.SinonStub = mySandBox.stub(FabricGatewayHelper, 'connectionProfilePathComplete').returns(true);
            const walletPathCompleteStub: sinon.SinonStub = mySandBox.stub(FabricGatewayHelper, 'walletPathComplete').returns(true);
            const instance: any = {some: 'thing'};
            const result: boolean = FabricGatewayHelper.isCompleted(instance);
            result.should.equal(true);
            connectionProfilePathCompleteStub.should.have.been.calledOnceWithExactly(instance);
            walletPathCompleteStub.should.have.been.calledOnceWithExactly(instance);
         });
    });

    describe('connectionProfilePathComplete', () => {
        it('should return false if connection profile is the default value', async () => {
           const instance: any = {connectionProfilePath: FabricGatewayHelper.CONNECTION_PROFILE_PATH_DEFAULT};
           const result: boolean = FabricGatewayHelper.connectionProfilePathComplete(instance);
           result.should.equal(false);
        });
        it('should return false if connection profile is an empty string', async () => {
            const instance: any = {connectionProfilePath: ''};
            const result: boolean = FabricGatewayHelper.connectionProfilePathComplete(instance);
            result.should.equal(false);
        });
        it('should return true if the connection profile is neither the default or an empty string', async () => {
            const instance: any = {connectionProfilePath: 'hello_world'};
            const result: boolean = FabricGatewayHelper.connectionProfilePathComplete(instance);
            result.should.equal(true);
        });
    });

    describe('walletPathComplete', () => {
        it('should return false if the wallet path is the default value', async () => {
           const instance: any = {walletPath: FabricGatewayHelper.WALLET_PATH_DEFAULT};
           const result: boolean = FabricGatewayHelper.walletPathComplete(instance);
           result.should.equal(false);
        });
        it('should return false if wallet path is an empty string', async () => {
            const instance: any = {walletPath: ''};
            const result: boolean = FabricGatewayHelper.walletPathComplete(instance);
            result.should.equal(false);
        });
        it('should return true if the wallet path is neither the default or an empty string', async () => {
            const instance: any = {walletPath: 'hello_world'};
            const result: boolean = FabricGatewayHelper.walletPathComplete(instance);
            result.should.equal(true);
        });
    });

    describe('copyConnectionProfile', () => {
        const gatewayName: string = 'myGateway';

        let getDirPathStub: sinon.SinonStub;
        let pathExistsStub: sinon.SinonStub;
        let ensureDirStub: sinon.SinonStub;
        let readJsonStub: sinon.SinonStub;
        let readFileStub: sinon.SinonStub;
        let writeFileStub: sinon.SinonStub;
        let isAbsoluteStub: sinon.SinonStub;
        let connectionProfileJsonPem: any;
        let connectionProfileJsonPath: any;

        beforeEach( async () => {
            getDirPathStub = mySandBox.stub(UserInputUtil, 'getDirPath');
            pathExistsStub = mySandBox.stub(fs, 'pathExists');
            ensureDirStub = mySandBox.stub(fs, 'ensureDir');
            readJsonStub = mySandBox.stub(fs, 'readJson');
            readFileStub = mySandBox.stub(fs, 'readFile');
            writeFileStub = mySandBox.stub(fs, 'writeFile');
            isAbsoluteStub = mySandBox.stub(path, 'isAbsolute');
            connectionProfileJsonPem = {
                peers: {
                    peer0: {
                        tlsCACerts: {
                            pem: 'CERT_HERE'
                        }
                    }
                },
                orderers: {
                    orderer0: {
                        tlsCACerts: {
                            pem: 'CERT_HERE'
                        }
                    }
                },
                certificateAuthorities: {
                    ca0: {
                        tlsCACerts: {
                            pem: 'CERT_HERE'
                        }
                    }
                }
            };
            connectionProfileJsonPath = {
                peers: {
                    peer0: {
                        tlsCACerts: {
                            path: 'path'
                        }
                    }
                },
                orderers: {
                    orderer0: {
                        tlsCACerts: {
                            path: 'path'
                        }
                    }
                },
                certificateAuthorities: {
                    ca0: {
                        tlsCACerts: {
                            path: 'path'
                        }
                    }
                }
            };

        });

        it('should copy a connection profile and do nothing if TLS certs are inline', async () => {
            const connectionProfilePath: string = '';
            getDirPathStub.resolves('fabric-vscode');
            pathExistsStub.resolves(true);
            readJsonStub.resolves(connectionProfileJsonPem);
            writeFileStub.resolves();

            const result: string = await FabricGatewayHelper.copyConnectionProfile(gatewayName, connectionProfilePath);

            getDirPathStub.should.have.been.calledOnce;
            pathExistsStub.should.have.been.calledOnceWithExactly(path.join('fabric-vscode', gatewayName));
            ensureDirStub.should.not.have.been.called;
            readJsonStub.should.have.been.calledOnceWithExactly(connectionProfilePath);
            readFileStub.should.not.have.been.called;
            const stringifiedJson: string = JSON.stringify(connectionProfileJsonPem);
            writeFileStub.should.have.been.calledOnceWithExactly(path.join('fabric-vscode', gatewayName, 'connection.json'), stringifiedJson);

            result.should.equal(path.join('fabric-vscode', gatewayName, 'connection.json'));
        });

        it('should copy a connection profile and ensure the destination directory exists', async () => {
            const connectionProfilePath: string = '';
            getDirPathStub.resolves('fabric-vscode');
            pathExistsStub.resolves(false);
            ensureDirStub.resolves();
            readJsonStub.resolves(connectionProfileJsonPem);
            writeFileStub.resolves();

            const result: string = await FabricGatewayHelper.copyConnectionProfile(gatewayName, connectionProfilePath);

            getDirPathStub.should.have.been.calledOnce;
            pathExistsStub.should.have.been.calledOnceWithExactly(path.join('fabric-vscode', gatewayName));
            ensureDirStub.should.have.been.calledOnceWithExactly(path.join('fabric-vscode', gatewayName));
            readJsonStub.should.have.been.calledOnceWithExactly(connectionProfilePath);
            readFileStub.should.not.have.been.called;
            const stringifiedJson: string = JSON.stringify(connectionProfileJsonPem);
            writeFileStub.should.have.been.calledOnceWithExactly(path.join('fabric-vscode', gatewayName, 'connection.json'), stringifiedJson);

            result.should.equal(path.join('fabric-vscode', gatewayName, 'connection.json'));
        });

        it('should copy a connection profile and change absolute paths', async () => {
            const connectionProfilePath: string = '';
            getDirPathStub.resolves('fabric-vscode');
            pathExistsStub.resolves(false);
            ensureDirStub.resolves();
            readJsonStub.resolves(connectionProfileJsonPath);
            isAbsoluteStub.returns(true);
            readFileStub.resolves('CERT_HERE');
            writeFileStub.resolves();

            const result: string = await FabricGatewayHelper.copyConnectionProfile(gatewayName, connectionProfilePath);

            getDirPathStub.should.have.been.calledOnce;
            pathExistsStub.should.have.been.calledOnceWithExactly(path.join('fabric-vscode', gatewayName));
            ensureDirStub.should.have.been.calledOnceWithExactly(path.join('fabric-vscode', gatewayName));
            readJsonStub.should.have.been.calledOnceWithExactly(connectionProfilePath);
            readFileStub.should.have.been.calledThrice;
            isAbsoluteStub.should.have.been.calledThrice;
            const stringifiedJson: string = JSON.stringify(connectionProfileJsonPem);
            writeFileStub.should.have.been.calledOnceWithExactly(path.join('fabric-vscode', gatewayName, 'connection.json'), stringifiedJson);

            result.should.equal(path.join('fabric-vscode', gatewayName, 'connection.json'));
        });

        it('should continue if property doesn\'nt exist in connection profile', async () => {
            const connectionProfilePath: string = '';
            const connectionProfileObject: any = {
                peers: {
                    peer0: {
                        tlsCACerts: {
                            path: 'path'
                        }
                    }
                },
                certificateAuthorities: {
                    ca0: {
                        tlsCACerts: {
                            path: 'path'
                        }
                    }
                }
            };
            getDirPathStub.resolves('fabric-vscode');
            pathExistsStub.resolves(false);
            ensureDirStub.resolves();
            readJsonStub.resolves(connectionProfileObject);
            isAbsoluteStub.returns(true);
            readFileStub.resolves('CERT_HERE');
            writeFileStub.resolves();

            const result: string = await FabricGatewayHelper.copyConnectionProfile(gatewayName, connectionProfilePath);

            getDirPathStub.should.have.been.calledOnce;
            pathExistsStub.should.have.been.calledOnceWithExactly(path.join('fabric-vscode', gatewayName));
            ensureDirStub.should.have.been.calledOnceWithExactly(path.join('fabric-vscode', gatewayName));
            readJsonStub.should.have.been.calledOnceWithExactly(connectionProfilePath);
            readFileStub.should.have.been.calledTwice;
            isAbsoluteStub.should.have.been.calledTwice;
            const stringifiedJson: string = JSON.stringify(connectionProfileObject);
            writeFileStub.should.have.been.calledOnceWithExactly(path.join('fabric-vscode', gatewayName, 'connection.json'), stringifiedJson);

            result.should.equal(path.join('fabric-vscode', gatewayName, 'connection.json'));
        });

        it('should copy a connection profile and change relative paths', async () => {
            const connectionProfilePath: string = path.join('hello', 'world');
            getDirPathStub.resolves('fabric-vscode');
            pathExistsStub.resolves(false);
            ensureDirStub.resolves();
            readJsonStub.resolves(connectionProfileJsonPath);
            isAbsoluteStub.returns(false);
            readFileStub.resolves('CERT_HERE');
            writeFileStub.resolves();

            const result: string = await FabricGatewayHelper.copyConnectionProfile(gatewayName, connectionProfilePath);

            getDirPathStub.should.have.been.calledOnce;
            pathExistsStub.should.have.been.calledOnceWithExactly(path.join('fabric-vscode', gatewayName));
            ensureDirStub.should.have.been.calledOnceWithExactly(path.join('fabric-vscode', gatewayName));
            readJsonStub.should.have.been.calledOnceWithExactly(connectionProfilePath);
            readFileStub.should.have.been.calledThrice;
            isAbsoluteStub.should.have.been.calledThrice;
            const stringifiedJson: string = JSON.stringify(connectionProfileJsonPem);
            writeFileStub.should.have.been.calledOnceWithExactly(path.join('fabric-vscode', gatewayName, 'connection.json'), stringifiedJson);

            result.should.equal(path.join('fabric-vscode', gatewayName, 'connection.json'));
        });

        it('should handle any errors thrown', async () => {
            const connectionProfilePath: string = path.join('hello', 'world');
            getDirPathStub.resolves('fabric-vscode');
            pathExistsStub.resolves(false);
            ensureDirStub.resolves();
            readJsonStub.resolves(connectionProfileJsonPath);
            isAbsoluteStub.returns(false);
            readFileStub.resolves('CERT_HERE');
            const error: Error = new Error('Errored for some reason');
            writeFileStub.throws(error);

            await FabricGatewayHelper.copyConnectionProfile(gatewayName, connectionProfilePath).should.be.rejectedWith(error);

            getDirPathStub.should.have.been.calledOnce;
            pathExistsStub.should.have.been.calledOnceWithExactly(path.join('fabric-vscode', gatewayName));
            ensureDirStub.should.have.been.calledOnceWithExactly(path.join('fabric-vscode', gatewayName));
            readJsonStub.should.have.been.calledOnceWithExactly(connectionProfilePath);
            readFileStub.should.have.been.calledThrice;
            isAbsoluteStub.should.have.been.calledThrice;
            const stringifiedJson: string = JSON.stringify(connectionProfileJsonPem);
            writeFileStub.should.have.been.calledOnceWithExactly(path.join('fabric-vscode', gatewayName, 'connection.json'), stringifiedJson);
        });
    });

});
