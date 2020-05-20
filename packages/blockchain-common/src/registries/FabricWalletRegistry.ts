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
'use strict';
import { FabricWalletRegistryEntry } from './FabricWalletRegistryEntry';
import { FileConfigurations } from './FileConfigurations';
import { FileRegistry } from './FileRegistry';
import { FabricEnvironmentRegistryEntry, EnvironmentType, EnvironmentFlags } from './FabricEnvironmentRegistryEntry';
import { FabricEnvironmentRegistry } from './FabricEnvironmentRegistry';
import { AnsibleEnvironment } from '../environments/AnsibleEnvironment';
import { FabletEnvironment } from '../environments/FabletEnvironment';

export class FabricWalletRegistry extends FileRegistry<FabricWalletRegistryEntry> {

    public static instance(): FabricWalletRegistry {
        return FabricWalletRegistry._instance;
    }

    private static _instance: FabricWalletRegistry = new FabricWalletRegistry();

    private constructor() {
        super(FileConfigurations.FABRIC_WALLETS);
    }

    public async getAll(showLocalFabric: boolean = true): Promise<FabricWalletRegistryEntry[]> {
        const entries: FabricWalletRegistryEntry[] = await super.getAll();

        let wallets: FabricWalletRegistryEntry[] = [];
        const localWallets: FabricWalletRegistryEntry[] = [];

        for (const entry of entries) {
            const envName: string = entry.fromEnvironment;
            let environmentType: EnvironmentType;
            if (envName) {
                const environment: FabricEnvironmentRegistryEntry = await FabricEnvironmentRegistry.instance().get(envName);
                environmentType = environment.environmentType;
            }
            if (environmentType === EnvironmentType.LOCAL_ENVIRONMENT) {
                localWallets.push(entry);
                continue;
            }

            wallets.push(entry);
        }

        if (showLocalFabric && localWallets.length > 0) {
            wallets = [...localWallets, ...wallets];
        }

        return wallets;
    }

    public async get(name: string, fromEnvironment?: string): Promise<FabricWalletRegistryEntry> {
        const entries: FabricWalletRegistryEntry[] = await this.getAll();

        const entry: FabricWalletRegistryEntry = entries.find((item: FabricWalletRegistryEntry) => {
            if (fromEnvironment && item.fromEnvironment) {
                return item.name === name && item.fromEnvironment === fromEnvironment;
            } else {
                return item.name === name;
            }
        });

        if (!entry && fromEnvironment) {
            throw new Error(`Entry "${name}" from environment "${fromEnvironment}" in registry "${FileConfigurations.FABRIC_WALLETS}" does not exist`);
        } else if (!entry && !fromEnvironment) {
            throw new Error(`Entry "${name}" in registry "${FileConfigurations.FABRIC_WALLETS}" does not exist`);
        } else {
            return entry;
        }
    }

    public async getEntries(): Promise<FabricWalletRegistryEntry[]> {
        const normalEntries: FabricWalletRegistryEntry[] = await super.getEntries();
        const otherEntries: FabricWalletRegistryEntry[] = [];

        // Get wallets from all Ansible environments.
        const ansibleEnvironmentEntries: FabricEnvironmentRegistryEntry[] = await FabricEnvironmentRegistry.instance().getAll([EnvironmentFlags.ANSIBLE]);
        for (const ansibleEnvironmentEntry of ansibleEnvironmentEntries) {
            const environment: AnsibleEnvironment = new AnsibleEnvironment(ansibleEnvironmentEntry.name, ansibleEnvironmentEntry.environmentDirectory);
            let walletEntries: FabricWalletRegistryEntry[] = await environment.getWalletsAndIdentities();
            walletEntries = walletEntries.map((entry: FabricWalletRegistryEntry) => {
                if (ansibleEnvironmentEntry.managedRuntime) {
                    entry.managedWallet = true;
                }

                return entry;
            });
            otherEntries.push(...walletEntries);
        }

        // Get wallets from all Fablet environments.
        const fabletEnvironmentEntries: FabricEnvironmentRegistryEntry[] = await FabricEnvironmentRegistry.instance().getAll([EnvironmentFlags.FABLET]);
        for (const fabletEnvironmentEntry of fabletEnvironmentEntries) {
            const environment: FabletEnvironment = this.newFabletEnvironment(fabletEnvironmentEntry.name, fabletEnvironmentEntry.environmentDirectory, fabletEnvironmentEntry.url);
            const walletEntries: FabricWalletRegistryEntry[] = await environment.getWalletsAndIdentities();
            otherEntries.push(...walletEntries);
        }

        return [...normalEntries, ...otherEntries].sort((a: FabricWalletRegistryEntry, b: FabricWalletRegistryEntry): number => {
            const aName: string = a.displayName ? a.displayName : a.name;
            const bName: string = b.displayName ? b.displayName : b.name;
            return aName.localeCompare(bName);
        });
    }

    public newFabletEnvironment(name: string, directory: string, url: string): FabletEnvironment {
        return new FabletEnvironment(name, directory, url);
    }

}
