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

// import * as path from 'path';
// import * as fs from 'fs-extra';
import * as vscode from 'vscode';
import { AnsibleEnvironment } from './AnsibleEnvironment';
import { OutputAdapter } from '../../logging/OutputAdapter';
import { FabricRuntimeState } from '../FabricRuntimeState';
import { FabricEnvironmentRegistry } from '../../registries/FabricEnvironmentRegistry';
import { FabricEnvironmentRegistryEntry } from '../../registries/FabricEnvironmentRegistryEntry';
import { YeomanUtil } from '../../util/YeomanUtil';
import { FabricRuntimeUtil } from '../FabricRuntimeUtil';
import { SettingConfigurations } from '../../../configurations';

export class LocalEnvironment extends AnsibleEnvironment {

    constructor() {
        super(FabricRuntimeUtil.LOCAL_FABRIC);
        this.dockerName = `fabricvscodelocalfabric`;
    }
    // LocalEnvironment
    public async generate(outputAdapter?: OutputAdapter): Promise<void> {
        try {
            this.setBusy(true);
            this.setState(FabricRuntimeState.STARTING);
            await this.execute('generate', [], outputAdapter);
        } finally {
            this.setBusy(false);
            const running: boolean = await this.isRunning();
            if (running) {
                this.setState(FabricRuntimeState.STARTED);
            } else {
                this.setState(FabricRuntimeState.STOPPED);
            }
        }
    }

    // LocalEnvironment (pretty certain)
    // Update implementation to generate fabric using ansible (?)
    // Are AnsibleEnvironment's local or IBP? - they are local

    // On IBP how do we stop/start? Surely this would just be a FabricEnvironment?
    // What does ansible actually generate/do?
    // ran playbook to generate structure - add environment - dir - imports ansible stuff
    public async create(): Promise<void> {

        // Delete any existing runtime directory, and then recreate it.
        await FabricEnvironmentRegistry.instance().delete(this.name, true);

        const registryEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry({
            name: this.name,
            managedRuntime: true
        });

        await FabricEnvironmentRegistry.instance().add(registryEntry);

        // This is going to be changed I guess

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

     // LocalEnvironment
     public async isCreated(): Promise<boolean> {
        return FabricEnvironmentRegistry.instance().exists(this.name);
    }

    // LocalEnvironment
    public async isGenerated(): Promise<boolean> {
        try {
            const created: boolean = await this.isCreated();
            if (!created) {
                return false;
            }
            await this.execute('is_generated');
            return true;
        } catch (error) {
            return false;
        }
    }

    public async teardown(outputAdapter?: OutputAdapter): Promise<void> {
        try {
            await super.teardownInner(outputAdapter);
            await this.create();  // This will only be for local
            await this.importWalletsAndIdentities(); // This will only be for local
            await this.importGateways(); // This will only be for local
        } catch (err) {
            // ignore
        }

        await super.setTeardownState();

    }

    // LocalEnvironment
    public async updateUserSettings(): Promise<void> {
        const runtimeObject: any = {
            ports: this.ports
        };
        await vscode.workspace.getConfiguration().update(SettingConfigurations.FABRIC_RUNTIME, runtimeObject, vscode.ConfigurationTarget.Global);
    }

    // LocalEnvironment - used for debug
    public async killChaincode(args?: string[], outputAdapter?: OutputAdapter): Promise<void> {
        await this.killChaincodeInner(args, outputAdapter);
    }

    // Both
    private async killChaincodeInner(args: string[], outputAdapter?: OutputAdapter): Promise<void> {
        await this.execute('kill_chaincode', args, outputAdapter);
    }
}
