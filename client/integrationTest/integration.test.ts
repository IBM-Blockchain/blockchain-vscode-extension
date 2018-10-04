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

const should = chai.should();
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
    let testContractDir: string;

    let getWorkspaceFoldersStub;
    let findFilesStub;
    let showPeerQuickPickStub;
    let showPackagesStub;
    let showChannelStub;
    let showChanincodeAndVersionStub;
    let inputBoxStub;

    before(async function() {
        this.timeout(600000);
        keyPath = path.join(__dirname, `../../integrationTest/hlfv1/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore/key.pem`);
        certPath = path.join(__dirname, `../../integrationTest/hlfv1/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/Admin@org1.example.com-cert.pem`);

        await ExtensionUtil.activateExtension();
        await TestUtil.storeConnectionsConfig();
        await TestUtil.storeRuntimesConfig();
        await TestUtil.storePackageDirectoryConfig();

        VSCodeOutputAdapter.instance().setConsole(true);
    });

    after(async () => {
        VSCodeOutputAdapter.instance().setConsole(false);
        await TestUtil.restoreConnectionsConfig();
        await TestUtil.restoreRuntimesConfig();
        await TestUtil.restorePackageDirectoryConfig();
    });

    beforeEach(() => {
        mySandBox = sinon.createSandbox();
        getWorkspaceFoldersStub = mySandBox.stub(UserInputUtil, 'getWorkspaceFolders')
        findFilesStub = mySandBox.stub(vscode.workspace, 'findFiles').resolves([]);
        showPeerQuickPickStub = mySandBox.stub(UserInputUtil, 'showPeerQuickPickBox');
        showPackagesStub = mySandBox.stub(UserInputUtil, 'showSmartContractPackagesQuickPickBox');
        showChannelStub = mySandBox.stub(UserInputUtil, 'showChannelQuickPickBox');
        showChanincodeAndVersionStub = mySandBox.stub(UserInputUtil, 'showChaincodeAndVersionQuickPick');
        inputBoxStub = mySandBox.stub(UserInputUtil, 'showInputBox');
    });

    afterEach(async () => {
        await vscode.commands.executeCommand('blockchainExplorer.disconnectEntry');
        mySandBox.restore();
    });

    async function createSmartContract(name, type) {
        mySandBox.stub(UserInputUtil, 'showSmartContractLanguagesQuickPick').resolves(type);
        mySandBox.stub(UserInputUtil, 'showFolderOptions').resolves(UserInputUtil.OPEN_IN_CURRENT_WINDOW);

        const originalExecuteCommand = vscode.commands.executeCommand;
        const executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
        executeCommandStub.callsFake(async function fakeExecuteCommand(command: string) {
            // Don't open the folder as this causes lots of windows to pop up, and random
            // test failures.
            if (command !== 'vscode.openFolder') {
                return originalExecuteCommand.apply(this, arguments);
            }
        });

        testContractDir = path.join(__dirname, '../../integrationTest', name);

        const smartContractDir: string = path.join(__dirname, '../../integrationTest/smartContractDir');

        const uri = vscode.Uri.file(testContractDir);
        const uriArr = [uri];
        const openDialogStub = mySandBox.stub(vscode.window, 'showOpenDialog');
        openDialogStub.resolves(uriArr);

        await vscode.workspace.getConfiguration().update('fabric.package.directory', smartContractDir, vscode.ConfigurationTarget.Global);

        await vscode.commands.executeCommand('blockchain.createSmartContractProjectEntry');
    }

    async function packageSmartContract() {
       getWorkspaceFoldersStub.returns([{uri: {path: testContractDir}}]);
      
        findFilesStub.withArgs('**/*.js', '**/node_modules/**', 1).resolves([vscode.Uri.file('chaincode.js')]);

        await vscode.commands.executeCommand('blockchainAPackageExplorer.packageSmartContractProjectEntry');
    }

    async function createFabricConnection() {
        if (connectionRegistry.exists('myConnection')) {
            await connectionRegistry.delete('myConnection');
        }

        const rootPath = path.dirname(__dirname);

        inputBoxStub.withArgs('Enter a name for the connection').resolves('myConnection');
        inputBoxStub.withArgs('Enter a file path to the connection profile json file').resolves(path.join(rootPath, '../integrationTest/data/connection/connection.json'));
        inputBoxStub.withArgs('Enter a file path to the certificate file').resolves(certPath);
        inputBoxStub.withArgs('Enter a file path to the private key file').resolves(keyPath);

        await vscode.commands.executeCommand('blockchainExplorer.addConnectionEntry');

        connectionRegistry.exists('myConnection').should.be.true;
    }

    async function connectToFabric() {
        const connection: FabricConnectionRegistryEntry = FabricConnectionRegistry.instance().get('myConnection');

        await vscode.commands.executeCommand('blockchainExplorer.connectEntry', connection);

    }

    async function installSmartContract(name, version, type) {
        showPeerQuickPickStub.resolves('peer0.org1.example.com');
        const allPackages: Array<PackageRegistryEntry> = await PackageRegistry.instance().getAll();

        const packageToInstall = allPackages.find((packageEntry) => {
            return packageEntry.version === version && packageEntry.name === name && packageEntry.chaincodeLanguage === type;
        });

        should.exist(packageToInstall);

        showPackagesStub.resolves({
            label: name,
            data: packageToInstall
        });
        await vscode.commands.executeCommand('blockchainExplorer.installSmartContractEntry');
    }

    async function instantiateSmartContract(name, version) {
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

    async function updatePackageJsonVersion(version): Promise<void> {
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
        const connection: FabricConnectionRegistryEntry = connectionRegistry.get('local_fabric');
        await vscode.commands.executeCommand('blockchainExplorer.connectEntry', connection);

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
        const connection: FabricConnectionRegistryEntry = connectionRegistry.get('local_fabric');
        await vscode.commands.executeCommand('blockchainExplorer.connectEntry', connection);

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
        let connection: FabricConnectionRegistryEntry = connectionRegistry.get('local_fabric');
        await vscode.commands.executeCommand('blockchainExplorer.connectEntry', connection);

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
        connection = connectionRegistry.get('local_fabric');
        await vscode.commands.executeCommand('blockchainExplorer.connectEntry', connection);

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

    it('should create a smart contract, package, install it on a peer and instantiate', async () => {
        await createFabricConnection();

        await connectToFabric();

        await createSmartContract('mySmartContract', 'JavaScript');

        await packageSmartContract();

        await installSmartContract('mySmartContract', '0.0.1', 'javascript');

        await instantiateSmartContract('mySmartContract', '0.0.1');

        let allChildren: Array<ChannelTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren() as Array<ChannelTreeItem>;

        let channelChildrenOne: Array<BlockchainTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(allChildren[0]) as Array<PeersTreeItem>;

        allChildren = await myExtension.getBlockchainNetworkExplorerProvider().getChildren() as Array<ChannelTreeItem>;
        channelChildrenOne = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(allChildren[0]) as Array<PeersTreeItem>;

        const peersChildren: Array<PeerTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(channelChildrenOne[0]) as Array<PeerTreeItem>;

        const installedSmartContracts: Array<InstalledChainCodeTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(peersChildren[0]) as Array<InstalledChainCodeTreeItem>;

        installedSmartContracts.length.should.equal(1);

        installedSmartContracts[0].label.should.equal('mySmartContract');

        const versions: Array<InstalledChainCodeVersionTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(installedSmartContracts[0]) as Array<InstalledChainCodeVersionTreeItem>;

        versions.length.should.equal(1);

        versions[0].label.should.equal('0.0.1');

        const instantiatedSmartContracts: Array<ChainCodeTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(channelChildrenOne[1]) as Array<ChainCodeTreeItem>;

        instantiatedSmartContracts.length.should.equal(1);

        instantiatedSmartContracts[0].label.should.equal('mySmartContract - 0.0.1');

    }).timeout(0);

    // TODO: put this back in when upgrade is more reliable, the problem is with the 
    // new event handling stuff it doesn't always unblock even though the upgrade happens
    xit('should upgrade a smart contract', async () => {
        await createFabricConnection();

        await connectToFabric();

        await createSmartContract('anotherSmartContract', 'JavaScript');

        await packageSmartContract();

        await installSmartContract('anotherSmartContract', '0.0.1', 'javascript');

        await instantiateSmartContract('anotherSmartContract', '0.0.1');

        await updatePackageJsonVersion('0.0.2');

        await packageSmartContract();

        await installSmartContract('anotherSmartContract', '0.0.2', 'javascript');

        await instantiateSmartContract('anotherSmartContract', '0.0.2');

        let allChildren: Array<ChannelTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren() as Array<ChannelTreeItem>;

        let channelChildrenOne: Array<BlockchainTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(allChildren[0]) as Array<PeersTreeItem>;

        allChildren = await myExtension.getBlockchainNetworkExplorerProvider().getChildren() as Array<ChannelTreeItem>;
        channelChildrenOne = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(allChildren[0]) as Array<PeersTreeItem>;

        const peersChildren: Array<PeerTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(channelChildrenOne[0]) as Array<PeerTreeItem>;

        const installedSmartContracts: Array<InstalledChainCodeTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(peersChildren[0]) as Array<InstalledChainCodeTreeItem>;

        installedSmartContracts.length.should.equal(1);

        installedSmartContracts[0].label.should.equal('anotherSmartContract');

        const versions: Array<InstalledChainCodeVersionTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(installedSmartContracts[0]) as Array<InstalledChainCodeVersionTreeItem>;

        versions.length.should.equal(2);

        versions[0].label.should.equal('0.0.1');
        versions[1].label.should.equal('0.0.2');

        const instantiatedSmartContracts: Array<ChainCodeTreeItem> = await myExtension.getBlockchainNetworkExplorerProvider().getChildren(channelChildrenOne[1]) as Array<ChainCodeTreeItem>;

        instantiatedSmartContracts.length.should.equal(1);

        instantiatedSmartContracts[0].label.should.equal('anotherSmartContract - 0.0.2');
    }).timeout(0);
});
