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
import { EventEmitter } from 'events';
import { UserInputUtil } from '../commands/UserInputUtil';
import { FabricIdentity } from './FabricIdentity';
import { FabricNode} from './FabricNode';
import { SettingConfigurations } from '../../SettingConfigurations';

export class FabricEnvironment extends EventEmitter {

    protected name: string;
    protected path: string;

    constructor(name: string) {
        super();
        const extDir: string = vscode.workspace.getConfiguration().get(SettingConfigurations.EXTENSION_DIRECTORY);
        const resolvedExtDir: string = UserInputUtil.getDirPath(extDir);
        this.name = name;
        this.path = path.join(resolvedExtDir, 'environments', name);
    }

    public getName(): string {
        return this.name;
    }

    public getPath(): string {
        return this.path;
    }

    public async getNodes(): Promise<FabricNode[]> {
        const nodesPath: string = path.resolve(this.path, 'nodes');
        const nodesExist: boolean = await fs.pathExists(nodesPath);
        if (!nodesExist) {
            return [];
        }
        let nodePaths: string[] = await fs.readdir(nodesPath);
        nodePaths = nodePaths
            .sort()
            .filter((nodePath: string) => !nodePath.startsWith('.'))
            .map((nodePath: string) => path.resolve(this.path, 'nodes', nodePath));
        const nodes: FabricNode[] = [];
        for (const nodePath of nodePaths) {
            const node: FabricNode = await fs.readJson(nodePath);
            nodes.push(node);
        }
        return nodes;
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
        identityPaths = identityPaths
            .sort()
            .filter((identityPath: string) => !identityPath.startsWith('.'))
            .map((identityPath: string) => path.resolve(this.path, 'wallets', walletName, identityPath));
        const identities: FabricIdentity[] = [];
        for (const identityPath of identityPaths) {
            const identity: FabricIdentity = await fs.readJson(identityPath);
            identities.push(identity);
        }
        return identities;
    }
}
