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
import * as os from 'os';
import { UserInputUtil, IBlockchainQuickPickItem, LanguageQuickPickItem } from './UserInputUtil';
import { FabricConnectionManager } from '../fabric/FabricConnectionManager';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { Reporter } from '../util/Reporter';
import { CommandUtil } from '../util/CommandUtil';
import { InstantiatedContractTreeItem } from '../explorer/model/InstantiatedContractTreeItem';
import { FabricGatewayRegistryEntry } from '../fabric/FabricGatewayRegistryEntry';
import { MetadataUtil } from '../util/MetadataUtil';
import { LogType } from '../logging/OutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricWalletRegistryEntry } from '../fabric/FabricWalletRegistryEntry';
import { IFabricClientConnection } from '../fabric/IFabricClientConnection';
import { ContractTreeItem } from '../explorer/model/ContractTreeItem';

export async function testSmartContract(allContracts: boolean, chaincode?: InstantiatedContractTreeItem | ContractTreeItem): Promise<void> {

    let chaincodeLabel: string;
    let chosenChaincode: IBlockchainQuickPickItem<{ name: string, channel: string, version: string }>;
    let channelName: string;
    let chaincodeName: string;
    let chaincodeVersion: string;
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    outputAdapter.log(LogType.INFO, undefined, `testSmartContractCommand`);

    // If called from the command palette, ask for instantiated smart contract to test
    if (!chaincode) {
        if (!FabricConnectionManager.instance().getConnection()) {
            // Connect if not already connected
            await vscode.commands.executeCommand(ExtensionCommands.CONNECT);
            if (!FabricConnectionManager.instance().getConnection()) {
                // either the user cancelled or there was an error so don't carry on
                return;
            }
        }

        // Ask for instantiated smart contract
        chosenChaincode = await UserInputUtil.showClientInstantiatedSmartContractsQuickPick('Please choose instantiated smart contract to test');
        if (!chosenChaincode) {
            return;
        }
        chaincodeLabel = chosenChaincode.label;
        chaincodeName = chosenChaincode.data.name;
        chaincodeVersion = chosenChaincode.data.version;
        channelName = chosenChaincode.data.channel;
    } else {

        if (chaincode instanceof ContractTreeItem) {
            chaincodeLabel = chaincode.instantiatedChaincode.label;
            chaincodeName = chaincode.instantiatedChaincode.name;
            channelName = chaincode.instantiatedChaincode.channel.label;
            chaincodeVersion = chaincode.instantiatedChaincode.version;
        } else {
            // Smart Contract selected from the tree item, so assign label and name
            chaincodeLabel = chaincode.label;
            chaincodeName = chaincode.name;
            channelName = chaincode.channel.label;
            chaincodeVersion = chaincode.version;
        }
    }
    console.log('testSmartContractCommand: chaincode to generate tests for is: ' + chaincodeLabel);

    // Get metadata
    const connection: IFabricClientConnection = FabricConnectionManager.instance().getConnection();

    let transactions: Map<string, any[]> = await MetadataUtil.getTransactions(connection, chaincodeName, channelName, true);
    if (transactions.size === 0) {
        outputAdapter.log(LogType.ERROR, `Populated metadata required for generating smart contract tests, see previous error`);

        return;
    }

    if ((chaincode && chaincode instanceof ContractTreeItem) || (!allContracts && !chaincode && transactions.size > 1)) {
        let chosenContract: string;

        if (chaincode && chaincode instanceof ContractTreeItem) {
            chosenContract = chaincode.name;
        } else {
            chosenContract = await UserInputUtil.showContractQuickPick('Choose a contract to generate tests for', Array.from(transactions.keys()));
            if (!chosenContract) {
                return;
            }
        }

        const tempTransactions: Map<string, any[]> = transactions;
        transactions = new Map<string, any[]>();
        transactions.set(chosenContract, tempTransactions.get(chosenContract));
    }

    // Ask the user which language to write the tests in
    const languagesToSuffixes: object = {
        JavaScript: 'js',
        TypeScript: 'ts'
    };
    const testLanguageItem: LanguageQuickPickItem = await UserInputUtil.showLanguagesQuickPick('Choose preferred test language', [], Object.keys(languagesToSuffixes));
    if (!testLanguageItem) {
        return;
    }
    const testLanguage: string = testLanguageItem.label;
    const testFileSuiffix: string = languagesToSuffixes[testLanguage];

    // Only generate the test file(s) if the smart contract is open in the workspace
    const workspaceFolders: Array<vscode.WorkspaceFolder> = UserInputUtil.getWorkspaceFolders();
    if (workspaceFolders.length === 0) {
        outputAdapter.log(LogType.ERROR, `Smart contract project ${chaincodeName} is not open in workspace`);

        return;
    }

    const packageJSONSearch: Array<vscode.Uri> = await vscode.workspace.findFiles('package.json', '**/node_modules/**', workspaceFolders.length);
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
        outputAdapter.log(LogType.ERROR, `Smart contract project ${chaincodeName} is not open in workspace. Please ensure the ${chaincodeName} smart contract project folder is not nested within your workspace.`);

        return;
    }

    const fabricConnectionManager: FabricConnectionManager = FabricConnectionManager.instance();
    const fabricGatewayRegistryEntry: FabricGatewayRegistryEntry = fabricConnectionManager.getGatewayRegistryEntry();
    const fabricWalletRegistryEntry: FabricWalletRegistryEntry = fabricConnectionManager.getConnectionWallet();
    const connectionIdentityName: string = fabricConnectionManager.getConnectionIdentity();

    for (const [contractName, transactionArray] of transactions) {
        const homedir: string = os.homedir();
        let connectionProfileHome: boolean;
        let connectionProfilePathString: string;
        let walletPathString: string;
        let walletHome: boolean;
        let pathWithoutHomeDir: string;

        if (fabricGatewayRegistryEntry.connectionProfilePath.includes(homedir)) {
            connectionProfilePathString = 'path.join(homedir';
            pathWithoutHomeDir = fabricGatewayRegistryEntry.connectionProfilePath.slice(homedir.length + 1);
            pathWithoutHomeDir.split('/').forEach((item: string) => {
                connectionProfilePathString += `, '${item}'`;
            });
            connectionProfilePathString += ')';
            connectionProfileHome = true;
        } else {
            connectionProfilePathString = fabricGatewayRegistryEntry.connectionProfilePath;
            connectionProfileHome = false;
        }

        if (fabricWalletRegistryEntry.walletPath.includes(homedir)) {
            walletPathString = 'path.join(homedir';

            pathWithoutHomeDir = fabricWalletRegistryEntry.walletPath.slice(homedir.length + 1);
            pathWithoutHomeDir.split('/').forEach((item: string) => {
                walletPathString += `, '${item}'`;
            });

            walletPathString += ')';
            walletHome = true;
        } else {
            walletPathString = fabricWalletRegistryEntry.walletPath;
            walletHome = false;
        }
        // Populate the template data
        const templateData: any = {
            contractName: contractName,
            chaincodeLabel: chaincodeLabel,
            transactions: transactionArray,
            connectionProfileHome: connectionProfileHome,
            connectionProfilePath: connectionProfilePathString,
            walletPath: walletPathString,
            walletHome: walletHome,
            chaincodeName: chaincodeName,
            chaincodeVersion: chaincodeVersion,
            channelName: channelName,
            identityName: connectionIdentityName
        };

        const utilTemplateData: any = {
            connectionProfileHome: connectionProfileHome,
            connectionProfilePath: connectionProfilePathString,
            chaincodeName: chaincodeName,
            channelName: channelName,
            walletHome: walletHome
        };

        console.log('template data is: ');
        console.log(templateData);

        // Create data to write to file from template engine
        const template: string = path.join(__dirname, '..', '..', '..', 'templates', `${testFileSuiffix}TestSmartContractTemplate.ejs`);
        const utilTemplate: string = path.join(__dirname, '..', '..', '..', 'templates', `${testFileSuiffix}TestSmartContractUtilTemplate.ejs`);

        let dataToWrite: string;
        let functionDataToWrite: string;
        try {
            dataToWrite = await createDataToWrite(template, templateData);
            functionDataToWrite = await createDataToWrite(utilTemplate, utilTemplateData);
        } catch (error) {
            outputAdapter.log(LogType.ERROR, `Error creating template data: ${error.message}`, `Error creating template data: ${error.toString()}`);

            return;
        }

        // Determine if test file already exists
        let testFile: string;
        if (contractName !== '') {
            testFile = path.join(functionalTestsDirectory, `${contractName}-${chaincodeLabel}.test.${testFileSuiffix}`);
        } else {
            testFile = path.join(functionalTestsDirectory, `${chaincodeLabel}.test.${testFileSuiffix}`);
        }
        const testFileExists: boolean = await fs.pathExists(testFile);
        let overwriteTestFile: string;
        if (testFileExists) {
            // Ask the user if they want to overwrite existing test file
            overwriteTestFile = await UserInputUtil.showTestFileOverwriteQuickPick('Test file for selected smart contract already exists in workspace, overwrite it?');
            if (!overwriteTestFile) {
                // User cancelled the overwrite options box, so exit
                outputAdapter.log(LogType.INFO, undefined, `Preserving test file for instantiated smart contract located here: ${testFile}`);
                return;
            }
        }
        if (overwriteTestFile === UserInputUtil.NO) {
            // Don't create test file, user doesn't want to overwrite existing, but tell them where it is:
            outputAdapter.log(LogType.INFO, undefined, `Preserving test file for instantiated smart contract located here: ${testFile}`);
            return;
        } else if (overwriteTestFile === UserInputUtil.GENERATE_NEW_TEST_FILE) {
            // Generate copy of test file, indicate a copy has been created in the file name
            let i: number = 1;
            while (await fs.pathExists(testFile)) {
                if (contractName !== '') {
                    testFile = path.join(functionalTestsDirectory, `${contractName}-${chaincodeLabel}-copy${i}.test.${testFileSuiffix}`);
                } else {
                    testFile = path.join(functionalTestsDirectory, `${chaincodeLabel}-copy${i}.test.${testFileSuiffix}`);
                }
                i++;
            }
        }

        const testFunctionFile: string = path.join(functionalTestsDirectory, `${testFileSuiffix}-smart-contract-util.${testFileSuiffix}`);

        // Create the test file
        try {
            await fs.ensureFile(testFile);
        } catch (error) {
            console.log('Errored creating test file: ' + testFile);
            outputAdapter.log(LogType.ERROR, `Error creating test file: ${error.message}`, `Error creating test file: ${error.toString()}`);
            await removeTestFile(testFile);
            return;
        }
        outputAdapter.log(LogType.INFO, undefined, `Writing to Smart Contract test file: ${testFile}`);

        // Check if there's already a test functions file
        const testFunctionFileExists: boolean = await fs.pathExists(testFunctionFile);
        if (!testFunctionFileExists || overwriteTestFile) {
            try {
                await fs.ensureFile(testFunctionFile);
            } catch (error) {
                outputAdapter.log(LogType.ERROR, `Error creating test util file: ${error.message}`, `Error creating test util file: ${error.toString()}`);
                await removeTestFile(testFunctionFile);
                return;
            }
            // Open, show and write test functions file
            const functionDocument: vscode.TextDocument = await vscode.workspace.openTextDocument(testFunctionFile);
            const editor: vscode.TextEditor = await vscode.window.showTextDocument(functionDocument);
            const functionLineCount: number = functionDocument.lineCount;
            const editorResult: boolean = await editor.edit((editBuilder: vscode.TextEditorEdit) => {
                editBuilder.replace(new vscode.Range(0, 0, functionLineCount, 0), functionDataToWrite);
            });

            if (!editorResult) {
                outputAdapter.log(LogType.ERROR, `Error editing test util file: ${testFunctionFile}`);
                await removeTestFile(testFunctionFile);
                return;
            }

            await functionDocument.save();
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
            outputAdapter.log(LogType.ERROR, `Error editing test file: ${testFile}`);
            await removeTestFile(testFile);
            return;
        }
        await document.save();

    } // end of for each contract

    // Run npm install in smart contract project
    try {
        await installNodeModules(localSmartContractDirectory, testLanguage);
    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Error installing node modules in smart contract project: ${error.message}`, `Error installing node modules in smart contract project: ${error.toString()}`);
        return;
    }

    // If TypeScript, update JavaScript Test Runner user settings and create tsconfig.json
    if (testLanguage === 'TypeScript') {
        const runnerArgs: string = vscode.workspace.getConfiguration().get('javascript-test-runner.additionalArgs') as string;
        if (!runnerArgs || !runnerArgs.includes('-r ts-node/register')) {
            // If the user has removed JavaScript Test Runner since generating tests, this update will silently fail
            await vscode.workspace.getConfiguration().update('javascript-test-runner.additionalArgs', '-r ts-node/register', vscode.ConfigurationTarget.Global);
        }

        // Setup Tsconfig path
        const tsConfigPath: string = path.join(localSmartContractDirectory, 'tsconfig.json');

        // Tsconfig file content
        const tsConfigContents: any = {
            compilerOptions: {
                outDir: 'dist',
                target: 'es2017',
                moduleResolution: 'node',
                module: 'commonjs',
                declaration: true,
                sourceMap: true
            },
            include: [
                './functionalTests/**/*'
            ],
            exclude: [
                'node_modules'
            ]
        };

        // Try to create tsconfig.json file
        try {
            const tsConfigExists: boolean = await fs.pathExists(tsConfigPath);
            if (!tsConfigExists) {
                await fs.writeJson(tsConfigPath, tsConfigContents, { spaces: '\t' });
            } else {
                // Assume that the users tsconfig.json file is compatible, but don't error
                outputAdapter.log(LogType.WARNING, `Unable to create tsconfig.json file as it already exists`);
            }
        } catch (error) {
            outputAdapter.log(LogType.ERROR, `Unable to create tsconfig.json file: ${error.message}`, `Unable to create tsconfig.json file: ${error.toString()}`);
            return;
        }
    }

    outputAdapter.log(LogType.SUCCESS, 'Successfully generated tests');

    Reporter.instance().sendTelemetryEvent('testSmartContractCommand', {testSmartContractLanguage: testLanguage});

}

async function createDataToWrite(template: string, templateData: any): Promise<any> {
    console.log('TestSmartContractCommand: createDataToWrite using template file:', template);

    const ejsOptions: ejs.Options = {
        async: true,
    };
    return new Promise((resolve: any, reject: any): any => {
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
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();

    console.log('Something went wrong, so cleaning up and removing test file:', fileToRemove);

    try {
        await fs.remove(fileToRemove);
    } catch (error) {
        if (!error.message.includes('ENOENT: no such file or directory')) {
            outputAdapter.log(LogType.ERROR, `Error removing test file: ${error.message}`, `Error removing test file: ${error.toString()}`);
            return;
        }
    }
}

async function installNodeModules(dir: string, language: string): Promise<void> {
    const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
    let npmInstallOut: string;

    if (language === 'TypeScript') {
        outputAdapter.log(LogType.INFO, 'Installing package dependencies including: fabric-network@1.4.1, fabric-client@1.4.1, @types/mocha, ts-node, typescript');
        npmInstallOut = await CommandUtil.sendCommandWithProgress('npm install && npm install --save-dev fabric-network@1.4.1 fabric-client@1.4.1 @types/mocha ts-node typescript', dir, 'Installing npm and package dependencies in smart contract project');
    } else {
        outputAdapter.log(LogType.INFO, 'Installing package dependencies including: fabric-network@1.4.1, fabric-client@1.4.1');
        npmInstallOut = await CommandUtil.sendCommandWithProgress('npm install && npm install --save-dev fabric-network@1.4.1 fabric-client@1.4.1', dir, 'Installing npm and package dependencies in smart contract project');
    }
    outputAdapter.log(LogType.INFO, undefined, npmInstallOut);
}
