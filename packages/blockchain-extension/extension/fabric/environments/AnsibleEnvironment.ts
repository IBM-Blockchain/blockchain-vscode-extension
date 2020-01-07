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
import * as vscode from 'vscode';
import { FabricGateway } from '../FabricGateway';
import { FabricIdentity, FabricWalletRegistry, FabricWalletRegistryEntry, FileConfigurations, IFabricWallet, IFabricWalletGenerator, FileSystemUtil } from 'ibm-blockchain-platform-common';
import { FabricWalletGeneratorFactory } from '../FabricWalletGeneratorFactory';
import { SettingConfigurations } from '../../../configurations';
import { FabricEnvironment } from './FabricEnvironment';
import { FabricGatewayRegistryEntry } from '../../registries/FabricGatewayRegistryEntry';
import { FabricGatewayRegistry } from '../../registries/FabricGatewayRegistry';

export class AnsibleEnvironment extends FabricEnvironment {

    constructor(name: string) {
        super(name);
    }

    public async importWalletsAndIdentities(): Promise<void> {

        // Ensure that all wallets are created and populated with identities.
        const fabricWalletGenerator: IFabricWalletGenerator = FabricWalletGeneratorFactory.createFabricWalletGenerator();
        const walletNames: string[] = await this.getWalletNames();
        for (const walletName of walletNames) {
            const exists: boolean = await FabricWalletRegistry.instance().exists(walletName);
            if (!exists) {
                const extDir: string = vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_DIRECTORY);
                const homeExtDir: string = FileSystemUtil.getDirPath(extDir);
                const walletRegistryEntry: FabricWalletRegistryEntry = new FabricWalletRegistryEntry();
                walletRegistryEntry.name = walletName;
                walletRegistryEntry.walletPath = path.join(homeExtDir, FileConfigurations.FABRIC_WALLETS, walletName);
                walletRegistryEntry.managedWallet = true;
                await FabricWalletRegistry.instance().add(walletRegistryEntry);
            }

            const wallet: IFabricWallet = await fabricWalletGenerator.getWallet(walletName);
            const identities: FabricIdentity[] = await this.getIdentities(walletName);
            for (const identity of identities) {
                await wallet.importIdentity(
                    Buffer.from(identity.cert, 'base64').toString('utf8'),
                    Buffer.from(identity.private_key, 'base64').toString('utf8'),
                    identity.name,
                    identity.msp_id
                );
            }
        }
    }

    public async importGateways(fallbackAssociatedWallet?: string): Promise<void> {
        const extDir: string = vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_DIRECTORY);
        const homeExtDir: string = FileSystemUtil.getDirPath(extDir);

        const fabricGateways: FabricGateway[] = await this.getGateways();
        for (const gateway of fabricGateways) {
            await FabricGatewayRegistry.instance().delete(gateway.name, true);

            const profileDirPath: string = path.join(homeExtDir, FileConfigurations.FABRIC_GATEWAYS, gateway.name);
            const profilePath: string = path.join(profileDirPath, path.basename(gateway.path));
            await fs.ensureDir(profileDirPath);
            await fs.copy(gateway.path, profilePath);
            const gatewayRegistryEntry: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
            gatewayRegistryEntry.name = gateway.name;
            gatewayRegistryEntry.associatedWallet = (gateway.connectionProfile as any).wallet || fallbackAssociatedWallet;
            await FabricGatewayRegistry.instance().add(gatewayRegistryEntry);
        }
    }

    public async getGateways(): Promise<FabricGateway[]> {
        const gatewaysPath: string = path.resolve(this.path, FileConfigurations.FABRIC_GATEWAYS);
        return this.loadGateways(gatewaysPath);
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
