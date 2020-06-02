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

// tslint:disable max-classes-per-file

import { SettingConfigurations } from '../../configurations';
import * as vscode from 'vscode';

export interface IFeatureFlag {
    getName(): string;
    getDescription(): string;
    getContext(): boolean;
}

class FeatureFlag implements IFeatureFlag {

    constructor(private name: string, private description: string, private contextFlag?: boolean) {

    }

    getName(): string {
        return this.name;
    }

    getDescription(): string {
        return this.description;
    }

    getContext(): boolean {
        return this.contextFlag;
    }

}

type FeatureFlags = Map<string, boolean>;

export class FeatureFlagManager {

    static readonly MICROFAB: IFeatureFlag = new FeatureFlag('microfab', 'Enable connectivity to a Microfab instance');
    static readonly EXPORTAPPDATA: IFeatureFlag = new FeatureFlag('exportAppData', 'Export application data for the IBM Cloud Pak for Apps Blockchain Accelerator', true);

    static readonly ALL: IFeatureFlag[] = [
        FeatureFlagManager.MICROFAB,
        FeatureFlagManager.EXPORTAPPDATA
    ];

    static async enable(featureFlag: IFeatureFlag): Promise<void> {
        const featureFlags: FeatureFlags = await this.get();
        featureFlags[featureFlag.getName()] = true;
        await this.set(featureFlags);
        if (featureFlag.getContext()) {
            await vscode.commands.executeCommand('setContext', featureFlag.getName(), true);
        }
    }

    static async disable(featureFlag: IFeatureFlag): Promise<void> {
        const featureFlags: FeatureFlags = await this.get();
        featureFlags[featureFlag.getName()] = false;
        await this.set(featureFlags);
        if (featureFlag.getContext()) {
            await vscode.commands.executeCommand('setContext', featureFlag.getName(), false);
        }
    }

    static async enabled(featureFlag: IFeatureFlag): Promise<boolean> {
        const featureFlags: FeatureFlags = await this.get();
        return !!featureFlags[featureFlag.getName()];
    }

    static async disabled(featureFlag: IFeatureFlag): Promise<boolean> {
        const featureFlags: FeatureFlags = await this.get();
        return !featureFlags[featureFlag.getName()];
    }

    static async get(): Promise<FeatureFlags> {
        const configuration: vscode.WorkspaceConfiguration = await vscode.workspace.getConfiguration();
        const featureFlags: Map<string, boolean> = configuration.get(SettingConfigurations.FEATURE_FLAGS);
        return featureFlags;
    }

    private static async set(featureFlags: FeatureFlags): Promise<void> {
        const configuration: vscode.WorkspaceConfiguration = await vscode.workspace.getConfiguration();
        await configuration.update(SettingConfigurations.FEATURE_FLAGS, featureFlags, vscode.ConfigurationTarget.Global);
    }

}
