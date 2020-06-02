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
'use strict';
import { Wallet, X509Identity, Wallets, Identity } from 'fabric-network';
import { FabricIdentity, IFabricWallet } from 'ibm-blockchain-platform-common';

export class FabricWallet implements IFabricWallet {

    public static async newFabricWallet(walletPath: string): Promise<FabricWallet> {
        const wallet: Wallet = await Wallets.newFileSystemWallet(walletPath);
        return new FabricWallet(walletPath, wallet);
    }

    private wallet: Wallet;

    private walletPath: string;

    private constructor(walletPath: string, wallet: Wallet) {
        this.walletPath = walletPath;
        this.wallet = wallet;
    }

    public getWallet(): Wallet {
        return this.wallet;
    }

    public async importIdentity(certificate: string, privateKey: string, identityName: string, mspid: string): Promise<void> {
        const identity: X509Identity = {
            credentials: {
                certificate: certificate,
                privateKey: privateKey,
            },
            mspId: mspid,
            type: 'X.509',
        };

        await  this.wallet.put(identityName, identity);
    }

    public async getIdentityNames(): Promise<string[]> {
        return  this.wallet.list();
    }

    public async getIDs(identities: string[]): Promise<FabricIdentity[]> {
        const allIDs: FabricIdentity[] = [];
        const walletPath: string = this.getWalletPath();
        let privKey: string;
        let identityJSON: any;
        for (const item of identities) {
            const identity: FabricIdentity = {
                cert: '',
                msp_id: '',
                name: '',
                private_key: ''
            };
            identityJSON = undefined;
            let privKeyName: string;
            const identityPath: string = path.join(walletPath, item);
            const readPath: string[] = await fs.readdir(identityPath);
            for (const file of readPath) {
                if (file.endsWith('-priv')) {
                    privKeyName = file;
                }
            }

            identityJSON = await fs.readJson(path.join(identityPath, item));
            const privKeyBuff: Buffer = await fs.readFile(path.join(identityPath, privKeyName));
            privKey = privKeyBuff.toString();
            const cert: string = identityJSON.enrollment.identity.certificate;
            identity.name = identityJSON.name;
            identity.msp_id = identityJSON.mspid;
            identity.cert = Buffer.from(cert).toString('base64');
            identity.private_key = Buffer.from(privKey).toString('base64');
            allIDs.push(identity);
        }
        return allIDs;
    }

    public async getIdentities(): Promise<FabricIdentity[]> {
        const identityNames: string[] = await this.getIdentityNames();
        const identities: FabricIdentity[] = [];
        for (const identityName of identityNames) {
            const identity: X509Identity = await  this.wallet.get(identityName) as X509Identity;
            const fabricIdentity: FabricIdentity = new FabricIdentity(identityName, identity.credentials.certificate, identity.credentials.privateKey, identity.mspId);
            identities.push(fabricIdentity);
        }

        return identities;
    }

    public async getIdentity(identityName: string): Promise<FabricIdentity> {
        const identity: X509Identity = await  this.wallet.get(identityName) as X509Identity;
        return new FabricIdentity(identityName, identity.credentials.certificate, identity.credentials.privateKey, identity.mspId);
    }

    public getWalletPath(): string {
        return this.walletPath;
    }

    public async exists(identityName: string): Promise<boolean> {
        const identity: Identity = await this.wallet.get(identityName);
        return !!identity;
    }

    public removeIdentity(identityName: string): Promise<void> {
        return this.wallet.remove(identityName);
    }
}
