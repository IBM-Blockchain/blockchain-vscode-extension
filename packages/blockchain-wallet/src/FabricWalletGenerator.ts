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
import { FabricWallet } from './FabricWallet';
import { FabricWalletRegistryEntry, IFabricWalletGenerator } from 'ibm-blockchain-platform-common';

export class FabricWalletGenerator implements IFabricWalletGenerator {

    public static instance(): FabricWalletGenerator {
        return FabricWalletGenerator._instance;
    }

    private static _instance: FabricWalletGenerator = new FabricWalletGenerator();

    public async getWallet(walletRegistryEntry: FabricWalletRegistryEntry): Promise<FabricWallet> {
        return FabricWallet.newFabricWallet(walletRegistryEntry.walletPath);
    }
}
