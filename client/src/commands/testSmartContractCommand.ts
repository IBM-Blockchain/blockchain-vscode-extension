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
import { UserInputUtil, IBlockchainQuickPickItem } from './UserInputUtil';
import { FabricConnectionManager } from '../fabric/FabricConnectionManager';
import { IFabricConnection } from '../fabric/IFabricConnection';
import { VSCodeOutputAdapter } from '../logging/VSCodeOutputAdapter';
import { Reporter } from '../util/Reporter';
import { CommandUtil } from '../util/CommandUtil';
import { InstantiatedChaincodeTreeItem } from '../explorer/model/InstantiatedChaincodeTreeItem';
import { FabricConnectionRegistryEntry } from '../fabric/FabricConnectionRegistryEntry';

export async function testSmartContract(chaincode?: InstantiatedChaincodeTreeItem): Promise<void> {
    console.log('testSmartContractCommand', chaincode);

    let chaincodeLabel: string;
    let chosenChaincode: IBlockchainQuickPickItem<{ name: string, channel: string, version: string}>;
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

        // Ask for instantiated smart contract
        chosenChaincode = await UserInputUtil.showInstantiatedSmartContractsQuickPick('Please choose instantiated smart contract to test');
        if (!chosenChaincode) {
            return;
        }
        chaincodeLabel = chosenChaincode.label;
        chaincodeName = chosenChaincode.data.name;
        chaincodeVersion = chosenChaincode.data.version;
        channelName = chosenChaincode.data.channel;

    } else {
        // Smart Contract selected from the tree item, so assign label and name
        chaincodeLabel = chaincode.label;
        chaincodeName = chaincode.name;
        channelName = chaincode.channel.label;
        chaincodeVersion = chaincode.version;
    }
    console.log('testSmartContractCommand: chaincode to generate tests for is: ' + chaincodeLabel);

    // Ask the user which language to write the tests in
    const testLanguage: string = await UserInputUtil.showLanguagesQuickPick('Choose preferred test language', ['JavaScript', 'TypeScript']);
    let testFileSuiffix: string;
    if (testLanguage === 'JavaScript') {
        testFileSuiffix = 'js';
    } else {
        testFileSuiffix = 'ts';
    }

    // Only generate the test file if the smart contract is open in the workspace
    const workspaceFolders: Array<vscode.WorkspaceFolder> = await UserInputUtil.getWorkspaceFolders();
    if (workspaceFolders.length === 0) {
        vscode.window.showErrorMessage(`Smart contract project ${chaincodeName} is not open in workspace`);
        return;
    }

    const packageJSONSearch: Array<vscode.Uri> = await vscode.workspace.findFiles('**/package.json', '**/node_modules/**', workspaceFolders.length);
    let packageJSONFound: vscode.Uri;
    let functionalTestsDirectory: string;
    let localSmartContractDirectory: string;
    for (packageJSONFound of packageJSONSearch) {
        const packageJSONBuffer: Buffer = await fs.readFile(packageJSONFound.path);
        const packageJSONObj: any = JSON.parse(packageJSONBuffer.toString('utf8'));
        const workspaceProjectName: string = packageJSONObj.name;
        if (workspaceProjectName === chaincodeName) {
            // Smart contract is open in workspace
            functionalTestsDirectory = path.join(packageJSONFound.fsPath, '..', 'functionalTests');
            localSmartContractDirectory = path.join(packageJSONFound.fsPath, '..');
            break;
        }
    }
    if (!functionalTestsDirectory) {
        vscode.window.showErrorMessage(`Smart contract project ${chaincodeName} is not open in workspace`);
        return;
    }

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

    // Get connection details for connection
    let connectionProfilePath: string;
    let certificatePath: string;
    let privateKeyPath: string;

    const fabricConnectionRegistryEntry: FabricConnectionRegistryEntry = FabricConnectionManager.instance().getConnectionRegistryEntry();
    if (fabricConnectionRegistryEntry.managedRuntime) {
        // connection details are saved to disk in our directory
        const extDir: string = vscode.workspace.getConfiguration().get('blockchain.ext.directory');
        const homeExtDir: string = await UserInputUtil.getDirPath(extDir);

        connectionProfilePath = path.join(homeExtDir, 'local_fabric', 'connection.json');
        certificatePath = path.join(homeExtDir, 'local_fabric', 'certificate');
        privateKeyPath = path.join(homeExtDir, 'local_fabric', 'privateKey');
    } else {
        // Client connection, so connection details are all paths
        const connectionDetails: {connectionProfile: object, certificatePath: string, privateKeyPath: string} | {connectionProfilePath: string, certificatePath: string, privateKeyPath: string} = await connection.getConnectionDetails();
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
    const template: string = path.join(__dirname, '..', '..', '..', 'templates', `${testFileSuiffix}TestSmartContractTemplate.ejs`);
    let dataToWrite: string;
    try {
        dataToWrite = await createDataToWrite(template, templateData);
    } catch (error) {
        vscode.window.showErrorMessage('Error creating template data: ' + error.message);
        return;
    }

    // Determine if test file already exists
    const outputAdapter: VSCodeOutputAdapter = VSCodeOutputAdapter.instance();
    let testFile: string = path.join(functionalTestsDirectory, `${chaincodeLabel}.test.${testFileSuiffix}`);
    const testFileExists: boolean = await fs.pathExists(testFile);
    let overwriteTestFile: string;
    if (testFileExists) {
        // Ask the user if they want to overwrite existing test file
        overwriteTestFile = await UserInputUtil.showTestFileOverwriteQuickPick('Test file for selected smart contract already exists in workspace, overwrite it?');
        if (!overwriteTestFile) {
            // User cancelled the overwrite options box, so exit
            outputAdapter.log(`Preserving test file for instantiated smart contract located here: ${testFile}`);
            return;
        }
    }
    if (overwriteTestFile === UserInputUtil.NO) {
        // Don't create test file, user doesn't want to overwrite existing, but tell them where it is:
        outputAdapter.log(`Preserving test file for instantiated smart contract located here: ${testFile}`);
        return;
    } else if (overwriteTestFile === UserInputUtil.GENERATE_NEW_TEST_FILE) {
        // Generate copy of test file, indicate a copy has been created in the file name
        let i: number = 1;
        while (await fs.pathExists(testFile)) {
            testFile = path.join(functionalTestsDirectory, `${chaincodeLabel}-copy${i}.test.${testFileSuiffix}`);
            i++;
        }
    }

    // Create the test file
    try {
        await fs.ensureFile(testFile);
    } catch (error) {
        console.log('Errored creating test file: ' + testFile);
        vscode.window.showErrorMessage('Error creating test file: ' + error.message);
        await removeTestFile(testFile);
        return;
    }
    outputAdapter.log(`Writing to Smart Contract test file: ${testFile}`);

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
        await removeTestFile(testFile);
        return;

    }
    await document.save();

    // Run npm install in smart contract project
    try {
        await installNodeModules(localSmartContractDirectory, testLanguage);
    } catch (error) {
        vscode.window.showErrorMessage('Error installing node modules in smart contract project: ' + error.message);
        return;
    }

    // If TypeScript, update JavaScript Test Runner user settings
    if (testLanguage === 'TypeScript') {
        const runnerArgs: string = vscode.workspace.getConfiguration().get('javascript-test-runner.additionalArgs') as string;
        if (!runnerArgs || !runnerArgs.includes('-r ts-node/register')) {
            // If the user has removed JavaScript Test Runner since generating tests, this update will silently fail
            await vscode.workspace.getConfiguration().update('javascript-test-runner.additionalArgs', '-r ts-node/register', vscode.ConfigurationTarget.Global);
        }
    }

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

async function removeTestFile(fileToRemove: string): Promise<void> {
    console.log('Something went wrong, so cleaning up and removing test file:', fileToRemove);

    try {
        await fs.remove(fileToRemove);
    } catch (error) {
        if (!error.message.includes('ENOENT: no such file or directory')) {
            vscode.window.showErrorMessage('Error removing test file: ' + error.message);
            return;
        }
    }
}

async function installNodeModules(dir: string, language: string): Promise<void> {
    const outputAdapter: VSCodeOutputAdapter = VSCodeOutputAdapter.instance();
    let npmInstallOut: string;

    if (language === 'TypeScript') {
        outputAdapter.log('Installing package dependencies including: fabric-network@beta, fabric-client@beta, @types/mocha');
        npmInstallOut = await CommandUtil.sendCommandWithProgress('npm install && npm install fabric-network@beta fabric-client@beta @types/mocha', dir, 'Installing npm and package dependencies in smart contract project');
    } else {
        outputAdapter.log('Installing package dependencies including: fabric-network@beta, fabric-client@beta');
        npmInstallOut = await CommandUtil.sendCommandWithProgress('npm install && npm install fabric-network@beta fabric-client@beta', dir, 'Installing npm and package dependencies in smart contract project');
    }
    outputAdapter.log(npmInstallOut);
}
