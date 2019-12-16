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

import { RegistryEntry } from './RegistryEntry';

export enum EnvironmentType {
    ENVIRONMENT = 1, // Standard remote environment
    ANSIBLE_ENVIRONMENT = 2 // Ansible environment (non-managed or managed)
}

export class FabricEnvironmentRegistryEntry extends RegistryEntry {

    // Is this entry an imported Ansible environment or Local environment?
    public managedRuntime?: boolean;
    public environmentType?: EnvironmentType;
    public associatedGateways?: string[];
    public associatedWallets?: string[];
    constructor(fields?: FabricEnvironmentRegistryEntry) {
        super();
        Object.assign(this, fields);
    }
}
