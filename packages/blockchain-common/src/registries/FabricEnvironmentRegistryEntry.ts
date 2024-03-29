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

import { IFabricEnvironmentConnection } from '../..';
import {RegistryEntry} from './RegistryEntry';

export enum EnvironmentFlags {
    ENVIRONMENT = 1 << 0,
    ANSIBLE = 1 << 1,
    MANAGED = 1 << 2,
    LOCAL = 1 << 3, // Old
    OPS_TOOLS = 1 << 4,
    SAAS = 1 << 5,
    MICROFAB = 1 << 6
}

export enum EnvironmentType {
    ENVIRONMENT = EnvironmentFlags.ENVIRONMENT,
    ANSIBLE_ENVIRONMENT = EnvironmentFlags.ANSIBLE,
    LOCAL_ENVIRONMENT = EnvironmentFlags.LOCAL | EnvironmentFlags.MANAGED | EnvironmentFlags.ANSIBLE, // Local environments,
    OPS_TOOLS_ENVIRONMENT = EnvironmentFlags.OPS_TOOLS,
    SAAS_OPS_TOOLS_ENVIRONMENT = EnvironmentFlags.OPS_TOOLS | EnvironmentFlags.SAAS,
    LOCAL_MICROFAB_ENVIRONMENT = EnvironmentFlags.MICROFAB | EnvironmentFlags.MANAGED | EnvironmentFlags.LOCAL,
    MICROFAB_ENVIRONMENT = EnvironmentFlags.MICROFAB,
    MANAGED = EnvironmentFlags.MANAGED
}

// environmentConnection acts as a cache of connection to speed up the UI
// For more info see comments in environmentConnectCommand.ts
export class FabricEnvironmentRegistryEntry extends RegistryEntry {

    public managedRuntime?: boolean; // True if the Local environment
    public environmentType: EnvironmentType;
    public environmentDirectory?: string; // the dir where the microfab output is
    public url?: string;
    public numberOfOrgs?: number;
    public fabricCapabilities?: string;
    public environmentConnection?: IFabricEnvironmentConnection;
    constructor(fields?: FabricEnvironmentRegistryEntry) {
        super();
        Object.assign(this, fields);
    }
}
