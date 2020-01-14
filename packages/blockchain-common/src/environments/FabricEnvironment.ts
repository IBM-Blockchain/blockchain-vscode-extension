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
import { EventEmitter } from 'events';
import { FabricNode, FabricNodeType } from '../fabricModel/FabricNode';

export class FabricEnvironment extends EventEmitter {

    protected name: string;
    protected path: string;

    constructor(name: string, environmentPath: string) {
        super();

        this.path = environmentPath;
        this.name = name;
    }

    public getName(): string {
        return this.name;
    }

    public getPath(): string {
        return this.path;
    }

    public async getAllOrganizationNames(): Promise<string[]> {
        const mspIDs: Set<string> = new Set<string>();
        const nodes: FabricNode[] = await this.getNodes();
        for (const node of nodes) {
            if (node.msp_id) {
                mspIDs.add(node.msp_id);
            }
        }
        return Array.from(mspIDs).sort();
    }

    public async getNodes(withoutIdentities: boolean = false): Promise<FabricNode[]> {
        const rootNodesPath: string = path.resolve(this.path, 'nodes');
        const nodes: FabricNode[] = await this.loadNodes(rootNodesPath);
        if (withoutIdentities) {
            return nodes.filter((node: FabricNode) => (!node.wallet || !node.identity));
        } else {
            return nodes;
        }
    }

    public async updateNode(node: FabricNode): Promise<void> {
        const nodesPath: string = path.resolve(this.path, 'nodes');

        const nodesToUpdate: FabricNode[] = [];

        if (node.type === FabricNodeType.ORDERER) {
            // need to also update all the nodes in the same cluster
            let allNodes: FabricNode[] = await this.getNodes();
            allNodes = allNodes.filter((_node: FabricNode) => {
                return _node.type === FabricNodeType.ORDERER && _node.cluster_name && _node.cluster_name === node.cluster_name && _node.name !== node.name;
            }).map((_node: FabricNode) => {
                _node.wallet = node.wallet;
                _node.identity = node.identity;
                return _node;
            });

            nodesToUpdate.push(...allNodes);
        }

        // always needs to update itself
        nodesToUpdate.push(node);

        for (const _node of nodesToUpdate) {
            const _nodePath: string = path.resolve(nodesPath, `${_node.name}.json`);
            await fs.writeJson(_nodePath, _node);
        }
    }

    public async deleteNode(node: FabricNode): Promise<void> {
        const nodesPath: string = path.resolve(this.path, 'nodes');

        const nodePath: string = path.join(nodesPath, `${node.name}.json`);

        await fs.remove(nodePath);
    }

    public async requireSetup(): Promise<boolean> {
        const filteredNodes: FabricNode[] = await this.getNodes(true);

        return filteredNodes.length > 0;
    }

    private async loadNodes(nodesPath: string): Promise<FabricNode[]> {
        const nodesExist: boolean = await fs.pathExists(nodesPath);
        if (!nodesExist) {
            return [];
        }
        let nodePaths: string[] = await fs.readdir(nodesPath);
        nodePaths.sort();
        nodePaths = nodePaths
            .filter((nodePath: string) => !nodePath.startsWith('.'))
            .map((nodePath: string) => path.resolve(nodesPath, nodePath));
        const nodes: FabricNode[] = [];
        for (const nodePath of nodePaths) {
            const stats: fs.Stats = await fs.lstat(nodePath);
            if (stats.isDirectory()) {
                const subNodes: FabricNode[] = await this.loadNodes(nodePath);
                nodes.push(...subNodes);
            } else if (stats.isFile() && nodePath.endsWith('.json')) {
                const node: FabricNode = await fs.readJson(nodePath);
                nodes.push(node);
            }
        }
        return nodes;
    }
}
