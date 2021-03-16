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
import { PackageRegistryEntry } from '../registries/PackageRegistryEntry';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';
import { VSCodeBlockchainDockerOutputAdapter } from '../logging/VSCodeBlockchainDockerOutputAdapter';
import { FabricEnvironmentRegistryEntry, IFabricEnvironmentConnection, LogType, EnvironmentType, FabricCollectionDefinition } from 'ibm-blockchain-platform-common';
import { FabricEnvironmentManager } from '../fabric/environments/FabricEnvironmentManager';
import { FabricInstalledSmartContract } from 'ibm-blockchain-platform-common/build/src/fabricModel/FabricInstalledSmartContract';

export async function instantiateSmartContract(channelName: string, peerNames: Array<string>, selectedPackage: PackageRegistryEntry, instantiateFunctionName: string, instantiateFunctionArgs: string[], endorsementPolicy: any, collectionConfig: FabricCollectionDefinition[]): Promise<void> {

    let smartContractName: string;
    let smartContractVersion: string;
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, 'instantiateSmartContract');

    // can assume a connection, if there isn't one then something when wrong so just return out
    const connection: IFabricEnvironmentConnection = FabricEnvironmentManager.instance().getConnection();
    if (!connection) {
        return;
    }

    try {
        const isPackageInstalled: boolean = await checkPackageInstalled(connection, peerNames, selectedPackage);

        if (!isPackageInstalled) {
            // Install smart contract package
            const channelMap: Map<string, string[]> = await connection.createChannelMap();
            const installResult: string[] = await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT, channelMap, selectedPackage);

            // If there was a timeout but the package was marked as installed, inform the user and exit. Also exit if it failed for other reasons.
            if(installResult[1] && installResult[1] !== 'none') {
                if (installResult[1] === 'timeout') {
                    const didInstallWork: boolean = await checkPackageInstalled(connection, peerNames, selectedPackage);
                    if (didInstallWork) {
                        throw new Error('Chaincode installed but timed out waiting for the chaincode image to build. Please redeploy your chaincode package to attempt instantiation');
                    }
                }
                throw new Error('failed to get contract from peer after install');
            }
        }

        smartContractName = selectedPackage.name;
        smartContractVersion = selectedPackage.version;

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'IBM Blockchain Platform Extension',
            cancellable: false
        }, async (progress: vscode.Progress<{ message: string }>) => {

            progress.report({ message: 'Instantiating Smart Contract' });

            const fabricEnvironmentRegistryEntry: FabricEnvironmentRegistryEntry = FabricEnvironmentManager.instance().getEnvironmentRegistryEntry();
            if (fabricEnvironmentRegistryEntry.environmentType === EnvironmentType.LOCAL_MICROFAB_ENVIRONMENT) {
                VSCodeBlockchainDockerOutputAdapter.instance(fabricEnvironmentRegistryEntry.name).show();
            }

            await connection.instantiateChaincode(smartContractName, smartContractVersion, peerNames, channelName, instantiateFunctionName, instantiateFunctionArgs, collectionConfig, endorsementPolicy);

            Reporter.instance().sendTelemetryEvent('instantiateCommand');

            outputAdapter.log(LogType.SUCCESS, 'Successfully instantiated smart contract');
            await vscode.commands.executeCommand(ExtensionCommands.REFRESH_GATEWAYS);
            await vscode.commands.executeCommand(ExtensionCommands.REFRESH_ENVIRONMENTS);
        });
    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Error instantiating smart contract: ${error.message}`, `Error instantiating smart contract: ${error.toString()}`);
        return;
    }
}

async function checkPackageInstalled(connection: IFabricEnvironmentConnection, peerNames: string[], selectedPackage: PackageRegistryEntry): Promise<boolean> {
    let installedChaincode: FabricInstalledSmartContract[] = await connection.getInstalledSmartContracts(peerNames[0], true);
    installedChaincode = installedChaincode.filter((chaincode: FabricInstalledSmartContract) => {
        return chaincode.label === `${selectedPackage.name}@${selectedPackage.version}` && chaincode.packageId === selectedPackage.name;
    });

    return (installedChaincode.length > 0);
}
