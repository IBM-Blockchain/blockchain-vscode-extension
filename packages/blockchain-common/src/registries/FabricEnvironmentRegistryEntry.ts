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

import {RegistryEntry} from './RegistryEntry';

export enum EnvironmentFlags {
    ENVIRONMENT = 1 << 0,
    ANSIBLE = 1 << 1,
    MANAGED = 1 << 2,
    LOCAL = 1 << 3,
    OPS_TOOLS = 1 << 4,
    SAAS = 1 << 5,
    FABLET = 1 << 6
}

export enum EnvironmentType {
    ENVIRONMENT = EnvironmentFlags.ENVIRONMENT,
    ANSIBLE_ENVIRONMENT = EnvironmentFlags.ANSIBLE,
    MANAGED_ANSIBLE_ENVIRONMENT = EnvironmentFlags.MANAGED | EnvironmentFlags.ANSIBLE,
    LOCAL_ENVIRONMENT = EnvironmentFlags.LOCAL | EnvironmentFlags.MANAGED | EnvironmentFlags.ANSIBLE, // Local environments,
    OPS_TOOLS_ENVIRONMENT = EnvironmentFlags.OPS_TOOLS,
    SAAS_OPS_TOOLS_ENVIRONMENT = EnvironmentFlags.OPS_TOOLS | EnvironmentFlags.SAAS,
    FABLET_ENVIRONMENT = EnvironmentFlags.FABLET
}

export class FabricEnvironmentRegistryEntry extends RegistryEntry {

    public managedRuntime?: boolean; // True if the Local environment or a managed Ansible environment
    public environmentType: EnvironmentType;
    public environmentDirectory?: string; // the dir where the ansible output is
    public url?: string;
    public numberOfOrgs?: number;

    constructor(fields?: FabricEnvironmentRegistryEntry) {
        super();
        Object.assign(this, fields);
    }
}
