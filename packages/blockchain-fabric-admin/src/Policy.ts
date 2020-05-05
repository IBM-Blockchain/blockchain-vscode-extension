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

import {Utils} from 'fabric-common';
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

        envelope.setVersion(0);

        const parsedPolicy: any = this.parsePolicyString(policy);
        const actualPolicy: protos.common.SignaturePolicy = this.parsePolicy(parsedPolicy);
        envelope.setRule(actualPolicy);

        const principals: protos.common.MSPPrincipal[] = [];

        for (const identity of this.identityArray) {
            const principal: protos.common.MSPPrincipal = this.buildPrincipal(identity);
            principals.push(principal);
        }

        envelope.setIdentities(principals);

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
            nOutOf.setN(1);
        } else if (type === EndorsementPolicy.AND) {
            nOutOf.setN(args.length);
        } else {
            nOutOf.setN(spec.count);
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
                signedBy.set('signed_by', index);
                signaturePolicies.push(signedBy);
            }
        }

        nOutOf.setRules(signaturePolicies);

        const nOf: protos.common.SignaturePolicy = new protos.common.SignaturePolicy();
        nOf.set('n_out_of', nOutOf);

        return nOf;
    }

    private buildPrincipal(identity: Identity): protos.common.MSPPrincipal {
        const newPrincipal: protos.common.MSPPrincipal = new protos.common.MSPPrincipal();

        newPrincipal.setPrincipalClassification(protos.common.MSPPrincipal.Classification.ROLE);
        const newRole: protos.common.MSPRole = new protos.common.MSPRole();
        const roleName: string = identity.role;
        if (roleName === EndorsementPolicy.PEER) {
            newRole.setRole(protos.common.MSPRole.MSPRoleType.PEER);
        } else if (roleName === EndorsementPolicy.MEMBER) {
            newRole.setRole(protos.common.MSPRole.MSPRoleType.MEMBER);
        } else if (roleName === EndorsementPolicy.ADMIN) {
            newRole.setRole(protos.common.MSPRole.MSPRoleType.ADMIN);
        } else if (roleName === EndorsementPolicy.ORDERER) {
            newRole.setRole(protos.common.MSPRole.MSPRoleType.ORDERER);
        } else {
            newRole.setRole(protos.common.MSPRole.MSPRoleType.CLIENT);
        }

        const mspid: string = identity.mspid;

        newRole.setMspIdentifier(mspid);

        newPrincipal.setPrincipal(newRole.toBuffer());

        return newPrincipal;
    }
}
