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
import { EndorsementPolicy } from '../src/Policy';

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
        principalMemberA.principal_classification = protos.common.MSPPrincipal.Classification.ROLE;

        const newRoleMemberA: protos.common.IMSPRole = {};
        newRoleMemberA.role = protos.common.MSPRole.MSPRoleType.MEMBER;
        newRoleMemberA.msp_identifier = 'A';

        principalMemberA.principal = protos.common.MSPRole.encode(newRoleMemberA).finish();

        principalMemberB = new protos.common.MSPPrincipal();
        principalMemberB.principal_classification = protos.common.MSPPrincipal.Classification.ROLE;
        const newRoleMemberB: protos.common.IMSPRole = {};
        newRoleMemberB.role = protos.common.MSPRole.MSPRoleType.MEMBER;
        newRoleMemberB.msp_identifier = 'B';
        principalMemberB.principal = protos.common.MSPRole.encode(newRoleMemberB).finish();

        principalMemberC = new protos.common.MSPPrincipal();
        principalMemberC.principal_classification = protos.common.MSPPrincipal.Classification.ROLE;
        const newRoleMemberC: protos.common.IMSPRole = {};
        newRoleMemberC.role = protos.common.MSPRole.MSPRoleType.MEMBER;
        newRoleMemberC.msp_identifier = 'C';
        principalMemberC.principal = protos.common.MSPRole.encode(newRoleMemberC).finish();

        principalMemberD = new protos.common.MSPPrincipal();
        principalMemberD.principal_classification = protos.common.MSPPrincipal.Classification.ROLE;
        const newRoleMemberD: protos.common.IMSPRole = {};
        newRoleMemberD.role = protos.common.MSPRole.MSPRoleType.MEMBER;
        newRoleMemberD.msp_identifier = 'D';
        principalMemberD.principal = protos.common.MSPRole.encode(newRoleMemberD).finish();

        principalClientA = new protos.common.MSPPrincipal();
        principalClientA.principal_classification = protos.common.MSPPrincipal.Classification.ROLE;
        const newRoleClientA: protos.common.IMSPRole = {};
        newRoleClientA.role = protos.common.MSPRole.MSPRoleType.CLIENT;
        newRoleClientA.msp_identifier = 'A';
        principalClientA.principal = protos.common.MSPRole.encode(newRoleClientA).finish();

        principalPeerA = new protos.common.MSPPrincipal();
        principalPeerA.principal_classification = protos.common.MSPPrincipal.Classification.ROLE;
        const newRolePeerA: protos.common.IMSPRole = {};
        newRolePeerA.role = protos.common.MSPRole.MSPRoleType.PEER;
        newRolePeerA.msp_identifier = 'A';
        principalPeerA.principal = protos.common.MSPRole.encode(newRolePeerA).finish();

        principalPeerB = new protos.common.MSPPrincipal();
        principalPeerB.principal_classification = protos.common.MSPPrincipal.Classification.ROLE;
        const newRolePeerB: protos.common.IMSPRole = {};
        newRolePeerB.role = protos.common.MSPRole.MSPRoleType.PEER;
        newRolePeerB.msp_identifier = 'B';
        principalPeerB.principal = protos.common.MSPRole.encode(newRolePeerB).finish();

        principalAdminB = new protos.common.MSPPrincipal();
        principalAdminB.principal_classification = protos.common.MSPPrincipal.Classification.ROLE;
        const newRoleAdminB: protos.common.IMSPRole = {};
        newRoleAdminB.role = protos.common.MSPRole.MSPRoleType.ADMIN;
        newRoleAdminB.msp_identifier = 'B';
        principalAdminB.principal = protos.common.MSPRole.encode(newRoleAdminB).finish();

        principalAdminC = new protos.common.MSPPrincipal();
        principalAdminC.principal_classification = protos.common.MSPPrincipal.Classification.ROLE;
        const newRoleAdminC: protos.common.IMSPRole = {};
        newRoleAdminC.role = protos.common.MSPRole.MSPRoleType.ADMIN;
        newRoleAdminC.msp_identifier = 'C';
        principalAdminC.principal = protos.common.MSPRole.encode(newRoleAdminC).finish();

        principalOrdererC = new protos.common.MSPPrincipal();
        principalOrdererC.principal_classification = protos.common.MSPPrincipal.Classification.ROLE;
        const newRoleOrdererC: protos.common.IMSPRole = {};
        newRoleOrdererC.role = protos.common.MSPRole.MSPRoleType.ORDERER;
        newRoleOrdererC.msp_identifier = 'C';
        principalOrdererC.principal = protos.common.MSPRole.encode(newRoleOrdererC).finish();

        principalClientD = new protos.common.MSPPrincipal();
        principalClientD.principal_classification = protos.common.MSPPrincipal.Classification.ROLE;
        const newRoleClientD: protos.common.IMSPRole = {};
        newRoleClientD.role = protos.common.MSPRole.MSPRoleType.CLIENT;
        newRoleClientD.msp_identifier = 'D';
        principalClientD.principal = protos.common.MSPRole.encode(newRoleClientD).finish();

        signedByA = new protos.common.SignaturePolicy();
        signedByA.signed_by = 0;

        signedByB = new protos.common.SignaturePolicy();
        signedByB.signed_by = 1;

        signedByC = new protos.common.SignaturePolicy();
        signedByC.signed_by = 2;

        signedByD = new protos.common.SignaturePolicy();
        signedByD.signed_by = 3;
    });

    it(`should parse "OutOf(1, 'A.member', 'B.member')" correctly`, () => {
        const result: protos.common.SignaturePolicyEnvelope = policy.buildPolicy(`OutOf(1, 'A.member', 'B.member')`);

        const principals: protos.common.MSPPrincipal[] = [];
        principals.push(principalMemberA);
        principals.push(principalMemberB);

        const nOutOf: protos.common.SignaturePolicy.NOutOf = new protos.common.SignaturePolicy.NOutOf();
        nOutOf.n = 1;

        const signaturePolicies: protos.common.SignaturePolicy[] = [];

        signaturePolicies.push(signedByA);
        signaturePolicies.push(signedByB);

        nOutOf.rules = signaturePolicies;

        const nOf: protos.common.SignaturePolicy = new protos.common.SignaturePolicy();
        nOf.n_out_of = nOutOf;

        const envelope: protos.common.SignaturePolicyEnvelope = new protos.common.SignaturePolicyEnvelope();
        envelope.version = 0;
        envelope.rule = nOf;
        envelope.identities = principals;

        result.should.deep.equal(envelope);
    });

    it(`should parse "OutOf(2, 'A.member', 'B.member')" correctly`, () => {
        const result: protos.common.SignaturePolicyEnvelope = policy.buildPolicy(`OutOf(2, 'A.member', 'B.member')`);

        const principals: protos.common.MSPPrincipal[] = [];

        principals.push(principalMemberA);
        principals.push(principalMemberB);

        const nOutOf: protos.common.SignaturePolicy.NOutOf = new protos.common.SignaturePolicy.NOutOf();
        nOutOf.n = 2;

        const signaturePolicies: protos.common.SignaturePolicy[] = [];
        signaturePolicies.push(signedByA);
        signaturePolicies.push(signedByB);

        nOutOf.rules = signaturePolicies;

        const nOf: protos.common.SignaturePolicy = new protos.common.SignaturePolicy();
        nOf.n_out_of = nOutOf;

        const envelope: protos.common.SignaturePolicyEnvelope = new protos.common.SignaturePolicyEnvelope();
        envelope.version = 0;
        envelope.rule = nOf;
        envelope.identities = principals;

        result.should.deep.equal(envelope);
    });

    it(`should parse "AND('A.member', 'B.member')" correctly`, () => {
        const result: protos.common.SignaturePolicyEnvelope = policy.buildPolicy(`AND('A.member', 'B.member')`);

        const principals: protos.common.MSPPrincipal[] = [];

        principals.push(principalMemberA);
        principals.push(principalMemberB);

        const nOutOf: protos.common.SignaturePolicy.NOutOf = new protos.common.SignaturePolicy.NOutOf();
        nOutOf.n = 2;

        const signaturePolicies: protos.common.SignaturePolicy[] = [];
        signaturePolicies.push(signedByA);
        signaturePolicies.push(signedByB);

        nOutOf.rules = signaturePolicies;

        const nOf: protos.common.SignaturePolicy = new protos.common.SignaturePolicy();
        nOf.n_out_of = nOutOf;

        const envelope: protos.common.SignaturePolicyEnvelope = new protos.common.SignaturePolicyEnvelope();
        envelope.version = 0;
        envelope.rule = nOf;
        envelope.identities = principals;

        result.should.deep.equal(envelope);
    });

    it(`should parse "AND('A.client', 'B.peer')" correctly`, () => {
        const result: protos.common.SignaturePolicyEnvelope = policy.buildPolicy(`AND('A.client', 'B.peer')`);

        const principals: protos.common.MSPPrincipal[] = [];
        principals.push(principalClientA);
        principals.push(principalPeerB);

        const nOutOf: protos.common.SignaturePolicy.NOutOf = new protos.common.SignaturePolicy.NOutOf();
        nOutOf.n = 2;

        const signaturePolicies: protos.common.SignaturePolicy[] = [];
        signaturePolicies.push(signedByA);
        signaturePolicies.push(signedByB);

        nOutOf.rules = signaturePolicies;

        const nOf: protos.common.SignaturePolicy = new protos.common.SignaturePolicy();
        nOf.n_out_of = nOutOf;

        const envelope: protos.common.SignaturePolicyEnvelope = new protos.common.SignaturePolicyEnvelope();
        envelope.version = 0;
        envelope.rule = nOf;
        envelope.identities = principals;

        result.should.deep.equal(envelope);
    });

    it(`should parse "OR('A.member', 'B.member')" correctly`, () => {
        const result: protos.common.SignaturePolicyEnvelope = policy.buildPolicy(`OR('A.member', 'B.member')`);

        const principals: protos.common.MSPPrincipal[] = [];
        principals.push(principalMemberA);
        principals.push(principalMemberB);

        const nOutOf: protos.common.SignaturePolicy.NOutOf = new protos.common.SignaturePolicy.NOutOf();
        nOutOf.n = 1;

        const signaturePolicies: protos.common.SignaturePolicy[] = [];
        signaturePolicies.push(signedByA);
        signaturePolicies.push(signedByB);

        nOutOf.rules = signaturePolicies;

        const nOf: protos.common.SignaturePolicy = new protos.common.SignaturePolicy();
        nOf.n_out_of = nOutOf;

        const envelope: protos.common.SignaturePolicyEnvelope = new protos.common.SignaturePolicyEnvelope();
        envelope.version = 0;
        envelope.rule = nOf;
        envelope.identities = principals;

        result.should.deep.equal(envelope);
    });

    it(`should parse "OR('A.member', AND('B.member', 'C.member'))" correctly`, () => {
        const result: protos.common.SignaturePolicyEnvelope = policy.buildPolicy(`OR('A.member', AND('B.member', 'C.member'))`);

        const principals: protos.common.MSPPrincipal[] = [];
        principals.push(principalMemberA);
        principals.push(principalMemberB);
        principals.push(principalMemberC);

        const nOutOfAnd: protos.common.SignaturePolicy.NOutOf = new protos.common.SignaturePolicy.NOutOf();
        nOutOfAnd.n = 2;

        const signaturePoliciesAnd: protos.common.SignaturePolicy[] = [];
        signaturePoliciesAnd.push(signedByB);
        signaturePoliciesAnd.push(signedByC);

        nOutOfAnd.rules = signaturePoliciesAnd;

        const nOfAnd: protos.common.SignaturePolicy = new protos.common.SignaturePolicy();
        nOfAnd.n_out_of = nOutOfAnd;

        const nOutOfOr: protos.common.SignaturePolicy.NOutOf = new protos.common.SignaturePolicy.NOutOf();
        nOutOfOr.n = 1;

        const signaturePoliciesOr: protos.common.SignaturePolicy[] = [];
        signaturePoliciesOr.push(signedByA);
        signaturePoliciesOr.push(nOfAnd);

        nOutOfOr.rules = signaturePoliciesOr;

        const nOfOr: protos.common.SignaturePolicy = new protos.common.SignaturePolicy();
        nOfOr.n_out_of = nOutOfOr;

        const envelope: protos.common.SignaturePolicyEnvelope = new protos.common.SignaturePolicyEnvelope();
        envelope.version = 0;
        envelope.rule = nOfOr;
        envelope.identities = principals;

        result.should.deep.equal(envelope);
    });

    it(`should parse "AND(OR('A.member', 'B.member'), OR('B.member', 'C.member'))" correctly`, () => {
        const result: protos.common.SignaturePolicyEnvelope = policy.buildPolicy(`AND(OR('A.member', 'B.member'), OR('B.member', 'C.member'))`);

        const principals: protos.common.MSPPrincipal[] = [];
        principals.push(principalMemberA);
        principals.push(principalMemberB);
        principals.push(principalMemberC);

        const nOutOfFirstOr: protos.common.SignaturePolicy.NOutOf = new protos.common.SignaturePolicy.NOutOf();
        nOutOfFirstOr.n = 1;

        const signaturePoliciesFirstOr: protos.common.SignaturePolicy[] = [];
        signaturePoliciesFirstOr.push(signedByA);
        signaturePoliciesFirstOr.push(signedByB);

        nOutOfFirstOr.rules = signaturePoliciesFirstOr;

        const nOfFirstOr: protos.common.SignaturePolicy = new protos.common.SignaturePolicy();
        nOfFirstOr.n_out_of = nOutOfFirstOr;

        const nOutOfSecondOr: protos.common.SignaturePolicy.NOutOf = new protos.common.SignaturePolicy.NOutOf();
        nOutOfSecondOr.n = 1;

        const signaturePoliciesSecondOr: protos.common.SignaturePolicy[] = [];
        signaturePoliciesSecondOr.push(signedByB);
        signaturePoliciesSecondOr.push(signedByC);

        nOutOfSecondOr.rules = signaturePoliciesSecondOr;

        const nOfSecondOr: protos.common.SignaturePolicy = new protos.common.SignaturePolicy();
        nOfSecondOr.n_out_of = nOutOfSecondOr;

        const nOutOfAnd: protos.common.SignaturePolicy.NOutOf = new protos.common.SignaturePolicy.NOutOf();
        nOutOfAnd.n = 2;

        const signaturePoliciesAnd: protos.common.SignaturePolicy[] = [];
        signaturePoliciesAnd.push(nOfFirstOr);
        signaturePoliciesAnd.push(nOfSecondOr);

        nOutOfAnd.rules = signaturePoliciesAnd;

        const nOfAnd: protos.common.SignaturePolicy = new protos.common.SignaturePolicy();
        nOfAnd.n_out_of = nOutOfAnd;

        const envelope: protos.common.SignaturePolicyEnvelope = new protos.common.SignaturePolicyEnvelope();
        envelope.version = 0;
        envelope.rule = nOfAnd;
        envelope.identities = principals;

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
        nOutOfAnd.n = 2;

        const signaturePoliciesAnd: protos.common.SignaturePolicy[] = [];
        signaturePoliciesAnd.push(signedByA);
        signaturePoliciesAnd.push(signedByB);

        nOutOfAnd.rules = signaturePoliciesAnd;

        const nOfAnd: protos.common.SignaturePolicy = new protos.common.SignaturePolicy();
        nOfAnd.n_out_of = nOutOfAnd;

        const nOutOfOr: protos.common.SignaturePolicy.NOutOf = new protos.common.SignaturePolicy.NOutOf();
        nOutOfOr.n = 1;

        const signaturePoliciesOr: protos.common.SignaturePolicy[] = [];
        signaturePoliciesOr.push(signedByC);
        signaturePoliciesOr.push(signedByD);

        nOutOfOr.rules = signaturePoliciesOr;

        const nOfOr: protos.common.SignaturePolicy = new protos.common.SignaturePolicy();
        nOfOr.n_out_of = nOutOfOr;

        const nOutOfOuterOr: protos.common.SignaturePolicy.NOutOf = new protos.common.SignaturePolicy.NOutOf();
        nOutOfOuterOr.n = 1;

        const signaturePoliciesOuterOr: protos.common.SignaturePolicy[] = [];

        signaturePoliciesOuterOr.push(nOfAnd);
        signaturePoliciesOuterOr.push(nOfOr);

        nOutOfOuterOr.rules = signaturePoliciesOuterOr;

        const nOfOuterOr: protos.common.SignaturePolicy = new protos.common.SignaturePolicy();
        nOfOuterOr.n_out_of = nOutOfOuterOr;

        const envelope: protos.common.SignaturePolicyEnvelope = new protos.common.SignaturePolicyEnvelope();
        envelope.version = 0;
        envelope.rule = nOfOuterOr;
        envelope.identities = principals;

        result.should.deep.equal(envelope);
    });

    it(`should parse "OR('MSP.member', 'MSP.WITH.DOTS.member', 'MSP-WITH-DASHES.member')" correctly`, () => {
        const result: protos.common.SignaturePolicyEnvelope = policy.buildPolicy(`OR('MSP.member', 'MSP.WITH.DOTS.member', 'MSP-WITH-DASHES.member')`);

        const principals: protos.common.MSPPrincipal[] = [];

        const principalMemberMSP: protos.common.MSPPrincipal = new protos.common.MSPPrincipal();
        principalMemberMSP.principal_classification = protos.common.MSPPrincipal.Classification.ROLE;

        const newRoleMemberMSP: protos.common.IMSPRole = {};
        newRoleMemberMSP.role = protos.common.MSPRole.MSPRoleType.MEMBER;
        newRoleMemberMSP.msp_identifier = 'MSP';
        principalMemberMSP.principal = protos.common.MSPRole.encode(newRoleMemberMSP).finish();

        principals.push(principalMemberMSP);

        const principalMemberMSPWithDots: protos.common.MSPPrincipal = new protos.common.MSPPrincipal();
        principalMemberMSPWithDots.principal_classification = protos.common.MSPPrincipal.Classification.ROLE;

        const newRoleMemberMSPWithDots: protos.common.IMSPRole = {};
        newRoleMemberMSPWithDots.role = protos.common.MSPRole.MSPRoleType.MEMBER;
        newRoleMemberMSPWithDots.msp_identifier = 'MSP.WITH.DOTS';

        principalMemberMSPWithDots.principal = protos.common.MSPRole.encode(newRoleMemberMSPWithDots).finish();
        principals.push(principalMemberMSPWithDots);

        const principalMemberMSPWithDashes: protos.common.MSPPrincipal = new protos.common.MSPPrincipal();
        principalMemberMSPWithDashes.principal_classification = protos.common.MSPPrincipal.Classification.ROLE;
        const newRoleMemberMSPWithDashes: protos.common.IMSPRole = {};
        newRoleMemberMSPWithDashes.role = protos.common.MSPRole.MSPRoleType.MEMBER;
        newRoleMemberMSPWithDashes.msp_identifier = 'MSP-WITH-DASHES';
        principalMemberMSPWithDashes.principal = protos.common.MSPRole.encode(newRoleMemberMSPWithDashes).finish();
        principals.push(principalMemberMSPWithDashes);

        const nOutOf: protos.common.SignaturePolicy.NOutOf = new protos.common.SignaturePolicy.NOutOf();
        nOutOf.n = 1;

        const signaturePolicies: protos.common.SignaturePolicy[] = [];

        const signedByMSP: protos.common.SignaturePolicy = new protos.common.SignaturePolicy();
        signedByMSP.signed_by = 0;

        const signedByMSPWithDots: protos.common.SignaturePolicy = new protos.common.SignaturePolicy();
        signedByMSPWithDots.signed_by = 1;

        const signedByMSPWithDashes: protos.common.SignaturePolicy = new protos.common.SignaturePolicy();
        signedByMSPWithDashes.signed_by = 2;

        signaturePolicies.push(signedByMSP);
        signaturePolicies.push(signedByMSPWithDots);
        signaturePolicies.push(signedByMSPWithDashes);

        nOutOf.rules = signaturePolicies;

        const nOf: protos.common.SignaturePolicy = new protos.common.SignaturePolicy();
        nOf.n_out_of = nOutOf;

        const envelope: protos.common.SignaturePolicyEnvelope = new protos.common.SignaturePolicyEnvelope();
        envelope.version = 0;
        envelope.rule = nOf;
        envelope.identities = principals;

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
        nOutOf.n = 1;

        const signaturePolicies: protos.common.SignaturePolicy[] = [];
        signaturePolicies.push(signedByA);
        signaturePolicies.push(signedByB);
        signaturePolicies.push(signedByC);
        signaturePolicies.push(signedByD);

        nOutOf.rules = signaturePolicies;

        const nOf: protos.common.SignaturePolicy = new protos.common.SignaturePolicy();
        nOf.n_out_of = nOutOf;

        const envelope: protos.common.SignaturePolicyEnvelope = new protos.common.SignaturePolicyEnvelope();
        envelope.version = 0;
        envelope.rule = nOf;
        envelope.identities = principals;

        result.should.deep.equal(envelope);
    });

    it(`should parse "OutOf('1', 'A.member', 'B.member')" correctly`, () => {
        const result: protos.common.SignaturePolicyEnvelope = policy.buildPolicy(`OutOf('1', 'A.member', 'B.member')`);

        const principals: protos.common.MSPPrincipal[] = [];
        principals.push(principalMemberA);
        principals.push(principalMemberB);

        const nOutOf: protos.common.SignaturePolicy.NOutOf = new protos.common.SignaturePolicy.NOutOf();
        nOutOf.n = 1;

        const signaturePolicies: protos.common.SignaturePolicy[] = [];

        signaturePolicies.push(signedByA);
        signaturePolicies.push(signedByB);

        nOutOf.rules = signaturePolicies;

        const nOf: protos.common.SignaturePolicy = new protos.common.SignaturePolicy();
        nOf.n_out_of = nOutOf;

        const envelope: protos.common.SignaturePolicyEnvelope = new protos.common.SignaturePolicyEnvelope();
        envelope.version = 0;
        envelope.rule = nOf;
        envelope.identities = principals;

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
        nOutOf.n = 0;

        const signaturePolicies: protos.common.SignaturePolicy[] = [];

        signaturePolicies.push(signedByA);
        signaturePolicies.push(signedByB);

        nOutOf.rules = signaturePolicies;

        const nOf: protos.common.SignaturePolicy = new protos.common.SignaturePolicy();
        nOf.n_out_of = nOutOf;

        const envelope: protos.common.SignaturePolicyEnvelope = new protos.common.SignaturePolicyEnvelope();
        envelope.version = 0;
        envelope.rule = nOf;
        envelope.identities = principals;

        result.should.deep.equal(envelope);
    });

    it('should parse "OutOf(3, \'A.member\', \'B.member\')" correctly', () => {
        const result: protos.common.SignaturePolicyEnvelope = policy.buildPolicy(`OutOf(3, 'A.member', 'B.member')`);

        const principals: protos.common.MSPPrincipal[] = [];
        principals.push(principalMemberA);
        principals.push(principalMemberB);

        const nOutOf: protos.common.SignaturePolicy.NOutOf = new protos.common.SignaturePolicy.NOutOf();
        nOutOf.n = 3;

        const signaturePolicies: protos.common.SignaturePolicy[] = [];

        signaturePolicies.push(signedByA);
        signaturePolicies.push(signedByB);

        nOutOf.rules = signaturePolicies;

        const nOf: protos.common.SignaturePolicy = new protos.common.SignaturePolicy();
        nOf.n_out_of = nOutOf;

        const envelope: protos.common.SignaturePolicyEnvelope = new protos.common.SignaturePolicyEnvelope();
        envelope.version = 0;
        envelope.rule = nOf;
        envelope.identities = principals;

        result.should.deep.equal(envelope);
    });

    it('should error count for out of is > n+1', () => {
        (() => policy.buildPolicy(`OutOf(4, 'A.member', 'B.member')`)).should.throw(`Expected OutOf count is too large but "OutOf(4, 'A.member', 'B.member')" found`);
    });
});
