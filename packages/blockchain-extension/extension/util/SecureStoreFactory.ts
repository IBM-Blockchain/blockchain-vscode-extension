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

import { SecureStore } from './SecureStore';
import { ModuleUtil } from './ModuleUtil';
import { KeytarSecureStore } from './KeytarSecureStore';
import { SettingConfigurations } from '../../configurations';
import * as path from 'path';
import * as vscode from 'vscode';
import { FileSystemSecureStore } from './FileSystemSecureStore';
import { FileSystemUtil } from 'ibm-blockchain-platform-common';

export class SecureStoreFactory {

    static async getSecureStore(): Promise<SecureStore> {
        const keytar: any = ModuleUtil.getCoreNodeModule('keytar');
        if (keytar) {
            return new KeytarSecureStore(keytar);
        }
        const extensionDirectory: string = vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_DIRECTORY);
        const resolvedExtensionDirectory: string = FileSystemUtil.getDirPath(extensionDirectory);
        const storePath: string = path.join(resolvedExtensionDirectory, 'ibm-blockchain-platform.store');
        return new FileSystemSecureStore(storePath);
    }

}
