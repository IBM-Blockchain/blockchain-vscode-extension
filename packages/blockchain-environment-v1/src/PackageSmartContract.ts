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

import { SmartContractPackageBase, V1SmartContractPackage, V2SmartContractPackage, SmartContractType, PackagingOptions } from 'ibm-blockchain-platform-fabric-admin';
import * as fs from 'fs-extra';

export class PackageSmartContract {
    public static async packageContract(fabricVersion: number, name: string, version: string, contractPath: string, pkgFile: string, language: string, metadataPath?: string, golangPath?: string): Promise<Array<string>> {
        let smartContractPackage: SmartContractPackageBase;
        const options: PackagingOptions = {
            smartContractPath: contractPath,
            name,
            version,
            smartContractType: language as SmartContractType,
            metaDataPath: metadataPath,
            golangPath,
        };
        if (fabricVersion === 1) {
            smartContractPackage = await V1SmartContractPackage.createSmartContractPackage(options);
        } else if (fabricVersion === 2) {
            smartContractPackage = await V2SmartContractPackage.createSmartContractPackage(options);
        } else {
            throw new Error(`Unknown fabric version passed through. Should be 1 or 2 but ${fabricVersion} was passed`);
        }

        await fs.writeFile(pkgFile, smartContractPackage.smartContractPackage);

        return smartContractPackage.getFileNames();
    }

    // Currently only used for v1 contracts
    public static getPackageInfo(pkgBuffer: Buffer): {name: string, version: string} {
        return V1SmartContractPackage.nameAndVersionFromBuffer(pkgBuffer);
    }
}
