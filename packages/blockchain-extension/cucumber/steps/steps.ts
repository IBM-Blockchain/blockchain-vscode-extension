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
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';
import { BlockchainWalletExplorerProvider } from '../../extension/explorer/walletExplorer';
import { BlockchainGatewayExplorerProvider } from '../../extension/explorer/gatewayExplorer';
import { BlockchainEnvironmentExplorerProvider } from '../../extension/explorer/environmentExplorer';
import { BlockchainPackageExplorerProvider } from '../../extension/explorer/packageExplorer';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';

// tslint:disable:no-unused-expression

chai.use(sinonChai);
chai.use(chaiAsPromised);
const should: Chai.Should = chai.should();

export enum LanguageType {
    CHAINCODE = 'chaincode',
    CONTRACT = 'contract'
}

module.exports = function(): any {

    this.Then(/^there (should|shouldn't) be an? (environment connected |installed smart contract |instantiated smart contract |Channels |Node |Organizations |identity )?tree item with a label '(.*?)' in the '(Smart Contracts|Fabric Environments|Fabric Gateways|Fabric Wallets)' panel( for item| for the current tree item)?( .*)?$/, this.timeout, async (shouldOrshouldnt: string, child: string, label: string, panel: string, thing2: string, thing: string) => {
        let treeItems: any[];
        if (panel === 'Smart Contracts') {
            const blockchainPackageExplorerProvider: BlockchainPackageExplorerProvider = ExtensionUtil.getBlockchainPackageExplorerProvider();
            treeItems = await blockchainPackageExplorerProvider.getChildren();
        } else if (panel === 'Fabric Environments') {
            const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();
            if (!child) {
                treeItems = await blockchainRuntimeExplorerProvider.getChildren();
            } else if (child.includes('environment connected')) {
                const allTreeItems: any[] = await blockchainRuntimeExplorerProvider.getChildren();
                const smartContracts: any[] = await blockchainRuntimeExplorerProvider.getChildren(allTreeItems[0]);
                treeItems = await blockchainRuntimeExplorerProvider.getChildren(smartContracts[0]); // Connected to
            } else if (child.includes('installed smart contract')) {
                const allTreeItems: any[] = await blockchainRuntimeExplorerProvider.getChildren();
                const smartContracts: any[] = await blockchainRuntimeExplorerProvider.getChildren(allTreeItems[1]);
                treeItems = await blockchainRuntimeExplorerProvider.getChildren(smartContracts[0]); // Installed smart contracts
            } else if (child.includes('instantiated smart contract')) {
                const allTreeItems: any[] = await blockchainRuntimeExplorerProvider.getChildren();
                const smartContracts: any[] = await blockchainRuntimeExplorerProvider.getChildren(allTreeItems[1]);
                treeItems = await blockchainRuntimeExplorerProvider.getChildren(smartContracts[1]); // Instantiated smart contracts
            } else if (child.includes('Channels')) {
                const allTreeItems: any[] = await blockchainRuntimeExplorerProvider.getChildren();
                treeItems = await blockchainRuntimeExplorerProvider.getChildren(allTreeItems[2]); // Channels
            } else if (child.includes('Node')) {
                const allTreeItems: any[] = await blockchainRuntimeExplorerProvider.getChildren();
                treeItems = await blockchainRuntimeExplorerProvider.getChildren(allTreeItems[3]); // Nodes
            } else if (child.includes('Organizations')) {
                const allTreeItems: any[] = await blockchainRuntimeExplorerProvider.getChildren();
                treeItems = await blockchainRuntimeExplorerProvider.getChildren(allTreeItems[4]); // Organizations
            } else {
                treeItems = await blockchainRuntimeExplorerProvider.getChildren();
            }
        } else if (panel === 'Fabric Gateways') {
            const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = ExtensionUtil.getBlockchainGatewayExplorerProvider();
            treeItems = await blockchainGatewayExplorerProvider.getChildren();
        } else if (panel === 'Fabric Wallets') {
            const blockchainWalletExplorerProvider: BlockchainWalletExplorerProvider = ExtensionUtil.getBlockchainWalletExplorerProvider();
            treeItems = await blockchainWalletExplorerProvider.getChildren();
            if (thing2 && thing2.includes('for the current tree item')) {
                treeItems = await blockchainWalletExplorerProvider.getChildren(this.treeItem);
            } else if (child && child.includes('identity') && thing && thing2) {
                const walletIndex: number = treeItems.findIndex((item: any) => {
                    return item.label === thing.trim();
                });
                if (walletIndex < 0) {
                    throw new Error('Name of thing doesn\'t exist');
                }
                treeItems = await blockchainWalletExplorerProvider.getChildren(treeItems[walletIndex]);
            }
        } else {
            throw new Error('Name of panel doesn\'t exist');
        }

        const treeItem: any = treeItems.find((item: any) => {
            return item.label === label;
        });

        if (shouldOrshouldnt === 'should') {
            should.exist(treeItem);
            this.treeItem = treeItem;
        } else {
            should.not.exist(treeItem);
        }
    });

    this.Then(/^the '(Smart Contracts|Fabric Environments|Fabric Gateways|Fabric Wallets)' tree item should have a child '(.*)'$/, this.timeout, async (panel: string, childName: string) => {
        let children: any;
        if (panel === 'Fabric Wallets') {
            const blockchainWalletExplorerProvider: BlockchainWalletExplorerProvider = ExtensionUtil.getBlockchainWalletExplorerProvider();
            const allTreeItems: any[] = await blockchainWalletExplorerProvider.getChildren();
            const parent: any = allTreeItems.find((item: any) => {
                return item.label === this.treeItem.label;
            });

            children = await blockchainWalletExplorerProvider.getChildren(parent);

        } else if (panel === 'Fabric Gateways') {
            const blockchainGatewayExplorerProvider: BlockchainGatewayExplorerProvider = ExtensionUtil.getBlockchainGatewayExplorerProvider();
            const allTreeItems: any[] = await blockchainGatewayExplorerProvider.getChildren();
            const parent: any = allTreeItems.find((item: any) => {
                return item.label === this.treeItem.label;
            });

            children = await blockchainGatewayExplorerProvider.getChildren(parent);

        } else if (panel === 'Fabric Environments') {
            const blockchainEnvironmentExplorerProvider: BlockchainEnvironmentExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();
            const allTreeItems: any[] = await blockchainEnvironmentExplorerProvider.getChildren();
            const parent: any = allTreeItems.find((item: any) => {
                return item.label === this.treeItem.label;
            });

            children = await blockchainEnvironmentExplorerProvider.getChildren(parent);
        }

        // Expand on this 'if' statement when required!

        // Set this.treeItem to be the child in question
        this.treeItem = children.find((child: any) => {
            return child.label === childName;
        });
    });

    this.Then(/the tree item should have a tooltip equal to '(.*)'/, this.timeout, async (tooltipValue: string) => {
        tooltipValue = tooltipValue.replace(/\\n/g, `\n`); // Add line breaks
        this.treeItem.tooltip.should.equal(tooltipValue);
    });

    this.Then("the logger should have been called with '{string}', '{string}' and '{string}'", this.timeout, async (type: string, popupMessage: string, outputMessage: string) => {
        if (popupMessage === 'undefined') {
            popupMessage = undefined;
        }
        this.userInputUtilHelper.logSpy.should.have.been.calledWith(type, popupMessage, outputMessage);
    });

    this.Then("the log should have been called with '{string}' and '{string}'", this.timeout, async (type: string, popupMessage: string) => {
        this.userInputUtilHelper.logSpy.should.have.been.calledWith(type, popupMessage);
    });
};
