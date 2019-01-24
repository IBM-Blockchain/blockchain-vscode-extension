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
import { FabricConnection } from './FabricConnection';
import { FabricRuntime } from './FabricRuntime';
import { OutputAdapter } from '../logging/OutputAdapter';
import { FabricWallet } from '../fabric/FabricWallet';

export class FabricRuntimeConnection extends FabricConnection {

    constructor(private runtime: FabricRuntime, outputAdapter?: OutputAdapter) {
        super(outputAdapter);
    }

    async connect(wallet: FabricWallet, identityName: string): Promise<void> {
        console.log('FabricRuntimeConnection: connect');
        const connectionProfile: object = await this.runtime.getConnectionProfile();
        await this.connectInner(connectionProfile, wallet, identityName);
    }
}
