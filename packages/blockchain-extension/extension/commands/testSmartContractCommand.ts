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
import { FabricGatewayConnectionManager } from '../fabric/FabricGatewayConnectionManager';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { Reporter } from '../util/Reporter';
import { CommandUtil } from '../util/CommandUtil';
import { InstantiatedTreeItem } from '../explorer/model/InstantiatedTreeItem';
import { FabricGatewayRegistryEntry } from '../registries/FabricGatewayRegistryEntry';
import { MetadataUtil } from '../util/MetadataUtil';
import { LogType } from '../logging/OutputAdapter';
import { ExtensionCommands } from '../../ExtensionCommands';
import { FabricWalletRegistryEntry } from '../registries/FabricWalletRegistryEntry';
import { IFabricGatewayConnection } from 'ibm-blockchain-platform-common';
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
        if (!FabricGatewayConnectionManager.instance().getConnection()) {
            // Connect if not already connected
            await vscode.commands.executeCommand(ExtensionCommands.CONNECT_TO_GATEWAY);
            if (!FabricGatewayConnectionManager.instance().getConnection()) {
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
            channelName = chaincode.instantiatedChaincode.channels[0].label;
            chaincodeVersion = chaincode.instantiatedChaincode.version;
        } else {
            // Smart Contract selected from the tree item, so assign label and name
            chaincodeLabel = chaincode.label;
            chaincodeName = chaincode.name;
            channelName = chaincode.channels[0].label;
            chaincodeVersion = chaincode.version;
        }
    }

    // Get metadata
    const connection: IFabricGatewayConnection = FabricGatewayConnectionManager.instance().getConnection();

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
    let workspaceProjectName: string;
    if (contractLang === 'golang' ) {
        outputAdapter.log(LogType.ERROR, `Automated functional tests for a smart contract project written in ${contractLang} are currently not supported.`);
        return;
    } else {
        const languagesToSuffixes: object = {
            JavaScript: 'js',
            TypeScript: 'ts',
        };
        if (contractLang === 'java') {
            languagesToSuffixes['Java'] = 'java';
            testLang = 'Java';
            functionalTestsDirectory = path.join(chosenPackageFolder.uri.fsPath, 'src', 'test', 'java', 'org', 'example');
            workspaceProjectName = chaincodeName;
        } else {
            // Node smart contract: package.json must exist, chaincode and project names must match.
            const packageJsonFile: string = path.join(chosenPackageFolder.uri.fsPath, 'package.json');
            const packageJSONBuffer: Buffer = await fs.readFile(packageJsonFile);
            const packageJSONObj: any = JSON.parse(packageJSONBuffer.toString('utf8'));
            const replaceRegex: RegExp = /@.*?\//;
            workspaceProjectName = packageJSONObj.name;
            workspaceProjectName = workspaceProjectName.replace(replaceRegex, '');
            if (workspaceProjectName === chaincodeName) {
                // Smart contract is open in workspace
                functionalTestsDirectory = path.join(chosenPackageFolder.uri.fsPath, 'functionalTests');
                localSmartContractDirectory = chosenPackageFolder.uri.fsPath;
                const testLanguageItem: LanguageQuickPickItem = await UserInputUtil.showLanguagesQuickPick('Choose preferred test language', [], Object.keys(languagesToSuffixes));
                if (!testLanguageItem) {
                    return;
                }
                testLang = testLanguageItem.label;
            } else {
                // Unable to identify the correct project in workspace.
                outputAdapter.log(LogType.ERROR, `Smart contract project ${chaincodeName} does not correspond to the selected open project ${workspaceProjectName}.`);
                return;
            }
        }
        testFileSuffix = languagesToSuffixes[testLang];
    }

    const fabricConnectionManager: FabricGatewayConnectionManager = FabricGatewayConnectionManager.instance();
    const fabricGatewayRegistryEntry: FabricGatewayRegistryEntry = fabricConnectionManager.getGatewayRegistryEntry();
    const fabricWalletRegistryEntry: FabricWalletRegistryEntry = fabricConnectionManager.getConnectionWallet();
    const connectionIdentityName: string = fabricConnectionManager.getConnectionIdentity();

    for (const [contractName, transactionArray] of transactions) {
        const homedir: string = os.homedir();
        let walletPathString: string;
        let walletHome: boolean;
        let pathWithoutHomeDir: string;
        let connectionProfilePath: string;
        let conProfileHome: boolean;
        const separator: string = process.platform === 'win32' ? '\\' : '/';

        const connectionProfilePathTmp: string = await FabricGatewayHelper.getConnectionProfilePath(fabricGatewayRegistryEntry.name);
        if (connectionProfilePathTmp.includes(homedir)) {
            connectionProfilePath = 'path.join(homedir';

            pathWithoutHomeDir = connectionProfilePathTmp.slice(homedir.length + 1);
            pathWithoutHomeDir.split(separator).forEach((item: string) => {
                connectionProfilePath += `, '${item}'`;
            });
            connectionProfilePath += ')';
            conProfileHome = true;
        } else {
            connectionProfilePath = process.platform === 'win32' ? connectionProfilePathTmp.replace(/\\/g, '\\\\') : connectionProfilePathTmp;
            conProfileHome = false;
        }

        if (fabricWalletRegistryEntry.walletPath.includes(homedir)) {
            walletPathString = 'path.join(homedir';

            pathWithoutHomeDir = fabricWalletRegistryEntry.walletPath.slice(homedir.length + 1);
            pathWithoutHomeDir.split(separator).forEach((item: string) => {
                walletPathString += `, '${item}'`;
            });
            walletPathString += ')';
            walletHome = true;
        } else {
            walletPathString = process.platform === 'win32' ? fabricWalletRegistryEntry.walletPath.replace(/\\/g, '\\\\') : fabricWalletRegistryEntry.walletPath;
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
            identityName: connectionIdentityName,
            conProfileHome: conProfileHome
        };

        const utilTemplateData: any = {
            connectionProfilePath: connectionProfilePath,
            chaincodeName: chaincodeName,
            channelName: channelName,
            walletHome: walletHome,
            conProfileHome: conProfileHome
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

        // Determine test file names accounting for differences in node and Java naming convention.
        let testFile: string;
        let testFunctionFile: string;
        if (testLang === 'Java') {
            const capsChaincodeLabelForJava: string = chaincodeLabel[0].toUpperCase() + chaincodeLabel.slice(1).replace(/\./g, '').replace('@', '');
            if (contractName !== '') {
                const capsContractName: string = contractName[0].toUpperCase() + contractName.slice(1);
                testFile = path.join(functionalTestsDirectory, `Fv${capsContractName}${capsChaincodeLabelForJava}Test.${testFileSuffix}`);
            } else {
                testFile = path.join(functionalTestsDirectory, `Fv${capsChaincodeLabelForJava}Test.${testFileSuffix}`);
            }
            testFunctionFile = path.join(functionalTestsDirectory, `${testLang}SmartContractUtil.${testFileSuffix}`);
        } else {
            if (contractName !== '') {
                testFile = path.join(functionalTestsDirectory, `${contractName}-${chaincodeLabel}.test.${testFileSuffix}`);
            } else {
                testFile = path.join(functionalTestsDirectory, `${chaincodeLabel}.test.${testFileSuffix}`);
            }
            testFunctionFile = path.join(functionalTestsDirectory, `${testFileSuffix}-smart-contract-util.${testFileSuffix}`);
        }

        // Determine if test file already exists.
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
                if (testLang === 'Java') {
                    const capsChaincodeLabelForJava: string = chaincodeLabel[0].toUpperCase() + chaincodeLabel.slice(1).replace(/\./g, '').replace('@', '');
                    if (contractName !== '') {
                        const capsContractName: string = contractName[0].toUpperCase() + contractName.slice(1);
                        testFile = path.join(functionalTestsDirectory, `Fv${capsContractName}${capsChaincodeLabelForJava}Copy${i}Test.${testFileSuffix}`);
                    } else {
                        testFile = path.join(functionalTestsDirectory, `Fv${capsChaincodeLabelForJava}Copy${i}Test.${testFileSuffix}`);
                    }
                } else {
                    if (contractName !== '') {
                        testFile = path.join(functionalTestsDirectory, `${contractName}-${chaincodeLabel}-copy${i}.test.${testFileSuffix}`);
                    } else {
                        testFile = path.join(functionalTestsDirectory, `${chaincodeLabel}-copy${i}.test.${testFileSuffix}`);
                    }
                }
                i++;
            }
        }

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

    // Run npm install in JS or TS smart contract project, or update build file in Java project
    let javaBuildFile: string = null;
    let state: any;
    if (testLang !== 'Java') {
        try {
            await installNodeModules(localSmartContractDirectory, testLang);
        } catch (error) {
            outputAdapter.log(LogType.ERROR, `Error installing node modules in smart contract project: ${error.message}`, `Error installing node modules in smart contract project: ${error.toString()}`);
            return;
        }
    } else {
        state = {
            tryCopy:    false,
            doneCopy:   false,
            needUpdate: false,
            tryUpdate:  false,
            doneupdate: false,
            success:    false,
        };
        // create local tmp copy of build file and modify the orignal
        try {
            javaBuildFile = await whichBuildFile(chosenPackageFolder);
            await updateBuildFile(javaBuildFile, state);
        } catch (error) {
            outputAdapter.log(LogType.ERROR, `Unable to modify the build file in folder ${chosenPackageFolder.uri.fsPath}: ${error.message}`, `Unable to modify the build file in folder ${chosenPackageFolder.uri.fsPath}: ${error.toString()}`);
        }

        if (state.doneCopy) {
            // remove copy if write successful or not attempted, copy tmp back to original if write failed.
            const writeFailed: boolean = state.needUpdate && state.tryUpdate && !state.doneupdate;
            try {
                await mvOrRmBuildFileCopy(chosenPackageFolder, javaBuildFile, writeFailed);
            } catch (error) {
                outputAdapter.log(LogType.ERROR, `Unable to cleanup tmp build file: ${error.message}`, `Unable to cleanup tmp build file: ${error.toString()}`);
                return;
            }
        }
        if (!state.success) {
            return;
        }
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

    let successMessage: string = 'Successfully generated tests';
    if (testLang === 'Java' && !state.tryCopy && javaBuildFile !== null) {
        successMessage += ` - didn't overwrite ${javaBuildFile}, see README for dependency details.`;
    }
    outputAdapter.log(LogType.SUCCESS, successMessage);

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

async function whichBuildFile(packageFolder: vscode.WorkspaceFolder): Promise<string> {
    let buildFile: string = null;
    const gradleFile: string = path.join(packageFolder.uri.fsPath, 'build.gradle');
    const mavenFile: string = path.join(packageFolder.uri.fsPath, 'pom.xml');
    const gradleFileExists: boolean = await fs.pathExists(gradleFile);
    const mavenFileExists: boolean = await fs.pathExists(mavenFile);
    if (gradleFileExists) {
        buildFile = gradleFile;
    } else if (mavenFileExists) {
        buildFile = mavenFile;
    } else {
        throw new Error('Could not locate a build file.');
    }
    return buildFile;
}

async function updateBuildFile(buildFile: string, state: any): Promise<void> {
    const isGradle: boolean = buildFile.endsWith('build.gradle');
    const reallyDoIt: boolean = await UserInputUtil.showConfirmationWarningMessage(`This task might overwrite ${buildFile}. Do you wish to continue?`);
    if (!reallyDoIt) {
        state.success = true;
        return;
    }

    // Create local copy of build file to protect against torn writes
    state.tryCopy = true;
    await fs.copy(buildFile, `${buildFile}.tmp`);
    state.doneCopy = true;

    const additionalRequirements: any = {
        dependencies: {
            'fabric-gateway-java': {
                groupId: 'org.hyperledger.fabric',
                artifactId: 'fabric-gateway-java',
                version: '1.4.2',
                present: false,
            },
            'assertj-core': {
                groupId: 'org.assertj',
                artifactId: 'assertj-core',
                version: '3.14.0',
                present: false,
            },
            'jackson-dataformat': {
                groupId: 'com.fasterxml.jackson.dataformat',
                artifactId: 'jackson-dataformat-yaml',
                version: '2.10.0',
                present: false,
            },
            'jackson-databind': {
                groupId: 'com.fasterxml.jackson.core',
                artifactId: 'jackson-databind',
                version: '2.10.0',
                present: false,
            },
        }
    };

    const originalContents: string = await fs.readFile(buildFile, 'utf8');
    state.needUpdate = checkContent(originalContents, additionalRequirements);

    if (state.needUpdate) {
        const currentDep: string = getProperty(originalContents, 'dependencies', isGradle);
        const replaceDep: string = getReplacement(currentDep, additionalRequirements, 'dependencies', isGradle);
        const modifiedContents: string = originalContents.replace(currentDep, replaceDep);
        state.tryUpdate = true;
        await fs.writeFile(buildFile, modifiedContents);
        state.doneupdate = true;
    }
    state.success = true;
}

function checkContent(content: string, requirements: any): boolean {
    let needUpdate: boolean = false;
    for (const obj in requirements) {
        for (const req in requirements[obj]) {
            const searchItem: string = requirements[obj][req].artifactId;
            if (content.indexOf(searchItem) > -1) {
                requirements[obj][req].present = true;
            } else {
                needUpdate = true;
            }
        }
    }
    return needUpdate;
}

function getProperty(data: string, property: string, isGradle: boolean): string {
    let start: number = -1 ;
    let end: number = -1;
    if (isGradle) {
        // Find the requested property with it's children, ie, property { ... }.
        // We therefore need to find the first curly bracket after the property,
        // and the correspoding closing bracket. Then return that substring.
        start = data.indexOf(property);
        if (start !== -1) {
            let count: number = 0;
            for (let i: number = start + data.slice(start).indexOf('{'); i < data.length; i++) {
                count += data[i] === '{' ? 1 : data[i] === '}' ? -1 : 0;
                if (count === 0 && i > start) {
                    end = i + 1;
                    break;
                }
            }
        }
    } else {
        start = data.indexOf(`<${property}>`);
        end = data.indexOf(`</${property}>`) + `</${property}>`.length;
    }

    if (start === -1 || end === -1) {
        throw new Error(`Could not find property '${property}'.`);
    }
    return data.slice(start, end);
}

function getReplacement(data: string, requirements: any, type: string, isGradle: boolean): string {
    for (const obj in requirements[type]) {
        if (!requirements[type][obj].present) {
            let replacement: string;
            if (isGradle) {
                replacement = `\ttestImplementation '${requirements[type][obj].groupId}:${requirements[type][obj].artifactId}:${requirements[type][obj].version}'\n}`;
                data = data.replace(/\n*}$/, '\n}').replace(/}$/, replacement);
            } else {
                replacement = `\n\t\t<dependency>\n\t\t\t<groupId>${requirements[type][obj].groupId}</groupId>\n\t\t\t<artifactId>${requirements[type][obj].artifactId}</artifactId>\n\t\t\t<version>${requirements[type][obj].version}</version>\n\t\t</dependency>\n\t</dependencies>`;
                data = data.replace(/\n*\s*<\/dependencies>/, replacement);
            }
        }
    }
    return data;
}

async function mvOrRmBuildFileCopy(packageFolder: vscode.WorkspaceFolder, buildFile: string, writeFailed: boolean): Promise<void> {
    const buildFileTmp: string = `${buildFile}.tmp`;
    const buildFileCopyExists: boolean = await fs.pathExists(buildFileTmp);
    const buildFileCopy: string = buildFileCopyExists ? buildFileTmp : null;

    if (buildFileCopy === null) {
        throw new Error(`Could not locate tmp build file in folder ${packageFolder.uri.fsPath}`);
    } else if (!writeFailed) {
        await fs.remove(buildFileCopy);
    } else {
        await fs.move(buildFileCopy, buildFileCopy.replace(/.tmp$/, ''), { overwrite: true });
    }
}
