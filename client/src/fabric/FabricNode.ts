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
    ORDERER = 'fabric-orderer'
}

// This is a JSON representation of a Fabric node.
// tslint:disable variable-name
export class FabricNode {
    public constructor(public short_name: string, public name: string, public type: FabricNodeType, public url: string, public wallet: string, public identity: string, public msp_id: string) {

    }
}
