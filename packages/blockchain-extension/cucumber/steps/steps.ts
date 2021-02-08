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
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';
import {BlockchainWalletExplorerProvider} from '../../extension/explorer/walletExplorer';
import {BlockchainGatewayExplorerProvider} from '../../extension/explorer/gatewayExplorer';
import {BlockchainEnvironmentExplorerProvider} from '../../extension/explorer/environmentExplorer';
import {BlockchainPackageExplorerProvider} from '../../extension/explorer/packageExplorer';
import {ExtensionUtil} from '../../extension/util/ExtensionUtil';

// tslint:disable:no-unused-expression

chai.use(sinonChai);
chai.use(chaiAsPromised);
const should: Chai.Should = chai.should();

export enum LanguageType {
    CHAINCODE = 'chaincode',
    CONTRACT = 'contract'
}

module.exports = function(): any {

    this.Then(/^there (should|shouldn't) be an? (environment connected |committed smart contract |channel |Node |Organizations |identity )?tree item with a label '(.*?)' in the '(Smart Contracts|Fabric Environments|Fabric Gateways|Fabric Wallets)' panel( for item| for the current tree item)?( .*)?$/, this.timeout, async (shouldOrshouldnt: string, child: string, label: string, panel: string, thing2: string, thing: string) => {
        let treeItems: any[] = [];
        if (panel === 'Smart Contracts') {
            const blockchainPackageExplorerProvider: BlockchainPackageExplorerProvider = ExtensionUtil.getBlockchainPackageExplorerProvider();
            treeItems = await blockchainPackageExplorerProvider.getChildren();
        } else if (panel === 'Fabric Environments') {
            const blockchainRuntimeExplorerProvider: BlockchainEnvironmentExplorerProvider = ExtensionUtil.getBlockchainEnvironmentExplorerProvider();
            if (!child) {
                treeItems = await blockchainRuntimeExplorerProvider.getChildren();
            } else if (child.includes('environment connected')) {
                const allTreeItems: any[] = await blockchainRuntimeExplorerProvider.getChildren();
                treeItems = [allTreeItems[0]]; // Connected to
            } else if (child.includes('channel')) {
                const allTreeItems: any[] = await blockchainRuntimeExplorerProvider.getChildren();
                for (let i: number = 1; i < allTreeItems.length - 2; i++) {
                    treeItems.push(allTreeItems[i]); // channels
                }
            } else if (child.includes('committed smart contract')) {
                const allTreeItems: any[] = await blockchainRuntimeExplorerProvider.getChildren();

                const channelItemIndex: number = allTreeItems.findIndex((item: any) => {
                    return thing.trim() === item.label;
                });

                treeItems = await blockchainRuntimeExplorerProvider.getChildren(allTreeItems[channelItemIndex]); // committed smart contracts
            } else if (child.includes('Node')) {
                const allTreeItems: any[] = await blockchainRuntimeExplorerProvider.getChildren();
                treeItems = await blockchainRuntimeExplorerProvider.getChildren(allTreeItems[allTreeItems.length - 2]); // Nodes
            } else if (child.includes('Organizations')) {
                const allTreeItems: any[] = await blockchainRuntimeExplorerProvider.getChildren();
                treeItems = await blockchainRuntimeExplorerProvider.getChildren(allTreeItems[allTreeItems.length - 1]); // Organizations
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

    this.Then(/the tree item should have a tooltip (equal|including) to '(.*)'/, this.timeout, async (operator: string, tooltipValue: string) => {
        tooltipValue = tooltipValue.replace(/\\n/g, `\n`); // Add line breaks
        if (operator === 'equal') {
            this.treeItem.tooltip.should.equal(tooltipValue);
        } else if (operator === 'including') {
            this.treeItem.tooltip.includes(tooltipValue).should.equal(true);
        } else {
            throw new Error('Unknown operator for step.');
        }
    });

    this.Then(/the file size should be greater than '(.*)' KB/, this.timeout, async (value: string) => {
        const regex: RegExp = /File size: (.*?) KB/;
        const fileSize: string = this.treeItem.tooltip.match(regex)[1];
        (fileSize >= value).should.equal(true);
    });

    this.Then("the logger should have been called with '{string}', '{string}' and '{string}'", this.timeout, async (type: string, popupMessage: string, outputMessage: string) => {
        if (popupMessage === 'undefined') {
            popupMessage = undefined;
        }
        this.userInputUtilHelper.logSpy.should.have.been.calledWith(type, popupMessage, outputMessage);
    });

    this.Then("the log should have been called with '{string}' and '{string}'", this.timeout, async (type: string, popupMessage: string) => {
        this.userInputUtilHelper.logSpy.should.have.been.calledWith(type, sinon.match(popupMessage));
    });
};
