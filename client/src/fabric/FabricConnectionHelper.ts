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

export class FabricConnectionHelper {
    // Wanted to type with FabricConnectionRegistryEntry but it failed

    static readonly CONNECTION_PROFILE_PATH_DEFAULT: string = '<PATH_TO_CONNECTION_PROFILE_JSON>';
    static readonly WALLET_PATH_DEFAULT: string = '<PATH_TO_WALLET>';

    public static isCompleted(instance: any): boolean {
        return this.connectionProfilePathComplete(instance) && this.walletPathComplete(instance);
    }

    public static connectionProfilePathComplete(instance: any): boolean {
        return instance.connectionProfilePath !== this.CONNECTION_PROFILE_PATH_DEFAULT && instance.connectionProfilePath !== '';
    }

    public static walletPathComplete(instance: any): boolean {
        return instance.walletPath !== this.WALLET_PATH_DEFAULT && instance.walletPath !== '';
    }

}
