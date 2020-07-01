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

import { AnsibleEnvironment } from './AnsibleEnvironment';
import { FabricNode } from '../fabricModel/FabricNode';
import { FabricWalletRegistryEntry } from '../registries/FabricWalletRegistryEntry';
import { FabricGatewayRegistryEntry } from '../registries/FabricGatewayRegistryEntry';
import { FabricIdentity } from '../fabricModel/FabricIdentity';
import { FabricGateway } from '../fabricModel/FabricGateway';
import { MicrofabClient, isPeer, isOrderer, MicrofabComponent, MicrofabIdentity, isIdentity, isGateway, MicrofabGateway } from './MicrofabClient';
import { FileConfigurations } from '../registries/FileConfigurations';
import { IFabricWalletGenerator } from '../interfaces/IFabricWalletGenerator';
import { FabricWalletGeneratorFactory } from '../util/FabricWalletGeneratorFactory';
import { IFabricWallet } from '../interfaces/IFabricWallet';

import * as fs from 'fs-extra';
import * as path from 'path';

export class MicrofabEnvironment extends AnsibleEnvironment {

    private client: MicrofabClient;

    constructor(name: string, environmentPath: string, private url: string) {
        super(name, environmentPath);
        this.client = new MicrofabClient(this.url);
    }

    public async getAllOrganizationNames(showOrderer: boolean = true): Promise<string[]> {
        return super.getAllOrganizationNames(showOrderer);
    }

    public async getNodes(_withoutIdentities: boolean = false, _showAll: boolean = false): Promise<FabricNode[]> {
        const components: MicrofabComponent[] = await this.client.getComponents();
        const nodes: FabricNode[] = [];
        for (const component of components) {
            if (isPeer(component)) {
                const node: FabricNode = FabricNode.newPeer(
                    component.id,
                    component.display_name,
                    component.api_url,
                    component.wallet,
                    component.identity,
                    component.msp_id,
                    false
                );
                node.api_options = component.api_options;
                node.chaincode_url = component.chaincode_url;
                node.chaincode_options = component.chaincode_options;
                nodes.push(node);
            } else if (isOrderer(component)) {
                const node: FabricNode = FabricNode.newOrderer(
                    component.id,
                    component.display_name,
                    component.api_url,
                    component.wallet,
                    component.identity,
                    component.msp_id,
                    component.display_name,
                    false
                );
                node.api_options = component.api_options;
                nodes.push(node);
            }
        }
        return nodes;
    }

    public async updateNode(_node: FabricNode, _isOpsTools: boolean = false): Promise<void> {
        throw new Error('Operation not supported');
    }

    public async deleteNode(_node: FabricNode): Promise<void> {
        throw new Error('Operation not supported');
    }

    public async requireSetup(): Promise<boolean> {
        return false;
    }

    public async getWalletsAndIdentities(): Promise<FabricWalletRegistryEntry[]> {
        const walletNames: string[] = await this.getWalletNames();
        const walletRegistryEntries: FabricWalletRegistryEntry[] = [];
        const walletGenerator: IFabricWalletGenerator = FabricWalletGeneratorFactory.getFabricWalletGenerator();
        for (const walletName of walletNames) {
            const walletPath: string = path.join(this.path, FileConfigurations.FABRIC_WALLETS, walletName);
            await fs.mkdirp(walletPath);
            const walletRegistryEntry: FabricWalletRegistryEntry = new FabricWalletRegistryEntry({
                name: walletName,
                displayName: `${this.name} - ${walletName}`,
                walletPath,
                managedWallet: false,
                fromEnvironment: this.name,
                environmentGroups: [this.name]
            });
            walletRegistryEntries.push(walletRegistryEntry);
            const wallet: IFabricWallet = await walletGenerator.getWallet(walletRegistryEntry);
            const expectedIdentities: FabricIdentity[] = await this.getIdentities(walletName);
            const existingIdentities: FabricIdentity[] = await wallet.getIdentities();
            const identitiesToImport: FabricIdentity[] = [];
            for (const expectedIdentity of expectedIdentities) {
                const identityExists: boolean = await wallet.exists(expectedIdentity.name);
                if (!identityExists) {
                    identitiesToImport.push(expectedIdentity);
                    continue;
                }
                const existingIdentity: FabricIdentity = existingIdentities.find((identity: FabricIdentity) => identity.name === expectedIdentity.name);
                const identityMatches: boolean = existingIdentity.msp_id === expectedIdentity.msp_id
                    && Buffer.from(existingIdentity.cert, 'utf8').toString('base64') === expectedIdentity.cert
                    && Buffer.from(existingIdentity.private_key, 'utf8').toString('base64') === expectedIdentity.private_key;
                if (!identityMatches) {
                    identitiesToImport.push(expectedIdentity);
                    continue;
                }
            }
            for (const identityToImport of identitiesToImport) {
                await wallet.importIdentity(
                    Buffer.from(identityToImport.cert, 'base64').toString('utf8'),
                    Buffer.from(identityToImport.private_key, 'base64').toString('utf8'),
                    identityToImport.name,
                    identityToImport.msp_id
                );
            }
        }
        return walletRegistryEntries;
    }

    public async getGateways(): Promise<FabricGatewayRegistryEntry[]> {
        const gateways: FabricGateway[] = await this.getFabricGateways();
        return gateways.map((gateway: FabricGateway) => {
            return new FabricGatewayRegistryEntry({
                name: `${this.name} - ${gateway.name}`,
                associatedWallet: (gateway.connectionProfile as any).wallet,
                displayName: gateway.name,
                connectionProfilePath: gateway.path,
                fromEnvironment: this.name,
                environmentGroup: this.name
            });
        });
    }

    public async getWalletNames(): Promise<string[]> {
        const components: MicrofabComponent[] = await this.client.getComponents();
        const identities: MicrofabIdentity[] = components.filter((component: MicrofabComponent) => isIdentity(component)) as MicrofabIdentity[];
        const walletNames: string[] = [];
        for (const identity of identities) {
            if (walletNames.indexOf(identity.wallet) < 0) {
                walletNames.push(identity.wallet);
            }
        }
        return walletNames;
    }

    public async getIdentities(walletName: string): Promise<FabricIdentity[]> {
        const components: MicrofabComponent[] = await this.client.getComponents();
        const identities: MicrofabIdentity[] = components.filter((component: MicrofabComponent) => isIdentity(component) && component.wallet === walletName) as MicrofabIdentity[];
        return identities.map((identity: MicrofabIdentity) => {
            return new FabricIdentity(identity.display_name, identity.cert, identity.private_key, identity.msp_id);
        });
    }

    public async getFabricGateways(): Promise<FabricGateway[]> {
        const components: MicrofabComponent[] = await this.client.getComponents();
        const gateways: MicrofabGateway[] = components.filter((component: MicrofabComponent) => isGateway(component)) as MicrofabGateway[];
        const result: FabricGateway[] = [];
        for (const gateway of gateways) {
            const gatewaysPath: string = path.join(this.path, FileConfigurations.FABRIC_GATEWAYS);
            await fs.mkdirp(gatewaysPath);
            const gatewayPath: string = path.join(gatewaysPath, `${gateway.display_name}.json`);
            const gatewayExists: boolean = await fs.pathExists(gatewayPath);
            if (!gatewayExists) {
                await fs.writeJson(gatewayPath, gateway);
            } else {
                const existingGateway: any = await fs.readJson(gatewayPath);
                const gatewaysMatch: boolean = JSON.stringify(existingGateway) === JSON.stringify(gateway);
                if (!gatewaysMatch) {
                    await fs.writeJson(gatewayPath, gateway);
                }
            }
            result.push(new FabricGateway(gateway.name, gatewayPath, gateway));
        }
        return result;
    }

}
