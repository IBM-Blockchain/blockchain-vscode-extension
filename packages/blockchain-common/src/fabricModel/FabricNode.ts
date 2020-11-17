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

export enum FabricNodeType {
    PEER = 'fabric-peer',
    CERTIFICATE_AUTHORITY = 'fabric-ca',
    ORDERER = 'fabric-orderer',
    COUCHDB = 'couchdb'
}

// This is a JSON representation of a Fabric node.
// tslint:disable variable-name
export class FabricNode {

    public static newPeer(short_name: string, name: string, api_url: string, wallet: string, identity: string, msp_id: string, hidden: boolean = false): FabricNode {
        return new FabricNode({ short_name, name, type: FabricNodeType.PEER, api_url, wallet, identity, msp_id, hidden });
    }

    public static newSecurePeer(short_name: string, name: string, api_url: string, pem: string, wallet: string, identity: string, msp_id: string, hidden: boolean = false): FabricNode {
        return new FabricNode({ short_name, name, type: FabricNodeType.PEER, api_url, pem, wallet, identity, msp_id, hidden });
    }

    public static newOrderer(short_name: string, name: string, api_url: string, wallet: string, identity: string, msp_id: string, cluster_name: string, hidden: boolean = false): FabricNode {
        return new FabricNode({ short_name, name, type: FabricNodeType.ORDERER, api_url, wallet, identity, msp_id, cluster_name, hidden });
    }

    public static newSecureOrderer(short_name: string, name: string, api_url: string, pem: string, wallet: string, identity: string, msp_id: string, cluster_name: string, hidden: boolean = false): FabricNode {
        return new FabricNode({ short_name, name, type: FabricNodeType.ORDERER, api_url, pem, wallet, identity, msp_id, cluster_name, hidden });
    }

    public static newCouchDB(short_name: string, name: string, api_url: string, hidden: boolean = false): FabricNode {
        return new FabricNode({ short_name, name, type: FabricNodeType.COUCHDB, api_url, hidden });
    }

    public static newCertificateAuthority(short_name: string, name: string, api_url: string, ca_name: string, wallet: string, identity: string, msp_id: string, enroll_id: string, enroll_secret: string, hidden: boolean = false): FabricNode {
        return new FabricNode({ short_name, name, type: FabricNodeType.CERTIFICATE_AUTHORITY, api_url, ca_name, wallet, identity, msp_id, enroll_id, enroll_secret, hidden });
    }

    public static newSecureCertificateAuthority(short_name: string, name: string, api_url: string, ca_name: string, pem: string, wallet: string, identity: string, msp_id: string, enroll_id: string, enroll_secret: string, hidden: boolean = false): FabricNode {
        return new FabricNode({ short_name, name, type: FabricNodeType.CERTIFICATE_AUTHORITY, api_url, ca_name, pem, wallet, identity, msp_id, enroll_id, enroll_secret, hidden });
    }

    public static validateNode(node: FabricNode): void {
        if (!node.name) {
            throw new Error('A node should have a name property');
        } else if (!node.type) {
            throw new Error('A node should have a type property');
        } else if (!node.api_url) {
            throw new Error('A node should have a api_url property');
        }

        if (node.type === FabricNodeType.PEER || node.type === FabricNodeType.ORDERER) {
            if (!node.msp_id) {
                throw new Error(`A ${node.type} node should have a msp_id property`);
            }
        }

        if (node.type === FabricNodeType.CERTIFICATE_AUTHORITY) {
            if (!node.ca_name) {
                throw new Error(`A ${node.type} node should have a ca_name property`);
            }
        }
    }

    public static pruneNode(data: any): FabricNode {
        const hidden: boolean = data.hidden === undefined ? false : data.hidden;
        const node: FabricNode = new FabricNode({short_name: data.short_name, name: data.name, type: data.type, api_url: data.api_url, hidden: hidden});

        if (data.msp_id) {
            node.msp_id = data.msp_id;
        }

        if (data.ca_name) {
            node.ca_name = data.ca_name;
        }

        if (data.pem) {
            node.pem = data.pem;
        }

        if (data.ssl_target_name_override) {
            node.ssl_target_name_override = data.ssl_target_name_override;
        }

        if (data.cluster_name) {
            node.cluster_name = data.cluster_name;
        }

        return node;
    }

    public short_name: string;
    public name?: string;
    public display_name?: string;
    public type: FabricNodeType;
    public api_url: string;
    public api_options?: object;
    public ca_name?: string;
    public pem?: string;
    public tls_cert?: string;
    public tls_ca_root_cert?: string;
    public tls_ca_root_certs?: string[];
    public ssl_target_name_override?: string;
    public wallet?: string;
    public identity?: string;
    public msp_id?: string;
    public container_name?: string;
    public chaincode_url?: string;
    public chaincode_options?: object;
    public enroll_secret?: string;
    public enroll_id?: string;
    public cluster_name?: string;
    public hidden: boolean;

    private constructor(fields: FabricNode) {
        Object.assign(this, fields);
    }
}
