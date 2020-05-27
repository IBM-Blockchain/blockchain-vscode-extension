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

export interface MicrofabComponent {
    id: string;
    display_name: string;
    type: 'fabric-peer' | 'fabric-orderer' | 'gateway' | 'identity';
}

export interface MicrofabPeer extends MicrofabComponent {
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

export function isPeer(component: MicrofabComponent): component is MicrofabPeer {
    return component.type === 'fabric-peer';
}

export interface MicrofabOrderer extends MicrofabComponent {
    api_url: string;
    api_options?: Map<string, any>;
    operations_url: string;
    operations_options?: Map<string, any>;
    msp_id: string;
    wallet: string;
    identity: string;
}

export function isOrderer(component: MicrofabComponent): component is MicrofabOrderer {
    return component.type === 'fabric-orderer';
}

export interface MicrofabGateway extends MicrofabComponent {
    wallet: string;
    [propName: string]: any;
}

export function isGateway(component: MicrofabComponent): component is MicrofabGateway {
    return component.type === 'gateway';
}

export interface MicrofabIdentity extends MicrofabComponent {
    cert: string;
    private_key: string;
    msp_id: string;
    wallet: string;
}

export function isIdentity(component: MicrofabComponent): component is MicrofabIdentity {
    return component.type === 'identity';
}

export class MicrofabClient {

    constructor(private url: string) {

    }

    public async getComponents(): Promise<MicrofabComponent[]> {
        const url: URL = new URL('/ak/api/v1/components', this.url);
        const response: AxiosResponse = await Axios.get(url.toString());
        return response.data as MicrofabComponent[];
    }

    public async getComponent(id: string): Promise<MicrofabComponent> {
        const url: URL = new URL(`/ak/api/v1/components/${id}`, this.url);
        const response: AxiosResponse = await Axios.get(url.toString());
        return response.data as MicrofabComponent;
    }

}
