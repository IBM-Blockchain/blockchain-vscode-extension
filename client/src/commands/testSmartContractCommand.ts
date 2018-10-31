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
import * as ejs from 'ejs';
import * as path from 'path';
import { ChainCodeTreeItem } from '../explorer/model/ChainCodeTreeItem';
import { UserInputUtil, IBlockchainQuickPickItem } from './UserInputUtil';
import { FabricConnectionManager } from '../fabric/FabricConnectionManager';
import { IFabricConnection } from '../fabric/IFabricConnection';
import { FabricRuntimeConnection } from '../fabric/FabricRuntimeConnection';
import { VSCodeOutputAdapter } from '../logging/VSCodeOutputAdapter';
import { Reporter } from '../util/Reporter';

export async function testSmartContract(chaincode?: ChainCodeTreeItem): Promise<void> {
    console.log('testSmartContractCommand', chaincode);

    let chaincodeLabel: string;
    let chosenChaincode: IBlockchainQuickPickItem<{ name: string, channel: string, version: string}>;
    let chosenChannel: IBlockchainQuickPickItem<Set<string>>;
    let channelName: string;
    let chaincodeName: string;
    let chaincodeVersion: string;

    // If called from the command palette, ask for instantiated smart contract to test
    if (!chaincode) {
        if (!FabricConnectionManager.instance().getConnection()) {
            // Connect if not already connected
            await vscode.commands.executeCommand('blockchainExplorer.connectEntry');
            if (!FabricConnectionManager.instance().getConnection()) {
                // either the user cancelled or there was an error so don't carry on
                return;
            }
        }
        try {
            // Ask for a channel
            chosenChannel = await UserInputUtil.showChannelQuickPickBox('Please chose channel of instantiated smart contract to test');
            if (!chosenChannel) {
                return;
            }
            channelName = chosenChannel.label;
        } catch (error) {
            vscode.window.showErrorMessage(error.message);
            return;
        }

        // Ask for instantiated smart contract on chosen channel
        chosenChaincode = await UserInputUtil.showInstantiatedSmartContractsQuickPick('Please chose instantiated smart contract to test', channelName);
        if (!chosenChaincode) {
            return;
        }
        chaincodeLabel = chosenChaincode.label;
        chaincodeName = chosenChaincode.data.name;
        chaincodeVersion = chosenChaincode.data.version;

    } else {
        // Smart Contract selected from the tree item, so assign label and name
        chaincodeLabel = chaincode.label;
        chaincodeName = chaincode.name;
        channelName = chaincode.channel.label;
        chaincodeVersion = chaincode.version;
    }
    console.log('testSmartContractCommand: chaincode to generate tests for is: ' + chaincodeLabel);

    // Get the metadata for the chosen instantiated smart contract
    const connection: IFabricConnection = FabricConnectionManager.instance().getConnection();
    let metadataObj: any;
    try {
        metadataObj = await connection.getMetadata(chaincodeName, channelName);
    } catch (error) {
        console.log('Error getting the metadata: ' + error);
        vscode.window.showErrorMessage('Error getting metadata for smart contract: ' + error.message);
        return;
    }

    // Get extension directory
    const extDir: string = vscode.workspace.getConfiguration().get('blockchain.ext.directory');
    const homeExtDir: string = await UserInputUtil.getDirPath(extDir);
    const testCommandDir: string = path.join(homeExtDir, 'test', chaincodeLabel);

    // Get connection details for connection
    const connectionDetails: {connectionProfile: object, certificatePath: string, privateKeyPath: string} | {connectionProfilePath: string, certificatePath: string, privateKeyPath: string} = await connection.getConnectionDetails();
    let connectionProfilePath: string;
    let certificatePath: string;
    let privateKeyPath: string;

    if (connection instanceof FabricRuntimeConnection) {
        // connection profile is an object not a path, so write it to a file
        const runtimeConnectionDetails: {connectionProfile: object, certificatePath: string, privateKeyPath: string} = connectionDetails as {connectionProfile: object, certificatePath: string, privateKeyPath: string};
        const runtimeConnectionProfilePath: string = path.join(testCommandDir, 'connection.json');
        const connectionProfile: string = JSON.stringify(runtimeConnectionDetails.connectionProfile, null, 4);
        try {
            await fs.ensureFile(runtimeConnectionProfilePath);
            await fs.writeFileSync(runtimeConnectionProfilePath, connectionProfile);
        } catch (error) {
            vscode.window.showErrorMessage('Error writing runtime connection profile: ' + error.message);
            await removeDirectory(testCommandDir);
            return;
        }
        connectionProfilePath = runtimeConnectionProfilePath;
        certificatePath = runtimeConnectionDetails.certificatePath;
        privateKeyPath = runtimeConnectionDetails.privateKeyPath;
    } else {
        // Client connection, so connection details are all paths
        const clientConnectionDetails: {connectionProfilePath: string, certificatePath: string, privateKeyPath: string} = connectionDetails as {connectionProfilePath: string, certificatePath: string, privateKeyPath: string};
        connectionProfilePath = clientConnectionDetails.connectionProfilePath;
        certificatePath = clientConnectionDetails.certificatePath;
        privateKeyPath = clientConnectionDetails.privateKeyPath;
    }

    // Populate the template data
    // TODO: Needs updating when the metadata is updated:
    // tslint:disable-next-line
    const smartContractFunctionsArray: string[] = metadataObj[""].functions;

    const templateData: any = {
        chaincodeLabel: chaincodeLabel,
        functionNames: smartContractFunctionsArray,
        connectionProfilePath: connectionProfilePath,
        certificatePath: certificatePath,
        privateKeyPath: privateKeyPath,
        chaincodeName: chaincodeName,
        chaincodeVersion: chaincodeVersion,
        channelName: channelName
    };
    console.log('template data is: ');
    console.log(templateData);

    // Create data to write to file from template engine
    const template: string = path.join(__dirname, '..', '..', '..', 'templates', 'testSmartContractTemplate.ejs');
    let dataToWrite: string;
    try {
        dataToWrite = await createDataToWrite(template, templateData);
    } catch (error) {
        vscode.window.showErrorMessage('Error creating template data: ' + error.message);
        await removeDirectory(testCommandDir);
        return;
    }

    // Create the test file
    const outputAdapter: VSCodeOutputAdapter = VSCodeOutputAdapter.instance();
    const testFile: string = path.join(testCommandDir, `${chaincodeLabel}.test.js`);
    const testFileExists: boolean = await fs.pathExists(testFile);
    if (testFileExists) {
        // Ask the user if they want to overwrite existing test file
        const overwriteTestFile: string = await UserInputUtil.showQuickPickYesNo(`Test file for selected smart contract already exists in workspace, overwrite it?`);
        if (overwriteTestFile === UserInputUtil.NO) {
            // Don't create test file, user doesn't want to overwrite existing, but tell them where it is:
            outputAdapter.log(`Preserving test file for instantiated smart contract located here: ${testFile}`);
            return;
        }
        outputAdapter.log(`Writing to Smart Contract test file: ${testFile}`);
    } else {
        // Test file doesn't already exist, so create it
        try {
            await fs.ensureFile(testFile);
        } catch (error) {
            console.log('Errored creating test file: ' + testFile);
            vscode.window.showErrorMessage('Error creating test file: ' + error.message);
            await removeDirectory(testCommandDir);
            return;
        }
        outputAdapter.log(`Created Smart Contract test file: ${testFile}`);
    }

   // Open, show and write to test file
    const document: vscode.TextDocument = await vscode.workspace.openTextDocument(testFile);

    const showTextDocumentOptions: any = {
        preserveFocus: true,
        selection: new vscode.Range(0, 0, 12, 2) // Only highlights comment when overwriting the test file
    };
    const textEditor: vscode.TextEditor = await vscode.window.showTextDocument(document, showTextDocumentOptions);

    const lineCount: number = document.lineCount;
    const textEditorResult: boolean = await textEditor.edit((editBuilder: vscode.TextEditorEdit) => {
            editBuilder.replace(new vscode.Range(0, 0, lineCount, 0), dataToWrite);
        });
    if (!textEditorResult) {
        vscode.window.showErrorMessage('Error editing test file: ' + testFile);
        await removeDirectory(testCommandDir);
        return;

    }
    await document.save();

    Reporter.instance().sendTelemetryEvent('testSmartContractCommand');

}

async function createDataToWrite(template: string, templateData: any): Promise<any> {
    console.log('TestSmartContractCommand: createDataToWrite using template file:', template);

    const ejsOptions: ejs.Options = {
        async: true,
    };
    return new Promise ( (resolve: any, reject: any): any => {
        // TODO: promisify this?
        ejs.renderFile(template, templateData, ejsOptions, (error: any, data: any) => {
            if (error) {
                reject(error);
            } else {
                resolve(data);
            }
         });
    });
}

async function removeDirectory(dirToRemove: string): Promise<void> {
    console.log('Something went wrong, so cleaning up and removing test directory:', dirToRemove);

    try {
        await fs.remove(dirToRemove);
    } catch (error) {
        if (!error.message.includes('ENOENT: no such file or directory')) {
            vscode.window.showErrorMessage('Error removing test command directory: ' + error.message);
            return;
        }
    }
}
