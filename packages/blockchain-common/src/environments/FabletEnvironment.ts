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

import { AnsibleEnvironment } from './AnsibleEnvironment';
import { FabricNode } from '../fabricModel/FabricNode';
import { FabricWalletRegistryEntry } from '../registries/FabricWalletRegistryEntry';
import { FabricGatewayRegistryEntry } from '../registries/FabricGatewayRegistryEntry';
import { FabricIdentity } from '../fabricModel/FabricIdentity';
import { FabricGateway } from '../fabricModel/FabricGateway';

export class FabletEnvironment extends AnsibleEnvironment {

    constructor(name: string, environmentPath: string, _url: string) {
        super(name, environmentPath);
    }

    public async getAllOrganizationNames(_showOrderer: boolean = true): Promise<string[]> {
        return [];
    }

    public async getNodes(_withoutIdentities: boolean = false, _showAll: boolean = false): Promise<FabricNode[]> {
        return [];
    }

    public async updateNode(_node: FabricNode, _isOpsTools: boolean = false): Promise<void> {
        return;
    }

    public async deleteNode(_node: FabricNode): Promise<void> {
        return;
    }

    public async requireSetup(): Promise<boolean> {
        return false;
    }

    public async getWalletsAndIdentities(): Promise<FabricWalletRegistryEntry[]> {
        return [];
    }

    public async getGateways(): Promise<FabricGatewayRegistryEntry[]> {
        return [];
    }

    public async getWalletNames(): Promise<string[]> {
        return [];
    }

    public async getIdentities(_walletName: string): Promise<FabricIdentity[]> {
        return [];
    }

    public async getFabricGateways(): Promise<FabricGateway[]> {
        return [];
    }

}
