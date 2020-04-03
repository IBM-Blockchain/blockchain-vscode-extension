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

import { SmartContractPackage, SmartContractType, PackageMetadata } from 'ibm-blockchain-platform-fabric-admin';
import * as fs from 'fs-extra';

export class PackageSmartContract {

    public static async packageContract(name: string, contractPath: string, pkgFile: string, language: string, metadataPath?: string, golangPath?: string): Promise<Array<string>> {
        const smartContractPackage: SmartContractPackage = await SmartContractPackage.createSmartContractPackage({ smartContractPath: contractPath, label: name, smartContractType: language as SmartContractType, metaDataPath: metadataPath, golangPath: golangPath });

        await fs.writeFile(pkgFile, smartContractPackage.smartContractPackage);

        return smartContractPackage.getFileNames();
    }

    public static async getPackageInfo(pkgBuffer: Buffer): Promise<PackageMetadata> {
        const smartContractPackage: SmartContractPackage = new SmartContractPackage(pkgBuffer);
        return smartContractPackage.getMetadata();
    }
}
