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

import * as path from 'path';
import * as fs from 'fs-extra';
import { FabricGateway } from '../fabricModel/FabricGateway';
import { FabricIdentity } from '../fabricModel/FabricIdentity';
import { FabricWalletRegistryEntry } from '../registries/FabricWalletRegistryEntry';
import { FileConfigurations } from '../registries/FileConfigurations';
import { IFabricWallet } from '../interfaces/IFabricWallet';
import { IFabricWalletGenerator } from '../interfaces/IFabricWalletGenerator';
import { FabricEnvironment } from './FabricEnvironment';
import { FabricGatewayRegistryEntry } from '../registries/FabricGatewayRegistryEntry';
import { FabricWalletGeneratorFactory } from '../util/FabricWalletGeneratorFactory';

export class AnsibleEnvironment extends FabricEnvironment {

    constructor(name: string, environmentPath: string) {
        super(name, environmentPath);
    }

    public async getWalletsAndIdentities(): Promise<FabricWalletRegistryEntry[]> {
        // Ensure that all wallets are created and populated with identities.
        const fabricWalletGenerator: IFabricWalletGenerator = FabricWalletGeneratorFactory.getFabricWalletGenerator();
        const walletNames: string[] = await this.getWalletNames();

        const entries: FabricWalletRegistryEntry[] = [];
        for (const walletName of walletNames) {
            let walletRegistryEntry: FabricWalletRegistryEntry;

            const walletPath: string = path.join(this.path, FileConfigurations.FABRIC_WALLETS, walletName);
            const walletConfigPath: string = path.join(walletPath, '.config.json');
            const hasConfigFile: boolean = await fs.pathExists(walletConfigPath);
            if (hasConfigFile) {
                walletRegistryEntry = await fs.readJSON(walletConfigPath);
            } else {
                walletRegistryEntry = new FabricWalletRegistryEntry();
                walletRegistryEntry.name = walletName;
                walletRegistryEntry.walletPath = path.join(this.path, FileConfigurations.FABRIC_WALLETS, walletName);
                walletRegistryEntry.managedWallet = false;
                walletRegistryEntry.displayName = `${this.name} - ${walletName}`;
                walletRegistryEntry.fromEnvironment = this.name;
                walletRegistryEntry.environmentGroups = [this.name];
            }

            entries.push(walletRegistryEntry);

            const wallet: IFabricWallet = await fabricWalletGenerator.getWallet(walletRegistryEntry);

            const existingIdentityNames: any[] = await wallet.getIdentities();

            let identities: FabricIdentity[] = await this.getIdentities(walletName);

            // Filter out identities
            identities = identities.filter((id: FabricIdentity) => {
                const exists: FabricIdentity = existingIdentityNames.find((otherId: any) => {
                    const buff: Buffer = new Buffer(id.cert, 'base64');
                    const decodedCert: string = buff.toString('utf8');
                    return otherId.name === id.name && otherId.mspid === id.msp_id && otherId.enrollment.identity.certificate === decodedCert;
                });
                if (exists) {
                    return false;
                } else {
                    return true;
                }
            });

            // Import the identities which haven't been imported yet
            for (const identity of identities) {
                await wallet.importIdentity(
                    Buffer.from(identity.cert, 'base64').toString('utf8'),
                    Buffer.from(identity.private_key, 'base64').toString('utf8'),
                    identity.name,
                    identity.msp_id
                );
            }
        }

        return entries;
    }

    public async getGateways(): Promise<FabricGatewayRegistryEntry[]> {
        const entries: FabricGatewayRegistryEntry[] = [];

        const fabricGateways: FabricGateway[] = await this.getFabricGateways();
        for (const gateway of fabricGateways) {
            const gatewayRegistryEntry: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
            gatewayRegistryEntry.name = `${this.name} - ${gateway.name}`;
            gatewayRegistryEntry.associatedWallet = (gateway.connectionProfile as any).wallet;
            gatewayRegistryEntry.displayName = `${gateway.name}`;
            gatewayRegistryEntry.connectionProfilePath = gateway.path;
            gatewayRegistryEntry.fromEnvironment = this.name;
            gatewayRegistryEntry.environmentGroup = this.name;
            entries.push(gatewayRegistryEntry);
        }

        return entries;
    }

    public async getWalletNames(): Promise<string[]> {
            const walletsPath: string = path.resolve(this.path, 'wallets');
            const walletsExist: boolean = await fs.pathExists(walletsPath);
            if (!walletsExist) {
                return [];
            }
            const walletPaths: string[] = await fs.readdir(walletsPath);
            return walletPaths
                .sort()
                .filter((walletPath: string) => !walletPath.startsWith('.'));
    }

    public async getIdentities(walletName: string): Promise<FabricIdentity[]> {
        const walletPath: string = path.resolve(this.path, 'wallets', walletName);
        const walletExists: boolean = await fs.pathExists(walletPath);
        if (!walletExists) {
            return [];
        }
        let identityPaths: string[] = await fs.readdir(walletPath);
        identityPaths.sort();
        identityPaths = identityPaths
            .filter((identityPath: string) => !identityPath.startsWith('.') && identityPath.endsWith('.json'))
            .map((identityPath: string) => path.resolve(this.path, 'wallets', walletName, identityPath));
        const identities: FabricIdentity[] = [];
        for (const identityPath of identityPaths) {
            const stats: fs.Stats = await fs.lstat(identityPath);
            if (!stats.isFile()) {
                continue;
            }
            const identity: FabricIdentity = await fs.readJson(identityPath);
            identities.push(identity);
        }
        return identities;
    }

    public async getFabricGateways(): Promise<FabricGateway[]> {
        const gatewaysPath: string = path.resolve(this.path, FileConfigurations.FABRIC_GATEWAYS);
        return this.loadGateways(gatewaysPath);
    }

    private async loadGateways(gatewaysPath: string): Promise<FabricGateway[]> {
        const gatewaysExist: boolean = await fs.pathExists(gatewaysPath);
        if (!gatewaysExist) {
            return [];
        }
        let gatewayPaths: string[] = await fs.readdir(gatewaysPath);
        gatewayPaths.sort();
        gatewayPaths = gatewayPaths
            .filter((gatewayPath: string) => !gatewayPath.startsWith('.'))
            .map((gatewayPath: string) => path.resolve(gatewaysPath, gatewayPath));
        const gateways: FabricGateway[] = [];
        for (const gatewayPath of gatewayPaths) {
            const stats: fs.Stats = await fs.lstat(gatewayPath);
            if (stats.isDirectory()) {
                const subGateways: FabricGateway[] = await this.loadGateways(gatewayPath);
                gateways.push(...subGateways);
            } else if (stats.isFile() && gatewayPath.endsWith('.json')) {
                const connectionProfile: any = await fs.readJson(gatewayPath);
                const gateway: FabricGateway = new FabricGateway(connectionProfile.name, gatewayPath, connectionProfile);
                gateways.push(gateway);
            }
        }
        return gateways;
    }
}
