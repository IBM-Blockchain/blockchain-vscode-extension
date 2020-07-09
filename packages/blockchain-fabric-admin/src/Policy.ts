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

import { Utils } from 'fabric-common';
import * as protos from 'fabric-protos';
import { parse } from './pegjs/policyParser';


const logger: any = Utils.getLogger('Policy');

interface Identity {
    mspid: string;
    role: string;
}

/**
 *  * Governs the constructions of endorsement policies to be passed into the calls to approve and commit smart contracts
 */
export class EndorsementPolicy {

    static AND: string = 'AND';
    static OR: string = 'OR';
    // @ts-ignore
    static OUT_OF: string = 'OutOf';

    private static MEMBER: string = 'member';
    private static ADMIN: string = 'admin';
    // @ts-ignore
    private static CLIENT: string = 'client';
    private static PEER: string = 'peer';
    private static ORDERER: string = 'orderer';

    private identityArray: Identity[] = [];

    /**
     * Create the policy proto
     * @param policy string the policy string
     * @returns protos.common.SignaturePolicyEnvelope The proto of the policy
     */
    public buildPolicy(policy: string): protos.common.SignaturePolicyEnvelope {
        logger.debug('Building policy');

        const envelope: protos.common.SignaturePolicyEnvelope = new protos.common.SignaturePolicyEnvelope();

        envelope.version = 0;

        const parsedPolicy: any = this.parsePolicyString(policy);
        const actualPolicy: protos.common.SignaturePolicy = this.parsePolicy(parsedPolicy);
        envelope.rule = actualPolicy;

        const principals: protos.common.MSPPrincipal[] = [];

        for (const identity of this.identityArray) {
            const principal: protos.common.MSPPrincipal = this.buildPrincipal(identity);
            principals.push(principal);
        }

        envelope.identities = principals;

        return envelope;
    }

    private parsePolicyString(policy: string): any {
        return parse(policy);
    }

    private findIdentityIndex(identity: Identity): number {
        return this.identityArray.findIndex((otherIdentity) => {
            return otherIdentity.mspid === identity.mspid && otherIdentity.role === identity.role;
        });
    }

    private parsePolicy(spec: any): protos.common.SignaturePolicy {
        const type: string = spec.op;
        const args: any[] = spec.args;

        const nOutOf: protos.common.SignaturePolicy.NOutOf = new protos.common.SignaturePolicy.NOutOf();

        if (type === EndorsementPolicy.OR) {
            nOutOf.n = 1;
        } else if (type === EndorsementPolicy.AND) {
            nOutOf.n = args.length;
        } else {
            nOutOf.n = spec.count;
        }

        const signaturePolicies: protos.common.SignaturePolicy[] = [];
        for (const arg of args) {
            if (arg.op) {
                const subPolicy: protos.common.SignaturePolicy = this.parsePolicy(arg);
                signaturePolicies.push(subPolicy);
            } else {
                let index: number = this.findIdentityIndex(arg);

                if (index === -1) {
                    this.identityArray.push(arg);
                    index = this.identityArray.length - 1;
                }

                const signedBy: protos.common.SignaturePolicy = new protos.common.SignaturePolicy();
                signedBy.signed_by = index;
                signaturePolicies.push(signedBy);
            }
        }

        nOutOf.rules = signaturePolicies;

        const nOf: protos.common.SignaturePolicy = new protos.common.SignaturePolicy();
        nOf.n_out_of = nOutOf;

        return nOf;
    }

    private buildPrincipal(identity: Identity): protos.common.MSPPrincipal {

        const newPrincipal: protos.common.MSPPrincipal = new protos.common.MSPPrincipal();

        newPrincipal.principal_classification = protos.common.MSPPrincipal.Classification.ROLE;

        const newRoleArgs: protos.common.IMSPRole = {};
        const roleName: string = identity.role;
        if (roleName === EndorsementPolicy.PEER) {
            newRoleArgs.role = protos.common.MSPRole.MSPRoleType.PEER;
        } else if (roleName === EndorsementPolicy.MEMBER) {
            newRoleArgs.role = protos.common.MSPRole.MSPRoleType.MEMBER;
        } else if (roleName === EndorsementPolicy.ADMIN) {
            newRoleArgs.role = protos.common.MSPRole.MSPRoleType.ADMIN;
        } else if (roleName === EndorsementPolicy.ORDERER) {
            newRoleArgs.role = protos.common.MSPRole.MSPRoleType.ORDERER;
        } else {
            newRoleArgs.role = protos.common.MSPRole.MSPRoleType.CLIENT;
        }

        const mspid: string = identity.mspid;

        newRoleArgs.msp_identifier = mspid;

        const newRole: Uint8Array = protos.common.MSPRole.encode(newRoleArgs).finish();

        newPrincipal.principal = newRole;

        return newPrincipal;
    }
}
