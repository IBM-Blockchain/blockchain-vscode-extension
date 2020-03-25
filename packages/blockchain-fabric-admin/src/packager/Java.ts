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
import * as path from 'path';
import {Utils} from 'fabric-common';
import {LifecyclePackager} from './Lifecycle';

import * as walk from 'ignore-walk';
import {BufferStream} from './BufferStream';

const logger: any = Utils.getLogger('JavaPackager.js');

export class JavaPackager extends LifecyclePackager {

    /**
     * Package smart contract source and metadata files for deployment.
     * @param smartContractPath
     * @param {string} [metadataPath] The path to the top-level directory containing metadata descriptors
     * @returns {Promise<Buffer>}
     */
    public async package(smartContractPath: string, metadataPath?: string): Promise<Buffer> {
        logger.debug(`packaging Java source from ${smartContractPath}`);

        let descriptors: { name: string, fqp: string }[] = await this.findSource(smartContractPath);
        if (metadataPath) {
            logger.debug(`packaging metadata files from ${metadataPath}`);

            const metaDescriptors: { name: string, fqp: string }[] = await super.findMetadataDescriptors(metadataPath);
            descriptors = descriptors.concat(metaDescriptors);
        }
        const stream: BufferStream = new BufferStream();
        await super.generateTarGz(descriptors, stream);
        return stream.toBuffer();
    }

    /**
     * Given an input 'filePath', recursively parse the filesystem for any files
     * that fit the criteria for being valid java smart contract source
     * note: currently all files found in the source path are included
     *
     * @param filePath
     * @returns {Promise}
     */
    protected async findSource(filePath: string): Promise<{name: string, fqp: string}[]> {
        const descriptors: { name: string, fqp: string }[] = [];

        const files: string[] = await walk({path: filePath, follow: true});
        if (files) {
            files.forEach((entry) => {
                const desc: {name: string, fqp: string} = {
                    name: path.join('src', entry).split('\\').join('/'), // for windows style paths
                    fqp: path.join(filePath, entry)
                };

                logger.debug('adding descriptor entry', desc);
                descriptors.push(desc);
            });
        }

        return descriptors;
    }
}
