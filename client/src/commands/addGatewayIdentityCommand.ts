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
import * as fs from 'fs-extra';
import { UserInputUtil, IBlockchainQuickPickItem } from './UserInputUtil';
import { VSCodeOutputAdapter } from '../logging/VSCodeOutputAdapter';
import { LogType } from '../logging/OutputAdapter';
import { ParsedCertificate } from '../fabric/ParsedCertificate';
import { ExtensionUtil } from '../util/ExtensionUtil';
import { IFabricWallet } from '../fabric/IFabricWallet';
import { IFabricWalletGenerator } from '../fabric/IFabricWalletGenerator';
import { FabricWalletGeneratorFactory } from '../fabric/FabricWalletGeneratorFactory';
import { GatewayTreeItem } from '../explorer/model/GatewayTreeItem';
import { FabricGatewayRegistryEntry } from '../fabric/FabricGatewayRegistryEntry';
import { FabricGatewayHelper } from '../fabric/FabricGatewayHelper';

export async function addGatewayIdentity(gatewayItem: GatewayTreeItem): Promise<{} | void> {
    const outputAdapter: VSCodeOutputAdapter = VSCodeOutputAdapter.instance();
    let gatewayRegistryEntry: FabricGatewayRegistryEntry;
    outputAdapter.log(LogType.INFO, undefined, 'addGatewayIdentity');

    if (gatewayItem) {
        gatewayRegistryEntry = gatewayItem.gateway;
    } else {
        const chosenEntry: IBlockchainQuickPickItem<FabricGatewayRegistryEntry> = await UserInputUtil.showGatewayQuickPickBox('Choose a gateway to add an identity to', false);
        if (!chosenEntry) {
            return;
        }

        gatewayRegistryEntry = chosenEntry.data;
    }

    if (!FabricGatewayHelper.isCompleted(gatewayRegistryEntry)) {
        outputAdapter.log(LogType.ERROR, 'Blockchain gateway must be completed first!');
        return;
    }

    // Get the name of the identity
    const identityName: string = await UserInputUtil.showInputBox('Provide a name for the identity');
    if (!identityName) {
        return Promise.resolve();
    }
    // Get the certificate file path
    const certPath: string = await UserInputUtil.browseEdit('Browse for a certificate file', gatewayRegistryEntry.name);
    if (!certPath) {
        return Promise.resolve();
    }
    ParsedCertificate.validPEM(certPath, 'certificate');
    const keyPath: string = await UserInputUtil.browseEdit('Browse for a private key file', gatewayRegistryEntry.name);
    if (!keyPath) {
        return Promise.resolve();
    }
    // Get the private key file path
    ParsedCertificate.validPEM(keyPath, 'private key');

    const FabricWalletGenerator: IFabricWalletGenerator = FabricWalletGeneratorFactory.createFabricWalletGenerator();
    const wallet: IFabricWallet = FabricWalletGenerator.getNewWallet(gatewayRegistryEntry.name, gatewayRegistryEntry.walletPath);

    const connectionProfile: object = await ExtensionUtil.readConnectionProfile(gatewayRegistryEntry.connectionProfilePath);
    const certificate: string = await fs.readFile(certPath, 'utf8');
    const privateKey: string = await fs.readFile(keyPath, 'utf8');

    await wallet.importIdentity(connectionProfile, certificate, privateKey, identityName);
    await vscode.commands.executeCommand('blockchainConnectionsExplorer.refreshEntry');
    outputAdapter.log(LogType.SUCCESS, 'Successfully added identity', `Successfully added identity to gateway '${gatewayRegistryEntry.name}'`);
}
