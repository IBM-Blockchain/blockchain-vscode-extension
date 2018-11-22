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

import { IFabricConnection } from './IFabricConnection';
import { EventEmitter } from 'events';
import { FabricConnectionRegistryEntry } from './FabricConnectionRegistryEntry';

export class FabricConnectionManager extends EventEmitter {

    public static instance(): FabricConnectionManager {
        return FabricConnectionManager._instance;
    }

    private static _instance: FabricConnectionManager = new FabricConnectionManager();

    private connection: IFabricConnection;
    private connectionRegistryEntry: FabricConnectionRegistryEntry;

    private constructor() {
        super();
    }

    public getConnection(): IFabricConnection {
        return this.connection;
    }

    public getConnectionRegistryEntry(): FabricConnectionRegistryEntry {
        return this.connectionRegistryEntry;
    }

    public connect(connection: IFabricConnection, connectionRegistryEntry: FabricConnectionRegistryEntry): void {
        this.connection = connection;
        this.connectionRegistryEntry = connectionRegistryEntry;
        this.emit('connected', connection);
    }

    public disconnect(): void {
        if (this.connection) {
            this.connection.disconnect();
            this.connection = null;
        }

        if (this.connectionRegistryEntry) {
            this.connectionRegistryEntry = null;
        }
        this.emit('disconnected');
    }

}
