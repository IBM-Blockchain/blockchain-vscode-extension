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
import { UserInputUtil } from '../src/commands/UserInputUtil';
import { VSCodeOutputAdapter } from '../src/logging/VSCodeOutputAdapter';
import { FabricGatewayRegistry } from '../src/fabric/FabricGatewayRegistry';
import { FabricGatewayRegistryEntry } from '../src/fabric/FabricGatewayRegistryEntry';
import { PackageRegistryEntry } from '../src/packages/PackageRegistryEntry';
import { PackageRegistry } from '../src/packages/PackageRegistry';

// tslint:disable no-unused-expression
const should: Chai.Should = chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

export class IntegrationTestUtil {

    public mySandBox: sinon.SinonSandbox;
    public testContractName: string;
    public testContractDir: string;
    public testContractType: string;
    public workspaceFolder: vscode.WorkspaceFolder;
    public gatewayRegistry: FabricGatewayRegistry;
    public packageRegistry: PackageRegistry;
    public keyPath: string;
    public certPath: string;

    public showLanguagesQuickPickStub: sinon.SinonStub;
    public getWorkspaceFoldersStub: sinon.SinonStub;
    public findFilesStub: sinon.SinonStub;
    public inputBoxStub: sinon.SinonStub;
    public browseEditStub: sinon.SinonStub;
    public showPeerQuickPickStub: sinon.SinonStub;
    public showInstallableStub: sinon.SinonStub;
    public showChannelStub: sinon.SinonStub;
    public showChanincodeAndVersionStub: sinon.SinonStub;
    public showInstantiatedSmartContractsStub: sinon.SinonStub;
    public showTransactionStub: sinon.SinonStub;
    public workspaceConfigurationUpdateStub: sinon.SinonStub;
    public workspaceConfigurationGetStub: sinon.SinonStub;
    public getConfigurationStub: sinon.SinonStub;
    public showIdentityOptionsStub: sinon.SinonStub;

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
        this.browseEditStub = this.mySandBox.stub(UserInputUtil, 'browseEdit');
        this.showPeerQuickPickStub = this.mySandBox.stub(UserInputUtil, 'showPeerQuickPickBox');
        this.showInstallableStub = this.mySandBox.stub(UserInputUtil, 'showInstallableSmartContractsQuickPick');
        this.showInstantiatedSmartContractsStub = this.mySandBox.stub(UserInputUtil, 'showInstantiatedSmartContractsQuickPick');
        this.showChanincodeAndVersionStub = this.mySandBox.stub(UserInputUtil, 'showChaincodeAndVersionQuickPick');
        this.showTransactionStub = this.mySandBox.stub(UserInputUtil, 'showTransactionQuickPick');
        this.workspaceConfigurationUpdateStub = this.mySandBox.stub();
        this.workspaceConfigurationGetStub = this.mySandBox.stub();
        this.showIdentityOptionsStub = this.mySandBox.stub(UserInputUtil, 'showAddIdentityOptionsQuickPick');

    }

    public async createFabricConnection(): Promise<void> {
        if (this.gatewayRegistry.exists('myGateway')) {
            await this.gatewayRegistry.delete('myGateway');
        }

        this.inputBoxStub.withArgs('Enter a name for the gateway').resolves('myGateway');
        this.browseEditStub.withArgs('Enter a file path to a connection profile file', 'myGateway').resolves(path.join(__dirname, '../../integrationTest/data/connection/connection.json'));
        this.showIdentityOptionsStub.resolves(UserInputUtil.CERT_KEY);
        this.inputBoxStub.withArgs('Provide a name for the identity').resolves('greenConga');
        this.browseEditStub.withArgs('Browse for a certificate file', 'myGateway').resolves(this.certPath);
        this.browseEditStub.withArgs('Browse for a private key file', 'myGateway').resolves(this.keyPath);

        await vscode.commands.executeCommand('blockchainConnectionsExplorer.addGatewayEntry');

        this.gatewayRegistry.exists('myGateway').should.be.true;
    }

    public async connectToFabric(): Promise<void> {
        const gateway: FabricGatewayRegistryEntry = FabricGatewayRegistry.instance().get('myGateway');
        await vscode.commands.executeCommand('blockchainConnectionsExplorer.connectEntry', gateway);
    }

    public async createSmartContract(name: string, type: string): Promise<void> {
        this.showLanguagesQuickPickStub.resolves(type);
        this.mySandBox.stub(UserInputUtil, 'showFolderOptions').resolves(UserInputUtil.ADD_TO_WORKSPACE);

        this.testContractName = name;
        if (type === 'Go') {
            process.env.GOPATH = path.join(__dirname, '..', '..', 'integrationTest', 'tmp');
            this.testContractDir = path.join(process.env.GOPATH, 'src', name);
        } else {
            this.testContractDir = path.join(__dirname, '..', '..', 'integrationTest', 'tmp', name);
        }
        this.testContractType = type;
        const exists: boolean = await fs.pathExists(this.testContractDir);
        if (exists) {
            await fs.remove(this.testContractDir);
        }

        const uri: vscode.Uri = vscode.Uri.file(this.testContractDir);
        const uriArr: Array<vscode.Uri> = [uri];
        const openDialogStub: sinon.SinonStub = this.mySandBox.stub(vscode.window, 'showOpenDialog');
        openDialogStub.resolves(uriArr);

        let generator: string;
        if (type === 'Go' || type === 'Java') {
            generator = 'fabric:chaincode';
        }

        await vscode.commands.executeCommand('blockchain.createSmartContractProjectEntry', generator);

        if (type === 'JavaScript' || type === 'TypeScript') {
            await CommandUtil.sendCommandWithOutput('npm', ['install'], this.testContractDir, undefined, VSCodeOutputAdapter.instance(), false);
        }
    }

    public async packageSmartContract(version: string = '0.0.1'): Promise<void> {
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

        await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry');
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
        await vscode.commands.executeCommand('blockchainExplorer.installSmartContractEntry');
    }

    public async instantiateSmartContract(name: string, version: string): Promise<void> {
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

        this.inputBoxStub.withArgs('optional: What function do you want to call?').resolves('instantiate');
        this.inputBoxStub.withArgs('optional: What are the arguments to the function, (comma seperated)').resolves();
        await vscode.commands.executeCommand('blockchainExplorer.instantiateSmartContractEntry');
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
        this.inputBoxStub.withArgs('optional: What are the arguments to the function, (comma seperated)').resolves();
        await vscode.commands.executeCommand('blockchainExplorer.upgradeSmartContractEntry');
    }

    public async submitTransaction(name: string, version: string, transaction: string, args: string, contractName: string): Promise<void> {
        this.showInstantiatedSmartContractsStub.resolves({
            label: `${name}@${version}`,
            data: { name: name, channel: 'mychannel', version: version }
        });

        this.showTransactionStub.resolves({
            label: `${contractName} - ${transaction}`,
            data: { name: transaction, contract: contractName}
        });

        this.inputBoxStub.withArgs('optional: What are the arguments to the function, (comma seperated)').resolves(args);

        await vscode.commands.executeCommand('blockchainConnectionsExplorer.submitTransactionEntry');
    }

    public async generateSmartContractTests(name: string, version: string, language: string): Promise<void> {
        this.showChannelStub.resolves('mychannel');
        this.showInstantiatedSmartContractsStub.resolves({
            label: `${name}@${version}`,
            data: { name: name, channel: 'mychannel', version: version }
        });
        this.showLanguagesQuickPickStub.resolves(language);
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

        await vscode.commands.executeCommand('blockchainConnectionsExplorer.testSmartContractEntry');
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
}
