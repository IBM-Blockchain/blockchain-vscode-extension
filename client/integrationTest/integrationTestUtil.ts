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
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';
import { CommandUtil } from '../src/util/CommandUtil';
import { UserInputUtil, LanguageType } from '../src/commands/UserInputUtil';
import { VSCodeBlockchainOutputAdapter } from '../src/logging/VSCodeBlockchainOutputAdapter';
import { FabricGatewayRegistry } from '../src/fabric/FabricGatewayRegistry';
import { FabricWalletRegistry } from '../src/fabric/FabricWalletRegistry';
import { FabricGatewayRegistryEntry } from '../src/fabric/FabricGatewayRegistryEntry';
import { PackageRegistryEntry } from '../src/packages/PackageRegistryEntry';
import { PackageRegistry } from '../src/packages/PackageRegistry';
import { ExtensionCommands } from '../ExtensionCommands';
import { FabricWalletRegistryEntry } from '../src/fabric/FabricWalletRegistryEntry';
import { FabricConnectionManager } from '../src/fabric/FabricConnectionManager';
import { IFabricClientConnection } from '../src/fabric/IFabricClientConnection';
import { FabricRuntimeManager } from '../src/fabric/FabricRuntimeManager';

// tslint:disable no-unused-expression
const should: Chai.Should = chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

export class IntegrationTestUtil {

    public static async deleteSampleDirectory(): Promise<void> {
        const sampleDir: string = path.join(__dirname, '..', '..', 'integrationTest', 'data', 'fabric-samples');
        const sampleDirExists: boolean = await fs.pathExists(sampleDir);
        if (sampleDirExists) {
            await fs.remove(sampleDir);
        }
    }

    public mySandBox: sinon.SinonSandbox;
    public testContractName: string;
    public testContractDir: string;
    public testContractType: string;
    public workspaceFolder: vscode.WorkspaceFolder;
    public gatewayRegistry: FabricGatewayRegistry;
    public walletRegistry: FabricWalletRegistry;
    public packageRegistry: PackageRegistry;
    public keyPath: string;
    public certPath: string;

    public showLanguagesQuickPickStub: sinon.SinonStub;
    public getWorkspaceFoldersStub: sinon.SinonStub;
    public findFilesStub: sinon.SinonStub;
    public inputBoxStub: sinon.SinonStub;
    public browseStub: sinon.SinonStub;
    public showPeerQuickPickStub: sinon.SinonStub;
    public showInstallableStub: sinon.SinonStub;
    public showChannelStub: sinon.SinonStub;
    public showChanincodeAndVersionStub: sinon.SinonStub;
    public showInstantiatedSmartContractsStub: sinon.SinonStub;
    public showTransactionStub: sinon.SinonStub;
    public workspaceConfigurationUpdateStub: sinon.SinonStub;
    public workspaceConfigurationGetStub: sinon.SinonStub;
    public getConfigurationStub: sinon.SinonStub;
    public showAddWalletOptionsQuickPickStub: sinon.SinonStub;
    public showGatewayQuickPickStub: sinon.SinonStub;
    public showCertificateAuthorityQuickPickStub: sinon.SinonStub;
    public showIdentitiesQuickPickStub: sinon.SinonStub;
    public addIdentityMethodStub: sinon.SinonStub;
    public showWalletsQuickPickStub: sinon.SinonStub;

    constructor(sandbox: sinon.SinonSandbox) {
        this.mySandBox = sandbox;
        this.packageRegistry = PackageRegistry.instance();
        this.keyPath = path.join(__dirname, `../../integrationTest/hlfv1/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore/key.pem`);
        this.certPath = path.join(__dirname, `../../integrationTest/hlfv1/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/Admin@org1.example.com-cert.pem`);

        this.showLanguagesQuickPickStub = this.mySandBox.stub(UserInputUtil, 'showLanguagesQuickPick');
        this.getWorkspaceFoldersStub = this.mySandBox.stub(UserInputUtil, 'getWorkspaceFolders');
        this.inputBoxStub = this.mySandBox.stub(UserInputUtil, 'showInputBox');
        this.findFilesStub = this.mySandBox.stub(vscode.workspace, 'findFiles');
        this.showChannelStub = this.mySandBox.stub(UserInputUtil, 'showChannelQuickPickBox');
        this.gatewayRegistry = FabricGatewayRegistry.instance();
        this.walletRegistry = FabricWalletRegistry.instance();
        this.browseStub = this.mySandBox.stub(UserInputUtil, 'browse');
        this.showPeerQuickPickStub = this.mySandBox.stub(UserInputUtil, 'showPeerQuickPickBox');
        this.showInstallableStub = this.mySandBox.stub(UserInputUtil, 'showInstallableSmartContractsQuickPick');
        this.showInstantiatedSmartContractsStub = this.mySandBox.stub(UserInputUtil, 'showInstantiatedSmartContractsQuickPick');
        this.showChanincodeAndVersionStub = this.mySandBox.stub(UserInputUtil, 'showChaincodeAndVersionQuickPick');
        this.showTransactionStub = this.mySandBox.stub(UserInputUtil, 'showTransactionQuickPick');
        this.workspaceConfigurationUpdateStub = this.mySandBox.stub();
        this.workspaceConfigurationGetStub = this.mySandBox.stub();
        this.showAddWalletOptionsQuickPickStub = this.mySandBox.stub(UserInputUtil, 'showAddWalletOptionsQuickPick');
        this.showGatewayQuickPickStub = this.mySandBox.stub(UserInputUtil, 'showGatewayQuickPickBox');
        this.showCertificateAuthorityQuickPickStub = this.mySandBox.stub(UserInputUtil, 'showCertificateAuthorityQuickPickBox');
        this.showIdentitiesQuickPickStub = this.mySandBox.stub(UserInputUtil, 'showIdentitiesQuickPickBox');
        this.addIdentityMethodStub = this.mySandBox.stub(UserInputUtil, 'addIdentityMethod');
        this.showWalletsQuickPickStub = this.mySandBox.stub(UserInputUtil, 'showWalletsQuickPickBox');
    }

    public async createFabricConnection(): Promise<void> {
        if (this.gatewayRegistry.exists('myGateway')) {
            await this.gatewayRegistry.delete('myGateway');
        }
        this.inputBoxStub.withArgs('Enter a name for the gateway').resolves('myGateway');

        this.browseStub.resolves(path.join(__dirname, '../../integrationTest/data/connection/connection.json'));
        await vscode.commands.executeCommand(ExtensionCommands.ADD_GATEWAY);

        this.gatewayRegistry.exists('myGateway').should.be.true;
    }

    public async addWallet(name: string): Promise<void> {
        if (this.walletRegistry.exists(name)) {
            await this.walletRegistry.delete(name);
        }
        this.showAddWalletOptionsQuickPickStub.resolves(UserInputUtil.WALLET);

        const walletPath: vscode.Uri = vscode.Uri.file( path.join(__dirname, '../../integrationTest/data/myWallet') );

        this.browseStub.withArgs('Enter a file path to a wallet directory', [UserInputUtil.BROWSE_LABEL], {
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Select',
        }, true).resolves(walletPath);
        await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET);

        this.walletRegistry.exists(name).should.be.true;
    }

    public async connectToFabric(name: string, walletName: string): Promise<void> {
        // TODO: pass in name of identity to connect with
        let gatewayEntry: FabricGatewayRegistryEntry;

        try {
            gatewayEntry = this.gatewayRegistry.get(name);
        } catch (error) {
            gatewayEntry = new FabricGatewayRegistryEntry();
            gatewayEntry.name = name;
            gatewayEntry.managedRuntime = true;
            gatewayEntry.connectionProfilePath = FabricRuntimeManager.instance().getRuntime().getConnectionProfilePath();
        }

        let walletEntry: FabricWalletRegistryEntry;

        try {
            walletEntry = this.walletRegistry.get(walletName);
        } catch (error) {
            walletEntry = new FabricWalletRegistryEntry();
            walletEntry.name = 'local_wallet';
            walletEntry.walletPath = path.join(__dirname, '../../integrationTest/tmp/local_wallet');
        }

        this.showWalletsQuickPickStub.resolves({
            name: walletEntry.name,
            data: walletEntry
        });

        this.showIdentitiesQuickPickStub.withArgs('Choose an identity to connect with', ['greenConga']).resolves('greenConga');
        this.showIdentitiesQuickPickStub.withArgs('Choose an identity to connect with', ['greenConga', 'redConga']).resolves('greenConga');

        await vscode.commands.executeCommand(ExtensionCommands.CONNECT, gatewayEntry);

        const fabricConnection: IFabricClientConnection = FabricConnectionManager.instance().getConnection();
        should.exist(fabricConnection);
    }

    public async createSmartContract(name: string, language: string): Promise<void> {
        let type: LanguageType;
        if (language === 'Go' || language === 'Java') {
            type = LanguageType.CHAINCODE;
        } else if (language === 'JavaScript' || language === 'TypeScript') {
            type = LanguageType.CONTRACT;
        } else {
            throw new Error(`You must update this test to support the ${language} language`);
        }
        this.showLanguagesQuickPickStub.resolves({ label: language, type });
        this.mySandBox.stub(UserInputUtil, 'showFolderOptions').resolves(UserInputUtil.ADD_TO_WORKSPACE);

        this.testContractName = name;
        if (language === 'Go') {
            process.env.GOPATH = path.join(__dirname, '..', '..', 'integrationTest', 'tmp');
            this.testContractDir = path.join(process.env.GOPATH, 'src', name);
        } else {
            this.testContractDir = path.join(__dirname, '..', '..', 'integrationTest', 'tmp', name);
        }
        this.testContractType = language;
        const exists: boolean = await fs.pathExists(this.testContractDir);
        if (exists) {
            await fs.remove(this.testContractDir);
        }

        const uri: vscode.Uri = vscode.Uri.file(this.testContractDir);

        this.browseStub.withArgs('Choose the location to save the smart contract', [UserInputUtil.BROWSE_LABEL], {
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Save',
            filters: undefined
        }, true).resolves(uri);

        let generator: string;
        if (language === 'Go' || language === 'Java') {
            generator = 'fabric:chaincode';
        }

        await vscode.commands.executeCommand(ExtensionCommands.CREATE_SMART_CONTRACT_PROJECT, generator);

        if (language === 'JavaScript' || language === 'TypeScript') {
            await CommandUtil.sendCommandWithOutput('npm', ['install'], this.testContractDir, undefined, VSCodeBlockchainOutputAdapter.instance(), false);
        }
    }

    public async packageSmartContract(version: string = '0.0.1', overrideName?: string): Promise<void> {
        let workspaceFiles: vscode.Uri[];
        if (this.testContractType === 'JavaScript') {
            this.workspaceFolder = { index: 0, name: 'javascriptProject', uri: vscode.Uri.file(this.testContractDir) };
        } else if (this.testContractType === 'TypeScript') {
            this.workspaceFolder = { index: 0, name: 'typescriptProject', uri: vscode.Uri.file(this.testContractDir) };
        } else if (this.testContractType === 'Java') {
            this.inputBoxStub.withArgs('Enter a name for your Java package').resolves(this.testContractName);
            this.inputBoxStub.withArgs('Enter a version for your Java package').resolves(version);
            this.workspaceFolder = { index: 0, name: 'javaProject', uri: vscode.Uri.file(this.testContractDir) };
        } else if (this.testContractType === 'Go') {
            this.inputBoxStub.withArgs('Enter a name for your Go package').resolves(this.testContractName);
            this.inputBoxStub.withArgs('Enter a version for your Go package').resolves(version);
            this.workspaceFolder = { index: 0, name: 'goProject', uri: vscode.Uri.file(this.testContractDir) };
            workspaceFiles = [vscode.Uri.file('chaincode.go')];
            this.findFilesStub.withArgs(new vscode.RelativePattern(this.workspaceFolder, '**/*.go'), null, 1).resolves(workspaceFiles);
        } else {
            throw new Error(`I do not know how to handle language ${this.testContractType}`);
        }
        this.getWorkspaceFoldersStub.returns([this.workspaceFolder]);

        await vscode.commands.executeCommand(ExtensionCommands.PACKAGE_SMART_CONTRACT, undefined, overrideName);
    }

    public async installSmartContract(name: string, version: string): Promise<void> {
        this.showPeerQuickPickStub.resolves('peer0.org1.example.com');
        const allPackages: Array<PackageRegistryEntry> = await this.packageRegistry.getAll();

        const packageToInstall: PackageRegistryEntry = allPackages.find((packageEntry: PackageRegistryEntry): boolean => {
            return packageEntry.version === version && packageEntry.name === name;
        });

        should.exist(packageToInstall);

        this.showInstallableStub.resolves({
            label: name,
            data: {
                packageEntry: packageToInstall,
                workspace: undefined
            }
        });
        await vscode.commands.executeCommand(ExtensionCommands.INSTALL_SMART_CONTRACT);
    }

    public async instantiateSmartContract(name: string, version: string, transaction: string = 'instantiate', args: string = ''): Promise<void> {
        this.showChannelStub.resolves('mychannel');

        const allPackages: Array<PackageRegistryEntry> = await PackageRegistry.instance().getAll();

        const wantedPackage: PackageRegistryEntry = allPackages.find((packageEntry: PackageRegistryEntry) => {
            return packageEntry.name === name && packageEntry.version === version;
        });

        this.showChanincodeAndVersionStub.resolves({
            label: `${name}@${version}`,
            description: 'Installed',
            data: {
                packageEntry: wantedPackage,
                workspaceFolder: undefined,
            }
        });

        this.inputBoxStub.withArgs('optional: What function do you want to call?').resolves(transaction);
        this.inputBoxStub.withArgs('optional: What are the arguments to the function, (comma seperated)').resolves(args);
        await vscode.commands.executeCommand(ExtensionCommands.INSTANTIATE_SMART_CONTRACT);
    }

    public async upgradeSmartContract(name: string, version: string): Promise<void> {
        this.showChannelStub.resolves('mychannel');

        const allPackages: Array<PackageRegistryEntry> = await PackageRegistry.instance().getAll();

        const wantedPackage: PackageRegistryEntry = allPackages.find((packageEntry: PackageRegistryEntry) => {
            return packageEntry.name === name && packageEntry.version === version;
        });

        this.showChanincodeAndVersionStub.resolves({
            label: `${name}@${version}`,
            description: 'Installed',
            data: {
                packageEntry: wantedPackage,
                workspaceFolder: undefined,
            }
        });

        // Upgrade from instantiated contract at version 0.0.1
        this.showInstantiatedSmartContractsStub.resolves({
            label: `${name}@0.0.1`,
            data: { name: name, channel: 'mychannel', version: '0.0.1' }
        });

        this.inputBoxStub.withArgs('optional: What function do you want to call?').resolves('instantiate');
        this.inputBoxStub.withArgs('optional: What are the arguments to the function, (comma seperated)').resolves('');
        await vscode.commands.executeCommand(ExtensionCommands.UPGRADE_SMART_CONTRACT);
    }

    public async submitTransactionToChaincode(name: string, version: string, fcn: string, args: string): Promise<void> {
        this.showInstantiatedSmartContractsStub.resolves({
            label: `${name}@${version}`,
            data: { name: name, channel: 'mychannel', version: version }
        });

        this.showTransactionStub.resolves({
            label: null,
            data: { name: fcn, contract: null }
        });

        this.inputBoxStub.withArgs('optional: What are the arguments to the transaction, (comma seperated)').resolves(args);

        await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);
    }

    public async submitTransactionToContract(name: string, version: string, transaction: string, args: string, contractName: string): Promise<void> {
        this.showInstantiatedSmartContractsStub.resolves({
            label: `${name}@${version}`,
            data: { name: name, channel: 'mychannel', version: version }
        });

        this.showTransactionStub.resolves({
            label: `${contractName} - ${transaction}`,
            data: { name: transaction, contract: contractName }
        });

        this.inputBoxStub.withArgs('optional: What are the arguments to the transaction, (comma seperated)').resolves(args);

        await vscode.commands.executeCommand(ExtensionCommands.SUBMIT_TRANSACTION);
    }

    public async generateSmartContractTests(name: string, version: string, language: string, gatewayName: string): Promise<void> {
        let gatewayEntry: FabricGatewayRegistryEntry;

        try {
            gatewayEntry = FabricGatewayRegistry.instance().get(gatewayName);
        } catch (error) {
            gatewayEntry = new FabricGatewayRegistryEntry();
            gatewayEntry.name = gatewayName;
            gatewayEntry.managedRuntime = true;
        }

        this.showGatewayQuickPickStub.resolves({
            label: gatewayName,
            data: gatewayEntry
        });

        this.showChannelStub.resolves('mychannel');
        this.showInstantiatedSmartContractsStub.resolves({
            label: `${name}@${version}`,
            data: { name: name, channel: 'mychannel', version: version }
        });

        this.showLanguagesQuickPickStub.resolves({ label: language, type: LanguageType.CONTRACT });
        this.getWorkspaceFoldersStub.returns([this.workspaceFolder]);
        const packageJSONPath: string = path.join(this.testContractDir, 'package.json');
        this.findFilesStub.resolves([vscode.Uri.file(packageJSONPath)]);

        if (language === 'TypeScript') {
            // Stub out the update of JavaScript Test Runner user settings
            this.workspaceConfigurationGetStub.onCall(0).returns('');
            this.getConfigurationStub = this.mySandBox.stub(vscode.workspace, 'getConfiguration');
            this.getConfigurationStub.returns({
                get: this.workspaceConfigurationGetStub,
                update: this.workspaceConfigurationUpdateStub
            });
        }

        await vscode.commands.executeCommand(ExtensionCommands.TEST_SMART_CONTRACT);
    }

    public async runSmartContractTests(name: string, language: string): Promise<string> {
        // Run the same command that the JavaScript Test Runner runs to run javascript/typescript tests
        let testCommand: string = `node_modules/.bin/mocha functionalTests/MyContract-${name}@0.0.1.test.js --grep="instantiate"`;
        if (language === 'TypeScript') {
            testCommand = `node_modules/.bin/mocha functionalTests/MyContract-${name}@0.0.1.test.ts --grep="instantiate" -r ts-node/register`;
        }
        const testResult: string = await CommandUtil.sendCommand(testCommand, this.testContractDir);
        return testResult;
    }

    public async createCAIdentity(name: string): Promise<void> {
        this.showCertificateAuthorityQuickPickStub.withArgs('Choose certificate authority to create a new identity with').resolves('ca.example.com');
        this.inputBoxStub.withArgs('Provide a name for the identity').resolves(name);
        await vscode.commands.executeCommand(ExtensionCommands.CREATE_NEW_IDENTITY);
    }

    public async getRawPackageJson(): Promise<any> {
        const fileContents: Buffer = await fs.readFile(path.join(this.testContractDir, 'package.json'));
        return JSON.parse(fileContents.toString());
    }

    public async writePackageJson(packageJson: any): Promise<void> {
        const packageJsonString: string = JSON.stringify(packageJson, null, 4);

        return fs.writeFile(path.join(this.testContractDir, 'package.json'), packageJsonString, 'utf8');
    }

    public async updatePackageJsonVersion(version: string): Promise<void> {
        const packageJson: any = await this.getRawPackageJson();

        packageJson.version = version;

        return this.writePackageJson(packageJson);
    }

    public async updateConnectionProfile(): Promise<void> {
        const fabricGatewayEntry: FabricGatewayRegistryEntry = this.gatewayRegistry.get('myGateway');
        fabricGatewayEntry.connectionProfilePath = path.join(__dirname, '../../integrationTest/data/connection/connection.yaml');
        await this.gatewayRegistry.update(fabricGatewayEntry);
    }

    public async addIdentityToWallet(id: string, secret: string, walletName: string): Promise<void> {
        let walletEntry: FabricWalletRegistryEntry;

        try {
            walletEntry = this.walletRegistry.get(walletName);
        } catch (error) {
            walletEntry = new FabricWalletRegistryEntry();
            walletEntry.name = 'local_wallet';
            walletEntry.walletPath = path.join(__dirname, '../../integrationTest/tmp/local_wallet');
        }

        this.showWalletsQuickPickStub.resolves({
            name: walletEntry.name,
            data: walletEntry
        });

        this.inputBoxStub.withArgs('Provide a name for the identity').resolves('redConga');
        this.inputBoxStub.withArgs('Enter MSPID').resolves('Org1MSP');
        this.addIdentityMethodStub.resolves(UserInputUtil.ADD_ID_SECRET_OPTION);
        const fabricGatewayEntry: FabricGatewayRegistryEntry = this.gatewayRegistry.get('myGateway');
        this.showGatewayQuickPickStub.resolves({
            label: 'myGateway',
            data: fabricGatewayEntry
        });

        this.inputBoxStub.withArgs('Enter enrollment ID').resolves(id);
        this.inputBoxStub.withArgs('Enter enrollment secret').resolves(secret);

        await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET_IDENTITY);
    }
}
