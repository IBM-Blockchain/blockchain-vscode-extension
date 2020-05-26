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

import { SecureStore, SecureStoreCredentials } from './SecureStore';

export class KeytarSecureStore implements SecureStore {

    constructor(private keytar: any) {

    }

    async getPassword(service: string, account: string): Promise<string | null> {
        return this.keytar.getPassword(service, account);
    }

    async setPassword(service: string, account: string, password: string): Promise<void> {
        return this.keytar.setPassword(service, account, password);
    }

    async deletePassword(service: string, account: string): Promise<boolean> {
        return this.keytar.deletePassword(service, account);
    }

    async findCredentials(service: string): Promise<SecureStoreCredentials> {
        return this.keytar.findCredentials(service);
    }

    async findPassword(_service: string): Promise<string | null> {
        throw new Error('Operation not supported');
    }

}
