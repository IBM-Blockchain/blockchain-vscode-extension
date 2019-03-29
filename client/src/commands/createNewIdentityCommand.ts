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
import { ExtensionCommands } from '../../ExtensionCommands';
import { CertificateAuthorityTreeItem } from '../explorer/runtimeOps/CertificateAuthorityTreeItem';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../logging/OutputAdapter';
import { UserInputUtil } from './UserInputUtil';
import { FabricRuntimeManager } from '../fabric/FabricRuntimeManager';
import { IFabricWallet } from '../fabric/IFabricWallet';
import { FabricRuntime } from '../fabric/FabricRuntime';
import { FabricConnectionFactory } from '../fabric/FabricConnectionFactory';
import { IFabricRuntimeConnection } from '../fabric/IFabricRuntimeConnection';

export async function createNewIdentity(certificateAuthorityTreeItem?: CertificateAuthorityTreeItem): Promise<void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'createNewIdentity');

    if (!certificateAuthorityTreeItem) {
        // Command called from the command palette or elsewhere
        // Check runtime is running
        const isRunning: boolean = await FabricRuntimeManager.instance().getRuntime().isRunning();
        if (!isRunning) {
            // Start local_fabric to connect
            await vscode.commands.executeCommand(ExtensionCommands.START_FABRIC);
            if (!(await FabricRuntimeManager.instance().getRuntime().isRunning())) {
                // Start local_fabric failed so return
                return;
            }
        }
        // Ask which certificate authority to use
        const certificateAuthorityName: string = await UserInputUtil.showCertificateAuthorityQuickPickBox('Choose certificate authority to create a new identity with');
        if (!certificateAuthorityName) {
            return;
        }
    }

    // Ask for identity name
    const identityName: string = await UserInputUtil.showInputBox('Provide a name for the identity');
    if (!identityName) {
        return;
    }

    let connection: IFabricRuntimeConnection;

    try {
        const mspid: string = 'Org1MSP';
        const adminName: string = 'Admin@org1.example.com';
        const affiliation: string = 'org1.department1'; // Currently works for org1.department1, org1.department2
        // check to see if identity of same name exists
        const wallet: IFabricWallet = FabricRuntimeManager.instance().gatewayWallet;
        const identityExists: boolean = await wallet.exists(identityName);
        if (identityExists) {
            outputAdapter.log(LogType.ERROR, `An identity called ${identityName} already exists in the runtime wallet`, `An identity called ${identityName} already exists in the runtime wallet`);
            return;
        }

        const runtime: FabricRuntime = await FabricRuntimeManager.instance().getRuntime();
        connection = FabricConnectionFactory.createFabricRuntimeConnection(runtime);
        // Connect and then register the user
        await connection.connect(wallet, adminName);
        const secret: string = await connection.register(identityName, affiliation);

        // Enroll the user
        const details: { certificate: string, privateKey: string } = await connection.enroll(identityName, secret);

        // Import the new identity to the gateway wallet (no -ops in the name)
        await wallet.importIdentity(details.certificate, details.privateKey, identityName, mspid);

        await vscode.commands.executeCommand(ExtensionCommands.REFRESH_WALLETS);
        outputAdapter.log(LogType.SUCCESS, 'Successfully added identity', `Successfully added ${identityName} to runtime gateway`);

        await connection.disconnect();
        return;
    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Issue creating new identity: ${error.message}`, `Issue creating new identity: ${error.toString()}`);

        await connection.disconnect();
        return;
    }
}
