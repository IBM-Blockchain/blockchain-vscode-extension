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

// tslint:disable max-classes-per-file no-unused-expression

import { MicrofabEnvironment } from '../../src/environments/MicrofabEnvironment';
import { FabricNode, FabricNodeType } from '../../src/fabricModel/FabricNode';
import { MicrofabClient } from '../../src/environments/MicrofabClient';
import { FabricWalletRegistryEntry } from '../../src/registries/FabricWalletRegistryEntry';
import { FabricGatewayRegistryEntry } from '../../src/registries/FabricGatewayRegistryEntry';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as sinon from 'sinon';
import * as tmp from 'tmp';
import { FileConfigurations } from '../../src/registries/FileConfigurations';
import { FabricIdentity } from '../../src/fabricModel/FabricIdentity';
import { FabricGateway } from '../../src/fabricModel/FabricGateway';
import { IFabricWallet } from '../../src/interfaces/IFabricWallet';
import { IFabricWalletGenerator } from '../../src/interfaces/IFabricWalletGenerator';
import { FabricWalletGeneratorFactory } from '../../src/util/FabricWalletGeneratorFactory';

chai.should();
chai.use(chaiAsPromised);

function b64tostr(b64: string): string {
    return Buffer.from(b64, 'base64').toString('utf8');
}

class TestFabricWalletGenerator implements IFabricWalletGenerator {

    async getWallet(_walletRegistryEntry: FabricWalletRegistryEntry): Promise<IFabricWallet> {
        return null;
    }

}

class TestFabricWallet implements IFabricWallet {

    async importIdentity(_certificate: string, _privateKey: string, _identityName: string, _mspid: string): Promise<void> {
        return;
    }

    async delete(_identityName: string): Promise<void> {
        return;
    }

    async exists(_identityName: string): Promise<boolean> {
        return false;
    }

    async getIdentityNames(): Promise<string[]> {
        return [];
    }

    async getIDs(): Promise<FabricIdentity[]> {
        return [];
    }

    async getIdentities(): Promise<FabricIdentity[]> {
        return [];
    }

    getWalletPath(): string {
        return '';
    }

}

describe('MicrofabEnvironment', () => {

    let sandbox: sinon.SinonSandbox;
    let directory: string;
    let environment: MicrofabEnvironment;
    let mockClient: sinon.SinonStubbedInstance<MicrofabClient>;
    let mockFabricWalletGenerator: sinon.SinonStubbedInstance<TestFabricWalletGenerator>;
    let mockFabricWallet: sinon.SinonStubbedInstance<TestFabricWallet>;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        directory = tmp.dirSync().name;
        environment = new MicrofabEnvironment('microfabEnvironment', directory, 'http://console.microfab.example.org:8080');
        mockClient =  sinon.createStubInstance(MicrofabClient);
        mockClient.getComponents.resolves([
            {
                id: 'ordereradmin',
                display_name: 'Orderer Admin',
                type: 'identity',
                cert: 'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUIwekNDQVhxZ0F3SUJBZ0lRTXNjMWxWemUzSzlZQ3IrNktieVJ5akFLQmdncWhrak9QUVFEQWpBVk1STXcKRVFZRFZRUURFd3BQY21SbGNtVnlJRU5CTUI0WERUSXdNRFV4TkRFd05EY3dNRm9YRFRNd01EVXhNakV3TkRjdwpNRm93S0RFT01Bd0dBMVVFQ3hNRllXUnRhVzR4RmpBVUJnTlZCQU1URFU5eVpHVnlaWElnUVdSdGFXNHdXVEFUCkJnY3Foa2pPUFFJQkJnZ3Foa2pPUFFNQkJ3TkNBQVR0dkhyZDF5cWJNZWFDbHR5cXlNeVNESm5Va0FZWTYzalQKMkxicjBqdjR5NXhYdlF6SytOaDMzMnNZYllqYXpSM3JweG1xRVQvdVBoSFQrTk9vNGxSNG80R1lNSUdWTUE0RwpBMVVkRHdFQi93UUVBd0lGb0RBZEJnTlZIU1VFRmpBVUJnZ3JCZ0VGQlFjREFnWUlLd1lCQlFVSEF3RXdEQVlEClZSMFRBUUgvQkFJd0FEQXBCZ05WSFE0RUlnUWdiNkJYRlFKRFRocmc3WmdFVFAyM3RXTlkxZjlOMEdESVlZVGIKZ25obFdFNHdLd1lEVlIwakJDUXdJb0FnNEI1c2Fqc2FWc25ZMnJRcjFZc3RQYk5wMVBZNHFTeFRYTEtrb3g5NgpheTB3Q2dZSUtvWkl6ajBFQXdJRFJ3QXdSQUlnSmhVMGxsV0owcEhyQXk4VTlGRzVFekRjcUEwcXhZeTl3MGg5CkRKUW1zSlFDSUJnY0RxZ1RRa0xlMUhuQkVhRDd6NnNGZFpUNFduOXFYOTk3dk9WNXoxSlIKLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo=',
                private_key: 'LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JR0hBZ0VBTUJNR0J5cUdTTTQ5QWdFR0NDcUdTTTQ5QXdFSEJHMHdhd0lCQVFRZ0lBcmsyUVlSN2dxdWFnZUYKVDJSeE9lUWtuZHY0OW5OVmhLTG5EakpKMTRhaFJBTkNBQVR0dkhyZDF5cWJNZWFDbHR5cXlNeVNESm5Va0FZWQo2M2pUMkxicjBqdjR5NXhYdlF6SytOaDMzMnNZYllqYXpSM3JweG1xRVQvdVBoSFQrTk9vNGxSNAotLS0tLUVORCBQUklWQVRFIEtFWS0tLS0tCg==',
                msp_id: 'OrdererMSP',
                wallet: 'Orderer'
            },
            {
                id: 'org1admin',
                display_name: 'Org1 Admin',
                type: 'identity',
                cert: 'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUJ6RENDQVhTZ0F3SUJBZ0lRZHBtaE9FOVkxQ3V3WHl2b3pmMjFRakFLQmdncWhrak9QUVFEQWpBU01SQXcKRGdZRFZRUURFd2RQY21jeElFTkJNQjRYRFRJd01EVXhOREV3TkRjd01Gb1hEVE13TURVeE1qRXdORGN3TUZvdwpKVEVPTUF3R0ExVUVDeE1GWVdSdGFXNHhFekFSQmdOVkJBTVRDazl5WnpFZ1FXUnRhVzR3V1RBVEJnY3Foa2pPClBRSUJCZ2dxaGtqT1BRTUJCd05DQUFSN0l4UmRGb0theE1ZWHFyK01zU1F6UDhIS1lITVphRmYrVmt3SnpsbisKNGJsa1M0aWVxZFRiRWhqUThvc1F2QmxpZk1Ca29YeUVKd3JkNHdmUzNtc1dvNEdZTUlHVk1BNEdBMVVkRHdFQgovd1FFQXdJRm9EQWRCZ05WSFNVRUZqQVVCZ2dyQmdFRkJRY0RBZ1lJS3dZQkJRVUhBd0V3REFZRFZSMFRBUUgvCkJBSXdBREFwQmdOVkhRNEVJZ1FnNEpNUmx6cVhxaEFTaE1EaHIrOE5Hd0FFVE85bDFld3lJcDh0RHBMMTZMa3cKS3dZRFZSMGpCQ1F3SW9BZ21qczI3VG56V0ZvZWZ4Y3RYMGRZWUl4UnJKRmpVeXdyTHJ3YzMzdkp3Tmd3Q2dZSQpLb1pJemowRUF3SURSZ0F3UXdJZkVkS2xoSCsySk4yNDhVQnE3UjBtWnU5NGxiK1BXRFA4QnAxN0hMSHpMQUlnClRSMVF4ZUUrUitkNDhpWjB0ZEZ2S1FRVGQvWTJlZXJZMnJiUDZsQzVYWUU9Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K',
                private_key: 'LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JR0hBZ0VBTUJNR0J5cUdTTTQ5QWdFR0NDcUdTTTQ5QXdFSEJHMHdhd0lCQVFRZ1RMdWdydldMaXVvNWM5dnUKenh4MjBmZzBJS1B2c0haV2NLenUrTUVUcmNhaFJBTkNBQVI3SXhSZEZvS2F4TVlYcXIrTXNTUXpQOEhLWUhNWgphRmYrVmt3Snpsbis0YmxrUzRpZXFkVGJFaGpROG9zUXZCbGlmTUJrb1h5RUp3cmQ0d2ZTM21zVwotLS0tLUVORCBQUklWQVRFIEtFWS0tLS0tCg==',
                msp_id: 'Org1MSP',
                wallet: 'Org1'
            },
            // This isn't actually relevant to Microfab, but we need to test a wallet that has multiple identities.
            {
                id: 'org1user',
                display_name: 'Org1 User',
                type: 'identity',
                cert: 'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUJ6RENDQVhTZ0F3SUJBZ0lRZHBtaE9FOVkxQ3V3WHl2b3pmMjFRakFLQmdncWhrak9QUVFEQWpBU01SQXcKRGdZRFZRUURFd2RQY21jeElFTkJNQjRYRFRJd01EVXhOREV3TkRjd01Gb1hEVE13TURVeE1qRXdORGN3TUZvdwpKVEVPTUF3R0ExVUVDeE1GWVdSdGFXNHhFekFSQmdOVkJBTVRDazl5WnpFZ1FXUnRhVzR3V1RBVEJnY3Foa2pPClBRSUJCZ2dxaGtqT1BRTUJCd05DQUFSN0l4UmRGb0theE1ZWHFyK01zU1F6UDhIS1lITVphRmYrVmt3SnpsbisKNGJsa1M0aWVxZFRiRWhqUThvc1F2QmxpZk1Ca29YeUVKd3JkNHdmUzNtc1dvNEdZTUlHVk1BNEdBMVVkRHdFQgovd1FFQXdJRm9EQWRCZ05WSFNVRUZqQVVCZ2dyQmdFRkJRY0RBZ1lJS3dZQkJRVUhBd0V3REFZRFZSMFRBUUgvCkJBSXdBREFwQmdOVkhRNEVJZ1FnNEpNUmx6cVhxaEFTaE1EaHIrOE5Hd0FFVE85bDFld3lJcDh0RHBMMTZMa3cKS3dZRFZSMGpCQ1F3SW9BZ21qczI3VG56V0ZvZWZ4Y3RYMGRZWUl4UnJKRmpVeXdyTHJ3YzMzdkp3Tmd3Q2dZSQpLb1pJemowRUF3SURSZ0F3UXdJZkVkS2xoSCsySk4yNDhVQnE3UjBtWnU5NGxiK1BXRFA4QnAxN0hMSHpMQUlnClRSMVF4ZUUrUitkNDhpWjB0ZEZ2S1FRVGQvWTJlZXJZMnJiUDZsQzVYWUU9Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K',
                private_key: 'LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JR0hBZ0VBTUJNR0J5cUdTTTQ5QWdFR0NDcUdTTTQ5QXdFSEJHMHdhd0lCQVFRZ1RMdWdydldMaXVvNWM5dnUKenh4MjBmZzBJS1B2c0haV2NLenUrTUVUcmNhaFJBTkNBQVI3SXhSZEZvS2F4TVlYcXIrTXNTUXpQOEhLWUhNWgphRmYrVmt3Snpsbis0YmxrUzRpZXFkVGJFaGpROG9zUXZCbGlmTUJrb1h5RUp3cmQ0d2ZTM21zVwotLS0tLUVORCBQUklWQVRFIEtFWS0tLS0tCg==',
                msp_id: 'Org1MSP',
                wallet: 'Org1'
            },
            {
                id: 'orderer',
                display_name: 'Orderer',
                type: 'fabric-orderer',
                api_url: 'grpc://localhost:8080',
                api_options: {
                    'grpc.default_authority': 'orderer-api.127-0-0-1.nip.io:8080',
                    'grpc.ssl_target_name_override': 'orderer-api.127-0-0-1.nip.io:8080'
                },
                operations_url: 'http://localhost:8080',
                operations_options: {
                    'grpc.default_authority': 'orderer-operations.127-0-0-1.nip.io:8080',
                    'grpc.ssl_target_name_override': 'orderer-operations.127-0-0-1.nip.io:8080'
                },
                msp_id: 'OrdererMSP',
                wallet: 'Orderer',
                identity: 'Orderer Admin'
            },
            {
                id: 'org1peer',
                display_name: 'Org1 Peer',
                type: 'fabric-peer',
                api_url: 'grpc://localhost:8080',
                api_options: {
                    'grpc.default_authority': 'org1peer-api.127-0-0-1.nip.io:8080',
                    'grpc.ssl_target_name_override': 'org1peer-api.127-0-0-1.nip.io:8080'
                },
                chaincode_url: 'grpc://localhost:8080',
                chaincode_options: {
                    'grpc.default_authority': 'org1peer-chaincode.127-0-0-1.nip.io:8080',
                    'grpc.ssl_target_name_override': 'org1peer-chaincode.127-0-0-1.nip.io:8080'
                },
                operations_url: 'http://localhost:8080',
                operations_options: {
                    'grpc.default_authority': 'org1peer-operations.127-0-0-1.nip.io:8080',
                    'grpc.ssl_target_name_override': 'org1peer-operations.127-0-0-1.nip.io:8080'
                },
                msp_id: 'Org1MSP',
                wallet: 'Org1',
                identity: 'Org1 Admin'
            },
            {
                client: {
                    connection: {
                        timeout: {
                            orderer: '300',
                            peer: {
                                endorser: '300'
                            }
                        }
                    },
                    organization: 'Org1'
                },
                display_name: 'Org1 Gateway',
                id: 'org1gateway',
                name: 'Org1 Gateway',
                organizations: {
                    Org1: {
                        mspid: 'Org1MSP',
                        peers: [
                            'org1peer-api.127-0-0-1.nip.io:8080'
                        ]
                    }
                },
                peers: {
                    'org1peer-api.127-0-0-1.nip.io:8080': {
                        grpcOptions: {
                            'grpc.default_authority': 'org1peer-api.127-0-0-1.nip.io:8080',
                            'grpc.ssl_target_name_override': 'org1peer-api.127-0-0-1.nip.io:8080'
                        },
                        url: 'grpc://localhost:8080'
                    }
                },
                type: 'gateway',
                version: '1.0',
                wallet: 'Org1'
            }
        ]);
        environment['client'] = mockClient as any;
        mockFabricWalletGenerator = sinon.createStubInstance(TestFabricWalletGenerator);
        mockFabricWallet = sinon.createStubInstance(TestFabricWallet);
        sandbox.stub(FabricWalletGeneratorFactory, 'getFabricWalletGenerator').returns(mockFabricWalletGenerator);
        mockFabricWalletGenerator.getWallet.resolves(mockFabricWallet);
        mockFabricWallet.getIdentities.resolves([]);
        mockFabricWallet.getIdentityNames.resolves([]);
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('#getAllOrganizationNames', () => {

        it('should return all of the organization names', async () => {
            await environment.getAllOrganizationNames().should.eventually.deep.equal(['OrdererMSP', 'Org1MSP']);
        });

        it('should not return the orderer organization if desired', async () => {
            await environment.getAllOrganizationNames(false).should.eventually.deep.equal(['Org1MSP']);
        });

    });

    describe('#getNodes', () => {

        it('should return all of the nodes', async () => {
            const nodes: FabricNode[] = await environment.getNodes();
            nodes.should.have.lengthOf(2);
            nodes[0].should.deep.equal({
                api_options: {
                    'grpc.default_authority': 'orderer-api.127-0-0-1.nip.io:8080',
                    'grpc.ssl_target_name_override': 'orderer-api.127-0-0-1.nip.io:8080'
                },
                api_url: 'grpc://localhost:8080',
                cluster_name: 'Orderer',
                hidden: false,
                identity: 'Orderer Admin',
                msp_id: 'OrdererMSP',
                name: 'Orderer',
                short_name: 'orderer',
                type: FabricNodeType.ORDERER,
                wallet: 'Orderer'
            });
            nodes[1].should.deep.equal({
                api_options: {
                    'grpc.default_authority': 'org1peer-api.127-0-0-1.nip.io:8080',
                    'grpc.ssl_target_name_override': 'org1peer-api.127-0-0-1.nip.io:8080'
                },
                api_url: 'grpc://localhost:8080',
                chaincode_options: {
                    'grpc.default_authority': 'org1peer-chaincode.127-0-0-1.nip.io:8080',
                    'grpc.ssl_target_name_override': 'org1peer-chaincode.127-0-0-1.nip.io:8080'
                },
                chaincode_url: 'grpc://localhost:8080',
                hidden: false,
                identity: 'Org1 Admin',
                msp_id: 'Org1MSP',
                name: 'Org1 Peer',
                short_name: 'org1peer',
                type: FabricNodeType.PEER,
                wallet: 'Org1'
            });
        });

    });

    describe('#updateNode', () => {

        it('should throw as it is not supported', async () => {
            const node: FabricNode = {
                short_name: 'org1peer',
                name: 'Org1 Peer',
                api_url: 'http://org1peer-api.microfab.example.org',
                type: FabricNodeType.PEER,
                hidden: false
            };
            await environment.updateNode(node).should.eventually.be.rejectedWith(/Operation not supported/);
        });

    });

    describe('#deleteNode', () => {

        it('should throw as it is not supported', async () => {
            const node: FabricNode = {
                short_name: 'org1peer',
                name: 'Org1 Peer',
                api_url: 'http://org1peer-api.microfab.example.org',
                type: FabricNodeType.PEER,
                hidden: false
            };
            await environment.deleteNode(node).should.eventually.be.rejectedWith(/Operation not supported/);
        });

    });

    describe('#requireSetup', () => {

        it('should return false', async () => {
            await environment.requireSetup().should.eventually.be.false;
        });

    });

    describe('#getWalletsAndIdentities', () => {

        it('should import all identities and return all of the wallet registry entries', async () => {
            const walletRegistryEntries: FabricWalletRegistryEntry[] = await environment.getWalletsAndIdentities();
            walletRegistryEntries.should.have.lengthOf(2);
            walletRegistryEntries[0].should.deep.equal({
                displayName: 'microfabEnvironment - Orderer',
                environmentGroups: ['microfabEnvironment'],
                fromEnvironment: 'microfabEnvironment',
                managedWallet: false,
                name: 'Orderer',
                walletPath: path.join(directory, FileConfigurations.FABRIC_WALLETS, 'Orderer')
            });
            walletRegistryEntries[1].should.deep.equal({
                displayName: 'microfabEnvironment - Org1',
                environmentGroups: ['microfabEnvironment'],
                fromEnvironment: 'microfabEnvironment',
                managedWallet: false,
                name: 'Org1',
                walletPath: path.join(directory, FileConfigurations.FABRIC_WALLETS, 'Org1')
            });
            mockFabricWallet.importIdentity.should.have.been.calledThrice;
            mockFabricWallet.importIdentity.should.have.been.calledWithExactly(sinon.match.string, sinon.match.string, 'Orderer Admin', 'OrdererMSP');
            mockFabricWallet.importIdentity.should.have.been.calledWithExactly(sinon.match.string, sinon.match.string, 'Org1 Admin', 'Org1MSP');
            mockFabricWallet.importIdentity.should.have.been.calledWithExactly(sinon.match.string, sinon.match.string, 'Org1 User', 'Org1MSP');
        });

        it('should import all identities ignoring existing matching identities and return all of the wallet registry entries', async () => {
            mockFabricWallet.exists.withArgs('Orderer Admin').resolves(true);
            mockFabricWallet.exists.withArgs('Org1 Admin').resolves(true);
            mockFabricWallet.exists.withArgs('Org1 User').resolves(true);
            mockFabricWallet.getIdentities.resolves([
                {
                    name: 'Orderer Admin',
                    msp_id: 'OrdererMSP',
                    cert: b64tostr('LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUIwekNDQVhxZ0F3SUJBZ0lRTXNjMWxWemUzSzlZQ3IrNktieVJ5akFLQmdncWhrak9QUVFEQWpBVk1STXcKRVFZRFZRUURFd3BQY21SbGNtVnlJRU5CTUI0WERUSXdNRFV4TkRFd05EY3dNRm9YRFRNd01EVXhNakV3TkRjdwpNRm93S0RFT01Bd0dBMVVFQ3hNRllXUnRhVzR4RmpBVUJnTlZCQU1URFU5eVpHVnlaWElnUVdSdGFXNHdXVEFUCkJnY3Foa2pPUFFJQkJnZ3Foa2pPUFFNQkJ3TkNBQVR0dkhyZDF5cWJNZWFDbHR5cXlNeVNESm5Va0FZWTYzalQKMkxicjBqdjR5NXhYdlF6SytOaDMzMnNZYllqYXpSM3JweG1xRVQvdVBoSFQrTk9vNGxSNG80R1lNSUdWTUE0RwpBMVVkRHdFQi93UUVBd0lGb0RBZEJnTlZIU1VFRmpBVUJnZ3JCZ0VGQlFjREFnWUlLd1lCQlFVSEF3RXdEQVlEClZSMFRBUUgvQkFJd0FEQXBCZ05WSFE0RUlnUWdiNkJYRlFKRFRocmc3WmdFVFAyM3RXTlkxZjlOMEdESVlZVGIKZ25obFdFNHdLd1lEVlIwakJDUXdJb0FnNEI1c2Fqc2FWc25ZMnJRcjFZc3RQYk5wMVBZNHFTeFRYTEtrb3g5NgpheTB3Q2dZSUtvWkl6ajBFQXdJRFJ3QXdSQUlnSmhVMGxsV0owcEhyQXk4VTlGRzVFekRjcUEwcXhZeTl3MGg5CkRKUW1zSlFDSUJnY0RxZ1RRa0xlMUhuQkVhRDd6NnNGZFpUNFduOXFYOTk3dk9WNXoxSlIKLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo='),
                    private_key: b64tostr('LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JR0hBZ0VBTUJNR0J5cUdTTTQ5QWdFR0NDcUdTTTQ5QXdFSEJHMHdhd0lCQVFRZ0lBcmsyUVlSN2dxdWFnZUYKVDJSeE9lUWtuZHY0OW5OVmhLTG5EakpKMTRhaFJBTkNBQVR0dkhyZDF5cWJNZWFDbHR5cXlNeVNESm5Va0FZWQo2M2pUMkxicjBqdjR5NXhYdlF6SytOaDMzMnNZYllqYXpSM3JweG1xRVQvdVBoSFQrTk9vNGxSNAotLS0tLUVORCBQUklWQVRFIEtFWS0tLS0tCg==')
                },
                {
                    name: 'Org1 Admin',
                    msp_id: 'Org1MSP',
                    cert: b64tostr('LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUJ6RENDQVhTZ0F3SUJBZ0lRZHBtaE9FOVkxQ3V3WHl2b3pmMjFRakFLQmdncWhrak9QUVFEQWpBU01SQXcKRGdZRFZRUURFd2RQY21jeElFTkJNQjRYRFRJd01EVXhOREV3TkRjd01Gb1hEVE13TURVeE1qRXdORGN3TUZvdwpKVEVPTUF3R0ExVUVDeE1GWVdSdGFXNHhFekFSQmdOVkJBTVRDazl5WnpFZ1FXUnRhVzR3V1RBVEJnY3Foa2pPClBRSUJCZ2dxaGtqT1BRTUJCd05DQUFSN0l4UmRGb0theE1ZWHFyK01zU1F6UDhIS1lITVphRmYrVmt3SnpsbisKNGJsa1M0aWVxZFRiRWhqUThvc1F2QmxpZk1Ca29YeUVKd3JkNHdmUzNtc1dvNEdZTUlHVk1BNEdBMVVkRHdFQgovd1FFQXdJRm9EQWRCZ05WSFNVRUZqQVVCZ2dyQmdFRkJRY0RBZ1lJS3dZQkJRVUhBd0V3REFZRFZSMFRBUUgvCkJBSXdBREFwQmdOVkhRNEVJZ1FnNEpNUmx6cVhxaEFTaE1EaHIrOE5Hd0FFVE85bDFld3lJcDh0RHBMMTZMa3cKS3dZRFZSMGpCQ1F3SW9BZ21qczI3VG56V0ZvZWZ4Y3RYMGRZWUl4UnJKRmpVeXdyTHJ3YzMzdkp3Tmd3Q2dZSQpLb1pJemowRUF3SURSZ0F3UXdJZkVkS2xoSCsySk4yNDhVQnE3UjBtWnU5NGxiK1BXRFA4QnAxN0hMSHpMQUlnClRSMVF4ZUUrUitkNDhpWjB0ZEZ2S1FRVGQvWTJlZXJZMnJiUDZsQzVYWUU9Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K'),
                    private_key: b64tostr('LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JR0hBZ0VBTUJNR0J5cUdTTTQ5QWdFR0NDcUdTTTQ5QXdFSEJHMHdhd0lCQVFRZ1RMdWdydldMaXVvNWM5dnUKenh4MjBmZzBJS1B2c0haV2NLenUrTUVUcmNhaFJBTkNBQVI3SXhSZEZvS2F4TVlYcXIrTXNTUXpQOEhLWUhNWgphRmYrVmt3Snpsbis0YmxrUzRpZXFkVGJFaGpROG9zUXZCbGlmTUJrb1h5RUp3cmQ0d2ZTM21zVwotLS0tLUVORCBQUklWQVRFIEtFWS0tLS0tCg==')
                },
                {
                    name: 'Org1 User',
                    msp_id: 'Org1MSP',
                    cert: b64tostr('LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUJ6RENDQVhTZ0F3SUJBZ0lRZHBtaE9FOVkxQ3V3WHl2b3pmMjFRakFLQmdncWhrak9QUVFEQWpBU01SQXcKRGdZRFZRUURFd2RQY21jeElFTkJNQjRYRFRJd01EVXhOREV3TkRjd01Gb1hEVE13TURVeE1qRXdORGN3TUZvdwpKVEVPTUF3R0ExVUVDeE1GWVdSdGFXNHhFekFSQmdOVkJBTVRDazl5WnpFZ1FXUnRhVzR3V1RBVEJnY3Foa2pPClBRSUJCZ2dxaGtqT1BRTUJCd05DQUFSN0l4UmRGb0theE1ZWHFyK01zU1F6UDhIS1lITVphRmYrVmt3SnpsbisKNGJsa1M0aWVxZFRiRWhqUThvc1F2QmxpZk1Ca29YeUVKd3JkNHdmUzNtc1dvNEdZTUlHVk1BNEdBMVVkRHdFQgovd1FFQXdJRm9EQWRCZ05WSFNVRUZqQVVCZ2dyQmdFRkJRY0RBZ1lJS3dZQkJRVUhBd0V3REFZRFZSMFRBUUgvCkJBSXdBREFwQmdOVkhRNEVJZ1FnNEpNUmx6cVhxaEFTaE1EaHIrOE5Hd0FFVE85bDFld3lJcDh0RHBMMTZMa3cKS3dZRFZSMGpCQ1F3SW9BZ21qczI3VG56V0ZvZWZ4Y3RYMGRZWUl4UnJKRmpVeXdyTHJ3YzMzdkp3Tmd3Q2dZSQpLb1pJemowRUF3SURSZ0F3UXdJZkVkS2xoSCsySk4yNDhVQnE3UjBtWnU5NGxiK1BXRFA4QnAxN0hMSHpMQUlnClRSMVF4ZUUrUitkNDhpWjB0ZEZ2S1FRVGQvWTJlZXJZMnJiUDZsQzVYWUU9Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K'),
                    private_key: b64tostr('LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JR0hBZ0VBTUJNR0J5cUdTTTQ5QWdFR0NDcUdTTTQ5QXdFSEJHMHdhd0lCQVFRZ1RMdWdydldMaXVvNWM5dnUKenh4MjBmZzBJS1B2c0haV2NLenUrTUVUcmNhaFJBTkNBQVI3SXhSZEZvS2F4TVlYcXIrTXNTUXpQOEhLWUhNWgphRmYrVmt3Snpsbis0YmxrUzRpZXFkVGJFaGpROG9zUXZCbGlmTUJrb1h5RUp3cmQ0d2ZTM21zVwotLS0tLUVORCBQUklWQVRFIEtFWS0tLS0tCg==')
                }
            ]);
            await environment.getWalletsAndIdentities();
            mockFabricWallet.importIdentity.should.not.have.been.called;
        });

        it('should import all identities replacing any non-matching identities and return all of the wallet registry entries', async () => {
            mockFabricWallet.exists.withArgs('Orderer Admin').resolves(true);
            mockFabricWallet.exists.withArgs('Org1 Admin').resolves(true);
            mockFabricWallet.exists.withArgs('Org1 User').resolves(true);
            mockFabricWallet.getIdentities.resolves([
                {
                    name: 'Orderer Admin',
                    msp_id: 'OrdererMSP',
                    cert: b64tostr('LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUIwekNDQVhxZ0F3SUJBZ0lRTXNjMWxWemUzSzlZQ3IrNktieVJ5akFLQmdncWhrak9QUVFEQWpBVk1STXcKRVFZRFZRUURFd3BQY21SbGNtVnlJRU5CTUI0WERUSXdNRFV4TkRFd05EY3dNRm9YRFRNd01EVXhNakV3TkRjdwpNRm93S0RFT01Bd0dBMVVFQ3hNRllXUnRhVzR4RmpBVUJnTlZCQU1URFU5eVpHVnlaWElnUVdSdGFXNHdXVEFUCkJnY3Foa2pPUFFJQkJnZ3Foa2pPUFFNQkJ3TkNBQVR0dkhyZDF5cWJNZWFDbHR5cXlNeVNESm5Va0FZWTYzalQKMkxicjBqdjR5NXhYdlF6SytOaDMzMnNZYllqYXpSM3JweG1xRVQvdVBoSFQrTk9vNGxSNG80R1lNSUdWTUE0RwpBMVVkRHdFQi93UUVBd0lGb0RBZEJnTlZIU1VFRmpBVUJnZ3JCZ0VGQlFjREFnWUlLd1lCQlFVSEF3RXdEQVlEClZSMFRBUUgvQkFJd0FEQXBCZ05WSFE0RUlnUWdiNkJYRlFKRFRocmc3WmdFVFAyM3RXTlkxZjlOMEdESVlZVGIKZ25obFdFNHdLd1lEVlIwakJDUXdJb0FnNEI1c2Fqc2FWc25ZMnJRcjFZc3RQYk5wMVBZNHFTeFRYTEtrb3g5NgpheTB3Q2dZSUtvWkl6ajBFQXdJRFJ3QXdSQUlnSmhVMGxsV0owcEhyQXk4VTlGRzVFekRjcUEwcXhZeTl3MGg5CkRKUW1zSlFDSUJnY0RxZ1RRa0xlMUhuQkVhRDd6NnNGZFpUNFduOXFYOTk3dk9WNXoxSlIKLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo='),
                    private_key: b64tostr('LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JR0hBZ0VBTUJNR0J5cUdTTTQ5QWdFR0NDcUdTTTQ5QXdFSEJHMHdhd0lCQVFRZ0lBcmsyUVlSN2dxdWFnZUYKVDJSeE9lUWtuZHY0OW5OVmhLTG5EakpKMTRhaFJBTkNBQVR0dkhyZDF5cWJNZWFDbHR5cXlNeVNESm5Va0FZWQo2M2pUMkxicjBqdjR5NXhYdlF6SytOaDMzMnNZYllqYXpSM3JweG1xRVQvdVBoSFQrTk9vNGxSNAotLS0tLUVORCBQUklWQVRFIEtFWS0tLS0tCg==')
                },
                {
                    name: 'Org1 Admin',
                    msp_id: 'Org1MSP',
                    cert: b64tostr('bm90aGluZyB0byBzZWUgaGVyZQo='),
                    private_key: b64tostr('d2h5IGRvIHlvdSBrZWVwIHJlYWRpbmcK')
                },
                {
                    name: 'Org1 User',
                    msp_id: 'Org1MSP',
                    cert: b64tostr('LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUJ6RENDQVhTZ0F3SUJBZ0lRZHBtaE9FOVkxQ3V3WHl2b3pmMjFRakFLQmdncWhrak9QUVFEQWpBU01SQXcKRGdZRFZRUURFd2RQY21jeElFTkJNQjRYRFRJd01EVXhOREV3TkRjd01Gb1hEVE13TURVeE1qRXdORGN3TUZvdwpKVEVPTUF3R0ExVUVDeE1GWVdSdGFXNHhFekFSQmdOVkJBTVRDazl5WnpFZ1FXUnRhVzR3V1RBVEJnY3Foa2pPClBRSUJCZ2dxaGtqT1BRTUJCd05DQUFSN0l4UmRGb0theE1ZWHFyK01zU1F6UDhIS1lITVphRmYrVmt3SnpsbisKNGJsa1M0aWVxZFRiRWhqUThvc1F2QmxpZk1Ca29YeUVKd3JkNHdmUzNtc1dvNEdZTUlHVk1BNEdBMVVkRHdFQgovd1FFQXdJRm9EQWRCZ05WSFNVRUZqQVVCZ2dyQmdFRkJRY0RBZ1lJS3dZQkJRVUhBd0V3REFZRFZSMFRBUUgvCkJBSXdBREFwQmdOVkhRNEVJZ1FnNEpNUmx6cVhxaEFTaE1EaHIrOE5Hd0FFVE85bDFld3lJcDh0RHBMMTZMa3cKS3dZRFZSMGpCQ1F3SW9BZ21qczI3VG56V0ZvZWZ4Y3RYMGRZWUl4UnJKRmpVeXdyTHJ3YzMzdkp3Tmd3Q2dZSQpLb1pJemowRUF3SURSZ0F3UXdJZkVkS2xoSCsySk4yNDhVQnE3UjBtWnU5NGxiK1BXRFA4QnAxN0hMSHpMQUlnClRSMVF4ZUUrUitkNDhpWjB0ZEZ2S1FRVGQvWTJlZXJZMnJiUDZsQzVYWUU9Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K'),
                    private_key: b64tostr('LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JR0hBZ0VBTUJNR0J5cUdTTTQ5QWdFR0NDcUdTTTQ5QXdFSEJHMHdhd0lCQVFRZ1RMdWdydldMaXVvNWM5dnUKenh4MjBmZzBJS1B2c0haV2NLenUrTUVUcmNhaFJBTkNBQVI3SXhSZEZvS2F4TVlYcXIrTXNTUXpQOEhLWUhNWgphRmYrVmt3Snpsbis0YmxrUzRpZXFkVGJFaGpROG9zUXZCbGlmTUJrb1h5RUp3cmQ0d2ZTM21zVwotLS0tLUVORCBQUklWQVRFIEtFWS0tLS0tCg==')
                }
            ]);
            await environment.getWalletsAndIdentities();
            mockFabricWallet.importIdentity.should.have.been.calledWithExactly(sinon.match.string, sinon.match.string, 'Org1 Admin', 'Org1MSP');
        });

    });

    describe('#getGateways', () => {

        it('should return all of the gateway registry entries', async () => {
            const gatewayRegistryEntries: FabricGatewayRegistryEntry[] = await environment.getGateways();
            gatewayRegistryEntries.should.have.lengthOf(1);
            gatewayRegistryEntries[0].should.deep.equal({
                associatedWallet: 'Org1',
                connectionProfilePath: path.join(directory, FileConfigurations.FABRIC_GATEWAYS, 'Org1 Gateway.json'),
                displayName: 'Org1 Gateway',
                environmentGroup: 'microfabEnvironment',
                fromEnvironment: 'microfabEnvironment',
                name: 'microfabEnvironment - Org1 Gateway'
            });
            const connectionProfile: object = await fs.readJson(gatewayRegistryEntries[0].connectionProfilePath);
            connectionProfile['display_name'].should.equal('Org1 Gateway');
        });

    });

    describe('#getWalletNames', () => {

        it('should return all of the wallet names', async () => {
            await environment.getWalletNames().should.eventually.deep.equal(['Orderer', 'Org1']);
        });

    });

    describe('#getIdentities', () => {

        it('should return all of the identities', async () => {
            const identities: FabricIdentity[] = await environment.getIdentities('Org1');
            identities.should.have.lengthOf(2);
            identities[0].name.should.equal('Org1 Admin');
            identities[1].name.should.equal('Org1 User');
        });

    });

    describe('#getFabricGateways', () => {

        it('should import all gateways and return all of the gateways', async () => {
            const gateways: FabricGateway[] = await environment.getFabricGateways();
            gateways.should.have.lengthOf(1);
            gateways[0].name.should.equal('Org1 Gateway');
            gateways[0].path.should.equal(path.join(directory, FileConfigurations.FABRIC_GATEWAYS, 'Org1 Gateway.json'));
            gateways[0].connectionProfile['display_name'].should.equal('Org1 Gateway');
            const connectionProfile: object = await fs.readJson(gateways[0].path);
            connectionProfile['display_name'].should.equal('Org1 Gateway');
        });

        it('should import all gateways ignoring existing matching gateways and return all of the gateways', async () => {
            const writeJsonSpy: sinon.SinonSpy = sandbox.spy(fs, 'writeJson');
            await environment.getFabricGateways();
            writeJsonSpy.should.have.been.calledOnce;
            writeJsonSpy.resetHistory();
            const gateways: FabricGateway[] = await environment.getFabricGateways();
            writeJsonSpy.should.not.have.been.called;
            gateways.should.have.lengthOf(1);
            gateways[0].name.should.equal('Org1 Gateway');
            gateways[0].path.should.equal(path.join(directory, FileConfigurations.FABRIC_GATEWAYS, 'Org1 Gateway.json'));
            gateways[0].connectionProfile['display_name'].should.equal('Org1 Gateway');
        });

        it('should import all gateways replacing any non-matching gateways and return all of the gateways', async () => {
            const writeJsonSpy: sinon.SinonSpy = sandbox.spy(fs, 'writeJson');
            await environment.getFabricGateways();
            writeJsonSpy.should.have.been.calledOnce;
            writeJsonSpy.resetHistory();
            await fs.writeFile(path.join(directory, FileConfigurations.FABRIC_GATEWAYS, 'Org1 Gateway.json'), '{}');
            const gateways: FabricGateway[] = await environment.getFabricGateways();
            writeJsonSpy.should.have.been.calledOnce;
            gateways.should.have.lengthOf(1);
            gateways[0].name.should.equal('Org1 Gateway');
            gateways[0].path.should.equal(path.join(directory, FileConfigurations.FABRIC_GATEWAYS, 'Org1 Gateway.json'));
            gateways[0].connectionProfile['display_name'].should.equal('Org1 Gateway');
            const connectionProfile: object = await fs.readJson(gateways[0].path);
            connectionProfile['display_name'].should.equal('Org1 Gateway');
        });

    });

});
