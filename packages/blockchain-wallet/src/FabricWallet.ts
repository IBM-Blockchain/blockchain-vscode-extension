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
import * as fs from 'fs-extra';
import * as path from 'path';
import { FileSystemWallet, X509WalletMixin, IdentityInfo } from 'fabric-network';
import { FabricIdentity, IFabricWallet } from 'ibm-blockchain-platform-common';

export class FabricWallet extends FileSystemWallet implements IFabricWallet {
    public walletPath: string;

    constructor(walletPath: string) {
        super(walletPath);
        this.walletPath = walletPath;
    }

    public async importIdentity(certificate: string, privateKey: string, identityName: string, mspid: string): Promise<void> {
        await this.import(identityName, X509WalletMixin.createIdentity(mspid, certificate, privateKey));
    }

    public async getIdentityNames(): Promise<string[]> {
        const identities: IdentityInfo[] = await this.list();
        const identityNames: string[] = [];
        for (const identity of identities) {
            identityNames.push(identity.label);
        }
        return identityNames;
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
        const walletPath: string = this.getWalletPath();
        let identityPaths: string[] = await fs.readdir(walletPath);
        identityPaths.sort();
        identityPaths = identityPaths
            .filter((identityPath: string) => {
                const stats: fs.Stats = fs.lstatSync(path.join(walletPath, identityPath));
                return !identityPath.startsWith('.') && stats.isDirectory();
            })
            .map((identityPath: string) => {
                const identityName: string = path.basename(identityPath);
                return path.resolve(walletPath, identityPath, identityName);
            });
        const identities: FabricIdentity[] = [];
        for (const identityPath of identityPaths) {
            const exists: boolean = await fs.pathExists(identityPath);
            // ignore ones where there is no actual identity
            if (exists) {
                const identity: FabricIdentity = await fs.readJson(identityPath);
                identities.push(identity);
            }
        }
        return identities;
    }

    public getWalletPath(): string {
        return this.walletPath;
    }

}
