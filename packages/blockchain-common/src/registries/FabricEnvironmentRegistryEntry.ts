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
    // If we update this enum, we must update environmentConnectCommand too!
    ENVIRONMENT = 1, // Standard remote environment
    ANSIBLE_ENVIRONMENT = 2, // Ansible environment (non-managed or managed)
    OPS_TOOLS_ENVIRONMENT = 3,
    LOCAL_ENVIRONMENT = 4, // Local environments
    SAAS_OPS_TOOLS_ENVIRONMENT = 5,
    MICROFAB_ENVIRONMENT = 6
}

export class FabricEnvironmentRegistryEntry extends RegistryEntry {

    public managedRuntime?: boolean; // True if the Local environment or a managed Ansible environment
    public environmentType?: EnvironmentType;
    public environmentDirectory?: string; // the dir where the ansible output is
    public url?: string;
    public numberOfOrgs?: number;
    constructor(fields?: FabricEnvironmentRegistryEntry) {
        super();
        Object.assign(this, fields);
    }
}
