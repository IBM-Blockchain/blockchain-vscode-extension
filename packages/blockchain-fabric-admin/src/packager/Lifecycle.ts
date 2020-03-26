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

import {Utils} from 'fabric-common';
import {BasePackager, SmartContractType} from './BasePackager';
import {BufferStream} from './BufferStream';

const logger: any = Utils.getLogger('packager/Lifecycle.js');


export abstract class LifecyclePackager extends BasePackager {

    /**
     * Package the final smart contract package for installation on a
     * Hyperledger Fabric Peer using the v2 Lifecycle process.
     * @param {string} label The label of the chaincode package
     * @param {string} smartContractType The smart contract type
     * @param {Buffer} packageBytes The smart contract package
     * @param {string} goPath Optional. The goPath, must be set if type is go
     * @returns {Promise<Buffer>}
     */
    public async finalPackage(label: string, smartContractType: SmartContractType, packageBytes: Buffer, goPath?: string): Promise<Buffer> {
        const method: string = 'finalPackage';
        logger.debug('%s - Start building final lifecycle package for label:%s type:%s goPath:%s',
            method, label, smartContractType, goPath);

        // We generate the tar in two phases: First grab a list of descriptors,
        // and then pack them into an archive.  While the two phases aren't
        // strictly necessary yet, they pave the way for the future where we
        // will need to assemble sources from multiple packages

        let descriptors: { bytes: Buffer; name: string }[] = LifecyclePackager.buildMetaDataDescriptors(label, smartContractType, goPath);
        const packageDescriptors: { bytes: Buffer; name: string }[] = LifecyclePackager.buildPackageDescriptors(packageBytes);
        descriptors = descriptors.concat(packageDescriptors);
        const stream: BufferStream = new BufferStream();
        await super.generateTarGz(descriptors, stream);
        const returnBytes: Buffer = stream.toBuffer();
        logger.debug('%s - packaged bytes %s', method, returnBytes.length);

        return returnBytes;
    }

    /**
     * Build a descriptor to describe an in memory JSON file entry
     * @param label
     * @param {string} type
     * @param {string} path
     */
    private static buildMetaDataDescriptors(label: string, type: string, path?: string): { bytes: Buffer, name: string }[] {
        if (!path) {
            path = '';
        }
        const metadata: { path: string; label: string; type: string } = {
            label: label,
            path: path,
            type: type
        };
        const descriptors: { bytes: Buffer, name: string }[] = [];
        const metadataDescriptor: { bytes: Buffer; name: string } = {
            bytes: Buffer.from(JSON.stringify(metadata), 'utf8'),
            name: 'metadata.json'
        };
        descriptors.push(metadataDescriptor);

        return descriptors;
    }

    /**
     * Build a descriptor to describe an in memory byte[] file entry
     * @param {Buffer} bytes that are assumed to be a smart contract package.
     */
    private static buildPackageDescriptors(bytes: Buffer): { bytes: Buffer, name: string }[] {
        const descriptors: any[] = [];
        const packageDescriptor: { bytes: Buffer; name: string } = {
            bytes: bytes,
            name: 'code.tar.gz'
        };
        descriptors.push(packageDescriptor);

        return descriptors;
    }
}
