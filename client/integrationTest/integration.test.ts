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
import * as myExtension from '../src/extension';
import * as path from 'path';
import * as fs from 'fs-extra';

import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';
import { ChannelTreeItem } from '../src/explorer/model/ChannelTreeItem';
import { PeerTreeItem } from '../src/explorer/model/PeerTreeItem';
import { PeersTreeItem } from '../src/explorer/model/PeersTreeItem';
import { ExtensionUtil } from '../src/util/ExtensionUtil';
import { FabricConnectionRegistry } from '../src/fabric/FabricConnectionRegistry';
import { FabricConnectionRegistryEntry } from '../src/fabric/FabricConnectionRegistryEntry';
import { BlockchainTreeItem } from '../src/explorer/model/BlockchainTreeItem';
import { RuntimeTreeItem } from '../src/explorer/model/RuntimeTreeItem';
import { FabricRuntime } from '../src/fabric/FabricRuntime';
import { FabricRuntimeManager } from '../src/fabric/FabricRuntimeManager';
import { ConnectionTreeItem } from '../src/explorer/model/ConnectionTreeItem';
import { VSCodeOutputAdapter } from '../src/logging/VSCodeOutputAdapter';
import { UserInputUtil } from '../src/commands/UserInputUtil';
import { InstalledChainCodeTreeItem } from '../src/explorer/model/InstalledChainCodeTreeItem';
import { InstalledChainCodeVersionTreeItem } from '../src/explorer/model/InstalledChaincodeVersionTreeItem';
import { PackageRegistryEntry } from '../src/packages/PackageRegistryEntry';
import { PackageRegistry } from '../src/packages/PackageRegistry';
import { ChainCodeTreeItem } from '../src/explorer/model/ChainCodeTreeItem';
import { TestUtil } from '../test/TestUtil';
import { InstantiatedChainCodesTreeItem } from '../src/explorer/model/InstantiatedChaincodesTreeItem';
import { CommandUtil } from '../src/util/CommandUtil';

const should: Chai.Should = chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

// tslint:disable no-unused-expression
// Defines a Mocha test suite to group tests of similar kind together
describe('Integration Test', () => {

    const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
    const connectionRegistry: FabricConnectionRegistry = FabricConnectionRegistry.instance();

    let mySandBox: sinon.SinonSandbox;
    let keyPath: string;
    let certPath: string;
    let testContractName: string;
    let testContractDir: string;
    let testContractType: string;

    let getWorkspaceFoldersStub: sinon.SinonStub;
    let findFilesStub: sinon.SinonStub;
    let showPeerQuickPickStub: sinon.SinonStub;
    let showPackagesStub: sinon.SinonStub;
    let showChannelStub: sinon.SinonStub;
    let showChanincodeAndVersionStub: sinon.SinonStub;
    let inputBoxStub: sinon.SinonStub;
    let browseEditStub: sinon.SinonStub;

    before(async function(): Promise<void> {
        this.timeout(600000);
        keyPath = path.join(__dirname, `../../integrationTest/hlfv1/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore/key.pem`);
        certPath = path.join(__dirname, `../../integrationTest/hlfv1/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/Admin@org1.example.com-cert.pem`);

        await ExtensionUtil.activateExtension();
        await TestUtil.storeConnectionsConfig();
        await TestUtil.storeRuntimesConfig();
        await TestUtil.storeExtensionDirectoryConfig();

        VSCodeOutputAdapter.instance().setConsole(true);

        vscode.workspace.updateWorkspaceFolders(1, vscode.workspace.workspaceFolders.length - 1);

        const packageDir: string = path.join(__dirname, '..', '..', 'integrationTest', 'tmp', 'packages');
        await vscode.workspace.getConfiguration().update('blockchain.ext.directory', packageDir, vscode.ConfigurationTarget.Global);
        const exists: boolean = await fs.pathExists(packageDir);
        if (exists) {
            await fs.remove(packageDir);
        }
    });

    after(async () => {
        vscode.workspace.updateWorkspaceFolders(1, vscode.workspace.workspaceFolders.length - 1);
        VSCodeOutputAdapter.instance().setConsole(false);
        await TestUtil.restoreConnectionsConfig();
        await TestUtil.restoreRuntimesConfig();
        await TestUtil.restoreExtensionDirectoryConfig();
    });

    beforeEach(() => {
        mySandBox = sinon.createSandbox();
        getWorkspaceFoldersStub = mySandBox.stub(UserInputUtil, 'getWorkspaceFolders');
        findFilesStub = mySandBox.stub(vscode.workspace, 'findFiles').resolves([]);
        showPeerQuickPickStub = mySandBox.stub(UserInputUtil, 'showPeerQuickPickBox');
        showPackagesStub = mySandBox.stub(UserInputUtil, 'showSmartContractPackagesQuickPickBox');
        showChannelStub = mySandBox.stub(UserInputUtil, 'showChannelQuickPickBox');
        showChanincodeAndVersionStub = mySandBox.stub(UserInputUtil, 'showChaincodeAndVersionQuickPick');
        inputBoxStub = mySandBox.stub(UserInputUtil, 'showInputBox');
        browseEditStub = mySandBox.stub(UserInputUtil, 'browseEdit');
    });

    afterEach(async () => {
        await vscode.commands.executeCommand('blockchainExplorer.disconnectEntry');
        mySandBox.restore();
    });

    async function createSmartContract(name: string, type: string): Promise<void> {
        mySandBox.stub(UserInputUtil, 'showSmartContractLanguagesQuickPick').resolves(type);
        mySandBox.stub(UserInputUtil, 'showFolderOptions').resolves(UserInputUtil.ADD_TO_WORKSPACE);

        testContractName = name;
        testContractDir = path.join(__dirname, '..', '..', 'integrationTest', 'tmp', name);
        testContractType = type;
        const exists: boolean = await fs.pathExists(testContractDir);
        if (exists) {
            await fs.remove(testContractDir);
        }

        const uri: vscode.Uri = vscode.Uri.file(testContractDir);
        const uriArr: Array<vscode.Uri> = [uri];
        const openDialogStub: sinon.SinonStub = mySandBox.stub(vscode.window, 'showOpenDialog');
        openDialogStub.resolves(uriArr);

        let generator: string;
        if (type === 'Java') {
            generator = 'fabric:chaincode';
        }

        await vscode.commands.executeCommand('blockchain.createSmartContractProjectEntry', generator);

        if (type === 'JavaScript' || type === 'TypeScript') {
            await CommandUtil.sendCommandWithOutput('npm', ['install'], testContractDir, undefined, VSCodeOutputAdapter.instance(), false);
        }
    }

    async function packageSmartContract(version: string = '0.0.1'): Promise<void> {
        let workspaceFolder: vscode.WorkspaceFolder;
        let workspaceFiles: vscode.Uri[];
        if (testContractType === 'JavaScript') {
            workspaceFolder = { index: 0, name: 'javascriptProject', uri: vscode.Uri.file(testContractDir)};
            workspaceFiles = [ vscode.Uri.file('chaincode.js') ];
        } else if (testContractType === 'TypeScript') {
            workspaceFolder = { index: 0, name: 'typescriptProject', uri: vscode.Uri.file(testContractDir)};
            workspaceFiles = [ vscode.Uri.file('chaincode.js'), vscode.Uri.file('chaincode.ts') ];
        } else if (testContractType === 'Java') {
            inputBoxStub.withArgs('Enter a name for your Java package').resolves(testContractName);
            inputBoxStub.withArgs('Enter a version for your Java package').resolves(version);
            workspaceFolder = { index: 0, name: 'javaProject', uri: vscode.Uri.file(testContractDir)};
            workspaceFiles = [ vscode.Uri.file('chaincode.java') ];
        } else {
            throw new Error(`I do not know how to handle language ${testContractType}`);
        }
        getWorkspaceFoldersStub.returns([workspaceFolder]);

        findFilesStub.withArgs(new vscode.RelativePattern(workspaceFolder, '**/*.{js,ts,go,java,kt}'), '**/node_modules/**', 1).resolves(workspaceFiles);

        await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry');
    }

    async function createFabricConnection(): Promise<void> {
        if (connectionRegistry.exists('myConnection')) {
            await connectionRegistry.delete('myConnection');
        }

        const rootPath: string = path.dirname(__dirname);

        inputBoxStub.withArgs('Enter a name for the connection').resolves('myConnection');
        browseEditStub.withArgs('Enter a file path to the connection profile json file', 'myConnection').resolves(path.join(rootPath, '../integrationTest/data/connection/connection.json'));
        browseEditStub.withArgs('Enter a file path to the certificate file', 'myConnection').resolves(certPath);
        browseEditStub.withArgs('Enter a file path to the private key file', 'myConnection').resolves(keyPath);

        await vscode.commands.executeCommand('blockchainExplorer.addConnectionEntry');

        connectionRegistry.exists('myConnection').should.be.true;
    }

    async function connectToFabric(): Promise<void> {
        const connection: FabricConnectionRegistryEntry = FabricConnectionRegistry.instance().get('myConnection');
        await vscode.commands.executeCommand('blockchainExplorer.connectEntry', connection);

    }

    async function installSmartContract(name: string, version: string): Promise<void> {
        showPeerQuickPickStub.resolves('peer0.org1.example.com');
        const allPackages: Array<PackageRegistryEntry> = await PackageRegistry.instance().getAll();

        const packageToInstall: PackageRegistryEntry = allPackages.find((packageEntry: PackageRegistryEntry): boolean => {
            return packageEntry.version === version && packageEntry.name === name;
        });

        should.exist(packageToInstall);

        showPackagesStub.resolves({
            label: name,
            data: packageToInstall
        });
        await vscode.commands.executeCommand('blockchainExplorer.installSmartContractEntry');
    }

    async function instantiateSmartContract(name: string, version: string): Promise<void> {
        showChannelStub.resolves('myChannel');

        showChanincodeAndVersionStub.resolves({
            label: `${name}@${version}`,
            data: {
                chaincode: name,
                version: version
            }
        });

        inputBoxStub.withArgs('optional: What function do you want to call?').resolves('instantiate');
        inputBoxStub.withArgs('optional: What are the arguments to the function, (comma seperated)').resolves();
        await vscode.commands.executeCommand('blockchainExplorer.instantiateSmartContractEntry');
    }

    async function getRawPackageJson(): Promise<any> {
        const fileContents: Buffer = await fs.readFile(path.join(testContractDir, 'package.json'));
        return JSON.parse(fileContents.toString());
    }

    async function writePackageJson(packageJson: any): Promise<void> {
        const packageJsonString: string = JSON.stringify(packageJson, null, 4);

        return fs.writeFile(path.join(testContractDir, 'package.json'), packageJsonString, 'utf8');
    }

    async function updatePackageJsonVersion(version: string): Promise<void> {
        const packageJson: any = await getRawPackageJson();

        packageJson.version = version;

        return writePackageJson(packageJson);
    }

    it('should connect to a real fabric', async () => {
        await createFabricConnection();

        await connectToFabric();

        const allChildren: Array<ChannelTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren() as Array<ChannelTreeItem>;

        allChildren.length.should.equal(2);

        allChildren[0].label.should.equal('mychannel');
        allChildren[1].label.should.equal('myotherchannel');

        const channelChildrenOne: Array<PeersTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(allChildren[0]) as Array<PeersTreeItem>;
        const peersChildren: Array<PeerTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(channelChildrenOne[0]) as Array<PeerTreeItem>;

        peersChildren.length.should.equal(1);
        peersChildren[0].label.should.equal('peer0.org1.example.com');

        await vscode.commands.executeCommand('blockchainExplorer.disconnectEntry');
        const connectionItems: BlockchainTreeItem[] = await myExtension.getBlockchainNetworkExplorerProvider().getChildren();
        const myConnectionItem: ConnectionTreeItem = connectionItems.find((value: BlockchainTreeItem) => value instanceof ConnectionTreeItem && value.label.startsWith('myConnection')) as ConnectionTreeItem;
        await vscode.commands.executeCommand('blockchainExplorer.deleteConnectionEntry', myConnectionItem);
        connectionRegistry.exists('myConnection').should.be.false;
    }).timeout(0);

    it('should allow you to start, connect to, and stop the local Fabric in non-development mode', async () => {

        // Ensure that the Fabric runtime is in the right state.
        const runtime: FabricRuntime = runtimeManager.get('local_fabric');
        runtime.isRunning().should.eventually.be.false;
        runtime.isDevelopmentMode().should.be.false;

        // Find the Fabric runtime in the connections tree.
        let connectionItems: BlockchainTreeItem[] = await myExtension.getBlockchainNetworkExplorerProvider().getChildren();
        let localFabricItem: RuntimeTreeItem = connectionItems.find((value: BlockchainTreeItem) => value instanceof RuntimeTreeItem && value.label.startsWith('local_fabric')) as RuntimeTreeItem;
        localFabricItem.should.not.be.null;

        // Start the Fabric runtime, and ensure that it is in the right state.
        await vscode.commands.executeCommand('blockchainExplorer.startFabricRuntime', localFabricItem);
        runtime.isRunning().should.eventually.be.true;
        runtime.isDevelopmentMode().should.be.false;

        // Connect to the Fabric runtime.
        await vscode.commands.executeCommand('blockchainExplorer.connectEntry', localFabricItem.connection);

        // Ensure that the Fabric runtime is showing a single channel.
        const channelItems: ChannelTreeItem[] = await myExtension.getBlockchainNetworkExplorerProvider().getChildren() as ChannelTreeItem[];
        channelItems.length.should.equal(1);
        channelItems[0].label.should.equal('mychannel');

        // Disconnect from the Fabric runtime.
        await vscode.commands.executeCommand('blockchainExplorer.disconnectEntry');

        // Find the Fabric runtime in the connections tree again.
        connectionItems = await myExtension.getBlockchainNetworkExplorerProvider().getChildren();
        localFabricItem = connectionItems.find((value: BlockchainTreeItem) => value instanceof RuntimeTreeItem && value.label.startsWith('local_fabric')) as RuntimeTreeItem;
        localFabricItem.should.not.be.null;

        // Stop the Fabric runtime, and ensure that it is in the right state.
        await vscode.commands.executeCommand('blockchainExplorer.stopFabricRuntime', localFabricItem);
        runtime.isRunning().should.eventually.be.false;
        runtime.isDevelopmentMode().should.be.false;

    }).timeout(0);

    it('should allow you to start, connect to, and stop the local Fabric in development mode', async () => {

        // Ensure that the Fabric runtime is in the right state.
        const runtime: FabricRuntime = runtimeManager.get('local_fabric');
        runtime.isRunning().should.eventually.be.false;
        runtime.isDevelopmentMode().should.be.false;

        // Find the Fabric runtime in the connections tree.
        let connectionItems: BlockchainTreeItem[] = await myExtension.getBlockchainNetworkExplorerProvider().getChildren();
        let localFabricItem: RuntimeTreeItem = connectionItems.find((value: BlockchainTreeItem) => value instanceof RuntimeTreeItem && value.label.startsWith('local_fabric')) as RuntimeTreeItem;
        localFabricItem.should.not.be.null;

        // Enable development mode for the Fabric runtime.
        await vscode.commands.executeCommand('blockchainExplorer.toggleFabricRuntimeDevMode', localFabricItem);

        // Start the Fabric runtime, and ensure that it is in the right state.
        await vscode.commands.executeCommand('blockchainExplorer.startFabricRuntime', localFabricItem);
        runtime.isRunning().should.eventually.be.true;
        runtime.isDevelopmentMode().should.be.true;

        // Connect to the Fabric runtime.
        await vscode.commands.executeCommand('blockchainExplorer.connectEntry', localFabricItem.connection);

        // Ensure that the Fabric runtime is showing a single channel.
        const channelItems: ChannelTreeItem[] = await myExtension.getBlockchainNetworkExplorerProvider().getChildren() as ChannelTreeItem[];
        channelItems.length.should.equal(1);
        channelItems[0].label.should.equal('mychannel');

        // Disconnect from the Fabric runtime.
        await vscode.commands.executeCommand('blockchainExplorer.disconnectEntry');

        // Find the Fabric runtime in the connections tree again.
        connectionItems = await myExtension.getBlockchainNetworkExplorerProvider().getChildren();
        localFabricItem = connectionItems.find((value: BlockchainTreeItem) => value instanceof RuntimeTreeItem && value.label.startsWith('local_fabric')) as RuntimeTreeItem;
        localFabricItem.should.not.be.null;

        // Stop the Fabric runtime, disable development mode, and ensure that it is in the right state.
        await vscode.commands.executeCommand('blockchainExplorer.stopFabricRuntime', localFabricItem);
        await vscode.commands.executeCommand('blockchainExplorer.toggleFabricRuntimeDevMode', localFabricItem);
        runtime.isRunning().should.eventually.be.false;
        runtime.isDevelopmentMode().should.be.false;

    }).timeout(0);

    it('should allow you to restart the local Fabric in non-development mode', async () => {

        // Ensure that the Fabric runtime is in the right state.
        const runtime: FabricRuntime = runtimeManager.get('local_fabric');
        runtime.isRunning().should.eventually.be.false;
        runtime.isDevelopmentMode().should.be.false;

        // Find the Fabric runtime in the connections tree.
        let connectionItems: BlockchainTreeItem[] = await myExtension.getBlockchainNetworkExplorerProvider().getChildren();
        let localFabricItem: RuntimeTreeItem = connectionItems.find((value: BlockchainTreeItem) => value instanceof RuntimeTreeItem && value.label.startsWith('local_fabric')) as RuntimeTreeItem;
        localFabricItem.should.not.be.null;

        // Start the Fabric runtime, and ensure that it is in the right state.
        await vscode.commands.executeCommand('blockchainExplorer.startFabricRuntime', localFabricItem);
        runtime.isRunning().should.eventually.be.true;
        runtime.isDevelopmentMode().should.be.false;

        // Connect to the Fabric runtime.
        await vscode.commands.executeCommand('blockchainExplorer.connectEntry', localFabricItem.connection);

        // Ensure that the Fabric runtime is showing a single channel.
        let channelItems: ChannelTreeItem[] = await myExtension.getBlockchainNetworkExplorerProvider().getChildren() as ChannelTreeItem[];
        channelItems.length.should.equal(1);
        channelItems[0].label.should.equal('mychannel');

        // Disconnect from the Fabric runtime.
        await vscode.commands.executeCommand('blockchainExplorer.disconnectEntry');

        // Find the Fabric runtime in the connections tree again.
        connectionItems = await myExtension.getBlockchainNetworkExplorerProvider().getChildren();
        localFabricItem = connectionItems.find((value: BlockchainTreeItem) => value instanceof RuntimeTreeItem && value.label.startsWith('local_fabric')) as RuntimeTreeItem;
        localFabricItem.should.not.be.null;

        // Restart the Fabric runtime, and ensure that it is in the right state.
        await vscode.commands.executeCommand('blockchainExplorer.restartFabricRuntime', localFabricItem);
        runtime.isRunning().should.eventually.be.true;
        runtime.isDevelopmentMode().should.be.false;

        // Connect to the Fabric runtime.
        await vscode.commands.executeCommand('blockchainExplorer.connectEntry', localFabricItem.connection);

        // Ensure that the Fabric runtime is showing a single channel.
        channelItems = await myExtension.getBlockchainNetworkExplorerProvider().getChildren() as ChannelTreeItem[];
        channelItems.length.should.equal(1);
        channelItems[0].label.should.equal('mychannel');

        // Disconnect from the Fabric runtime.
        await vscode.commands.executeCommand('blockchainExplorer.disconnectEntry');

        // Stop the Fabric runtime, and ensure that it is in the right state.
        await vscode.commands.executeCommand('blockchainExplorer.stopFabricRuntime', localFabricItem);
        runtime.isRunning().should.eventually.be.false;
        runtime.isDevelopmentMode().should.be.false;

    }).timeout(0);

    it('should persist local Fabric data across restarts until the local Fabric is torn down', async () => {

        // Ensure that the Fabric runtime is in the right state.
        const runtime: FabricRuntime = runtimeManager.get('local_fabric');
        runtime.isRunning().should.eventually.be.false;
        runtime.isDevelopmentMode().should.be.false;

        // Find the Fabric runtime in the connections tree.
        let connectionItems: BlockchainTreeItem[] = await myExtension.getBlockchainNetworkExplorerProvider().getChildren();
        let localFabricItem: RuntimeTreeItem = connectionItems.find((value: BlockchainTreeItem) => value instanceof RuntimeTreeItem && value.label.startsWith('local_fabric')) as RuntimeTreeItem;
        localFabricItem.should.not.be.null;

        // Start the Fabric runtime, and ensure that it is in the right state.
        await vscode.commands.executeCommand('blockchainExplorer.startFabricRuntime', localFabricItem);
        runtime.isRunning().should.eventually.be.true;
        runtime.isDevelopmentMode().should.be.false;

        // Connect to the Fabric runtime.
        await vscode.commands.executeCommand('blockchainExplorer.connectEntry', localFabricItem.connection);

        // Ensure that the Fabric runtime is showing a single channel.
        let channelItems: ChannelTreeItem[] = await myExtension.getBlockchainNetworkExplorerProvider().getChildren() as ChannelTreeItem[];
        channelItems.length.should.equal(1);
        channelItems[0].label.should.equal('mychannel');

        // Create a smart contract, package it, install it, and instantiate it.
        await createSmartContract('teardownSmartContract', 'JavaScript');
        await packageSmartContract();
        await installSmartContract('teardownSmartContract', '0.0.1');
        await instantiateSmartContract('teardownSmartContract', '0.0.1');

        // Disconnect from the Fabric runtime.
        await vscode.commands.executeCommand('blockchainExplorer.disconnectEntry');

        // Find the Fabric runtime in the connections tree again.
        connectionItems = await myExtension.getBlockchainNetworkExplorerProvider().getChildren();
        localFabricItem = connectionItems.find((value: BlockchainTreeItem) => value instanceof RuntimeTreeItem && value.label.startsWith('local_fabric')) as RuntimeTreeItem;
        localFabricItem.should.not.be.null;

        // Restart the Fabric runtime, and ensure that it is in the right state.
        await vscode.commands.executeCommand('blockchainExplorer.restartFabricRuntime', localFabricItem);
        runtime.isRunning().should.eventually.be.true;
        runtime.isDevelopmentMode().should.be.false;

        // Connect to the Fabric runtime.
        await vscode.commands.executeCommand('blockchainExplorer.connectEntry', localFabricItem.connection);

        // Ensure that the Fabric runtime is showing a single channel.
        channelItems = await myExtension.getBlockchainNetworkExplorerProvider().getChildren() as ChannelTreeItem[];
        channelItems.length.should.equal(1);
        channelItems[0].label.should.equal('mychannel');

        // Ensure that the instantiated chaincodes are still instantiated.
        let channelChildren: BlockchainTreeItem[] = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(channelItems[0]);
        let instantiatedChaincodesParent: InstantiatedChainCodesTreeItem = channelChildren.find((channelChild: BlockchainTreeItem) => channelChild instanceof InstantiatedChainCodesTreeItem) as InstantiatedChainCodesTreeItem;
        instantiatedChaincodesParent.should.not.be.undefined;
        const instantiatedChaincodesItems: ChainCodeTreeItem[] = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(instantiatedChaincodesParent) as ChainCodeTreeItem[];
        const teardownSmartContractItem: ChainCodeTreeItem = instantiatedChaincodesItems.find((instantiatedChaincodesItem: ChainCodeTreeItem) => instantiatedChaincodesItem.label === 'teardownSmartContract@0.0.1');
        teardownSmartContractItem.should.not.be.undefined;

        // Disconnect from the Fabric runtime.
        await vscode.commands.executeCommand('blockchainExplorer.disconnectEntry');

        // Teardown the Fabric runtime, and ensure that it is in the right state.
        const warningStub: sinon.SinonStub = mySandBox.stub(UserInputUtil, 'showConfirmationWarningMessage').resolves(true);
        await vscode.commands.executeCommand('blockchainExplorer.teardownFabricRuntime', localFabricItem);
        runtime.isRunning().should.eventually.be.false;
        runtime.isDevelopmentMode().should.be.false;
        warningStub.restore();

        // Start the Fabric runtime, and ensure that it is in the right state.
        await vscode.commands.executeCommand('blockchainExplorer.startFabricRuntime', localFabricItem);
        runtime.isRunning().should.eventually.be.true;
        runtime.isDevelopmentMode().should.be.false;

        // Connect to the Fabric runtime.
        await vscode.commands.executeCommand('blockchainExplorer.connectEntry', localFabricItem.connection);

        // Ensure that the Fabric runtime is showing a single channel.
        channelItems = await myExtension.getBlockchainNetworkExplorerProvider().getChildren() as ChannelTreeItem[];
        channelItems.length.should.equal(1);
        channelItems[0].label.should.equal('mychannel');

        // Ensure that there are no instantiated chaincodes.
        channelChildren = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(channelItems[0]);
        instantiatedChaincodesParent = channelChildren.find((channelChild: BlockchainTreeItem) => channelChild instanceof InstantiatedChainCodesTreeItem) as InstantiatedChainCodesTreeItem;
        should.equal(instantiatedChaincodesParent, undefined);

    }).timeout(0);

    ['Java' , 'JavaScript', 'TypeScript'].forEach((language: string) => {

        it(`should create a ${language} smart contract, package, install it on a peer and instantiate`, async () => {
            const smartContractName: string = `my${language}SC`;

            await createFabricConnection();

            await connectToFabric();

            await createSmartContract(smartContractName, language);

            await packageSmartContract();

            await installSmartContract(smartContractName, '0.0.1');

            await instantiateSmartContract(smartContractName, '0.0.1');

            let allChildren: Array<ChannelTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren() as Array<ChannelTreeItem>;

            let channelChildrenOne: Array<BlockchainTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(allChildren[0]) as Array<PeersTreeItem>;

            allChildren = await myExtension.getBlockchainNetworkExplorerProvider().getChildren() as Array<ChannelTreeItem>;
            channelChildrenOne = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(allChildren[0]) as Array<PeersTreeItem>;

            const peersChildren: Array<PeerTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(channelChildrenOne[0]) as Array<PeerTreeItem>;

            const installedSmartContracts: Array<InstalledChainCodeTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(peersChildren[0]) as Array<InstalledChainCodeTreeItem>;

            const installedSmartContract: InstalledChainCodeTreeItem = installedSmartContracts.find((_installedSmartContract: InstalledChainCodeTreeItem) => {
                return _installedSmartContract.label === smartContractName;
            });

            installedSmartContract.should.not.be.null;

            const versions: Array<InstalledChainCodeVersionTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(installedSmartContract) as Array<InstalledChainCodeVersionTreeItem>;

            versions.length.should.equal(1);

            versions[0].label.should.equal('0.0.1');

            const instantiatedSmartContracts: Array<ChainCodeTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(channelChildrenOne[1]) as Array<ChainCodeTreeItem>;

            const instantiatedSmartContract: ChainCodeTreeItem = instantiatedSmartContracts.find((_instantiatedSmartContract: ChainCodeTreeItem) => {
                return _instantiatedSmartContract.label === `${smartContractName}@0.0.1`;
            });

            instantiatedSmartContract.should.not.be.null;

        }).timeout(0);

        it(`should upgrade a ${language} smart contract`, async () => {
            const smartContractName: string = `my${language}SC2`;

            await createFabricConnection();

            await connectToFabric();

            await createSmartContract(smartContractName, language);

            await packageSmartContract();

            await installSmartContract(smartContractName, '0.0.1');

            await instantiateSmartContract(smartContractName, '0.0.1');

            if (language === 'JavaScript' || language === 'TypeScript') {
                await updatePackageJsonVersion('0.0.2');
            }

            await packageSmartContract('0.0.2');

            await installSmartContract(smartContractName, '0.0.2');

            await instantiateSmartContract(smartContractName, '0.0.2');

            let allChildren: Array<ChannelTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren() as Array<ChannelTreeItem>;

            let channelChildrenOne: Array<BlockchainTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(allChildren[0]) as Array<PeersTreeItem>;

            allChildren = await myExtension.getBlockchainNetworkExplorerProvider().getChildren() as Array<ChannelTreeItem>;
            channelChildrenOne = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(allChildren[0]) as Array<PeersTreeItem>;

            const peersChildren: Array<PeerTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(channelChildrenOne[0]) as Array<PeerTreeItem>;

            const installedSmartContracts: Array<InstalledChainCodeTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(peersChildren[0]) as Array<InstalledChainCodeTreeItem>;

            const installedSmartContract: InstalledChainCodeTreeItem = installedSmartContracts.find((_installedSmartContract: InstalledChainCodeTreeItem) => {
                return _installedSmartContract.label === smartContractName;
            });

            installedSmartContract.should.not.be.null;

            const versions: Array<InstalledChainCodeVersionTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(installedSmartContract) as Array<InstalledChainCodeVersionTreeItem>;

            versions.length.should.equal(2);

            versions[0].label.should.equal('0.0.1');
            versions[1].label.should.equal('0.0.2');

            const instantiatedSmartContracts: Array<ChainCodeTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(channelChildrenOne[1]) as Array<ChainCodeTreeItem>;

            const instantiatedSmartContract: ChainCodeTreeItem = instantiatedSmartContracts.find((_instantiatedSmartContract: ChainCodeTreeItem) => {
                return _instantiatedSmartContract.label === `${smartContractName}@0.0.2`;
            });

            instantiatedSmartContract.should.not.be.null;
        }).timeout(0);

    });

});
