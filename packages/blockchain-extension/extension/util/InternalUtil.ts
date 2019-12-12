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

import { ExtensionUtil } from './ExtensionUtil';

/*
 * This file will hold generic util functions used by the extension.
 */
export class InternalUtil {

    public static getCoreNodeModule(moduleName: string): any {
        try {
          return ExtensionUtil.getModuleAsar(moduleName);
        } catch (err) {
            // do nothing
        }
        try {
          return ExtensionUtil.getModule(moduleName);
        } catch (err) {
            // do nothing
        }
        return undefined;
      }

}
