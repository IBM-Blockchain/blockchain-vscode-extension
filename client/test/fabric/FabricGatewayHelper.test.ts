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

import * as sinon from 'sinon';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { FabricGatewayHelper } from '../../src/fabric/FabricGatewayHelper';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import * as vscode from 'vscode';
import { SettingConfigurations } from '../../SettingConfigurations';

// tslint:disable no-unused-expression
describe('FabricGatewayHelper', () => {

    let mySandBox: sinon.SinonSandbox;

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
    });

    afterEach(() => {
        mySandBox.restore();
    });

    describe('copyConnectionProfile', () => {
        const gatewayName: string = 'myGateway';

        let getDirPathStub: sinon.SinonStub;
        let pathExistsStub: sinon.SinonStub;
        let ensureDirStub: sinon.SinonStub;
        let readFileStub: sinon.SinonStub;
        let writeFileStub: sinon.SinonStub;
        let isAbsoluteStub: sinon.SinonStub;

        let tlsPemLocation: string;
        let tlsPemJson: string;
        let tlsPemStringified: any;

        let tlsPathLocation: string;
        let tlsPathJson: string;

        let yamlPathLocation: string;
        let yamlPathData: string;

        let rootPath: string;
        rootPath = path.dirname(__dirname);

        before( async () => {
            tlsPemLocation = path.join(rootPath, '../../test/data/connectionTlsPem/connection.json');
            tlsPemJson = await fs.readFile(tlsPemLocation, 'utf8');
            const parsedTlsPemJson: any = JSON.parse(tlsPemJson);
            tlsPemStringified = JSON.stringify(parsedTlsPemJson, null, 4);

            tlsPathLocation = path.join(rootPath, '../../test/data/connectionTlsPath/connection.json');
            tlsPathJson = await fs.readFile(tlsPathLocation, 'utf8');

            yamlPathLocation = path.join(rootPath, '../../test/data/connectionYaml/tlsConnectionProfilePath.yml');
            yamlPathData = await fs.readFile(yamlPathLocation, 'utf8');
        });
        beforeEach( async () => {
            getDirPathStub = mySandBox.stub(UserInputUtil, 'getDirPath');
            pathExistsStub = mySandBox.stub(fs, 'pathExists');
            ensureDirStub = mySandBox.stub(fs, 'ensureDir');
            readFileStub = mySandBox.stub(fs, 'readFile');
            writeFileStub = mySandBox.stub(fs, 'writeFile');
            isAbsoluteStub = mySandBox.stub(path, 'isAbsolute');
        });

        it('should copy a connection profile and do nothing if TLS certs are inline', async () => {
            getDirPathStub.returns('fabric-vscode');
            pathExistsStub.resolves(true);
            readFileStub.onFirstCall().resolves(tlsPemJson);
            writeFileStub.resolves();

            const result: string = await FabricGatewayHelper.copyConnectionProfile(gatewayName, tlsPemLocation);

            getDirPathStub.should.have.been.calledOnce;
            pathExistsStub.should.have.been.calledOnceWithExactly(path.join('fabric-vscode', 'gateways', gatewayName));
            ensureDirStub.should.not.have.been.called;
            readFileStub.getCall(0).should.have.been.calledWithExactly(tlsPemLocation, 'utf8');
            writeFileStub.should.have.been.calledOnceWith(path.join('fabric-vscode', 'gateways', gatewayName, 'connection.json'), tlsPemStringified);

            result.should.equal(path.join('fabric-vscode', 'gateways', gatewayName, 'connection.json'));
        });

        it('should copy a connection profile and ensure the destination directory exists', async () => {
            getDirPathStub.returns('fabric-vscode');
            pathExistsStub.resolves(false);
            ensureDirStub.resolves();
            readFileStub.onFirstCall().resolves(tlsPemJson);
            writeFileStub.resolves();

            const result: string = await FabricGatewayHelper.copyConnectionProfile(gatewayName, tlsPemLocation);

            getDirPathStub.should.have.been.calledOnce;
            pathExistsStub.should.have.been.calledOnceWithExactly(path.join('fabric-vscode', 'gateways', gatewayName));
            ensureDirStub.should.have.been.calledOnceWithExactly(path.join('fabric-vscode/gateways', gatewayName));
            readFileStub.getCall(0).should.have.been.calledWithExactly(tlsPemLocation, 'utf8');
            writeFileStub.should.have.been.calledOnceWithExactly(path.join('fabric-vscode', 'gateways', gatewayName, 'connection.json'), tlsPemStringified);

            result.should.equal(path.join('fabric-vscode', 'gateways', gatewayName, 'connection.json'));
        });

        it('should copy a connection profile and change absolute paths', async () => {
            getDirPathStub.returns('fabric-vscode');
            pathExistsStub.resolves(false);
            ensureDirStub.resolves();
            readFileStub.onFirstCall().resolves(tlsPathJson);
            isAbsoluteStub.returns(true);
            readFileStub.resolves('CERT_HERE');
            writeFileStub.resolves();

            const result: string = await FabricGatewayHelper.copyConnectionProfile(gatewayName, tlsPathLocation);

            getDirPathStub.should.have.been.calledOnce;
            pathExistsStub.should.have.been.calledOnceWithExactly(path.join('fabric-vscode', 'gateways', gatewayName));
            ensureDirStub.should.have.been.calledOnceWithExactly(path.join('fabric-vscode', 'gateways', gatewayName));
            readFileStub.getCall(0).should.have.been.calledWithExactly(tlsPathLocation, 'utf8');
            readFileStub.getCalls().length.should.equal(4);
            isAbsoluteStub.should.have.been.calledThrice;
            writeFileStub.should.have.been.calledOnceWithExactly(path.join('fabric-vscode', 'gateways', gatewayName, 'connection.json'), tlsPemStringified);

            result.should.equal(path.join('fabric-vscode', 'gateways', gatewayName, 'connection.json'));
        });

        it('should continue if property doesn\'nt exist in connection profile', async () => {
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
            const stringifiedObject: string = JSON.stringify(connectionProfileObject);
            getDirPathStub.returns('fabric-vscode');
            pathExistsStub.resolves(false);
            ensureDirStub.resolves();
            readFileStub.resolves('CERT_HERE');
            readFileStub.onFirstCall().resolves(stringifiedObject);
            isAbsoluteStub.returns(true);
            writeFileStub.resolves();

            const result: string = await FabricGatewayHelper.copyConnectionProfile(gatewayName, 'connection.json');

            getDirPathStub.should.have.been.calledOnce;
            pathExistsStub.should.have.been.calledOnceWithExactly(path.join('fabric-vscode', 'gateways', gatewayName));
            ensureDirStub.should.have.been.calledOnceWithExactly(path.join('fabric-vscode', 'gateways', gatewayName));
            readFileStub.getCall(0).should.have.been.calledWithExactly('connection.json', 'utf8');
            readFileStub.should.have.been.calledThrice;
            isAbsoluteStub.should.have.been.calledTwice;

            connectionProfileObject.peers['peer0']['tlsCACerts'].path = undefined;
            connectionProfileObject.peers['peer0']['tlsCACerts'].pem = 'CERT_HERE';

            connectionProfileObject.certificateAuthorities['ca0']['tlsCACerts'].path = undefined;
            connectionProfileObject.certificateAuthorities['ca0']['tlsCACerts'].pem = 'CERT_HERE';

            const newStringifiedObject: any = JSON.stringify(connectionProfileObject, null, 4);
            writeFileStub.should.have.been.calledOnceWithExactly(path.join('fabric-vscode', 'gateways', gatewayName, 'connection.json'), newStringifiedObject);

            result.should.equal(path.join('fabric-vscode', 'gateways', gatewayName, 'connection.json'));
        });

        it('should copy a connection profile and change relative paths', async () => {
            getDirPathStub.returns('fabric-vscode');
            pathExistsStub.resolves(false);
            ensureDirStub.resolves();
            readFileStub.onFirstCall().resolves(tlsPathJson);
            isAbsoluteStub.returns(false);
            readFileStub.resolves('CERT_HERE');
            writeFileStub.resolves();

            const result: string = await FabricGatewayHelper.copyConnectionProfile(gatewayName, tlsPathLocation);

            getDirPathStub.should.have.been.calledOnce;
            pathExistsStub.should.have.been.calledOnceWithExactly(path.join('fabric-vscode', 'gateways', gatewayName));
            ensureDirStub.should.have.been.calledOnceWithExactly(path.join('fabric-vscode', 'gateways', gatewayName));
            readFileStub.getCall(0).should.have.been.calledWithExactly(tlsPathLocation, 'utf8');
            readFileStub.getCalls().length.should.equal(4);
            isAbsoluteStub.should.have.been.calledThrice;
            writeFileStub.should.have.been.calledOnceWithExactly(path.join('fabric-vscode', 'gateways', gatewayName, 'connection.json'), tlsPemStringified);

            result.should.equal(path.join('fabric-vscode', 'gateways', gatewayName, 'connection.json'));
        });

        it('should handle any errors thrown', async () => {
            getDirPathStub.returns('fabric-vscode');
            pathExistsStub.resolves(false);
            ensureDirStub.resolves();
            readFileStub.resolves('CERT_HERE');
            readFileStub.onFirstCall().resolves(tlsPathJson);
            isAbsoluteStub.returns(false);
            const error: Error = new Error('Errored for some reason');
            writeFileStub.throws(error);

            await FabricGatewayHelper.copyConnectionProfile(gatewayName, tlsPathLocation).should.be.rejectedWith(error);

            getDirPathStub.should.have.been.calledOnce;
            pathExistsStub.should.have.been.calledOnceWithExactly(path.join('fabric-vscode', 'gateways', gatewayName));
            ensureDirStub.should.have.been.calledOnceWithExactly(path.join('fabric-vscode', 'gateways', gatewayName));
            readFileStub.getCall(0).should.have.been.calledWithExactly(tlsPathLocation, 'utf8');
            readFileStub.getCalls().length.should.equal(4);
            isAbsoluteStub.should.have.been.calledThrice;
            writeFileStub.should.have.been.calledOnceWithExactly(path.join('fabric-vscode', 'gateways', gatewayName, 'connection.json'), tlsPemStringified);
        });

        it('should copy a connection profile and change relative paths for a YAML file', async () => {
            getDirPathStub.returns('fabric-vscode');
            pathExistsStub.resolves(false);
            ensureDirStub.resolves();
            readFileStub.onFirstCall().resolves(yamlPathData);
            isAbsoluteStub.returns(false);
            readFileStub.resolves('CERT_HERE');
            writeFileStub.resolves();
            const yamlDumpStub: sinon.SinonStub = mySandBox.stub(yaml, 'dump').returns('hello_world');

            const result: string = await FabricGatewayHelper.copyConnectionProfile(gatewayName, yamlPathLocation);

            getDirPathStub.should.have.been.calledOnce;
            pathExistsStub.should.have.been.calledOnceWithExactly(path.join('fabric-vscode', 'gateways', gatewayName));
            ensureDirStub.should.have.been.calledOnceWithExactly(path.join('fabric-vscode', 'gateways', gatewayName));
            readFileStub.getCall(0).should.have.been.calledWithExactly(yamlPathLocation, 'utf8');
            readFileStub.getCalls().length.should.equal(4);
            isAbsoluteStub.should.have.been.calledThrice;

            yamlDumpStub.should.have.been.calledOnce;
            writeFileStub.should.have.been.calledOnceWith(path.join('fabric-vscode', 'gateways', gatewayName, 'connection.yml'), 'hello_world');

            result.should.equal(path.join('fabric-vscode', 'gateways', gatewayName, 'connection.yml'));
        });
    });

    describe('migrateGateways', () => {

        let getConfigurationStub: sinon.SinonStub;
        let getSettingsStub: sinon.SinonStub;
        let updateSettingsStub: sinon.SinonStub;
        let gatewayA: any;
        let gatewayB: any;
        let fsCopyStub: sinon.SinonStub;
        let fsRemoveStub: sinon.SinonStub;

        beforeEach(async () => {

            gatewayA = {
                name: 'gatewayA',
                connectionProfilePath: 'fabric-dir/gateways/gatewayA/file.json',
                associatedWallet: ''
            };
            gatewayB = {
                name: 'gatewayB',
                connectionProfilePath: 'fabric-dir/gatewayB/anotherFile.json',
                associatedWallet: ''
            };

            getSettingsStub = mySandBox.stub();
            updateSettingsStub = mySandBox.stub();
            getConfigurationStub = mySandBox.stub(vscode.workspace, 'getConfiguration');
            getConfigurationStub.returns({
                get: getSettingsStub,
                update: updateSettingsStub
            });

            getSettingsStub.withArgs(SettingConfigurations.FABRIC_GATEWAYS).returns([gatewayA, gatewayB]);
            getSettingsStub.withArgs(SettingConfigurations.EXTENSION_DIRECTORY).returns('fabric-dir');
            fsCopyStub = mySandBox.stub(fs, 'copy').resolves();
            fsRemoveStub = mySandBox.stub(fs, 'remove').resolves();

        });

        it('should migrate gateways found in user settings to correct extension subdirectory', async () => {
            await FabricGatewayHelper.migrateGateways();

            getSettingsStub.should.have.been.calledWithExactly(SettingConfigurations.FABRIC_GATEWAYS);
            updateSettingsStub.should.have.been.calledOnceWithExactly(SettingConfigurations.FABRIC_GATEWAYS,
                [ gatewayA,
                    {
                        name: 'gatewayB',
                        connectionProfilePath: 'fabric-dir/gateways/gatewayB/anotherFile.json',
                        associatedWallet: ''
                    }
                ], vscode.ConfigurationTarget.Global);
            fsCopyStub.should.have.been.calledOnceWithExactly('fabric-dir/gatewayB/anotherFile.json', 'fabric-dir/gateways/gatewayB');
            fsRemoveStub.should.have.been.calledOnceWithExactly('fabric-dir/gatewayB');

        });

        it(`should not migrate a gateway if there is an issue migrating it`, async () => {
            const error: Error = new Error('a problem');
            fsCopyStub.rejects(error);
            await FabricGatewayHelper.migrateGateways().should.be.rejectedWith(`Issue copying ${gatewayB.connectionProfilePath} to fabric-dir/gateways/gatewayB: ${error.message}`);

            fsCopyStub.should.have.been.calledOnceWithExactly('fabric-dir/gatewayB/anotherFile.json', 'fabric-dir/gateways/gatewayB');
            fsRemoveStub.should.not.have.been.called;
        });
    });

});
