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

import * as fs from 'fs-extra';
import { Package } from 'fabric-client';

export class ListFilesInPackage {

    public static async listFiles(packagePath: string): Promise<Array<string>> {
        let fileNames: string[] = [];
        const cdsBuffer: Buffer = await fs.readFile(packagePath);
        const _package: Package = await Package.fromBuffer(cdsBuffer);

        fileNames = _package.getFileNames();

        return fileNames;
    }
}
