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
import * as fs from 'fs-extra';

interface Service {
    [account: string]: string;
}

interface Store {
    [service: string]: Service;
}

export class FileSystemSecureStore implements SecureStore {

    constructor(private path: string) {

    }

    async getPassword(service: string, account: string): Promise<string | null> {
        const store: Store = await this.load();
        if (!store[service]) {
            return null;
        }
        const password: string = store[service][account];
        if (!password) {
            return null;
        }
        return password;
    }

    async setPassword(service: string, account: string, password: string): Promise<void> {
        const store: Store = await this.load();
        if (!store[service]) {
            store[service] = {};
        }
        store[service][account] = password;
        await this.save(store);
    }

    async deletePassword(service: string, account: string): Promise<boolean> {
        const store: Store = await this.load();
        if (!store[service] || !store[service][account]) {
            return false;
        }
        delete store[service][account];
        await this.save(store);
        return true;
    }

    async findCredentials(service: string): Promise<SecureStoreCredentials> {
        const store: Store = await this.load();
        if (!store[service]) {
            return [];
        }
        const result = [];
        for (const [account, password] of Object.entries(store[service])) {
            result.push({ account, password });
        }
        return result;
    }

    async findPassword(_service: string): Promise<string | null> {
        throw new Error('Operation not supported');
    }

    private async load(): Promise<Store> {
        try {
            const data: string = await fs.readFile(this.path, 'utf8');
            return JSON.parse(Buffer.from(data, 'base64').toString('utf8'));
        } catch (error) {
            // Ignore any errors - file doesn't exist, can't be accessed, corrupted, etc
            return {};
        }
    }

    private async save(store: Store): Promise<void> {
        const data: string = Buffer.from(JSON.stringify(store), 'utf8').toString('base64');
        return fs.writeFile(this.path, data, { encoding: 'utf8', mode: 0o600 });
    }

}
