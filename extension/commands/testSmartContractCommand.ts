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
import { InstantiatedTreeItem } from '../explorer/model/InstantiatedTreeItem';
import { FabricGatewayRegistryEntry } from '../fabric/FabricGatewayRegistryEntry';
import { MetadataUtil } from '../util/MetadataUtil';
import { LogType } from '../logging/OutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricWalletRegistryEntry } from '../fabric/FabricWalletRegistryEntry';
import { IFabricClientConnection } from '../fabric/IFabricClientConnection';
import { ContractTreeItem } from '../explorer/model/ContractTreeItem';
import { FABRIC_CLIENT_VERSION, FABRIC_NETWORK_VERSION } from '../util/ExtensionUtil';
import { FabricGatewayHelper } from '../fabric/FabricGatewayHelper';

export async function testSmartContract(allContracts: boolean, chaincode?: InstantiatedTreeItem | ContractTreeItem): Promise<void> {

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
            await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_GATEWAY);
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

    // Get metadata
    const connection: IFabricClientConnection = FabricConnectionManager.instance().getConnection();

    let transactions: Map<string, any[]> = await MetadataUtil.getTransactions(connection, chaincodeName, channelName, true);
    if (!transactions || transactions.size === 0) {
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

    // Choose the workspace directory.
    let chosenPackageFolder: vscode.WorkspaceFolder;
    try {
        chosenPackageFolder = await UserInputUtil.chooseWorkspace( false );
        if (!chosenPackageFolder) {
            // User cancelled.
            return;
        }
    } catch (err) {
        outputAdapter.log(LogType.ERROR, err.message, err.toString());
        return;
    }

    // Create automated tests if supported.
    const contractLang: string = await UserInputUtil.getLanguage(chosenPackageFolder);
    let testLang: string;
    let functionalTestsDirectory: string;
    let localSmartContractDirectory: string;
    let testFileSuffix: string;
    if (contractLang === 'golang' || contractLang === 'java') {
        outputAdapter.log(LogType.ERROR, `Automated functional tests for a smart contract project written in ${contractLang} are currently not supported.`);
        return;
    } else {
        // Node smart contract: package.json must exist, chaincode and project names must match.
        const packageJsonFile: string = path.join(chosenPackageFolder.uri.fsPath, 'package.json');
        const packageJSONBuffer: Buffer = await fs.readFile(packageJsonFile);
        const packageJSONObj: any = JSON.parse(packageJSONBuffer.toString('utf8'));
        const replaceRegex: RegExp = /@.*?\//;
        let workspaceProjectName: string = packageJSONObj.name;
        workspaceProjectName = workspaceProjectName.replace(replaceRegex, '');
        if (workspaceProjectName === chaincodeName) {
            // Smart contract is open in workspace
            functionalTestsDirectory = path.join(chosenPackageFolder.uri.fsPath, 'functionalTests');
            localSmartContractDirectory = path.join(chosenPackageFolder.uri.fsPath, );
            const languagesToSuffixes: object = {
                JavaScript: 'js',
                 TypeScript: 'ts'
             };
            const testLanguageItem: LanguageQuickPickItem = await UserInputUtil.showLanguagesQuickPick('Choose preferred test language', [], Object.keys(languagesToSuffixes));
            if (!testLanguageItem) {
                return;
            }
            testLang = testLanguageItem.label;
            testFileSuffix = languagesToSuffixes[testLang];
        } else {
            // Unable to identify the correct project in workspace.
            outputAdapter.log(LogType.ERROR, `Smart contract project ${chaincodeName} does not correspond to the selected open project ${workspaceProjectName}.`);
            return;
        }
    }

    const fabricConnectionManager: FabricConnectionManager = FabricConnectionManager.instance();
    const fabricGatewayRegistryEntry: FabricGatewayRegistryEntry = fabricConnectionManager.getGatewayRegistryEntry();
    const fabricWalletRegistryEntry: FabricWalletRegistryEntry = fabricConnectionManager.getConnectionWallet();
    const connectionIdentityName: string = fabricConnectionManager.getConnectionIdentity();

    for (const [contractName, transactionArray] of transactions) {
        const homedir: string = os.homedir();
        let walletPathString: string;
        let walletHome: boolean;
        let pathWithoutHomeDir: string;

        const connectionProfilePath: string = await FabricGatewayHelper.getConnectionProfilePath(fabricGatewayRegistryEntry.name);

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
            connectionProfileHome: connectionProfilePath,
            walletPath: walletPathString,
            walletHome: walletHome,
            chaincodeName: chaincodeName,
            chaincodeVersion: chaincodeVersion,
            channelName: channelName,
            identityName: connectionIdentityName
        };

        const utilTemplateData: any = {
            connectionProfilePath: connectionProfilePath,
            chaincodeName: chaincodeName,
            channelName: channelName,
            walletHome: walletHome
        };

        // Create data to write to file from template engine
        const template: string = path.join(__dirname, '..', '..', '..', 'templates', `${testFileSuffix}TestSmartContractTemplate.ejs`);
        const utilTemplate: string = path.join(__dirname, '..', '..', '..', 'templates', `${testFileSuffix}TestSmartContractUtilTemplate.ejs`);

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
            testFile = path.join(functionalTestsDirectory, `${contractName}-${chaincodeLabel}.test.${testFileSuffix}`);
        } else {
            testFile = path.join(functionalTestsDirectory, `${chaincodeLabel}.test.${testFileSuffix}`);
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
                    testFile = path.join(functionalTestsDirectory, `${contractName}-${chaincodeLabel}-copy${i}.test.${testFileSuffix}`);
                } else {
                    testFile = path.join(functionalTestsDirectory, `${chaincodeLabel}-copy${i}.test.${testFileSuffix}`);
                }
                i++;
            }
        }

        const testFunctionFile: string = path.join(functionalTestsDirectory, `${testFileSuffix}-smart-contract-util.${testFileSuffix}`);

        // Create the test file
        try {
            await fs.ensureFile(testFile);
        } catch (error) {
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
        await installNodeModules(localSmartContractDirectory, testLang);
    } catch (error) {
        outputAdapter.log(LogType.ERROR, `Error installing node modules in smart contract project: ${error.message}`, `Error installing node modules in smart contract project: ${error.toString()}`);
        return;
    }

    // If TypeScript, update JavaScript Test Runner user settings and create tsconfig.json
    if (testLang === 'TypeScript') {
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

    Reporter.instance().sendTelemetryEvent('testSmartContractCommand', {testSmartContractLanguage: testLang});

}

async function createDataToWrite(template: string, templateData: any): Promise<any> {
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
        outputAdapter.log(LogType.INFO, `Installing package dependencies including: fabric-network@${FABRIC_NETWORK_VERSION}, fabric-client@${FABRIC_CLIENT_VERSION}, @types/mocha, ts-node, typescript`);
        npmInstallOut = await CommandUtil.sendCommandWithProgress(`npm install && npm install --save-dev fabric-network@${FABRIC_NETWORK_VERSION} fabric-client@${FABRIC_CLIENT_VERSION} @types/mocha ts-node typescript`, dir, 'Installing npm and package dependencies in smart contract project');
    } else {
        outputAdapter.log(LogType.INFO, `Installing package dependencies including: fabric-network@${FABRIC_NETWORK_VERSION}, fabric-client@${FABRIC_CLIENT_VERSION}`);
        npmInstallOut = await CommandUtil.sendCommandWithProgress(`npm install && npm install --save-dev fabric-network@${FABRIC_NETWORK_VERSION} fabric-client@${FABRIC_CLIENT_VERSION}`, dir, 'Installing npm and package dependencies in smart contract project');
    }
    outputAdapter.log(LogType.INFO, undefined, npmInstallOut);
}
