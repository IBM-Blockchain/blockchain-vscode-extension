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
import { FileSystemWallet, X509WalletMixin, IdentityInfo} from 'fabric-network';
import { IFabricWallet} from './IFabricWallet';

export class FabricWallet extends FileSystemWallet implements IFabricWallet {

    public walletPath: string;

    constructor(walletPath: string) {
        super(walletPath);
        this.walletPath = walletPath;
    }

    public async importIdentity(certificate: string, privateKey: string, identityName: string, mspid: string): Promise<void> {

        const wallet: FileSystemWallet = new FileSystemWallet(this.walletPath);
        await wallet.import(identityName, X509WalletMixin.createIdentity(mspid, certificate, privateKey));

    }

    public async getIdentityNames(): Promise<string[]> {
        const identities: IdentityInfo[] = await this.list();
        const identityNames: string[] = [];
        for (const identity of identities) {
            identityNames.push(identity.label);
        }
        return identityNames;
    }

    public getWalletPath(): string {
        return this.walletPath;
    }

}
