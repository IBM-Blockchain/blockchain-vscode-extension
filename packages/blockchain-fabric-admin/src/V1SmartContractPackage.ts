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

import * as zlib from 'zlib';
import * as tar from 'tar-stream';
import { protos } from 'fabric-protos';
import { SmartContractPackageBase } from './SmartContractPackageBase';

const logger: any = Utils.getLogger('V1SmartContractPackage');

/**
 * A class to package a smart contract and get the names of the files in a package
 */
export class V1SmartContractPackage extends SmartContractPackageBase {

    /**
     * The buffer containing the smart contract package
     */
    public smartContractPackage: Buffer;
    // private fileNames: string[] = [];

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
    public static async createSmartContractPackage(options: PackagingOptions): Promise<V1SmartContractPackage> {
        if (!options) {
            throw new Error('Missing options parameter');
        }

        logger.debug('createSmartContractPackage: smartContractPath: %s, name: %s, version: %s, smartContractType: %s, metadataPath: %s golangPath: %s',
            options.smartContractPath, options.name, options.version, options.smartContractType, options.metaDataPath, options.golangPath);

        this.validateOptions(options);

        try {
            const chaincodeDeploymentSpec: protos.IChaincodeDeploymentSpec = await this.fromDirectory(options);
            const pkgBuffer: Buffer = await this.convertChaincodeDeploymentSpecToBuffer(chaincodeDeploymentSpec);
            return new V1SmartContractPackage(pkgBuffer);
        } catch (error) {
            throw new Error(`Could not package smart contract, received error: ${error.message}`);
        }
    }

    /**
     * Extracts name and version from chaincode buffer
     * @param buffer
     */
    public static nameAndVersionFromBuffer(buffer: Buffer): {name: string, version: string} {
        const chaincodeDeploymentSpec: protos.ChaincodeDeploymentSpec = protos.ChaincodeDeploymentSpec.decode(buffer);

        return {name: chaincodeDeploymentSpec.chaincode_spec.chaincode_id.name, version: chaincodeDeploymentSpec.chaincode_spec.chaincode_id.version};
    }

    private static async packageContract(smartContractPath: string, smartContractType: SmartContractType, metadataPath?: string, goPath?: string): Promise<Buffer> {

        const handler: LifecyclePackager = this.getHandler(smartContractType);

        return handler.package(smartContractPath, metadataPath, goPath);
    }

    private static getHandler(chaincodeType: string): LifecyclePackager {
        logger.debug('packager: type %s ', chaincodeType);

        let handler: LifecyclePackager;

        switch (chaincodeType.toLowerCase()) {
            case SmartContractType.NODE:
                handler = new NodePackager();
                break;
            case SmartContractType.JAVA:
                handler = new JavaPackager();
                break;
            case SmartContractType.GO:
                handler = new GolangPackager(['.go', '.c', '.h', '.s', '.mod', '.sum']);
        }

        return handler;
    }

    private static translateCCType(chaincodeType: string): protos.ChaincodeSpec.Type {
        const { GOLANG, JAVA, NODE } = protos.ChaincodeSpec.Type;

        const map: { golang: any, java: any, node: any } = {
            golang: GOLANG,
            java: JAVA,
            node: NODE
        };
        const value: protos.ChaincodeSpec.Type = map[chaincodeType.toLowerCase()];

        return value;
    };

    private static validateOptions(options: PackagingOptions): void {
        if (!options.name) {
            throw new Error('Missing option name');
        }
        if (!options.name.match(/^[a-zA-Z0-9]+([-_][a-zA-Z0-9]+)*$/)) {
            throw new Error(`Invalid smart contract name '${options.name}'. Smart contract names must only consist of alphanumerics, '_', and '-'`);
        }
        if (!options.version) {
            throw new Error('Missing option version');
        }
        if (!options.version.match(/^[A-Za-z0-9_.+-]+$/)) {
            throw new Error(`Invalid smart contract version '${options.version}'. Smart contract versions must only consist of alphanumerics, '_', '-', '+', and '.'`);
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
    }

    private static async fromDirectory({ name, version, smartContractPath, smartContractType, metaDataPath, golangPath }: PackagingOptions): Promise<protos.IChaincodeDeploymentSpec> {
        logger.debug('Package.fromDirectory - entry - %s, %s, %s, %s', name, version, smartContractPath, smartContractType);
        const codePackage: any = await this.packageContract(smartContractPath, smartContractType, metaDataPath, golangPath);
        logger.debug('Package.fromDirectory - code package is %s bytes', codePackage.length);
        const fixedPath: string = smartContractPath.split('\\').join('/'); // for windows style paths
        const chaincodeSpec: protos.IChaincodeSpec = {
            type: this.translateCCType(smartContractType),
            chaincode_id: {
                name: name,
                path: fixedPath,
                version: version
            }
        };
        logger.debug('Package.fromDirectory - built chaincode specification %s', JSON.stringify(chaincodeSpec));
        const chaincodeDeploymentSpec: protos.IChaincodeDeploymentSpec = protos.ChaincodeDeploymentSpec.create();
        chaincodeDeploymentSpec.chaincode_spec = chaincodeSpec;
        chaincodeDeploymentSpec.code_package = codePackage;
        return chaincodeDeploymentSpec;
    }

    private static async convertChaincodeDeploymentSpecToBuffer(chaincodeDeploymentSpec: protos.IChaincodeDeploymentSpec): Promise<Buffer> {
        return Buffer.from(protos.ChaincodeDeploymentSpec.encode(chaincodeDeploymentSpec).finish());
    }

    protected async findFileNames(buffer: Buffer): Promise<any> {
        const chaincodeDeploymentSpec: protos.ChaincodeDeploymentSpec = protos.ChaincodeDeploymentSpec.decode(buffer);
        const codePackage: any = chaincodeDeploymentSpec.code_package;
        const gunzip: any = zlib.createGunzip();
        const extract: any = tar.extract();
        return new Promise((resolve) => {
            this.fileNames = [];
            extract.on('entry', (header, stream, next) => {
                logger.debug('V1SmartContractPackage.findFileNames - found entry %s', header.name);
                this.fileNames.push(header.name);
                stream.on('end', () => {
                    next();
                });
                stream.resume();
            });
            extract.on('finish', () => {
                resolve();
            });
            gunzip.pipe(extract);
            gunzip.end(codePackage);
        });
    }
}
