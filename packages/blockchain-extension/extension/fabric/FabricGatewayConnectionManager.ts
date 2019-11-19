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
import { FabricGatewayRegistryEntry } from '../registries/FabricGatewayRegistryEntry';
import { FabricWalletRegistryEntry } from '../registries/FabricWalletRegistryEntry';
import { IFabricGatewayConnection } from 'ibm-blockchain-platform-common';

export class FabricGatewayConnectionManager extends EventEmitter {

    public static instance(): FabricGatewayConnectionManager {
        return FabricGatewayConnectionManager._instance;
    }

    private static _instance: FabricGatewayConnectionManager = new FabricGatewayConnectionManager();

    private connection: IFabricGatewayConnection;
    private gatewayRegistryEntry: FabricGatewayRegistryEntry;
    private walletRegistryEntry: FabricWalletRegistryEntry;

    private constructor() {
        super();
    }

    public getConnection(): IFabricGatewayConnection {
        return this.connection;
    }

    public getGatewayRegistryEntry(): FabricGatewayRegistryEntry {
        return this.gatewayRegistryEntry;
    }

    public connect(connection: IFabricGatewayConnection, gatewayRegistryEntry: FabricGatewayRegistryEntry, walletRegistryEntry: FabricWalletRegistryEntry): void {
        this.connection = connection;
        this.gatewayRegistryEntry = gatewayRegistryEntry;
        this.walletRegistryEntry = walletRegistryEntry;
        this.emit('connected', connection);
    }

    public disconnect(): void {
        if (this.connection) {
            this.connection.disconnect();
            this.connection = null;
        }

        if (this.gatewayRegistryEntry) {
            this.gatewayRegistryEntry = null;
        }
        this.emit('disconnected');
    }

    public getConnectionIdentity(): string {
        return this.connection.identityName;
    }

    public getConnectionWallet(): FabricWalletRegistryEntry {
        return this.walletRegistryEntry;
    }

}
