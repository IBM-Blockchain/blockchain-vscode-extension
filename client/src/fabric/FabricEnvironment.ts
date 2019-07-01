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
import { FabricNode } from './FabricNode';
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
            const node: FabricNode | Array<FabricNode> = await fs.readJson(nodePath);
            if (Array.isArray(node)) {
                nodes.push(...node);
            } else {
                nodes.push(node);
            }
        }
        return nodes;
    }
}
