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

// tslint:disable no-unused-expression

import Axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { MicrofabClient, MicrofabComponent, isIdentity, isOrderer, isPeer, isGateway } from '../../src/environments/MicrofabClient';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';

chai.should();
chai.use(chaiAsPromised);

describe('MicrofabClient', () => {

    let client: MicrofabClient;
    let mockAxios: MockAdapter;

    beforeEach(() => {
        client = new MicrofabClient('http://console.microfab.example.org:8080');
        mockAxios = new MockAdapter(Axios);
        mockAxios.onGet('http://console.microfab.example.org:8080/ak/api/v1/components').reply(200, [
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
        mockAxios.onGet('http://console.microfab.example.org:8080/ak/api/v1/components/org1peer').reply(200, {
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
        });
    });

    afterEach(() => {
        mockAxios.restore();
    });

    describe('#getComponents', () => {

        it('should get the list of components', async () => {
            const components: MicrofabComponent[] = await client.getComponents();
            components.should.have.lengthOf(5);
            isIdentity(components[0]).should.be.true;
            components[0].display_name.should.equal('Orderer Admin');
            isIdentity(components[1]).should.be.true;
            components[1].display_name.should.equal('Org1 Admin');
            isOrderer(components[2]).should.be.true;
            components[2].display_name.should.equal('Orderer');
            isPeer(components[3]).should.be.true;
            components[3].display_name.should.equal('Org1 Peer');
            isGateway(components[4]).should.be.true;
            components[4].display_name.should.equal('Org1 Gateway');
        });

    });

    describe('#getComponent', () => {

        it('should get the component', async () => {
            const component: MicrofabComponent = await client.getComponent('org1peer');
            isPeer(component).should.be.true;
            component.display_name.should.equal('Org1 Peer');
        });

    });

});
