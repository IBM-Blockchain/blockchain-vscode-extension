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

import {LifecyclePackager} from './packager/Lifecycle';
import {NodePackager} from './packager/Node';
import {JavaPackager} from './packager/Java';
import {GolangPackager} from './packager/Golang';
import {Utils} from 'fabric-common';
import {SmartContractType} from './packager/BasePackager';

import * as fs from 'fs-extra';
import * as path from 'path';
import * as zlib from 'zlib';
import * as tar from 'tar-stream';

const logger: any = Utils.getLogger('packager');

export interface PackagingOptions {
    smartContractPath: string,
    label: string,
    smartContractType: SmartContractType,
    metaDataPath?: string,
    golangPath?: string
}

/**
 * A class to package a smart contract and get the names of the files in a package
 */
export class SmartContractPackage {

    /**
     * The buffer containing the smart contract package
     */
    public smartContractPackage: Buffer;
    private fileNames: string[] = [];

    /**
     * Create a smart contract package instance
     * @param smartContractPackage Buffer, the buffer containg the smart contract package
     */
    constructor(smartContractPackage: Buffer) {
        this.smartContractPackage = smartContractPackage;
    }

    /**
     * Create a smart contract package
     * @param options PackagingOptions, the options to use when creating a smart contract package
     * @return Promise<SmartContractPackage>, return an instance of this class
     */
    public static async createSmartContractPackage(options: PackagingOptions): Promise<SmartContractPackage> {
        if (!options) {
            throw new Error('Missing options parameter');
        }

        logger.debug('createSmartContractPackage: smartContractPath: %s, label: %s, smartContractType: %s, metadataPath: %s golangPath: %s',
            options.smartContractPath, options.label, options.smartContractType, options.metaDataPath, options.golangPath);


        if (!options.label) {
            throw new Error('Missing option label');
        }
        if (!options.smartContractPath || options.smartContractPath.length < 1) {
            throw new Error('Missing option smartContractPath');
        }

        if (!options.smartContractType) {
            throw new Error('Missing option smartContractType');
        }

        const correctType: boolean = Object.values(SmartContractType).includes(options.smartContractType);
        if (!correctType) {
            throw new Error('option smartContractType must be set to one of: golang, node, or java');
        }

        if (options.smartContractType === SmartContractType.GO) {
            const isModule: boolean = await fs.pathExists(path.join(options.smartContractPath, 'go.mod'));

            if (!isModule && !options.golangPath && !process.env.GOPATH) {
                throw new Error('option goLangPath was not set so tried to use environment variable GOPATH but this was not set either, one of these must be set');
            }
        }

        try {
            const smartContractPackage: Buffer = await this.packageContract(options.smartContractPath, options.smartContractType, options.metaDataPath, options.golangPath);

            const finalSmartContract: Buffer = await this.finalPackage(options.label, options.smartContractType, smartContractPackage, options.golangPath);

            return new SmartContractPackage(finalSmartContract);
        } catch (error) {
            throw new Error(`Could not package smart contract, received error: ${error.message}`);
        }
    }

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

    private static async finalPackage(label: string, smartContractType: SmartContractType, packageBytes: Buffer, goPath?: string): Promise<Buffer> {
        logger.debug('finalPackager - Start');

        const handler: LifecyclePackager = this.getHandler(smartContractType);

        return handler.finalPackage(label, smartContractType, packageBytes, goPath);
    }

    private static async packageContract(smartContractPath: string, smartContractType: SmartContractType, metadataPath?: string, goPath?: string): Promise<Buffer> {

        const handler: LifecyclePackager = this.getHandler(smartContractType);

        return handler.package(smartContractPath, metadataPath, goPath);
    }

    private static getHandler(smartContractType: SmartContractType): LifecyclePackager {
        logger.debug('packager: type %s ', smartContractType);

        let handler: LifecyclePackager;

        switch (smartContractType) {
            case SmartContractType.NODE:
                handler = new NodePackager();
                break;
            case SmartContractType.JAVA:
                handler = new JavaPackager();
                break;
            case SmartContractType.GO:
                handler = new GolangPackager(['.go', '.c', '.h', '.s', '.mod', '.sum']);
        }

        return handler
    }

    private async findFileNames(buffer: Buffer): Promise<void> {
        return new Promise((resolve) => {
            const gunzip: any = zlib.createGunzip();
            const extract: any = tar.extract();
            extract.on('entry', (header, stream, next) => {
                logger.debug('Package._findFileNames - found entry %s', header.name);
                if (header.type === 'file') {
                    if (header.name === 'code.tar.gz') {
                        this.extractInnerZip(stream, next);
                    } else {
                        this.fileNames.push(header.name);
                        stream.on('end', () => {
                            next();
                        });
                        stream.resume();
                    }
                }
            });
            extract.on('finish', () => {
                resolve();
            });
            gunzip.pipe(extract);
            gunzip.end(buffer);
        });
    }

    private extractInnerZip(packageStream: any, finished: any): void {
        const gunzip: any = zlib.createGunzip();
        const extract: any = tar.extract();

        extract.on('entry', (header, stream, next) => {
            logger.debug('Package._findFileNames - found entry %s', header.name);
            if (header.type === 'file') {
                this.fileNames.push(header.name);
            }
            stream.on('end', () => {
                next();
            });
            stream.resume();
        });
        extract.on('finish', () => {
            finished();
        });

        gunzip.pipe(extract);
        packageStream.pipe(gunzip);
    }
}
