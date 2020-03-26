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
import * as klaw from 'klaw'
import * as tar from 'tar-stream'
import * as path from 'path';
import * as zlib from 'zlib';

import {Utils} from 'fabric-common';

const logger: any = Utils.getLogger('packager/BasePackager.js');

export enum SmartContractType {
    GO = 'golang',
    JAVA = 'java',
    NODE = 'node'
}

export abstract class BasePackager {

    private keep: string[] | undefined;

    /**
     * Constructor
     *
     * @param {*} [keep] Array of valid source file extensions
     */
    constructor(keep?: string[]) {
        if (this.constructor === BasePackager) {
            // BasePackager can not be constructed.
            throw new TypeError('Can not construct abstract class.');
        }
        // let the implementor decide
        // if (this.package === BasePackager.prototype.package) {
        // 	throw new TypeError('Please implement method package from child class');
        // }

        this.keep = keep;
    }

    /**
     * All of the files in the directory of request smart contract path will be
     * included in an archive file.
     *
     * @param smartContractPath
     * @param {string} metadataPath
     * @param {string} [goPath] Optional. Must be provided or environment "GOPATH" must be set
     *        when packaging goLang smart contract.
     */
    abstract async package(smartContractPath: string, metadataPath?: string, goPath?: string): Promise<Buffer>

    /**
     * Package the final smart contract package for installation on a
     * Hyperledger Fabric Peer using the v2 Lifecycle process.
     * @param label
     * @param smartContractType
     * @param {Buffer} packageBytes The smart contract package
     * @param goPath (optional)
     * @returns {Promise<Buffer>}
     */
    public abstract async finalPackage(label: string, smartContractType: SmartContractType, packageBytes: Buffer, goPath?: string): Promise<Buffer>

    /**
     * Given an input 'filePath', recursively parse the filesystem for any files
     * that fit the criteria for being valid smart contract source (ISREG + keep)
     *
     * @param baseFilepath
     * @param filepath
     */
    protected abstract findSource(baseFilepath: string, filepath?: string): Promise<any>

    /**
     * Find the metadata descriptor files.
     *
     * @param filePath The top-level directory containing the metadata descriptors.
     * Only files with a ".json" extension will be included in the results.
     * @returns {Promise}
     */
    protected findMetadataDescriptors(filePath: string): Promise<{ name: string, fqp: string }[]> {
        return new Promise((resolve: any, reject: any) => {
            logger.debug('findMetadataDescriptors : start');
            const descriptors: { name: string, fqp: string }[] = [];
            klaw(filePath)
                .on('data', (entry) => {
                    if (entry.stats.isFile() && BasePackager.isMetadata(entry.path)) {

                        const desc: {name: string, fqp: string} = {
                            name: path.join('META-INF', path.relative(filePath, entry.path)).split('\\').join('/'), // for windows style paths
                            fqp: entry.path
                        };
                        logger.debug(' findMetadataDescriptors  :: %j', desc);
                        descriptors.push(desc);
                    }
                })
                .on('error', (error, item) => {
                    logger.error('error while packaging item %j :: %s', item, error);
                    reject(error);
                })
                .on('end', () => {
                    resolve(descriptors);
                });
        });
    }

    /**
     * Predicate function for determining whether a given path should be
     * considered a valid metadata descriptor based entirely on the
     * file extension.
     * @param filePath The top-level directory containing the metadata descriptors.
     * @returns {boolean} Returns true for valid metadata descriptors.
     */
    private static isMetadata(filePath: string): boolean {
        const extensions: string[] = ['.json'];
        return (extensions.indexOf(path.extname(filePath)) !== -1);
    }

    /**
     * Predicate function for determining whether a given path should be
     * considered valid source code, based entirely on the extension.  It is
     * assumed that other checks for file type (e.g. ISREG) have already been
     * performed.
     * @param filePath
     * @returns {boolean}
     */
    protected isSource(filePath: string): boolean {
        return (this.keep!.indexOf(path.extname(filePath)) !== -1);
    }

    /**
     * Given {fqp, name} generate a tar entry complete with sensible
     * header and contents read from the filesystem.
     *
     * @param pack
     * @param desc
     * @returns {Promise}
     */
    private packFileEntry(pack: any, desc: {name: string, fqp: string}): Promise<boolean> {
        return new Promise((resolve, reject) => {
            // Use a synchronous read to reduce non-determinism
            const content: Buffer = fs.readFileSync(desc.fqp);
            if (!content) {
                reject(new Error('failed to read ' + desc.fqp));
            } else {
                pack.entry(BasePackager._buildHeader(desc.name, content.length), content, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(true);
                    }
                });
            }
        });
    }

    /**
     * Given {bytes, name} generate a tar entry complete with sensible
     * header and contents from memory (the bytes).
     *
     * @param pack
     * @param desc
     * @returns {Promise}
     */
    private packMemoryEntry(pack: any, desc: any): Promise<boolean> {
        return new Promise((resolve, reject) => {
            if (!desc || !desc.bytes) {
                reject(new Error('Missing content'));
            } else {
                pack.entry(BasePackager._buildHeader(desc.name, desc.bytes.length), desc.bytes, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(true);
                    }
                });
            }
        });
    }

    private static _buildHeader(name: string, size: number): { mode: 0o100644; atime: Date; size: number; name: string; ctime: Date; mtime: Date } {
        // Use a deterministic "zero-time" for all date fields
        const zeroTime: Date = new Date(0);
        return {
            name: name,
            size: size,
            mode: 0o100644,
            atime: zeroTime,
            mtime: zeroTime,
            ctime: zeroTime
        };
    }

    /**
     * Creates an .tar.gz stream from the provided descriptor entries
     *
     * @param descriptors
     * @param dest
     * @returns {Promise}
     */
    protected generateTarGz(descriptors: any, dest: any): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const pack: any = tar.pack();
            // Setup the pipeline to compress on the fly and resolve/reject the promise
            pack.pipe(zlib.createGzip()).pipe(dest)
                .on('finish', () => {
                    resolve(true);
                })
                .on('error', (err) => {
                    reject(err);
                });

            // Iterate through each descriptor in the order it was provided and resolve
            // the entry asynchronously.  We will gather results below before
            // finalizing the tarball
            const tasks: any[] = [];
            for (const desc of descriptors) {
                let task: any;
                if (desc.bytes) {
                    task = this.packMemoryEntry(pack, desc);
                } else {
                    task = this.packFileEntry(pack, desc);
                }

                tasks.push(task);
            }

            // Block here until all entries have been gathered, and then finalize the
            // tarball.  This should result in a flush of the entire pipeline before
            // resolving the top-level promise.
            Promise.all(tasks).then(() => {
                pack.finalize();
            }).catch((err) => {
                reject(err);
            });
        });
    }
}
