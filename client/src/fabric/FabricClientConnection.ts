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
import { OutputAdapter } from '../logging/OutputAdapter';
import { IFabricConnection } from './IFabricConnection';
import { FabricConnection } from './FabricConnection';
import { FabricWallet } from './FabricWallet';
import { ExtensionUtil } from '../util/ExtensionUtil';

export class FabricClientConnection extends FabricConnection implements IFabricConnection {

    private connectionProfilePath: string;

    constructor(connectionData: { connectionProfilePath: string, walletPath: string }, outputAdapter?: OutputAdapter) {
        super(outputAdapter);
        this.connectionProfilePath = connectionData.connectionProfilePath;
    }

    async connect(wallet: FabricWallet, identityName: string): Promise<void> {
        console.log('FabricClientConnection: connect');
        const connectionProfile: object = await ExtensionUtil.readConnectionProfile(this.connectionProfilePath);
        await this.connectInner(connectionProfile, wallet, identityName);
    }
}
