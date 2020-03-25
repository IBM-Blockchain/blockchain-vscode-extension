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

import * as fs from 'fs-extra';
import {Wallet} from 'fabric-network';
import {Lifecycle, LifecyclePeer} from '../../src';

export class InstallHelper {

    public static async installPackage(lifecycle: Lifecycle, peerName: string, packagePath: string, wallet: Wallet, identity: string): Promise<string | undefined> {
        const packageFile: Buffer = await fs.readFile(packagePath);

        const peer: LifecyclePeer = lifecycle.getPeer(peerName, wallet, identity);

        return peer.installSmartContractPackage(packageFile, 60000);
    }

    public static async getInstalledSmartContracts(lifecycle: Lifecycle, peerName: string, wallet: Wallet, identity: string): Promise<{ label: string, packageId: string }[]> {
        const peer: LifecyclePeer = lifecycle.getPeer(peerName, wallet, identity);

        return peer.getAllInstalledSmartContracts();
    }

    public static async getInstalledPackage(lifecycle: Lifecycle, peerName: string, packageId: string,  wallet: Wallet, identity: string): Promise<Buffer | undefined> {
        const peer: LifecyclePeer = lifecycle.getPeer(peerName, wallet, identity);

        return peer.getInstalledSmartContractPackage(packageId);
    }
}
