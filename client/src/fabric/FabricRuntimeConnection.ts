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

export class FabricRuntimeConnection extends FabricConnection {

    constructor(private runtime: FabricRuntime) {
        super();
    }

    async connect(): Promise<void> {
        console.log('connect');
        const connectionProfile: object = await this.runtime.getConnectionProfile();
        const certificate: string = await this.runtime.getCertificate();
        const privateKey: string = await this.runtime.getPrivateKey();
        await this.connectInner(connectionProfile, certificate, privateKey);
    }

}
