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
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';
import {EndorsementPolicy} from '../src/Policy';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

// tslint:disable:no-unused-expression
describe('Policy', () => {

    let policy: EndorsementPolicy;

    let principalMemberA: protos.common.MSPPrincipal;
    let principalMemberB: protos.common.MSPPrincipal;
    let principalMemberC: protos.common.MSPPrincipal;
    let principalMemberD: protos.common.MSPPrincipal;

    let principalClientA: protos.common.MSPPrincipal;
    let principalPeerA: protos.common.MSPPrincipal;
    let principalPeerB: protos.common.MSPPrincipal;
    let principalAdminB: protos.common.MSPPrincipal;
    let principalAdminC: protos.common.MSPPrincipal;
    let principalOrdererC: protos.common.MSPPrincipal;
    let principalClientD: protos.common.MSPPrincipal;

    let signedByA: protos.common.SignaturePolicy;
    let signedByB: protos.common.SignaturePolicy;
    let signedByC: protos.common.SignaturePolicy;
    let signedByD: protos.common.SignaturePolicy;

    beforeEach(() => {
        policy = new EndorsementPolicy();

        principalMemberA = new protos.common.MSPPrincipal();
        principalMemberA.setPrincipalClassification(protos.common.MSPPrincipal.Classification.ROLE);
        const newRoleMemberA: protos.common.MSPRole = new protos.common.MSPRole();
        newRoleMemberA.setRole(protos.common.MSPRole.MSPRoleType.MEMBER);
        newRoleMemberA.setMspIdentifier('A');
        principalMemberA.setPrincipal(newRoleMemberA.toBuffer());

        principalMemberB = new protos.common.MSPPrincipal();
        principalMemberB.setPrincipalClassification(protos.common.MSPPrincipal.Classification.ROLE);
        const newRoleMemberB: protos.common.MSPRole = new protos.common.MSPRole();
        newRoleMemberB.setRole(protos.common.MSPRole.MSPRoleType.MEMBER);
        newRoleMemberB.setMspIdentifier('B');
        principalMemberB.setPrincipal(newRoleMemberB.toBuffer());

        principalMemberC = new protos.common.MSPPrincipal();
        principalMemberC.setPrincipalClassification(protos.common.MSPPrincipal.Classification.ROLE);
        const newRoleMemberC: protos.common.MSPRole = new protos.common.MSPRole();
        newRoleMemberC.setRole(protos.common.MSPRole.MSPRoleType.MEMBER);
        newRoleMemberC.setMspIdentifier('C');
        principalMemberC.setPrincipal(newRoleMemberC.toBuffer());

        principalMemberD = new protos.common.MSPPrincipal();
        principalMemberD.setPrincipalClassification(protos.common.MSPPrincipal.Classification.ROLE);
        const newRoleMemberD: protos.common.MSPRole = new protos.common.MSPRole();
        newRoleMemberD.setRole(protos.common.MSPRole.MSPRoleType.MEMBER);
        newRoleMemberD.setMspIdentifier('D');
        principalMemberD.setPrincipal(newRoleMemberD.toBuffer());

        principalClientA = new protos.common.MSPPrincipal();
        principalClientA.setPrincipalClassification(protos.common.MSPPrincipal.Classification.ROLE);
        const newRoleClientA: protos.common.MSPRole = new protos.common.MSPRole();
        newRoleClientA.setRole(protos.common.MSPRole.MSPRoleType.CLIENT);
        newRoleClientA.setMspIdentifier('A');
        principalClientA.setPrincipal(newRoleClientA.toBuffer());

        principalPeerA = new protos.common.MSPPrincipal();
        principalPeerA.setPrincipalClassification(protos.common.MSPPrincipal.Classification.ROLE);
        const newRolePeerA: protos.common.MSPRole = new protos.common.MSPRole();
        newRolePeerA.setRole(protos.common.MSPRole.MSPRoleType.PEER);
        newRolePeerA.setMspIdentifier('A');
        principalPeerA.setPrincipal(newRolePeerA.toBuffer());

        principalPeerB = new protos.common.MSPPrincipal();
        principalPeerB.setPrincipalClassification(protos.common.MSPPrincipal.Classification.ROLE);
        const newRolePeerB: protos.common.MSPRole = new protos.common.MSPRole();
        newRolePeerB.setRole(protos.common.MSPRole.MSPRoleType.PEER);
        newRolePeerB.setMspIdentifier('B');
        principalPeerB.setPrincipal(newRolePeerB.toBuffer());

        principalAdminB = new protos.common.MSPPrincipal();
        principalAdminB.setPrincipalClassification(protos.common.MSPPrincipal.Classification.ROLE);
        const newRoleAdminB: protos.common.MSPRole = new protos.common.MSPRole();
        newRoleAdminB.setRole(protos.common.MSPRole.MSPRoleType.ADMIN);
        newRoleAdminB.setMspIdentifier('B');
        principalAdminB.setPrincipal(newRoleAdminB.toBuffer());

        principalAdminC = new protos.common.MSPPrincipal();
        principalAdminC.setPrincipalClassification(protos.common.MSPPrincipal.Classification.ROLE);
        const newRoleAdminC: protos.common.MSPRole = new protos.common.MSPRole();
        newRoleAdminC.setRole(protos.common.MSPRole.MSPRoleType.ADMIN);
        newRoleAdminC.setMspIdentifier('C');
        principalAdminC.setPrincipal(newRoleAdminC.toBuffer());

        principalOrdererC = new protos.common.MSPPrincipal();
        principalOrdererC.setPrincipalClassification(protos.common.MSPPrincipal.Classification.ROLE);
        const newRoleOrdererC: protos.common.MSPRole = new protos.common.MSPRole();
        newRoleOrdererC.setRole(protos.common.MSPRole.MSPRoleType.ORDERER);
        newRoleOrdererC.setMspIdentifier('C');
        principalOrdererC.setPrincipal(newRoleOrdererC.toBuffer());

        principalClientD = new protos.common.MSPPrincipal();
        principalClientD.setPrincipalClassification(protos.common.MSPPrincipal.Classification.ROLE);
        const newRoleClientD: protos.common.MSPRole = new protos.common.MSPRole();
        newRoleClientD.setRole(protos.common.MSPRole.MSPRoleType.CLIENT);
        newRoleClientD.setMspIdentifier('D');
        principalClientD.setPrincipal(newRoleClientD.toBuffer());

        signedByA = new protos.common.SignaturePolicy();
        signedByA.set('signed_by', 0);

        signedByB = new protos.common.SignaturePolicy();
        signedByB.set('signed_by', 1);

        signedByC = new protos.common.SignaturePolicy();
        signedByC.set('signed_by', 2);

        signedByD = new protos.common.SignaturePolicy();
        signedByD.set('signed_by', 3);
    });

    it(`should parse "OutOf(1, 'A.member', 'B.member')" correctly`, () => {
        const result: protos.common.SignaturePolicyEnvelope = policy.buildPolicy(`OutOf(1, 'A.member', 'B.member')`);

        const principals: protos.common.MSPPrincipal[] = [];
        principals.push(principalMemberA);
        principals.push(principalMemberB);

        const nOutOf: protos.common.SignaturePolicy.NOutOf = new protos.common.SignaturePolicy.NOutOf();
        nOutOf.setN(1);

        const signaturePolicies: protos.common.SignaturePolicy[] = [];

        signaturePolicies.push(signedByA);
        signaturePolicies.push(signedByB);

        nOutOf.setRules(signaturePolicies);

        const nOf: protos.common.SignaturePolicy = new protos.common.SignaturePolicy();
        nOf.set('n_out_of', nOutOf);

        const envelope: protos.common.SignaturePolicyEnvelope = new protos.common.SignaturePolicyEnvelope();
        envelope.setVersion(0);
        envelope.setRule(nOf);
        envelope.setIdentities(principals);

        result.should.deep.equal(envelope);
    });

    it(`should parse "OutOf(2, 'A.member', 'B.member')" correctly`, () => {
        const result: protos.common.SignaturePolicyEnvelope = policy.buildPolicy(`OutOf(2, 'A.member', 'B.member')`);

        const principals: protos.common.MSPPrincipal[] = [];

        principals.push(principalMemberA);
        principals.push(principalMemberB);

        const nOutOf: protos.common.SignaturePolicy.NOutOf = new protos.common.SignaturePolicy.NOutOf();
        nOutOf.setN(2);

        const signaturePolicies: protos.common.SignaturePolicy[] = [];
        signaturePolicies.push(signedByA);
        signaturePolicies.push(signedByB);

        nOutOf.setRules(signaturePolicies);

        const nOf: protos.common.SignaturePolicy = new protos.common.SignaturePolicy();
        nOf.set('n_out_of', nOutOf);

        const envelope: protos.common.SignaturePolicyEnvelope = new protos.common.SignaturePolicyEnvelope();
        envelope.setVersion(0);
        envelope.setRule(nOf);
        envelope.setIdentities(principals);

        result.should.deep.equal(envelope);
    });

    it(`should parse "AND('A.member', 'B.member')" correctly`, () => {
        const result: protos.common.SignaturePolicyEnvelope = policy.buildPolicy(`AND('A.member', 'B.member')`);

        const principals: protos.common.MSPPrincipal[] = [];

        principals.push(principalMemberA);
        principals.push(principalMemberB);

        const nOutOf: protos.common.SignaturePolicy.NOutOf = new protos.common.SignaturePolicy.NOutOf();
        nOutOf.setN(2);

        const signaturePolicies: protos.common.SignaturePolicy[] = [];
        signaturePolicies.push(signedByA);
        signaturePolicies.push(signedByB);

        nOutOf.setRules(signaturePolicies);

        const nOf: protos.common.SignaturePolicy = new protos.common.SignaturePolicy();
        nOf.set('n_out_of', nOutOf);

        const envelope: protos.common.SignaturePolicyEnvelope = new protos.common.SignaturePolicyEnvelope();
        envelope.setVersion(0);
        envelope.setRule(nOf);
        envelope.setIdentities(principals);

        result.should.deep.equal(envelope);
    });

    it(`should parse "AND('A.client', 'B.peer')" correctly`, () => {
        const result: protos.common.SignaturePolicyEnvelope = policy.buildPolicy(`AND('A.client', 'B.peer')`);

        const principals: protos.common.MSPPrincipal[] = [];
        principals.push(principalClientA);
        principals.push(principalPeerB);

        const nOutOf: protos.common.SignaturePolicy.NOutOf = new protos.common.SignaturePolicy.NOutOf();
        nOutOf.setN(2);

        const signaturePolicies: protos.common.SignaturePolicy[] = [];
        signaturePolicies.push(signedByA);
        signaturePolicies.push(signedByB);

        nOutOf.setRules(signaturePolicies);

        const nOf: protos.common.SignaturePolicy = new protos.common.SignaturePolicy();
        nOf.set('n_out_of', nOutOf);

        const envelope: protos.common.SignaturePolicyEnvelope = new protos.common.SignaturePolicyEnvelope();
        envelope.setVersion(0);
        envelope.setRule(nOf);
        envelope.setIdentities(principals);

        result.should.deep.equal(envelope);
    });

    it(`should parse "OR('A.member', 'B.member')" correctly`, () => {
        const result: protos.common.SignaturePolicyEnvelope = policy.buildPolicy(`OR('A.member', 'B.member')`);

        const principals: protos.common.MSPPrincipal[] = [];
        principals.push(principalMemberA);
        principals.push(principalMemberB);

        const nOutOf: protos.common.SignaturePolicy.NOutOf = new protos.common.SignaturePolicy.NOutOf();
        nOutOf.setN(1);

        const signaturePolicies: protos.common.SignaturePolicy[] = [];
        signaturePolicies.push(signedByA);
        signaturePolicies.push(signedByB);

        nOutOf.setRules(signaturePolicies);

        const nOf: protos.common.SignaturePolicy = new protos.common.SignaturePolicy();
        nOf.set('n_out_of', nOutOf);

        const envelope: protos.common.SignaturePolicyEnvelope = new protos.common.SignaturePolicyEnvelope();
        envelope.setVersion(0);
        envelope.setRule(nOf);
        envelope.setIdentities(principals);

        result.should.deep.equal(envelope);
    });

    it(`should parse "OR('A.member', AND('B.member', 'C.member'))" correctly`, () => {
        const result: protos.common.SignaturePolicyEnvelope = policy.buildPolicy(`OR('A.member', AND('B.member', 'C.member'))`);

        const principals: protos.common.MSPPrincipal[] = [];
        principals.push(principalMemberA);
        principals.push(principalMemberB);
        principals.push(principalMemberC);

        const nOutOfAnd: protos.common.SignaturePolicy.NOutOf = new protos.common.SignaturePolicy.NOutOf();
        nOutOfAnd.setN(2);

        const signaturePoliciesAnd: protos.common.SignaturePolicy[] = [];
        signaturePoliciesAnd.push(signedByB);
        signaturePoliciesAnd.push(signedByC);

        nOutOfAnd.setRules(signaturePoliciesAnd);

        const nOfAnd: protos.common.SignaturePolicy = new protos.common.SignaturePolicy();
        nOfAnd.set('n_out_of', nOutOfAnd);

        const nOutOfOr: protos.common.SignaturePolicy.NOutOf = new protos.common.SignaturePolicy.NOutOf();
        nOutOfOr.setN(1);

        const signaturePoliciesOr: protos.common.SignaturePolicy[] = [];
        signaturePoliciesOr.push(signedByA);
        signaturePoliciesOr.push(nOfAnd);

        nOutOfOr.setRules(signaturePoliciesOr);

        const nOfOr: protos.common.SignaturePolicy = new protos.common.SignaturePolicy();
        nOfOr.set('n_out_of', nOutOfOr);

        const envelope: protos.common.SignaturePolicyEnvelope = new protos.common.SignaturePolicyEnvelope();
        envelope.setVersion(0);
        envelope.setRule(nOfOr);
        envelope.setIdentities(principals);

        result.should.deep.equal(envelope);
    });

    it(`should parse "AND(OR('A.member', 'B.member'), OR('B.member', 'C.member'))" correctly`, () => {
        const result: protos.common.SignaturePolicyEnvelope = policy.buildPolicy(`AND(OR('A.member', 'B.member'), OR('B.member', 'C.member'))`);

        const principals: protos.common.MSPPrincipal[] = [];
        principals.push(principalMemberA);
        principals.push(principalMemberB);
        principals.push(principalMemberC);

        const nOutOfFirstOr: protos.common.SignaturePolicy.NOutOf = new protos.common.SignaturePolicy.NOutOf();
        nOutOfFirstOr.setN(1);

        const signaturePoliciesFirstOr: protos.common.SignaturePolicy[] = [];
        signaturePoliciesFirstOr.push(signedByA);
        signaturePoliciesFirstOr.push(signedByB);

        nOutOfFirstOr.setRules(signaturePoliciesFirstOr);

        const nOfFirstOr: protos.common.SignaturePolicy = new protos.common.SignaturePolicy();
        nOfFirstOr.set('n_out_of', nOutOfFirstOr);

        const nOutOfSecondOr: protos.common.SignaturePolicy.NOutOf = new protos.common.SignaturePolicy.NOutOf();
        nOutOfSecondOr.setN(1);

        const signaturePoliciesSecondOr: protos.common.SignaturePolicy[] = [];
        signaturePoliciesSecondOr.push(signedByB);
        signaturePoliciesSecondOr.push(signedByC);

        nOutOfSecondOr.setRules(signaturePoliciesSecondOr);

        const nOfSecondOr: protos.common.SignaturePolicy = new protos.common.SignaturePolicy();
        nOfSecondOr.set('n_out_of', nOutOfSecondOr);

        const nOutOfAnd: protos.common.SignaturePolicy.NOutOf = new protos.common.SignaturePolicy.NOutOf();
        nOutOfAnd.setN(2);

        const signaturePoliciesAnd: protos.common.SignaturePolicy[] = [];
        signaturePoliciesAnd.push(nOfFirstOr);
        signaturePoliciesAnd.push(nOfSecondOr);

        nOutOfAnd.setRules(signaturePoliciesAnd);

        const nOfAnd: protos.common.SignaturePolicy = new protos.common.SignaturePolicy();
        nOfAnd.set('n_out_of', nOutOfAnd);

        const envelope: protos.common.SignaturePolicyEnvelope = new protos.common.SignaturePolicyEnvelope();
        envelope.setVersion(0);
        envelope.setRule(nOfAnd);
        envelope.setIdentities(principals);

        result.should.deep.equal(envelope);
    });

    it(`should parse "OR(AND('A.member', 'B.member'), OR('C.admin', 'D.member'))" correctly`, () => {
        const result: protos.common.SignaturePolicyEnvelope = policy.buildPolicy(`OR(AND('A.member', 'B.member'), OR('C.admin', 'D.member'))`);

        const principals: protos.common.MSPPrincipal[] = [];
        principals.push(principalMemberA);
        principals.push(principalMemberB);
        principals.push(principalAdminC);
        principals.push(principalMemberD);

        const nOutOfAnd: protos.common.SignaturePolicy.NOutOf = new protos.common.SignaturePolicy.NOutOf();
        nOutOfAnd.setN(2);

        const signaturePoliciesAnd: protos.common.SignaturePolicy[] = [];
        signaturePoliciesAnd.push(signedByA);
        signaturePoliciesAnd.push(signedByB);

        nOutOfAnd.setRules(signaturePoliciesAnd);

        const nOfAnd: protos.common.SignaturePolicy = new protos.common.SignaturePolicy();
        nOfAnd.set('n_out_of', nOutOfAnd);

        const nOutOfOr: protos.common.SignaturePolicy.NOutOf = new protos.common.SignaturePolicy.NOutOf();
        nOutOfOr.setN(1);

        const signaturePoliciesOr: protos.common.SignaturePolicy[] = [];
        signaturePoliciesOr.push(signedByC);
        signaturePoliciesOr.push(signedByD);

        nOutOfOr.setRules(signaturePoliciesOr);

        const nOfOr: protos.common.SignaturePolicy = new protos.common.SignaturePolicy();
        nOfOr.set('n_out_of', nOutOfOr);

        const nOutOfOuterOr: protos.common.SignaturePolicy.NOutOf = new protos.common.SignaturePolicy.NOutOf();
        nOutOfOuterOr.setN(1);

        const signaturePoliciesOuterOr: protos.common.SignaturePolicy[] = [];

        signaturePoliciesOuterOr.push(nOfAnd);
        signaturePoliciesOuterOr.push(nOfOr);

        nOutOfOuterOr.setRules(signaturePoliciesOuterOr);

        const nOfOuterOr: protos.common.SignaturePolicy = new protos.common.SignaturePolicy();
        nOfOuterOr.set('n_out_of', nOutOfOuterOr);

        const envelope: protos.common.SignaturePolicyEnvelope = new protos.common.SignaturePolicyEnvelope();
        envelope.setVersion(0);
        envelope.setRule(nOfOuterOr);
        envelope.setIdentities(principals);

        result.should.deep.equal(envelope);
    });

    it(`should parse "OR('MSP.member', 'MSP.WITH.DOTS.member', 'MSP-WITH-DASHES.member')" correctly`, () => {
        const result: protos.common.SignaturePolicyEnvelope = policy.buildPolicy(`OR('MSP.member', 'MSP.WITH.DOTS.member', 'MSP-WITH-DASHES.member')`);

        const principals: protos.common.MSPPrincipal[] = [];

        const principalMemberMSP: protos.common.MSPPrincipal = new protos.common.MSPPrincipal();
        principalMemberMSP.setPrincipalClassification(protos.common.MSPPrincipal.Classification.ROLE);
        const newRoleMemberMSP: protos.common.MSPRole = new protos.common.MSPRole();
        newRoleMemberMSP.setRole(protos.common.MSPRole.MSPRoleType.MEMBER);
        newRoleMemberMSP.setMspIdentifier('MSP');
        principalMemberMSP.setPrincipal(newRoleMemberMSP.toBuffer());

        principals.push(principalMemberMSP);

        const principalMemberMSPWithDots: protos.common.MSPPrincipal = new protos.common.MSPPrincipal();
        principalMemberMSPWithDots.setPrincipalClassification(protos.common.MSPPrincipal.Classification.ROLE);
        const newRoleMemberMSPWithDots: protos.common.MSPRole = new protos.common.MSPRole();
        newRoleMemberMSPWithDots.setRole(protos.common.MSPRole.MSPRoleType.MEMBER);
        newRoleMemberMSPWithDots.setMspIdentifier('MSP.WITH.DOTS');
        principalMemberMSPWithDots.setPrincipal(newRoleMemberMSPWithDots.toBuffer());

        principals.push(principalMemberMSPWithDots);

        const principalMemberMSPWithDashes: protos.common.MSPPrincipal = new protos.common.MSPPrincipal();
        principalMemberMSPWithDashes.setPrincipalClassification(protos.common.MSPPrincipal.Classification.ROLE);
        const newRoleMemberMSPWithDashes: protos.common.MSPRole = new protos.common.MSPRole();
        newRoleMemberMSPWithDashes.setRole(protos.common.MSPRole.MSPRoleType.MEMBER);
        newRoleMemberMSPWithDashes.setMspIdentifier('MSP-WITH-DASHES');
        principalMemberMSPWithDashes.setPrincipal(newRoleMemberMSPWithDashes.toBuffer());

        principals.push(principalMemberMSPWithDashes);

        const nOutOf: protos.common.SignaturePolicy.NOutOf = new protos.common.SignaturePolicy.NOutOf();
        nOutOf.setN(1);

        const signaturePolicies: protos.common.SignaturePolicy[] = [];

        const signedByMSP: protos.common.SignaturePolicy = new protos.common.SignaturePolicy();
        signedByMSP.set('signed_by', 0);

        const signedByMSPWithDots: protos.common.SignaturePolicy = new protos.common.SignaturePolicy();
        signedByMSPWithDots.set('signed_by', 1);

        const signedByMSPWithDashes: protos.common.SignaturePolicy = new protos.common.SignaturePolicy();
        signedByMSPWithDashes.set('signed_by', 2);

        signaturePolicies.push(signedByMSP);
        signaturePolicies.push(signedByMSPWithDots);
        signaturePolicies.push(signedByMSPWithDashes);

        nOutOf.setRules(signaturePolicies);

        const nOf: protos.common.SignaturePolicy = new protos.common.SignaturePolicy();
        nOf.set('n_out_of', nOutOf);

        const envelope: protos.common.SignaturePolicyEnvelope = new protos.common.SignaturePolicyEnvelope();
        envelope.setVersion(0);
        envelope.setRule(nOf);
        envelope.setIdentities(principals);

        result.should.deep.equal(envelope);
    });

    it(`should parse "OR('A.peer', 'B.admin', 'C.orderer', 'D.client')" correctly`, () => {
        const result: protos.common.SignaturePolicyEnvelope = policy.buildPolicy(`OR('A.peer', 'B.admin', 'C.orderer', 'D.client')`);

        const principals: protos.common.MSPPrincipal[] = [];
        principals.push(principalPeerA);
        principals.push(principalAdminB);
        principals.push(principalOrdererC);
        principals.push(principalClientD);

        const nOutOf: protos.common.SignaturePolicy.NOutOf = new protos.common.SignaturePolicy.NOutOf();
        nOutOf.setN(1);

        const signaturePolicies: protos.common.SignaturePolicy[] = [];
        signaturePolicies.push(signedByA);
        signaturePolicies.push(signedByB);
        signaturePolicies.push(signedByC);
        signaturePolicies.push(signedByD);

        nOutOf.setRules(signaturePolicies);

        const nOf: protos.common.SignaturePolicy = new protos.common.SignaturePolicy();
        nOf.set('n_out_of', nOutOf);

        const envelope: protos.common.SignaturePolicyEnvelope = new protos.common.SignaturePolicyEnvelope();
        envelope.setVersion(0);
        envelope.setRule(nOf);
        envelope.setIdentities(principals);

        result.should.deep.equal(envelope);
    });

    it(`should parse "OutOf('1', 'A.member', 'B.member')" correctly`, () => {
        const result: protos.common.SignaturePolicyEnvelope = policy.buildPolicy(`OutOf('1', 'A.member', 'B.member')`);

        const principals: protos.common.MSPPrincipal[] = [];
        principals.push(principalMemberA);
        principals.push(principalMemberB);

        const nOutOf: protos.common.SignaturePolicy.NOutOf = new protos.common.SignaturePolicy.NOutOf();
        nOutOf.setN(1);

        const signaturePolicies: protos.common.SignaturePolicy[] = [];

        signaturePolicies.push(signedByA);
        signaturePolicies.push(signedByB);

        nOutOf.setRules(signaturePolicies);

        const nOf: protos.common.SignaturePolicy = new protos.common.SignaturePolicy();
        nOf.set('n_out_of', nOutOf);

        const envelope: protos.common.SignaturePolicyEnvelope = new protos.common.SignaturePolicyEnvelope();
        envelope.setVersion(0);
        envelope.setRule(nOf);
        envelope.setIdentities(principals);

        result.should.deep.equal(envelope);
    });

    it('should error if no mspid', () => {
        (() => policy.buildPolicy(`OR('A.member', Bmember)`)).should.throw(`Expected "'", "AND", "OR", or "OutOf" but "B" found`);
    });

    it('should error if empty policy', () => {
        (() => policy.buildPolicy(``)).should.throw('Expected "AND", "OR", or "OutOf" but end of input found');
    });

    it('should error if not enough args for out of', () => {
        (() => policy.buildPolicy(`OutOf(1)`)).should.throw('Expected "," but ")" found');
    });

    it('should error if second arg is not a string for out of', () => {
        (() => policy.buildPolicy(`OutOf(1, 2)`)).should.throw(`Expected "'", "AND", "OR", or "OutOf" but "2" found`);
    });

    it('should error if second arg is not a expression for out of', () => {
        (() => policy.buildPolicy(`OutOf(1, true)`)).should.throw(`Expected "'", "AND", "OR", or "OutOf" but "t" found`);
    });

    it('should error if bad value for count for out of', () => {
        (() => policy.buildPolicy(`OutOf(-1, 'A.member', 'B.member')`)).should.throw('Expected integer but "-" found');
    });

    it(`should parse "OutOf(0, 'A.member', 'B.member')" correctly`, () => {
        const result: protos.common.SignaturePolicyEnvelope = policy.buildPolicy(`OutOf(0, 'A.member', 'B.member')`);

        const principals: protos.common.MSPPrincipal[] = [];
        principals.push(principalMemberA);
        principals.push(principalMemberB);

        const nOutOf: protos.common.SignaturePolicy.NOutOf = new protos.common.SignaturePolicy.NOutOf();
        nOutOf.setN(0);

        const signaturePolicies: protos.common.SignaturePolicy[] = [];

        signaturePolicies.push(signedByA);
        signaturePolicies.push(signedByB);

        nOutOf.setRules(signaturePolicies);

        const nOf: protos.common.SignaturePolicy = new protos.common.SignaturePolicy();
        nOf.set('n_out_of', nOutOf);

        const envelope: protos.common.SignaturePolicyEnvelope = new protos.common.SignaturePolicyEnvelope();
        envelope.setVersion(0);
        envelope.setRule(nOf);
        envelope.setIdentities(principals);

        result.should.deep.equal(envelope);
    });

    it('should parse "OutOf(3, \'A.member\', \'B.member\')" correctly', () => {
        const result: protos.common.SignaturePolicyEnvelope = policy.buildPolicy(`OutOf(3, 'A.member', 'B.member')`);

        const principals: protos.common.MSPPrincipal[] = [];
        principals.push(principalMemberA);
        principals.push(principalMemberB);

        const nOutOf: protos.common.SignaturePolicy.NOutOf = new protos.common.SignaturePolicy.NOutOf();
        nOutOf.setN(3);

        const signaturePolicies: protos.common.SignaturePolicy[] = [];

        signaturePolicies.push(signedByA);
        signaturePolicies.push(signedByB);

        nOutOf.setRules(signaturePolicies);

        const nOf: protos.common.SignaturePolicy = new protos.common.SignaturePolicy();
        nOf.set('n_out_of', nOutOf);

        const envelope: protos.common.SignaturePolicyEnvelope = new protos.common.SignaturePolicyEnvelope();
        envelope.setVersion(0);
        envelope.setRule(nOf);
        envelope.setIdentities(principals);

        result.should.deep.equal(envelope);
    });

    it('should error count for out of is > n+1', () => {
        (() => policy.buildPolicy(`OutOf(4, 'A.member', 'B.member')`)).should.throw(`Expected OutOf count is too large but "OutOf(4, 'A.member', 'B.member')" found`);
    });
});
