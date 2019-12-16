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

import { Package, ChaincodeType } from 'fabric-client';
import * as fs from 'fs-extra';

export class PackageSmartContract {

    public static async packageContract(name: string, version: string, contractPath: string, pkgFile: string, language: string, metadataPath: string): Promise<Array<string>> {
        const pkg: any = await Package.fromDirectory({
            name: name,
            version: version,
            path: contractPath,
            type: language as ChaincodeType,
            metadataPath: metadataPath ? metadataPath : null
        });
        const pkgBuffer: any = await pkg.toBuffer();
        await fs.writeFile(pkgFile, pkgBuffer);

        return pkg.fileNames;
    }

    public static async getPackageInfo(pkgBuffer: Buffer): Promise<{name: string, version: string}> {
        const pkg: Package = await Package.fromBuffer(pkgBuffer);

        return {name: pkg.getName(), version: pkg.getVersion()};
    }
}
