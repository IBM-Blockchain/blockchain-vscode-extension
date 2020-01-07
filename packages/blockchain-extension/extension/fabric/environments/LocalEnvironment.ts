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
import { ManagedAnsibleEnvironment } from './ManagedAnsibleEnvironment';
import { YeomanUtil } from '../../util/YeomanUtil';
import { FabricRuntimeUtil, FabricEnvironmentRegistry, FabricEnvironmentRegistryEntry, EnvironmentType, FabricWalletUtil, OutputAdapter, FabricWalletRegistryEntry, FabricWalletRegistry, FileConfigurations, FileSystemUtil } from 'ibm-blockchain-platform-common';
import { SettingConfigurations } from '../../../configurations';
import { FabricRuntimePorts } from '../FabricRuntimePorts';

export class LocalEnvironment extends ManagedAnsibleEnvironment {
    public ports?: FabricRuntimePorts;
    private dockerName: string;

    constructor() {
        super(FabricRuntimeUtil.LOCAL_FABRIC);
        this.dockerName = `fabricvscodelocalfabric`;
    }

    public getDisplayName(): string {
        return FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME;
    }

    public async create(): Promise<void> {

        // Delete any existing runtime directory, and then recreate it.
        await FabricEnvironmentRegistry.instance().delete(this.name, true);

        const registryEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry({
            name: this.name,
            managedRuntime: true,
            environmentType: EnvironmentType.ANSIBLE_ENVIRONMENT,
            associatedGateways: [FabricRuntimeUtil.LOCAL_FABRIC]
        });

        await FabricEnvironmentRegistry.instance().add(registryEntry);

        // Use Yeoman to generate a new network configuration.
        await YeomanUtil.run('fabric:network', {
            destination: this.path,
            name: this.name,
            dockerName: this.dockerName,
            orderer: this.ports.orderer,
            peerRequest: this.ports.peerRequest,
            peerChaincode: this.ports.peerChaincode,
            certificateAuthority: this.ports.certificateAuthority,
            couchDB: this.ports.couchDB,
            logspout: this.ports.logs
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
            await this.importWalletsAndIdentities();
            await this.importGateways();
        } finally {
            await super.setTeardownState();
        }

    }

    public async importGateways(): Promise<void> {
        await super.importGateways(FabricWalletUtil.LOCAL_WALLET);
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
