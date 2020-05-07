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

    public async getAllOrganizationNames(showOrderer: boolean = true): Promise<string[]> {
        const mspIDs: Set<string> = new Set<string>();
        let nodes: FabricNode[] = await this.getNodes();
        if (!showOrderer) {
            // Anything using the Orderer wallet is either a 'Orderer' or 'CA' type.
            nodes = nodes.filter((node: FabricNode) => {
                return node.type === FabricNodeType.PEER;
            });
        }

        for (const node of nodes) {
            if (node.msp_id) {
                mspIDs.add(node.msp_id);
            }
        }
        return Array.from(mspIDs).sort();
    }

    public async getNodes(withoutIdentities: boolean = false, showAll: boolean = false): Promise<FabricNode[]> {
        const rootNodesPath: string = path.resolve(this.path, 'nodes');
        const nodes: FabricNode[] = await this.loadNodes(rootNodesPath);
        const nodesToUse: FabricNode[] = showAll ? nodes : nodes.filter((_node: FabricNode) => {
            return _node.hidden === undefined || _node.hidden === false;
        });
        if (withoutIdentities) {
            return nodesToUse.filter((node: FabricNode) => (!node.wallet || !node.identity));
        } else {
            return nodesToUse;
        }
    }

    public async updateNode(node: FabricNode, isOpsTools: boolean = false): Promise<void> {
        const nodesPath: string = path.resolve(this.path, 'nodes');

        const nodesToUpdate: FabricNode[] = [];
        const allNodes: FabricNode[] = await this.getNodes(false, true);

        if (isOpsTools) {
            // If this node already exists keep wallet and identity properties.
            // Check name matches, if not rename the node JSON file.
            const allUrls: string[] = allNodes.map((_node: FabricNode) => _node.api_url);
            const index: number = allUrls.indexOf(node.api_url);
            if (index > -1) {
                if (allNodes[index].wallet !== undefined) {
                    node.wallet = allNodes[index].wallet;
                }
                if (allNodes[index].identity !== undefined) {
                    node.identity = allNodes[index].identity;
                }
                if (allNodes[index].name !== undefined && node.name !== allNodes[index].name) {
                    const newNodePath: string = path.resolve(nodesPath, `${node.name}.json`);
                    const oldNodePath: string = path.resolve(nodesPath, `${allNodes[index].name}.json`);
                    await fs.move(oldNodePath, newNodePath);
                }
            }
        }

        if (node.type === FabricNodeType.ORDERER) {
            // need to also update all the nodes in the same cluster
            const ordererNodes: FabricNode[] = allNodes.filter((_node: FabricNode) => {
                return _node.type === FabricNodeType.ORDERER && _node.cluster_name && _node.cluster_name === node.cluster_name && _node.name !== node.name;
            }).map((_node: FabricNode) => {
                _node.wallet = node.wallet;
                _node.identity = node.identity;
                _node.hidden = node.hidden;
                return _node;
            });

            nodesToUpdate.push(...ordererNodes);
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
