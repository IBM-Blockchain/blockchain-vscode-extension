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

import {SmartContractType} from './packager/BasePackager';


export interface PackagingOptions {
    smartContractPath: string,
    name: string,
    version: string,
    smartContractType: SmartContractType,
    metaDataPath?: string,
    golangPath?: string,
}

export abstract class SmartContractPackageBase {

    public smartContractPackage: Buffer;
    protected fileNames: string[] = [];

    /**
     * Create a smart contract package instance
     * @param smartContractPackage Buffer, the buffer containg the smart contract package
     */
    constructor(smartContractPackage: Buffer) {
        this.smartContractPackage = smartContractPackage;
    }

    protected abstract async findFileNames(buffer: Buffer): Promise<void>

    /**
     * Get the file names from a smart contract package
     * @return Promise<string[]>, An array of the names of the files in the smart contract package
     */
    public async getFileNames(): Promise<string[]> {
        try {
            this.fileNames = [];
            await this.findFileNames(this.smartContractPackage);
            return this.fileNames;
        } catch (error) {
            throw new Error(`Could not get file names for package, received error: ${error.message}`);
        }
    }

    public static getLabel(name: string, version: string): string {
        return `${name}_${version}`;
    }
}
