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

import * as fs from 'fs-extra';
import * as klaw from 'klaw';
import * as path from 'path';
import {Utils} from 'fabric-common'
import {BufferStream} from './BufferStream';
import {LifecyclePackager} from './Lifecycle';

const logger: any = Utils.getLogger('packager/Golang.js');

export class GolangPackager extends LifecyclePackager {

    /**
     * Package smart contract source and metadata for deployment.
     *        located under GOPATH/src. If a path to a Go module, a go.mod must be present.
     * @param smartContractPath The Go package name or path to Go module. If a package name, it must be
     *        located under GOPATH/src. If a path to a Go module, a go.mod must be present.
     * @param {string} [metadataPath[] Optional. The path to the top-level directory containing metadata descriptors.
     * @param {string} [goPath] Optional. The GOPATH setting used when building the smart contract. This will
     *        default to the environment setting "GOPATH".
     * @returns {Promise<Buffer>}
     */
    public async package(smartContractPath: string, metadataPath?: string, goPath?: string): Promise<Buffer> {
        // Determine the user's $GOPATH
        if (!goPath) {
            goPath = process.env.GOPATH;
        }

        // Compose the path to the go.mod candidate
        const isModule: boolean = await fs.pathExists(path.join(smartContractPath, 'go.mod'));

        // Compose the path to the smart contract project directory
        const projDir: string = isModule ? smartContractPath : path.join(goPath!, 'src', smartContractPath);
        const basePath: string = isModule ? smartContractPath : goPath!;

        logger.debug('packaging GOLANG smartContractPath from %s', smartContractPath);
        logger.debug('packaging GOLANG isModule %s', isModule);
        logger.debug('packaging GOLANG _goPath from %s', goPath);
        logger.debug('packaging GOLANG basePath from %s', basePath);
        logger.debug('packaging GOLANG projDir from %s', projDir);

        // We generate the tar in two phases: First grab a list of descriptors,
        // and then pack them into an archive.  While the two phases aren't
        // strictly necessary yet, they pave the way for the future where we
        // will need to assemble sources from multiple packages

        const srcDescriptors: { name: string, fqp: string }[] = await this.findSource(basePath, projDir);
        let descriptors: {name: string, fqp: string}[] = srcDescriptors.map(desc => {
            if (isModule) {
                desc.name = path.join('src', desc.name);
            }
            return desc;
        });

        if (metadataPath) {
            const metaDescriptors: { name: string, fqp: string }[] = await super.findMetadataDescriptors(metadataPath);
            descriptors = srcDescriptors.concat(metaDescriptors);
        }

        const stream: BufferStream = new BufferStream();
        await super.generateTarGz(descriptors, stream);
        return stream.toBuffer();
    }

    /**
     * Given an input 'filePath', recursively parse the filesystem for any
     * files that fit the criteria for being valid golang source (ISREG +
     * (*.(go|c|h|s|mod|sum))) As a convenience, we also formulate a
     * tar-friendly "name" for each file based on relative position to
     * 'basePath'.
     * @param basePath
     * @param filePath
     * @returns {Promise}
     */
    protected findSource(basePath: string, filePath: string): Promise<{ name: string, fqp: string }[]> {
        return new Promise((resolve, reject) => {
            const descriptors: { name: string, fqp: string }[] = [];
            klaw(filePath)
                .on('data', (entry) => {

                    if (entry.stats.isFile() && super.isSource(entry.path)) {
                        const desc: { name: string, fqp: string } = {
                            name: path.relative(basePath, entry.path).split('\\').join('/'), // for windows style paths
                            fqp: entry.path
                        };

                        logger.debug('adding entry', desc);
                        descriptors.push(desc);
                    }

                })
                .on('error', (error, item) => {
                    logger.error(`error while packaging ${item.path}`);
                    reject(error);
                })
                .on('end', () => {
                    resolve(descriptors);
                });
        });
    }
}
