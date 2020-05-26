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

import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as protos from 'fabric-protos';
import {CollectionConfig, Collection} from '../src/CollectionConfig';
import {EndorsementPolicy} from '../src/Policy';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

// tslint:disable:no-unused-expression
describe('CollectionConfig', () => {

    it('should create the collection', () => {
        const collection: Collection = {
            name: 'myCollection',
            policy: `OR('Org1MSP.member', 'Org2MSP.member')`,
            requiredPeerCount: 0,
            maxPeerCount: 3
        };

        const staticCollectionConfig: protos.StaticCollectionConfig = new protos.common.StaticCollectionConfig();
        staticCollectionConfig.name = collection.name;
        staticCollectionConfig.required_peer_count = collection.requiredPeerCount;
        staticCollectionConfig.maximum_peer_count = collection.maxPeerCount;
        staticCollectionConfig.block_to_live = 0;
        staticCollectionConfig.member_only_read = false;
        staticCollectionConfig.member_only_write = false;

        const collectionPolicyConfig: protos.common.CollectionPolicyConfig = new protos.common.CollectionPolicyConfig();
        const endorsementPolicy: EndorsementPolicy = new EndorsementPolicy();

        collectionPolicyConfig.signature_policy = endorsementPolicy.buildPolicy(collection.policy);

        staticCollectionConfig.member_orgs_policy = collectionPolicyConfig;

        const collectionConfig: protos.common.CollectionConfig = new protos.common.CollectionConfig();
        collectionConfig.static_collection_config = staticCollectionConfig;

        const expectedResult: protos.common.CollectionConfigPackage = new protos.common.CollectionConfigPackage([collectionConfig]);

        const result: protos.common.CollectionConfigPackage = CollectionConfig.buildCollectionConfigPackage([collection]);

        result.should.deep.equal(expectedResult);
    });

    it('should create the collection with optional properties', () => {
        const collection: Collection = {
            name: 'myCollection',
            policy: `OR('Org1MSP.member', 'Org2MSP.member')`,
            requiredPeerCount: 1,
            maxPeerCount: 3,
            memberOnlyRead: true,
            memberOnlyWrite: true,
            blockToLive: 10
        };

        const staticCollectionConfig: protos.StaticCollectionConfig = new protos.common.StaticCollectionConfig();
        staticCollectionConfig.name = collection.name;
        staticCollectionConfig.required_peer_count = collection.requiredPeerCount;
        staticCollectionConfig.maximum_peer_count = collection.maxPeerCount;
        staticCollectionConfig.block_to_live = collection.blockToLive;
        staticCollectionConfig.member_only_read = collection.memberOnlyRead;
        staticCollectionConfig.member_only_write = collection.memberOnlyWrite;

        const collectionPolicyConfig: protos.common.CollectionPolicyConfig = new protos.common.CollectionPolicyConfig();
        const endorsementPolicy: EndorsementPolicy = new EndorsementPolicy();

        collectionPolicyConfig.signature_policy = endorsementPolicy.buildPolicy(collection.policy);

        staticCollectionConfig.member_orgs_policy = collectionPolicyConfig;

        const collectionConfig: protos.common.CollectionConfig = new protos.common.CollectionConfig();
        collectionConfig.static_collection_config = staticCollectionConfig;

        const expectedResult: protos.common.CollectionConfigPackage = new protos.common.CollectionConfigPackage([collectionConfig]);

        const result: protos.common.CollectionConfigPackage = CollectionConfig.buildCollectionConfigPackage([collection]);

        result.should.deep.equal(expectedResult);
    });

    it('should create the collection with endorsement policy property', () => {
        const collection: Collection = {
            name: 'myCollection',
            policy: `OR('Org1MSP.member', 'Org2MSP.member')`,
            requiredPeerCount: 1,
            maxPeerCount: 3,
            endorsementPolicy: `AND('Org1MSP.member', 'Org2MSP.member')`
        };

        const staticCollectionConfig: protos.StaticCollectionConfig = new protos.common.StaticCollectionConfig();
        staticCollectionConfig.name = collection.name;
        staticCollectionConfig.required_peer_count = collection.requiredPeerCount;
        staticCollectionConfig.maximum_peer_count = collection.maxPeerCount;
        staticCollectionConfig.block_to_live = 0;
        staticCollectionConfig.member_only_read = false;
        staticCollectionConfig.member_only_write = false;

        const collectionPolicyConfig: protos.common.CollectionPolicyConfig = new protos.common.CollectionPolicyConfig();
        const endorsementPolicy: EndorsementPolicy = new EndorsementPolicy();

        collectionPolicyConfig.signature_policy = endorsementPolicy.buildPolicy(collection.policy);

        staticCollectionConfig.member_orgs_policy = collectionPolicyConfig;

        const collectionConfig: protos.common.CollectionConfig = new protos.common.CollectionConfig();
        collectionConfig.static_collection_config = staticCollectionConfig;

        const applicationPolicy: protos.common.ApplicationPolicy = new protos.common.ApplicationPolicy();
        const policy: EndorsementPolicy = new EndorsementPolicy();
        const signaturePolicy: protos.common.SignaturePolicyEnvelope = policy.buildPolicy(collection.endorsementPolicy);
        applicationPolicy.setSignaturePolicy(signaturePolicy);

        staticCollectionConfig.endorsement_policy = applicationPolicy;

        const expectedResult: protos.common.CollectionConfigPackage = new protos.common.CollectionConfigPackage([collectionConfig]);

        const result: protos.common.CollectionConfigPackage = CollectionConfig.buildCollectionConfigPackage([collection]);

        result.should.deep.equal(expectedResult);
    });

    it('should create the collection with endorsement policy property (channel policy reference)', () => {
        const collection: Collection = {
            name: 'myCollection',
            policy: `OR('Org1MSP.member', 'Org2MSP.member')`,
            requiredPeerCount: 1,
            maxPeerCount: 3,
            endorsementPolicy: `myPolicy`
        };

        const staticCollectionConfig: protos.StaticCollectionConfig = new protos.common.StaticCollectionConfig();
        staticCollectionConfig.name = collection.name;
        staticCollectionConfig.required_peer_count = collection.requiredPeerCount;
        staticCollectionConfig.maximum_peer_count = collection.maxPeerCount;
        staticCollectionConfig.block_to_live = 0;
        staticCollectionConfig.member_only_read = false;
        staticCollectionConfig.member_only_write = false;

        const collectionPolicyConfig: protos.common.CollectionPolicyConfig = new protos.common.CollectionPolicyConfig();
        const endorsementPolicy: EndorsementPolicy = new EndorsementPolicy();

        collectionPolicyConfig.signature_policy = endorsementPolicy.buildPolicy(collection.policy);

        staticCollectionConfig.member_orgs_policy = collectionPolicyConfig;

        const collectionConfig: protos.common.CollectionConfig = new protos.common.CollectionConfig();
        collectionConfig.static_collection_config = staticCollectionConfig;

        const applicationPolicy: protos.common.ApplicationPolicy = new protos.common.ApplicationPolicy();

        applicationPolicy.setChannelConfigPolicyReference(collection.endorsementPolicy);

        staticCollectionConfig.endorsement_policy = applicationPolicy;

        const expectedResult: protos.common.CollectionConfigPackage = new protos.common.CollectionConfigPackage([collectionConfig]);

        const result: protos.common.CollectionConfigPackage = CollectionConfig.buildCollectionConfigPackage([collection]);

        result.should.deep.equal(expectedResult);
    });

    it('should error if no collections passed in', () => {
        (() => CollectionConfig.buildCollectionConfigPackage([])).should.throw('CollectionConfig invalid: collection config is empty');
    });

    it('should error if no name given', () => {
        // @ts-ignore
        (() => CollectionConfig.buildCollectionConfigPackage([{
                policy: `OR('Org1MSP.member', 'Org2MSP.member')`,
                requiredPeerCount: 1,
                maxPeerCount: 3
            }])
        ).should.throw('CollectionConfig invalid: missing property name, name should be a string');
    });

    it('should error if no policy given', () => {
        // @ts-ignore
        (() => CollectionConfig.buildCollectionConfigPackage([{
            name: 'collectionMarbles',
            requiredPeerCount: 1,
            maxPeerCount: 3
        }])).should.throw('CollectionConfig invalid: missing property policy');
    });

    it('should error if no requiredPeerCount given', () => {
        // @ts-ignore
        (() => CollectionConfig.buildCollectionConfigPackage([{
            name: 'collectionMarbles',
            policy: `OR('Org1MSP.member', 'Org2MSP.member')`,
            maxPeerCount: 3
        }])).should.throw('CollectionConfig invalid: missing property requiredPeerCount, requiredPeerCount should be a integer');
    });

    it('should error if no maxPeerCount given', () => {
        // @ts-ignore
        (() => CollectionConfig.buildCollectionConfigPackage([{
            name: 'collectionMarbles',
            policy: `OR('Org1MSP.member', 'Org2MSP.member')`,
            requiredPeerCount: 1
        }])).should.throw('CollectionConfig invalid: missing property maxPeerCount, maxPeerCount should be a integer');
    });

    it('should error if maxPeerCount is less than requiredPeerCount', () => {
        // @ts-ignore
        (() => CollectionConfig.buildCollectionConfigPackage([{
            name: 'collectionMarbles',
            policy: `OR('Org1MSP.member', 'Org2MSP.member')`,
            requiredPeerCount: 4,
            maxPeerCount: 3
        }])).should.throw('CollectionConfig invalid: maxPeerCount should be greater than requiredPeerCount');
    });

    it('should error if blockToLive is negative', () => {
        // @ts-ignore
        (() => CollectionConfig.buildCollectionConfigPackage([{
            name: 'collectionMarbles',
            policy: `OR('Org1MSP.member', 'Org2MSP.member')`,
            requiredPeerCount: 1,
            maxPeerCount: 3,
            blockToLive: -1,
        }])).should.throw('CollectionConfig invalid: blockToLive should should be a positive number');
    });

    it('should error if memberOnlyRead is not a boolean', () => {
        (() => {
            const collection: Collection = {
                name: 'collectionMarbles',
                policy: `OR('Org1MSP.member', 'Org2MSP.member')`,
                requiredPeerCount: 1,
                maxPeerCount: 3
            };

            // @ts-ignore
            collection.memberOnlyRead = 'bob';
            CollectionConfig.buildCollectionConfigPackage([collection]);
        }).should.throw('CollectionConfig invalid: memberOnlyRead property should be a boolean');
    });

    it('should error if memberOnlyWrite is not a boolean', () => {
        (() => {
            const collection: Collection = {
                name: 'collectionMarbles',
                policy: `OR('Org1MSP.member', 'Org2MSP.member')`,
                requiredPeerCount: 1,
                maxPeerCount: 3
            };

            // @ts-ignore
            collection.memberOnlyWrite = 'bob';
            CollectionConfig.buildCollectionConfigPackage([collection]);
        }).should.throw('CollectionConfig invalid: memberOnlyWrite property should be a boolean');
    });
});
