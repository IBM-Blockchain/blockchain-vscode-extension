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

import * as Client from 'fabric-client';
import * as path from 'path';
import * as fs from 'fs-extra';

// tslint:disable no-unused-expression

export class IntegrationTestRemoteFabricUtil {

    private client: Client;

    private testPath: string = path.join(__dirname, '..', '..', 'integrationTest');

    public async connect(): Promise<void> {
        const filePath: string = path.join(this.testPath, 'data', 'connection', 'connection.json');
        const connection: string = await fs.readFile(filePath, 'utf8');
        const connectionObject: any = JSON.parse(connection);
        this.client = Client.loadFromConfig(connectionObject);

        const storePath: string = path.join(this.testPath, 'hfc-key-store');
        const stateStore: any = await Client.newDefaultKeyValueStore({ path: storePath });
        this.client.setStateStore(stateStore);
        const cryptoSuite: Client.ICryptoSuite = Client.newCryptoSuite();

        const cryptoStore: any = Client.newCryptoKeyStore({ path: storePath });
        cryptoSuite.setCryptoKeyStore(cryptoStore);
        this.client.setCryptoSuite(cryptoSuite);

        const networkPath: string = path.resolve(this.testPath, 'hlfv1');
        const networkAdminPath: string = path.resolve(networkPath, 'crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com');
        const networkAdminCertificatePath: string = path.resolve(networkAdminPath, 'msp/signcerts/Admin@org1.example.com-cert.pem');
        const networkAdminCertificate: string = fs.readFileSync(networkAdminCertificatePath, 'utf8');
        const networkAdminPrivateKeyPath: string = path.resolve(networkAdminPath, 'msp/keystore/key.pem');
        const networkAdminPrivateKey: string = fs.readFileSync(networkAdminPrivateKeyPath, 'utf8');

        const user: Client.User = await this.client.createUser({
            username: 'admin',
            mspid: 'Org1MSP',
            cryptoContent: { privateKeyPEM: networkAdminPrivateKey, signedCertPEM: networkAdminCertificate },
            skipPersistence: false
        });

        this.client.setUserContext(user);
    }

    public async installChaincode(language: string): Promise<void> {
        const peer: Client.Peer = this.client.getPeersForOrg('Org1MSP')[0];
        const filePath: string = path.join(this.testPath, 'tmp', 'packages', language + 'SmartContract@0.0.1.cds');
        const pkgBuffer: Buffer = await fs.readFile(filePath);
        const installRequest: Client.ChaincodePackageInstallRequest = {
            targets: [peer],
            chaincodePackage: pkgBuffer,
            txId: this.client.newTransactionID()
        };
        const response: Client.ProposalResponseObject = await this.client.installChaincode(installRequest);
        const proposalResponse: Client.ProposalResponse | Error = response[0][0];
        if (proposalResponse instanceof Error) {
            throw proposalResponse;
        } else if (proposalResponse.response.status !== 200) {
            throw new Error(proposalResponse.response.message);
        }
    }

    public async instantiateChaincode(language: string): Promise<void> {
        const peers: Array<Client.Peer> = this.client.getPeersForOrg('Org1MSP');

        // Get the channel.
        const channel: Client.Channel = this.client.getChannel('mychannel');

        // Build the transaction proposal.
        const txId: Client.TransactionId = this.client.newTransactionID();
        const instantiateOrUpgradeRequest: Client.ChaincodeInstantiateUpgradeRequest = {
            targets: peers,
            chaincodeId: language + 'SmartContract',
            chaincodeVersion: '0.0.1',
            txId,
            fcn: 'instantiate',
            args: []
        };

        // Send the instantiate/upgrade proposal to all of the specified peers.
        const proposalResponseObject: Client.ProposalResponseObject = await channel.sendInstantiateProposal(instantiateOrUpgradeRequest, 5 * 60 * 1000);

        // Validate the proposal responses.
        const validProposalResponses: Client.ProposalResponse[] = [];
        const proposal: Client.Proposal = proposalResponseObject[1];
        for (const proposalResponse of proposalResponseObject[0]) {
            if (proposalResponse instanceof Error) {
                throw proposalResponse;
            } else if (proposalResponse.response.status !== 200) {
                throw new Error(proposalResponse.response.message);
            }
            validProposalResponses.push(proposalResponse);
        }

        // Set up the channel event hub for this transaction.
        const eventHub: Client.ChannelEventHub = channel.newChannelEventHub(peers[0]);
        let eventReceived: boolean = false;
        await new Promise((resolve: any, reject: any): void => {
            eventHub.connect(null, (err: Error) => {
                // Doesn't matter if we received the event.
                if (err && !eventReceived) {
                    return reject(err);
                }
                resolve();
            });
        });
        const eventHubPromise: any = new Promise((resolve: any, reject: any): void => {
            eventHub.registerTxEvent(txId.getTransactionID(), (eventTxId: string, code: string, blockNumber: number): void => {
                eventReceived = true;
                if (code !== 'VALID') {
                    return reject(new Error(`Peer has rejected the transaction ${eventTxId} with code ${code} in block ${blockNumber}`));
                }
                resolve();
            }, (err: Error): void => {
                // Doesn't matter if we received the event.
                if (err && !eventReceived) {
                    return reject(err);
                }
            }, {
                    disconnect: true,
                    unregister: true
                });
        });

        // Send the proposal responses to the ordering service.
        const orderer: Client.Orderer = this.client.getOrderer('orderer.example.com');
        const broadcastResponse: Client.BroadcastResponse = await channel.sendTransaction({
            proposal,
            proposalResponses: validProposalResponses,
            orderer,
            txId
        });

        // Check that the ordering service accepted the transaction.
        if (broadcastResponse.status !== 'SUCCESS') {
            eventHub.disconnect();
            throw new Error(`Failed to send peer responses for transaction ${txId.getTransactionID()} to orderer. Response status: ${broadcastResponse.status}`);
        }

        // Wait for the transaction to be committed to the ledger.
        await eventHubPromise;
    }
}
