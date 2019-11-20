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
import * as vscode from 'vscode';
import { BlockchainExplorerProvider } from '../../BlockchainExplorerProvider';
import { NodeTreeItem } from './NodeTreeItem';
import { FabricNode } from '../../../fabric/FabricNode';
import { FabricEnvironmentRegistryEntry } from '../../../registries/FabricEnvironmentRegistryEntry';

export class PeerTreeItem extends NodeTreeItem {

    contextValue: string = 'blockchain-peer-item';

    constructor(provider: BlockchainExplorerProvider, public readonly peerName: string, public readonly tooltip: string, environmentRegsitryEntry: FabricEnvironmentRegistryEntry, node: FabricNode, public readonly command?: vscode.Command) {
        super(provider, peerName, tooltip, environmentRegsitryEntry, node, command);
    }
}
