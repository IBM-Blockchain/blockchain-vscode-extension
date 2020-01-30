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

import * as path from 'path';
import * as vscode from 'vscode';

/*
 * This file will hold generic util functions used by the extension.
 */
export class ModuleUtil {
    public static getModuleAsar(moduleName: string): any {
        return require(path.join(vscode.env.appRoot, 'node_modules.asar', moduleName));
    }

    public static getModule(moduleName: string): any {
        return require(path.join(vscode.env.appRoot, 'node_modules', moduleName));
    }

    public static getCoreNodeModule(moduleName: string): any {
        try {
          return ModuleUtil.getModuleAsar(moduleName);
        } catch (err) {
            // do nothing
        }
        try {
          return ModuleUtil.getModule(moduleName);
        } catch (err) {
            // do nothing
        }
        return undefined;
    }
}
