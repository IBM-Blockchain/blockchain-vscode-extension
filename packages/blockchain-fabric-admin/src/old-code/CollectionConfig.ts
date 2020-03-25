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

import * as fabprotos from 'fabric-protos';
import * as fs from 'fs';
import * as Policy from './Policy';
import {Utils} from 'fabric-common';
import Long = require('long');

const logger = Utils.getLogger('SideDB.js');
const {format} = require('util');

class CollectionConfig {

    /**
     * @typedef {Object} collectionConfig
     * @property {string} name
     * @property policy
     * @property {number} maxPeerCount integer
     * @property {number} requiredPeerCount integer
     * @property {!Long|number|string|!{low: number, high: number, unsigned: boolean}} blockToLive param will be converted to unsigned int64 as Long
     * @property {boolean} memberOnlyRead denotes whether only collection member clients can read the private data
     * @property {boolean} memberOnlyWrite denotes whether only collection member clients can write the private data
     */

    /**
     *
     * @param {string|collectionConfig[]} collectionsConfigs can be either:
     * A string represents the collections-config.json file path;
     * An array of collectionConfig;
     */
    static buildCollectionConfigPackage(collectionsConfigs) {
        try {
            let content = collectionsConfigs;
            if (typeof collectionsConfigs === 'string') {
                logger.debug('Read CollectionsConfig From %s', collectionsConfigs);
                content = fs.readFileSync(collectionsConfigs, 'utf8');
                content = JSON.parse(content);
            }
            if (!Array.isArray(content) || content.length === 0) {
                logger.error('Expect collections config of type Array, found %s', typeof content);
                throw new Error('Expect collections config of type Array');
            }
            let collectionConfigPackage: any[] = [];
            content.forEach(config => {
                const collectionConfig = this.buildCollectionConfig(config);
                collectionConfigPackage.push(collectionConfig);
            });
            collectionConfigPackage = new fabprotos.common.CollectionConfigPackage(collectionConfigPackage);

            return collectionConfigPackage;
        } catch (e) {
            logger.error(e);
            throw e;
        }
    }

    /**
     *
     * @param {collectionConfig} collectionConfig
     * @returns {collectionConfig}
     */
    static checkCollectionConfig(collectionConfig) {
        const method = 'checkCollectionConfig';
        let {
            blockToLive,
            memberOnlyRead,
            memberOnlyWrite
        } = collectionConfig;

        const {
            name,
            policy,
            maxPeerCount,
            requiredPeerCount
        } = collectionConfig;

        if (!name || typeof name !== 'string') {
            throw new Error(format('CollectionConfig Requires Param "name" of type string, found %j(type: %s)', name, typeof name));
        }
        if (!policy) {
            throw new Error('Missing Required Param "policy"');
        }
        Policy.checkPolicy(policy);
        if (!Number.isInteger(maxPeerCount)) {
            throw new Error(format('CollectionConfig Requires Param "maxPeerCount" of type number, found %j(type: %s)', maxPeerCount, typeof maxPeerCount));
        }
        if (!Number.isInteger(requiredPeerCount)) {
            throw new Error(format('CollectionConfig Requires Param "requiredPeerCount" of type number, found %j(type: %s)', requiredPeerCount, typeof requiredPeerCount));
        }

        if (maxPeerCount < requiredPeerCount) {
            throw new Error(`CollectionConfig Requires Param "maxPeerCount" bigger than "requiredPeerCount", found maxPeerCount==${maxPeerCount}, requiredPeerCount==${requiredPeerCount}`);
        }

        if (!blockToLive) {
            blockToLive = 0; // default is never purge
        } else {
            // @ts-ignore
            const isNegative: boolean = Long.fromValue(blockToLive, true).isNegative();
            if (Number.isNaN(Number.parseInt(blockToLive)) || isNegative
            ) {
                throw new Error(format('CollectionConfig Requires Param "blockToLive" of type unsigned int64, found %j(type: %s)', blockToLive, typeof blockToLive));
            } else {
                // @ts-ignore
                const test = Long.fromValue(blockToLive, true);
                logger.debug('%s blockToLive parse from %j and parsed to %s)', method, blockToLive, test);

                if (test.toString() !== blockToLive.toString()) {
                    throw new Error(format('CollectionConfig Requires Param "blockToLive" to be a valid unsigned int64, input is %j and parsed to %s)', blockToLive, test));
                }
            }
        }

        if (typeof memberOnlyRead !== 'undefined') {
            if (typeof memberOnlyRead === 'boolean') {
                logger.debug('%s - memberOnlyRead has value of %s', method, memberOnlyRead);
            } else {
                throw new Error(format('CollectionConfig Requires Param "memberOnlyRead" to be boolean, input is %s', memberOnlyRead));
            }
        } else {
            logger.debug('%s - memberOnlyRead defaulting to false', method);
            memberOnlyRead = false;
        }

        if (typeof memberOnlyWrite !== 'undefined') {
            if (typeof memberOnlyWrite === 'boolean') {
                logger.debug('%s - memberOnlyWrite has value of %s', method, memberOnlyWrite);
            } else {
                throw new Error(format('CollectionConfig Requires Param "memberOnlyWrite" to be boolean, input is %s', memberOnlyWrite));
            }
        } else {
            logger.debug('%s - memberOnlyWrite defaulting to false', method);
            memberOnlyWrite = false;
        }

        return {
            name,
            policy,
            maxPeerCount,
            requiredPeerCount,
            blockToLive,
            memberOnlyRead,
            memberOnlyWrite
        };
    }

    /**
     * @param {collectionConfig} collectionConfig
     */
    static buildCollectionConfig(collectionConfig) {
        try {
            const {
                name,
                policy,
                maxPeerCount,
                requiredPeerCount,
                blockToLive,
                memberOnlyRead,
                memberOnlyWrite
            } = this.checkCollectionConfig(collectionConfig);

            const static_collection_config = {
                name,
                member_orgs_policy: {
                    signature_policy: {}
                },
                required_peer_count: requiredPeerCount,
                maximum_peer_count: maxPeerCount,
                block_to_live: blockToLive,
                member_only_read: memberOnlyRead,
                member_only_write: memberOnlyWrite
            };

            const principals: any[] = [];
            policy.identities.forEach((identity) => {
                const newPrincipal = Policy.buildPrincipal(identity);
                principals.push(newPrincipal);
            });

            const signaturePolicy = Policy.buildSignaturePolicy(policy.policy);

            static_collection_config.member_orgs_policy.signature_policy = {
                version: 0,
                rule: signaturePolicy,
                identities: principals
            };

            return {static_collection_config};
        } catch (e) {
            logger.error(e);
            throw e;
        }
    }
}

module.exports = CollectionConfig;
