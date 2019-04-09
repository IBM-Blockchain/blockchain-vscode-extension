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

import { FabricClientConnection } from '../../src/fabric/FabricClientConnection';
import { FabricConnectionFactory } from '../../src/fabric/FabricConnectionFactory';
import * as fabricClient from 'fabric-client';
import * as path from 'path';

import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { Gateway } from 'fabric-network';
import { FabricWallet } from '../../src/fabric/FabricWallet';
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../../src/logging/OutputAdapter';
import { FabricRuntimeUtil } from '../../src/fabric/FabricRuntimeUtil';

const should: Chai.Should = chai.should();
chai.use(sinonChai);

// tslint:disable no-unused-expression
describe('FabricClientConnection', () => {

    let fabricContractStub: any;
    let fabricTransactionStub: any;
    let fabricClientStub: sinon.SinonStubbedInstance<fabricClient>;
    let fabricClientConnection: FabricClientConnection;
    let fabricClientConnectionYaml: FabricClientConnection;
    let otherFabricClientConnectionYml: FabricClientConnection;
    let fabricClientConnectionWrong: FabricClientConnection;
    let logSpy: sinon.SinonSpy;
    let wallet: FabricWallet;

    let mySandBox: sinon.SinonSandbox;

    let fabricGatewayStub: sinon.SinonStubbedInstance<Gateway>;

    const rootPath: string = path.dirname(__dirname);

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
        logSpy = mySandBox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');

        fabricClientStub = mySandBox.createStubInstance(fabricClient);

        mySandBox.stub(fabricClient, 'loadFromConfig').resolves(fabricClientStub);

        fabricClientStub.getMspid.returns('myMSPId');

        fabricGatewayStub = sinon.createStubInstance(Gateway);
        fabricGatewayStub.connect.resolves();

        const eventHandlerOptions: any = {
            commitTimeout: 30,
            strategy: 'MSPID_SCOPE_ANYFORTX'
        };

        const responsesStub: any = {
            validResponses: [
                {
                    response: {
                        payload: new Buffer('payload response buffer')
                    }
                }
            ]
        };

        const eventHandlerStub: any = {
            startListening: mySandBox.stub(),
            cancelListening: mySandBox.stub(),
            waitForEvents: mySandBox.stub(),
        };

        fabricTransactionStub = {
            _validatePeerResponses: mySandBox.stub().returns(responsesStub),
            _createTxEventHandler: mySandBox.stub().returns(eventHandlerStub)
        };

        fabricContractStub = {
            createTransaction: mySandBox.stub().returns(fabricTransactionStub),
            evaluateTransaction: mySandBox.stub(),
            submitTransaction: mySandBox.stub(),
            getEventHandlerOptions: mySandBox.stub().returns(eventHandlerOptions)
        };

        const fabricNetworkStub: any = {
            getContract: mySandBox.stub().returns(fabricContractStub)
        };

        fabricGatewayStub.getNetwork.returns(fabricNetworkStub);
        fabricGatewayStub.disconnect.returns(null);

        fabricClientConnection = new FabricClientConnection({ connectionProfilePath: 'connectionpath', walletPath: 'walletPath' });
        fabricClientConnection['gateway'] = fabricGatewayStub;
        fabricClientConnection['outputAdapter'] = VSCodeBlockchainOutputAdapter.instance();
    });

    afterEach(() => {
        mySandBox.restore();
    });

    describe('connect', () => {

        beforeEach(async () => {
            const connectionData: any = {
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionOne/connection.json'),
                walletPath: path.join(rootPath, '../../test/data/walletDir/wallet')
            };
            fabricClientConnection = FabricConnectionFactory.createFabricClientConnection(connectionData) as FabricClientConnection;
            fabricClientConnection['gateway'] = fabricGatewayStub;

            wallet = new FabricWallet(connectionData.walletPath);
        });

        it('should connect to a fabric', async () => {
            await fabricClientConnection.connect(wallet, FabricRuntimeUtil.ADMIN_USER);
            fabricGatewayStub.connect.should.have.been.called;
            logSpy.should.not.have.been.calledWith(LogType.ERROR);
            fabricClientConnection['networkIdProperty'].should.equal(false);
        });

        it('should connect with an already loaded client connection', async () => {
            should.exist(FabricConnectionFactory['clientConnection']);
            await fabricClientConnection.connect(wallet, FabricRuntimeUtil.ADMIN_USER);
            fabricGatewayStub.connect.should.have.been.called;
            logSpy.should.not.have.been.calledWith(LogType.ERROR);
            fabricClientConnection['networkIdProperty'].should.equal(false);
        });

        it('should connect to a fabric with a .yaml connection profile', async () => {
            const connectionYamlData: any = {
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionYaml/connection.yaml'),
                walletPath: path.join(rootPath, '../../test/data/connectionYaml/wallet')
            };
            wallet = new FabricWallet(connectionYamlData.walletPath);
            fabricClientConnectionYaml = FabricConnectionFactory.createFabricClientConnection(connectionYamlData) as FabricClientConnection;
            fabricClientConnectionYaml['gateway'] = fabricGatewayStub;

            await fabricClientConnectionYaml.connect(wallet, FabricRuntimeUtil.ADMIN_USER);
            fabricGatewayStub.connect.should.have.been.called;
            logSpy.should.not.have.been.calledWith(LogType.ERROR);
            fabricClientConnectionYaml['networkIdProperty'].should.equal(false);
        });

        it('should connect to a fabric with a .yml connection profile', async () => {
            const otherConnectionYmlData: any = {
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionYaml/otherConnectionProfile.yml'),
                walletPath: path.join(rootPath, '../../test/data/connectionYaml/wallet')
            };
            wallet = new FabricWallet(otherConnectionYmlData.walletPath);
            otherFabricClientConnectionYml = FabricConnectionFactory.createFabricClientConnection(otherConnectionYmlData) as FabricClientConnection;
            otherFabricClientConnectionYml['gateway'] = fabricGatewayStub;

            await otherFabricClientConnectionYml.connect(wallet, FabricRuntimeUtil.ADMIN_USER);
            fabricGatewayStub.connect.should.have.been.called;
            logSpy.should.not.have.been.calledWith(LogType.ERROR);
            fabricClientConnectionYaml['networkIdProperty'].should.equal(false);
        });

        it('should detecting connecting to ibp instance', async () => {

            const connectionData: any = {
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionTwo/connection.json'),
                walletPath: path.join(rootPath, '../../test/data/walletDir/wallet')
            };
            wallet = new FabricWallet(connectionData.walletPath);
            fabricClientConnection = FabricConnectionFactory.createFabricClientConnection(connectionData) as FabricClientConnection;
            fabricClientConnection['gateway'] = fabricGatewayStub;

            await fabricClientConnection.connect(wallet, FabricRuntimeUtil.ADMIN_USER);

            fabricGatewayStub.connect.should.have.been.called;
            logSpy.should.not.have.been.calledWith(LogType.ERROR);
            fabricClientConnection['networkIdProperty'].should.equal(true);
        });

        it('should show an error if connection profile is not .yaml or .json file', async () => {
            const connectionWrongData: any = {
                connectionProfilePath: path.join(rootPath, '../../test/data/connectionYaml/connection'),
                walletPath: path.join(rootPath, '../../test/data/connectionYaml/wallet')
            };
            wallet = new FabricWallet(connectionWrongData.walletPath);
            fabricClientConnectionWrong = FabricConnectionFactory.createFabricClientConnection(connectionWrongData) as FabricClientConnection;
            fabricClientConnectionWrong['gateway'] = fabricGatewayStub;

            await fabricClientConnectionWrong.connect(wallet, FabricRuntimeUtil.ADMIN_USER).should.have.been.rejectedWith('Connection profile must be in JSON or yaml format');
            fabricGatewayStub.connect.should.not.have.been.called;
        });

    });

    describe('isIBPConnection', () => {
        it('should return true if connected to an IBP instance', async () => {
            fabricClientConnection['networkIdProperty'] = true;
            const result: boolean = await fabricClientConnection.isIBPConnection();
            result.should.equal(true);
        });
        it('should return false if not connected to an IBP instance', async () => {
            fabricClientConnection['networkIdProperty'] = false;
            const result: boolean = await fabricClientConnection.isIBPConnection();
            result.should.equal(false);
        });
    });

    describe('getMetadata', () => {
        it('should return the metadata for an instantiated smart contract', async () => {
            const fakeMetaData: string = '{"contracts":{"my-contract":{"name":"","contractInstance":{"name":""},"transactions":[{"name":"instantiate"},{"name":"wagonwheeling"},{"name":"transaction2"}],"info":{"title":"","version":""}},"org.hyperledger.fabric":{"name":"org.hyperledger.fabric","contractInstance":{"name":"org.hyperledger.fabric"},"transactions":[{"name":"GetMetadata"}],"info":{"title":"","version":""}}},"info":{"version":"0.0.2","title":"victoria_sponge"},"components":{"schemas":{}}}';
            const fakeMetaDataBuffer: Buffer = Buffer.from(fakeMetaData, 'utf8');
            fabricContractStub.evaluateTransaction.resolves(fakeMetaDataBuffer);

            const metadata: any = await fabricClientConnection.getMetadata('myChaincode', 'channelConga');
            // tslint:disable-next-line
            const testFunction: string = metadata.contracts["my-contract"].transactions[1].name;
            // tslint:disable-next-line
            testFunction.should.equal("wagonwheeling");
        });

        it('should throw an error if an error is thrown by an instantiated smart contract', async () => {
            fabricContractStub.evaluateTransaction.rejects(new Error('no such function!'));

            await fabricClientConnection.getMetadata('myChaincode', 'channelConga')
                .should.be.rejectedWith(/Transaction function "org.hyperledger.fabric:GetMetadata" returned an error: no such function!/);
        });

        it('should throw an error if no metadata is returned by an instantiated smart contract', async () => {
            const fakeMetaData: string = '';
            const fakeMetaDataBuffer: Buffer = Buffer.from(fakeMetaData, 'utf8');
            fabricContractStub.evaluateTransaction.resolves(fakeMetaDataBuffer);

            await fabricClientConnection.getMetadata('myChaincode', 'channelConga')
                .should.be.rejectedWith(/Transaction function "org.hyperledger.fabric:GetMetadata" did not return any metadata/);
        });

        it('should throw an error if non-JSON metadata is returned by an instantiated smart contract', async () => {
            const fakeMetaData: string = '500 tokens to lulzwat@dogecorp.com';
            const fakeMetaDataBuffer: Buffer = Buffer.from(fakeMetaData, 'utf8');
            fabricContractStub.evaluateTransaction.resolves(fakeMetaDataBuffer);

            await fabricClientConnection.getMetadata('myChaincode', 'channelConga')
                .should.be.rejectedWith(/Transaction function "org.hyperledger.fabric:GetMetadata" did not return valid JSON metadata/);
        });

    });

    describe('submitTransaction', () => {
        it('should handle no response from a submitted transaction', async () => {
            const buffer: Buffer = Buffer.from([]);
            fabricContractStub.submitTransaction.resolves(buffer);

            const result: string | undefined = await fabricClientConnection.submitTransaction('mySmartContract', 'transaction1', 'myChannel', ['arg1', 'arg2'], 'my-contract');
            fabricContractStub.submitTransaction.should.have.been.calledWith('transaction1', 'arg1', 'arg2');
            should.equal(result, undefined);
        });

        it('should handle a returned string response from a submitted transaction', async () => {
            const buffer: Buffer = Buffer.from('hello world');
            fabricContractStub.submitTransaction.resolves(buffer);

            const result: string | undefined = await fabricClientConnection.submitTransaction('mySmartContract', 'transaction1', 'myChannel', ['arg1', 'arg2'], 'my-contract');
            fabricContractStub.submitTransaction.should.have.been.calledWith('transaction1', 'arg1', 'arg2');
            result.should.equal('hello world');
        });

        it('should handle a returned empty string response from a submitted transaction', async () => {
            const buffer: Buffer = Buffer.from('');
            fabricContractStub.submitTransaction.resolves(buffer);

            const result: string | undefined = await fabricClientConnection.submitTransaction('mySmartContract', 'transaction1', 'myChannel', ['arg1', 'arg2'], 'my-contract');
            fabricContractStub.submitTransaction.should.have.been.calledWith('transaction1', 'arg1', 'arg2');
            should.equal(result, undefined);
        });

        it('should handle a returned array from a submitted transaction', async () => {

            const buffer: Buffer = Buffer.from(JSON.stringify(['hello', 'world']));
            fabricContractStub.submitTransaction.resolves(buffer);

            const result: string | undefined = await fabricClientConnection.submitTransaction('mySmartContract', 'transaction1', 'myChannel', ['arg1', 'arg2'], 'my-contract');
            fabricContractStub.submitTransaction.should.have.been.calledWith('transaction1', 'arg1', 'arg2');
            should.equal(result, '["hello","world"]');
        });

        it('should handle returned object from a submitted transaction', async () => {

            const buffer: Buffer = Buffer.from(JSON.stringify({hello: 'world'}));
            fabricContractStub.submitTransaction.resolves(buffer);

            const result: string | undefined = await fabricClientConnection.submitTransaction('mySmartContract', 'transaction1', 'myChannel', ['arg1', 'arg2'], 'my-contract');
            fabricContractStub.submitTransaction.should.have.been.calledWith('transaction1', 'arg1', 'arg2');
            should.equal(result, '{"hello":"world"}');
        });

        it('should evaluate a transaction if specified', async () => {
            const buffer: Buffer = Buffer.from([]);
            fabricContractStub.evaluateTransaction.resolves(buffer);

            const result: string | undefined = await fabricClientConnection.submitTransaction('mySmartContract', 'transaction1', 'myChannel', ['arg1', 'arg2'], 'my-contract', true);
            fabricContractStub.evaluateTransaction.should.have.been.calledWith('transaction1', 'arg1', 'arg2');
            should.equal(result, undefined);
        });
    });
});
