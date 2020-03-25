/**
 * Copyright 2018 IBM All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

import * as fabprotos from 'fabric-protos';
import * as Packager from './Packager';
import * as tar from 'tar-stream';

import {Utils} from 'fabric-common';
import * as zlib from 'zlib';

const logger = Utils.getLogger('package');

const ccTypeMap = {};
ccTypeMap[fabprotos.protos.ChaincodeSpec.Type.GOLANG] = 'golang';
ccTypeMap[fabprotos.protos.ChaincodeSpec.Type.CAR] = 'car';
ccTypeMap[fabprotos.protos.ChaincodeSpec.Type.JAVA] = 'java';
ccTypeMap[fabprotos.protos.ChaincodeSpec.Type.NODE] = 'node';

const ccTranslateMap = {
    golang: fabprotos.protos.ChaincodeSpec.Type.GOLANG,
    car: fabprotos.protos.ChaincodeSpec.Type.CAR,
    java: fabprotos.protos.ChaincodeSpec.Type.JAVA,
    node: fabprotos.protos.ChaincodeSpec.Type.NODE
};

/**
 * A class representing a smart contract package.
 */
export class Package {

    private chaincodeDeploymentSpec;
    private readonly fileNames: string[];

    /**
     * Find the list of file names in the specified chaincode deployment specification.
     * @private
     * @param {ChaincodeDeploymentSpec} chaincodeDeploymentSpec The chaincode deployment specification.
     * @returns {string[]} The list of file names.
     */
    static async _findFileNames(chaincodeDeploymentSpec) {
        const codePackage = chaincodeDeploymentSpec.getCodePackage().toBuffer();
        const gunzip = zlib.createGunzip();
        const extract = tar.extract();
        return new Promise((resolve) => {
            const fileNames: string[] = [];
            extract.on('entry', (header, stream, next) => {
                logger.debug('Package._findFileNames - found entry %s', header.name);
                if (header.type === 'file') {
                    fileNames.push(header.name);
                }
                stream.on('end', () => {
                    next();
                });
                stream.resume();
            });
            extract.on('finish', () => {
                resolve(fileNames.sort());
            });
            gunzip.pipe(extract);
            gunzip.end(codePackage);
        });
    }

    /**
     * Validate that the specified smart contract name and version meet the rules specified
     * by the LSCC (https://github.com/hyperledger/fabric/blob/master/core/scc/lscc/lscc.go).
     * @param {string} name The name of the smart contract.
     * @param {*} version The version of the smart contract.
     */
    static _validateNameAndVersion(name, version) {
        if (!name) {
            throw new Error('Smart contract name not specified');
        } else if (!name.match(/^[a-zA-Z0-9]+([-_][a-zA-Z0-9]+)*$/)) {
            throw new Error(`Invalid smart contract name '${name}'. Smart contract names must only consist of alphanumerics, '_', and '-'`);
        } else if (!version) {
            throw new Error('Smart contract version not specified');
        } else if (!version.match(/^[A-Za-z0-9_.+-]+$/)) {
            throw new Error(`Invalid smart contract version '${version}'. Smart contract versions must only consist of alphanumerics, '_', '-', '+', and '.'`);
        }
    }

    /**
     * Load a smart contract package from the specified buffer.
     * @param {Buffer} buffer A buffer containing the serialized smart contract package.
     * @returns {Package} The smart contract package.
     */
    static async fromBuffer(buffer) {
        const chaincodeDeploymentSpec = fabprotos.protos.ChaincodeDeploymentSpec.decode(buffer);
        const fileNames = await Package._findFileNames(chaincodeDeploymentSpec);
        return new Package(chaincodeDeploymentSpec, fileNames);
    }

    /**
     * Create a new smart contract package from the specified directory.
     * @param {Object} options The options for the packager.
     * @param {string} options.name The name of the smart contract.
     * @param {string} options.version The version of the smart contract.
     * @param {string} options.path The directory containing the smart contract.
     * @param {string} options.type The type of the smart contract, one of 'golang', 'car', 'node' or 'java'.
     * @param {string} [options.metadataPath] The directory containing the metadata descriptors.
     * @param {string} options.goPath The path to be used with the golang chaincode.
     * @returns {Package} The smart contract package.
     */
    static async fromDirectory({name, version, path, type, metadataPath, goPath}) {
        logger.debug('Package.fromDirectory - entry - %s, %s, %s, %s', name, version, path, type);
        Package._validateNameAndVersion(name, version);
        const codePackage: Buffer | null = await Packager.packageContract(path, type, false, metadataPath, goPath);

        logger.debug('Package.fromDirectory - code package is %s bytes', codePackage ? codePackage.length : 0);
        const fixedPath = path.split('\\').join('/'); // for windows style paths
        const chaincodeSpec = {
            type: translateCCType(type),
            chaincode_id: {
                name,
                path: fixedPath,
                version
            }
        };
        logger.debug('Package.fromDirectory - built chaincode specification %s', JSON.stringify(chaincodeSpec));
        const chaincodeDeploymentSpec = new fabprotos.protos.ChaincodeDeploymentSpec();
        chaincodeDeploymentSpec.setChaincodeSpec(chaincodeSpec);
        chaincodeDeploymentSpec.setCodePackage(codePackage);
        const fileNames = await Package._findFileNames(chaincodeDeploymentSpec);
        return new Package(chaincodeDeploymentSpec, fileNames);
    }

    /**
     * Constructor.
     * @private
     * @param {ChaincodeDeploymentSpec} chaincodeDeploymentSpec The chaincode deployment specification.
     * @param fileNames
     */
    constructor(chaincodeDeploymentSpec, fileNames) {
        this.chaincodeDeploymentSpec = chaincodeDeploymentSpec;
        this.fileNames = fileNames;
    }

    /**
     * Get the name of the smart contract package.
     * @returns {string} The name of the smart contract package.
     */
    getName() {
        return this.chaincodeDeploymentSpec.getChaincodeSpec().getChaincodeId().getName();
    }

    /**
     * Get the version of the smart contract package.
     * @returns {string} The version of the smart contract package.
     */
    getVersion() {
        return this.chaincodeDeploymentSpec.getChaincodeSpec().getChaincodeId().getVersion();
    }

    /**
     * Get the type of the smart contract package.
     * @returns {string} The type of the smart contract package, one of 'golang', 'car', 'node' or 'java'.
     */
    getType() {
        return ccTypeMap[this.chaincodeDeploymentSpec.getChaincodeSpec().getType()];
    }

    /**
     * Get the list of file names in this smart contract package.
     * @returns {string[]} The list of file names in this smart contract package.
     */
    getFileNames() {
        return this.fileNames;
    }

    /**
     * Save the smart contract package to a buffer.
     * @returns {Buffer} A buffer containing the serialized smart contract package.
     */
    async toBuffer() {
        return this.chaincodeDeploymentSpec.toBuffer();
    }

}

function translateCCType(type) {
    const chaincodeType = type ? type.toLowerCase() : 'golang';
    return ccTranslateMap[chaincodeType];
}
