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

export interface IRegistry<T extends RegistryEntry> {

    getAll(): Promise<T[]>;

    get(name: string): Promise<T>;

    exists(name: string): Promise<boolean>;

    add(entry: T): Promise<void>;

    update(newEntry: T): Promise<void>;

    delete(name: string): Promise<void>;

    clear(): Promise<void>;
}
