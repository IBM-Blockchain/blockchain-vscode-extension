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

import { EventEmitter } from 'events';
import { FabricEnvironmentRegistryEntry, IFabricEnvironmentConnection } from 'ibm-blockchain-platform-common';

export enum ConnectedState {
    CONNECTED,
    SETUP,
    DISCONNECTED,
    CONNECTING
}

export class FabricEnvironmentManager extends EventEmitter {

    public static instance(): FabricEnvironmentManager {
        return FabricEnvironmentManager._instance;
    }

    private static _instance: FabricEnvironmentManager = new FabricEnvironmentManager();
    private connection: IFabricEnvironmentConnection;
    private environmentRegistryEntry: FabricEnvironmentRegistryEntry;
    private state: ConnectedState = ConnectedState.DISCONNECTED;

    private constructor() {
        super();
    }

    public getConnection(): IFabricEnvironmentConnection {
        return this.connection;
    }

    public getEnvironmentRegistryEntry(): FabricEnvironmentRegistryEntry {
        return this.environmentRegistryEntry;
    }

    public getState(): ConnectedState {
        return this.state;
    }

    public setState(newState: ConnectedState): void {
        this.state = newState;
    }

    public connect(connection: IFabricEnvironmentConnection, environmentRegistryEntry: FabricEnvironmentRegistryEntry, state: ConnectedState): void {
        this.connection = connection;
        this.environmentRegistryEntry = environmentRegistryEntry;
        this.state = state;
        this.emit('connected');
    }

    public disconnect(): void {
        if (this.connection) {
            this.connection.disconnect();
            this.connection = null;
        }

        if (this.environmentRegistryEntry) {
            this.environmentRegistryEntry = null;
        }

        this.state = ConnectedState.DISCONNECTED;

        this.emit('disconnected');
    }
}
