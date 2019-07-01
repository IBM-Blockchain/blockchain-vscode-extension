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
import { Reporter } from '../util/Reporter';
import { ExtensionCommands } from '../../ExtensionCommands';
import { CertificateAuthorityTreeItem } from '../explorer/runtimeOps/CertificateAuthorityTreeItem';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../logging/OutputAdapter';
import { UserInputUtil } from './UserInputUtil';
import { IFabricWallet } from '../fabric/IFabricWallet';
import { IFabricEnvironmentConnection } from '../fabric/IFabricEnvironmentConnection';
import { FabricNode } from '../fabric/FabricNode';
import { FabricEnvironmentManager } from '../fabric/FabricEnvironmentManager';

export async function createNewIdentity(certificateAuthorityTreeItem?: CertificateAuthorityTreeItem): Promise<void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'createNewIdentity');

    let certificateAuthorityName: string;
    let connection: IFabricEnvironmentConnection = await FabricEnvironmentManager.instance().getConnection();
    if (!connection) {
        await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_ENVIRONMENT);
        connection = await FabricEnvironmentManager.instance().getConnection();
        if (!connection) {
            // something went wrong with connecting so return
            return;
        }
    }

    if (!certificateAuthorityTreeItem) {
        // Ask which certificate authority to use
        certificateAuthorityName = await UserInputUtil.showCertificateAuthorityQuickPickBox('Choose certificate authority to create a new identity with');
        if (!certificateAuthorityName) {
            return;
        }
    } else {
        certificateAuthorityName = certificateAuthorityTreeItem.name;
    }

    // Ask for identity name
    const identityName: string = await UserInputUtil.showInputBox('Provide a name for the identity');
    if (!identityName) {
        return;
    }

    try {
        // check to see if identity of same name exists
        const wallet: IFabricWallet = await connection.getWallet(certificateAuthorityName);
        const identityExists: boolean = await wallet.exists(identityName);
        if (identityExists) {
            outputAdapter.log(LogType.ERROR, `An identity called ${identityName} already exists in the runtime wallet`, `An identity called ${identityName} already exists in the runtime wallet`);
            return;
        }

        const caNode: FabricNode = connection.getNode(certificateAuthorityName);
        let mspid: string = caNode.msp_id;

        if (!mspid) {
            const chosenMspid: string = await UserInputUtil.showInputBox('Enter MSPID');
            if (!chosenMspid) {
                return;
            }

            mspid = chosenMspid;
        }

        const affiliation: string = ''; // Give it the same affiliation as the identity registrar

        // Register the user
        const secret: string = await connection.register(certificateAuthorityName, identityName, affiliation);

        // Enroll the user
        const details: { certificate: string, privateKey: string } = await connection.enroll(certificateAuthorityName, identityName, secret);

        // Import the new identity to the wallet
        await wallet.importIdentity(details.certificate, details.privateKey, identityName, mspid);

        await vscode.commands.executeCommand(ExtensionCommands.REFRESH_WALLETS);
        outputAdapter.log(LogType.SUCCESS, 'Successfully added identity', `Successfully added ${identityName} to runtime gateway`);
        Reporter.instance().sendTelemetryEvent('createNewIdentityCommand');
    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Issue creating new identity: ${error.message}`, `Issue creating new identity: ${error.toString()}`);
    }
}
