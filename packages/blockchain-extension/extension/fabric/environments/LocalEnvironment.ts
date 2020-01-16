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

import * as vscode from 'vscode';
import * as path from 'path';
import { ManagedAnsibleEnvironment } from './ManagedAnsibleEnvironment';
import { YeomanUtil } from '../../util/YeomanUtil';
import { FabricRuntimeUtil, FabricEnvironmentRegistry, FabricEnvironmentRegistryEntry, EnvironmentType, OutputAdapter, FabricWalletRegistryEntry, FabricWalletRegistry, FileConfigurations, FileSystemUtil } from 'ibm-blockchain-platform-common';
import { SettingConfigurations } from '../../../configurations';
import { FabricRuntimePorts } from '../FabricRuntimePorts';

export class LocalEnvironment extends ManagedAnsibleEnvironment {
    public ports?: FabricRuntimePorts;
    private dockerName: string;

    constructor() {
        super(FabricRuntimeUtil.LOCAL_FABRIC);
        this.dockerName = `fabricvscodelocalfabric`;
    }

    public async create(): Promise<void> {

        // Delete any existing runtime directory, and then recreate it.
        await FabricEnvironmentRegistry.instance().delete(this.name, true);

        const registryEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry({
            name: this.name,
            managedRuntime: true,
            environmentType: EnvironmentType.ANSIBLE_ENVIRONMENT,
            associatedGateways: ['Org1']
        });

        await FabricEnvironmentRegistry.instance().add(registryEntry);

        // Use Yeoman to generate a new network configuration.
        await YeomanUtil.run('fabric:network', {
            destination: this.path,
            name: this.name,
            dockerName: this.dockerName,
            numOrganizations: 1,
            startPort: this.ports.startPort,
            endPort: this.ports.endPort
        });
    }

     public async isCreated(): Promise<boolean> {
        return FabricEnvironmentRegistry.instance().exists(this.name);
    }

    public async isGenerated(): Promise<boolean> {
        const created: boolean = await this.isCreated();
        if (!created) {
            return false;
        }
        return await super.isGenerated();
    }

    public async teardown(outputAdapter?: OutputAdapter): Promise<void> {
        try {
            await super.teardownInner(outputAdapter);
            await this.create();
        } finally {
            await super.setTeardownState();
        }

    }

    public async importWalletsAndIdentities(): Promise<void> {
        await super.importWalletsAndIdentities();

        const walletNames: string[] = await this.getWalletNames();
        for (const walletName of walletNames) {
            const exists: boolean = await FabricWalletRegistry.instance().exists(walletName);
            if (exists) {
                // Fallback solution if FabricWalletUtil.tidyWalletSettings() fix for "No path for wallet has been provided" doesn't work - https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1593
                // I think the problem occurred because we weren't setting a walletPath or managedWallet in FabricWalletUtil.tidyWalletSettings().
                const walletRegistryEntry: FabricWalletRegistryEntry = await FabricWalletRegistry.instance().get(walletName);
                if (!walletRegistryEntry.walletPath || !walletRegistryEntry.managedWallet) {
                    const extDir: string = vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_DIRECTORY);
                    const homeExtDir: string = FileSystemUtil.getDirPath(extDir);
                    walletRegistryEntry.walletPath = path.join(homeExtDir, FileConfigurations.FABRIC_WALLETS, walletName);
                    walletRegistryEntry.managedWallet = true;
                    await FabricWalletRegistry.instance().update(walletRegistryEntry);
                }
            }

        }

    }

    public async updateUserSettings(): Promise<void> {
        const runtimeObject: any = {
            ports: this.ports
        };
        await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, runtimeObject, vscode.ConfigurationTarget.Global);
    }

    public async killChaincode(args?: string[], outputAdapter?: OutputAdapter): Promise<void> {
        await this.killChaincodeInner(args, outputAdapter);
    }

    protected async isRunningInner(args?: string[]): Promise<boolean> {

        const created: boolean = await this.isCreated();
        if (!created) {
            return false;
        }
        return await super.isRunningInner(args);
    }

    private async killChaincodeInner(args: string[], outputAdapter?: OutputAdapter): Promise<void> {
        await this.execute('kill_chaincode', args, outputAdapter);
    }
}
