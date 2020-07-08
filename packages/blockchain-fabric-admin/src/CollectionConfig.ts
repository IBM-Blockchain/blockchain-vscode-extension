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

import * as protos from 'fabric-protos';
import * as Long from 'long';
import { EndorsementPolicy } from './Policy';

export interface Collection {
    name: string,
    policy: string,
    maxPeerCount: number,
    requiredPeerCount: number,
    blockToLive?: number,
    memberOnlyRead?: boolean,
    memberOnlyWrite?: boolean,
    endorsementPolicy?: string
}

export class CollectionConfig {

    static buildCollectionConfigPackage(collectionsConfigs: Collection[]): protos.common.CollectionConfigPackage {
        if (collectionsConfigs.length === 0) {
            throw new Error('CollectionConfig invalid: collection config is empty');
        }
        const collectionConfigPackage: protos.common.ICollectionConfigPackage = {};
        const collectionConfigs: protos.common.CollectionConfig[] = [];
        collectionsConfigs.forEach(config => {
            const staticCollectionConfig: protos.common.StaticCollectionConfig = this.buildCollectionConfig(config);
            const collectionConfig: protos.common.CollectionConfig = new protos.common.CollectionConfig();
            collectionConfig.static_collection_config = staticCollectionConfig;
            collectionConfigs.push(collectionConfig);
        });
        collectionConfigPackage.config = collectionConfigs;

        return new protos.common.CollectionConfigPackage(collectionConfigPackage);
    }

    /**
     *
     * @param {collectionConfig} collectionConfig
     * @returns {collectionConfig}
     */
    static checkCollectionConfig(collectionConfig: Collection): Collection {
        if (!collectionConfig.name || typeof collectionConfig.name !== 'string') {
            throw new Error('CollectionConfig invalid: missing property name, name should be a string');
        }
        if (!collectionConfig.policy) {
            throw new Error('CollectionConfig invalid: missing property policy');
        }

        if (collectionConfig.maxPeerCount === undefined || !Number.isInteger(collectionConfig.maxPeerCount)) {
            throw new Error('CollectionConfig invalid: missing property maxPeerCount, maxPeerCount should be a integer');
        }
        if (collectionConfig.requiredPeerCount === undefined || !Number.isInteger(collectionConfig.requiredPeerCount)) {
            throw new Error('CollectionConfig invalid: missing property requiredPeerCount, requiredPeerCount should be a integer');
        }

        if (collectionConfig.maxPeerCount < collectionConfig.requiredPeerCount) {
            throw new Error('CollectionConfig invalid: maxPeerCount should be greater than requiredPeerCount');
        }

        if (!collectionConfig.blockToLive) {
            collectionConfig.blockToLive = 0; // default is never purge
        } else {
            const isNegative: boolean = Long.fromValue(collectionConfig.blockToLive).isNegative();
            if (isNegative) {
                throw new Error('CollectionConfig invalid: blockToLive should should be a positive number');
            }
        }

        if (collectionConfig.memberOnlyRead === undefined) {
            collectionConfig.memberOnlyRead = false;
        } else if (typeof collectionConfig.memberOnlyRead !== 'boolean') {
            throw new Error('CollectionConfig invalid: memberOnlyRead property should be a boolean');
        }

        if (collectionConfig.memberOnlyWrite === undefined) {
            collectionConfig.memberOnlyWrite = false;
        } else if (typeof collectionConfig.memberOnlyWrite !== 'boolean') {
            throw new Error('CollectionConfig invalid: memberOnlyWrite property should be a boolean');
        }

        return collectionConfig;
    }

    /**
     * @param {collectionConfig} collectionConfig
     */
    static buildCollectionConfig(collectionConfig: Collection): protos.common.StaticCollectionConfig {
        collectionConfig = this.checkCollectionConfig(collectionConfig);

        const staticCollectionConfig: protos.common.StaticCollectionConfig = new protos.common.StaticCollectionConfig();
        staticCollectionConfig.name = collectionConfig.name;
        staticCollectionConfig.required_peer_count = collectionConfig.requiredPeerCount;
        staticCollectionConfig.maximum_peer_count = collectionConfig.maxPeerCount;
        staticCollectionConfig.block_to_live = collectionConfig.blockToLive;
        staticCollectionConfig.member_only_read = collectionConfig.memberOnlyRead;
        staticCollectionConfig.member_only_write = collectionConfig.memberOnlyWrite;

        const collectionPolicyConfig: protos.common.CollectionPolicyConfig = new protos.common.CollectionPolicyConfig();
        const endorsementPolicy: EndorsementPolicy = new EndorsementPolicy();

        collectionPolicyConfig.signature_policy = endorsementPolicy.buildPolicy(collectionConfig.policy);

        staticCollectionConfig.member_orgs_policy = collectionPolicyConfig;

        if (collectionConfig.endorsementPolicy) {
            const applicationPolicy: protos.common.ApplicationPolicy = new protos.common.ApplicationPolicy();
            if (collectionConfig.endorsementPolicy.startsWith(EndorsementPolicy.AND) || collectionConfig.endorsementPolicy.startsWith(EndorsementPolicy.OR) || collectionConfig.endorsementPolicy.startsWith(EndorsementPolicy.OUT_OF)) {
                const policy: EndorsementPolicy = new EndorsementPolicy();
                const signaturePolicy: protos.common.SignaturePolicyEnvelope = policy.buildPolicy(collectionConfig.endorsementPolicy);
                applicationPolicy.signature_policy = signaturePolicy;
            } else {
                applicationPolicy.channel_config_policy_reference = collectionConfig.endorsementPolicy;
            }

            staticCollectionConfig.endorsement_policy = applicationPolicy;
        }

        return staticCollectionConfig;
    }
}
