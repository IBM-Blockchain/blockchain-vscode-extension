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

import { ManagedAnsibleEnvironment } from './ManagedAnsibleEnvironment';

export class ManagedAnsibleEnvironmentManager {

    public static instance(): ManagedAnsibleEnvironmentManager {
        return this._instance;
    }

    private static _instance: ManagedAnsibleEnvironmentManager = new ManagedAnsibleEnvironmentManager();

    private runtimes: Map<string, ManagedAnsibleEnvironment> = new Map();

    private constructor() {
    }

    public getRuntime(name: string): ManagedAnsibleEnvironment {
        return this.runtimes.get(name);
    }

    public ensureRuntime(name: string, environmentDirectory: string): ManagedAnsibleEnvironment {
        // Return the environment instance if it has already been created.
        // Else create a new instance of the environment.

        let runtime: ManagedAnsibleEnvironment = this.getRuntime(name);
        if (!runtime) {
            runtime = new ManagedAnsibleEnvironment(name, environmentDirectory);
            this.runtimes.set(name, runtime);
        }

        return runtime;
    }

}
