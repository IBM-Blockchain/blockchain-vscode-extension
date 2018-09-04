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
import { IFabricConnection } from './IFabricConnection';
import { FabricRuntime } from './FabricRuntime';

export class FabricConnectionFactory {

    public static createFabricClientConnection(connection: any): IFabricConnection {
        if (!this.clientConnection) {
            this.clientConnection = require('./FabricClientConnection');
        }

        return new (this.clientConnection).FabricClientConnection(connection);
    }

    public static createFabricRuntimeConnection(runtime: FabricRuntime): IFabricConnection {
        if (!this.runtimeConnection) {
            this.runtimeConnection = require('./FabricRuntimeConnection');
        }

        return new (this.runtimeConnection).FabricRuntimeConnection(runtime);
    }

    private static clientConnection: any;
    private static runtimeConnection: any;

}
