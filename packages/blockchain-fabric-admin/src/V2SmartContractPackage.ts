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
import { PackagingOptions } from './SmartContractPackageBase';

import * as fs from 'fs-extra';
import * as path from 'path';
import * as zlib from 'zlib';
import * as tar from 'tar-stream';
import { SmartContractPackageBase } from './SmartContractPackageBase';

const logger: any = Utils.getLogger('V2SmartContractPackage');

/**
 * A class to package a smart contract and get the names of the files in a package
 */
export class V2SmartContractPackage extends SmartContractPackageBase {

    /**
     * Create a smart contract package instance
     * @param smartContractPackage Buffer, the buffer containg the smart contract package
     */
    constructor(smartContractPackage: Buffer) {
        super(smartContractPackage);
    }

    /**
     * Create a smart contract package
     * @param options PackagingOptions, the options to use when creating a smart contract package
     * @return Promise<SmartContractPackage>, return an instance of this class
     */
    public static async createSmartContractPackage(options: PackagingOptions): Promise<V2SmartContractPackage> {
        if (!options) {
            throw new Error('Missing options parameter');
        }

        logger.debug('createSmartContractPackage: smartContractPath: %s, name: %s, version: %s, smartContractType: %s, metadataPath: %s golangPath: %s',
            options.smartContractPath, options.name, options.version, options.smartContractType, options.metaDataPath, options.golangPath);

        if (!options.name) {
            throw new Error('Missing option name');
        }
        if (!options.version) {
            throw new Error('Missing option version');
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

        let goPath: string;
        if (options.smartContractType === SmartContractType.GO) {
            const isModule: boolean = await fs.pathExists(path.join(options.smartContractPath, 'go.mod'));

            if (!isModule && !options.golangPath && !process.env.GOPATH) {
                throw new Error('option goLangPath was not set so tried to use environment variable GOPATH but this was not set either, one of these must be set');
            } else if (!isModule) {
                goPath = options.smartContractPath;
            } else {
                goPath = options.golangPath;
            }
        }

        try {
            const smartContractPackage: Buffer = await this.packageContract(options.smartContractPath, options.smartContractType, options.metaDataPath, options.golangPath);

            const label: string = this.getLabel(options.name, options.version);
            const finalSmartContract: Buffer = await this.finalPackage(label, options.smartContractType, smartContractPackage, goPath);

            return new V2SmartContractPackage(finalSmartContract);
        } catch (error) {
            throw new Error(`Could not package smart contract, received error: ${error.message}`);
        }
    }

    private static async finalPackage(label: string, smartContractType: SmartContractType, packageBytes: Buffer, goPath?: string): Promise<Buffer> {
        logger.debug('finalPackager - Start');

        const handler: LifecyclePackager = this.getHandler(smartContractType);

        return handler.finalPackage(label, smartContractType, packageBytes, goPath);
    }

    private static async packageContract(smartContractPath: string, smartContractType: SmartContractType, metadataPath?: string, goPath?: string): Promise<Buffer> {

        const handler: LifecyclePackager = this.getHandler(smartContractType);

        return handler.package(smartContractPath, metadataPath, goPath, false);
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
                handler = new GolangPackager(['.go', '.c', '.h', '.s', '.mod', '.sum', '.txt']);
        }

        return handler;
    }

    protected async findFileNames(buffer: Buffer): Promise<void> {
        return new Promise((resolve) => {
            const gunzip: any = zlib.createGunzip();
            const extract: any = tar.extract();
            extract.on('entry', (header, stream, next) => {
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
