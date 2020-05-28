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

import * as path from 'path';
import * as fs from 'fs-extra';
import {Helper} from './Helper';
import {Wallet, Wallets, X509Identity} from 'fabric-network';
import {Lifecycle, LifecyclePeer, LifecyclePeerOptions} from '../../src';

export class NetworkHelper {

    public static async setupLifecycle(onlyOneOrg: boolean = false): Promise<{ lifecycle: Lifecycle, wallet: Wallet }> {

        await this.importIdentity(1);
        const wallet: Wallet = await this.importIdentity(2);

        const lifecycle: Lifecycle = new Lifecycle();

        const org1PeerDetails: LifecyclePeerOptions = await this.getPeerDetails(1);
        lifecycle.addPeer(org1PeerDetails);

        if (!onlyOneOrg) {
            const org2PeerDetails: LifecyclePeerOptions = await this.getPeerDetails(2);
            lifecycle.addPeer(org2PeerDetails);
        }

        const ordererPemPath: string = path.join(Helper.NETWORK_DIR, 'organizations', 'ordererOrganizations', 'example.com', 'orderers', 'orderer.example.com', 'tls', 'ca.crt');

        const ordererPem: string = await fs.readFile(ordererPemPath, 'utf8');

        lifecycle.addOrderer({
            name: 'orderer.example.com',
            url: 'grpcs://localhost:7050',
            pem: ordererPem,
            sslTargetNameOverride: 'orderer.example.com'
        });

        return {lifecycle: lifecycle, wallet: wallet};
    }

    public static getListOfChannels(lifecycle: Lifecycle, peerName: string, wallet: Wallet, identity: string): Promise<string[]> {
        const peer: LifecyclePeer = lifecycle.getPeer(peerName, wallet, identity);

        return peer.getAllChannelNames();
    }

    private static async importIdentity(orgNumber: number): Promise<Wallet> {
        const peerOrgPath: string = path.join(Helper.NETWORK_DIR, 'organizations', 'peerOrganizations');

        const peerOrgNumberPath: string = path.join(peerOrgPath, `org${orgNumber}.example.com`);

        const peerOrgCert: string = await fs.readFile(path.join(peerOrgNumberPath, 'users', `Admin@org${orgNumber}.example.com`, 'msp', 'signcerts', 'cert.pem'), 'utf8');

        const peerOrgKeyDir: string = path.join(peerOrgNumberPath, 'users', `Admin@org${orgNumber}.example.com`, 'msp', 'keystore');
        const fileList: string[] = await fs.readdir(peerOrgKeyDir);
        const peerOrgKey: string = await fs.readFile(path.join(peerOrgKeyDir, fileList[0]), 'utf8');

        const walletPath: string = path.join(Helper.TMP_DIR, 'wallet');

        const wallet: Wallet = await Wallets.newFileSystemWallet(walletPath);

        const peerOrgIdentity: X509Identity = {
            credentials: {
                certificate: peerOrgCert,
                privateKey: peerOrgKey,
            },
            mspId: `Org${orgNumber}MSP`,
            type: 'X.509',
        };

        await wallet.put(`peerAdminOrg${orgNumber}`, peerOrgIdentity);
        return wallet;
    }

    private static async getPeerDetails(orgNumber: number): Promise<LifecyclePeerOptions> {
        const peerOrgPath: string = path.join(Helper.NETWORK_DIR, 'organizations', 'peerOrganizations');

        const peerOrgNumberPath: string = path.join(peerOrgPath, `org${orgNumber}.example.com`);
        const orgCCPPath: string = path.join(peerOrgNumberPath, `connection-org${orgNumber}.json`);

        const org1CCP: any = await fs.readJSON(orgCCPPath);

        const peerInfo: any = org1CCP.peers[`peer0.org${orgNumber}.example.com`];

        return {
            name: `peer0.org${orgNumber}.example.com`,
            url: peerInfo.url,
            pem: peerInfo.tlsCACerts.pem,
            mspid: `Org${orgNumber}MSP`,
            sslTargetNameOverride: peerInfo.grpcOptions['ssl-target-name-override']
        };
    }
}
