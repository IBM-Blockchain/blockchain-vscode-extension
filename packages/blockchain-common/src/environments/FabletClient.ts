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

import Axios, { AxiosResponse } from 'axios';
import { URL } from 'url';

export interface FabletComponent {
    id: string;
    display_name: string;
    type: 'fabric-peer' | 'fabric-orderer' | 'gateway' | 'identity';
}

export interface FabletPeer extends FabletComponent {
    api_url: string;
    api_options?: Map<string, any>;
    chaincode_url: string;
    chaincode_options?: Map<string, any>;
    operations_url: string;
    operations_options?: Map<string, any>;
    msp_id: string;
    wallet: string;
    identity: string;
}

export function isPeer(component: FabletComponent): component is FabletPeer {
    return component.type === 'fabric-peer';
}

export interface FabletOrderer extends FabletComponent {
    api_url: string;
    api_options?: Map<string, any>;
    operations_url: string;
    operations_options?: Map<string, any>;
    msp_id: string;
    wallet: string;
    identity: string;
}

export function isOrderer(component: FabletComponent): component is FabletOrderer {
    return component.type === 'fabric-orderer';
}

export interface FabletGateway extends FabletComponent {
    wallet: string;
    [propName: string]: any;
}

export function isGateway(component: FabletComponent): component is FabletGateway {
    return component.type === 'gateway';
}

export interface FabletIdentity extends FabletComponent {
    cert: string;
    private_key: string;
    msp_id: string;
    wallet: string;
}

export function isIdentity(component: FabletComponent): component is FabletIdentity {
    return component.type === 'identity';
}

export class FabletClient {

    constructor(private url: string) {

    }

    public async getComponents(): Promise<FabletComponent[]> {
        const url: URL = new URL('/ak/api/v1/components', this.url);
        const response: AxiosResponse = await Axios.get(url.toString());
        return response.data as FabletComponent[];
    }

    public async getComponent(id: string): Promise<FabletComponent> {
        const url: URL = new URL(`/ak/api/v1/components/${id}`, this.url);
        const response: AxiosResponse = await Axios.get(url.toString());
        return response.data as FabletComponent;
    }

}
