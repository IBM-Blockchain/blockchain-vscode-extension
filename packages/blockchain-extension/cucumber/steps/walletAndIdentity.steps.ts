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
import { FabricWalletUtil } from '../../extension/fabric/FabricWalletUtil';
import { FabricRuntimeUtil } from 'ibm-blockchain-platform-common';
import { BlockchainWalletExplorerProvider } from '../../extension/explorer/walletExplorer';
import { BlockchainTreeItem } from '../../extension/explorer/model/BlockchainTreeItem';
import { ExtensionUtil } from '../../extension/util/ExtensionUtil';

// tslint:disable:no-unused-expression

chai.use(sinonChai);
chai.use(chaiAsPromised);

module.exports = function(): any {
    /**
     * Given
     */

    this.Given("the '{string}' wallet", this.timeout, async (wallet: string) => {
        if (wallet === FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME) {
            wallet = FabricWalletUtil.LOCAL_WALLET;
        }
        // Might want to detect if 'Local Fabric', then use FabricRuntime/WalletUtil
        this.wallet = wallet;
    });

    this.Given("the '{string}' identity", this.timeout, async (identity: string) => {
        if (identity === 'Local Fabric Admin') {
            identity = FabricRuntimeUtil.ADMIN_USER;
        }
        this.identity = identity;
    });

    this.Given(/the identity '(\S*?)'(?: with attributes )?'?(\S*?)?'? exists$/, this.timeout, async (identity: string, attributes: string) => {
        await this.walletAndIdentityHelper.createCAIdentity(this.wallet, identity, attributes);
        this.identity = identity;
    });

    this.Given(/the wallet '(.*?)' with identity '(.*?)' and mspid '(.*?)' exists/, this.timeout, async (wallet: string, identity: string, mspid: string) => {
        const blockchainWalletExplorerProvider: BlockchainWalletExplorerProvider = ExtensionUtil.getBlockchainWalletExplorerProvider();
        let treeItems: BlockchainTreeItem[] = await blockchainWalletExplorerProvider.getChildren();
        const walletIndex: number = treeItems.findIndex((item: any) => {
            return item.label === wallet;
        });
        if (walletIndex < 0) {
            await this.walletAndIdentityHelper.createWallet(wallet, identity, mspid, 'certs');
        } else {
            treeItems = await blockchainWalletExplorerProvider.getChildren(treeItems[walletIndex]);

            const identityExists: BlockchainTreeItem = treeItems.find((item: any) => {
                return item.label === identity;
            });

            if (!identityExists) {
                await this.walletAndIdentityHelper.createIdentity(wallet, identity, mspid, 'certs');
            }
        }

        this.wallet = wallet;
        this.identity = identity;
    });

    /**
     * When
     */

    this.When(/^I create a wallet '(.*?)' using (certs|enrollId|JSON file) with identity name '(.*?)' and mspid '(.*?)'$/, this.timeout, async (wallet: string, method: string, identityName: string, mspid: string) => {
        await this.walletAndIdentityHelper.createWallet(wallet, identityName, mspid, method);
    });

    this.When(/^I create an identity using (certs|enrollId|JSON file) with identity name '(.*?)' and mspid '(.*?)' in wallet '(.*?)'$/, this.timeout, async (method: string, identityName: string, mspid: string, wallet: string) => {
        await this.walletAndIdentityHelper.createIdentity(wallet, identityName, mspid, method);
    });

    this.When(/I register a new identity '(.*?)' (?:with the attributes)? '(.*?)'?$/, this.timeout, async (identity: string, attributes: string) => {
        await this.walletAndIdentityHelper.createCAIdentity(this.wallet, identity, attributes);
    });

    this.When(/I delete the identity '(.*?)'$/, this.timeout, async (identity: string) => {
        await this.walletAndIdentityHelper.deleteCAIdentity(identity);
    });
};
