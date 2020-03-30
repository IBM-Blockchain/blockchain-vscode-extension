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

import {LifecyclePackager} from './Lifecycle';
import {BufferStream} from './BufferStream';
import * as path from 'path';

import {Utils} from 'fabric-common';

import * as walk from 'ignore-walk';

const logger: any = Utils.getLogger('packager/Node.js');

export class NodePackager extends LifecyclePackager {

    /**
     * Package smart contract source and metadata for deployment.
     * and package.json.
     * @param smartContractPath
     * @param {string} [metadataPath] The path to the top-level directory containing metadata descriptors
     * @returns {Promise<Buffer>}
     */
    public async package(smartContractPath: string, metadataPath?: string): Promise<Buffer> {
        logger.debug(`packaging Node from ${smartContractPath}`);

        // Compose the path to the smart contract project directory
        // We generate the tar in two phases: First grab a list of descriptors,
        // and then pack them into an archive.  While the two phases aren't
        // strictly necessary yet, they pave the way for the future where we
        // will need to assemble sources from multiple packages

        const srcDescriptors: { name: string; fqp: string }[] = await this.findSource(smartContractPath);
        let descriptors: { name: string; fqp: string }[] = srcDescriptors;
        if (metadataPath) {
            const metaDescriptors: { name: string; fqp: string }[] = await super.findMetadataDescriptors(metadataPath);
            descriptors = srcDescriptors.concat(metaDescriptors);
        }
        const stream: BufferStream = new BufferStream();
        await super.generateTarGz(descriptors, stream);
        return stream.toBuffer();
    }

    /**
     * Given an input 'filePath', recursively parse the filesystem for any files
     * that fit the criteria for being valid node smart contract source
     *
     * @param filePath
     * @returns {Promise}
     */
    protected async findSource(filePath: string): Promise<{ name: string, fqp: string }[]> {
        let files: string[] = await walk({
            path: filePath,
            // applies filtering based on the same rules as "npm publish":
            // if .npmignore exists, uses rules it specifies
            ignoreFiles: ['.npmignore'],
            // follow symlink dirs
            follow: true
        });
        const descriptors: { name: string, fqp: string }[] = [];

        // ignore the node_modules folder by default
        files = files.filter(f => f.indexOf('node_modules') !== 0);

        files.forEach((entry) => {
            const desc: { fqp: string; name: string } = {
                name: path.join('src', entry).split('\\').join('/'), // for windows style paths
                fqp: path.join(filePath, entry)
            };

            logger.debug('adding entry', desc);
            descriptors.push(desc);
        });

        return descriptors;
    }
}
