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
import * as sinon from 'sinon';
import * as path from 'path';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';
import { UserInputUtil } from '../../extension/commands/UserInputUtil';
import { UserInputUtilHelper } from './userInputUtilHelper';
import { ExtensionCommands } from '../../ExtensionCommands';
import { IFabricWallet, FabricIdentity } from 'ibm-blockchain-platform-common';
import { FabricWalletGeneratorFactory } from '../../extension/fabric/FabricWalletGeneratorFactory';
import { FabricGatewayRegistryEntry } from '../../extension/registries/FabricGatewayRegistryEntry';
import { FabricWalletRegistryEntry } from '../../extension/registries/FabricWalletRegistryEntry';
import { FabricWalletUtil } from '../../extension/fabric/FabricWalletUtil';
import { FabricWalletRegistry } from '../../extension/registries/FabricWalletRegistry';
import { IFabricWalletGenerator } from '../../extension/fabric/IFabricWalletGenerator';

chai.use(sinonChai);
chai.use(chaiAsPromised);

export class WalletAndIdentityHelper {

    public static certPath: string = path.join(__dirname, `../../../cucumber/hlfv1/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/Admin@org1.example.com-cert.pem`);
    public static keyPath: string = path.join(__dirname, `../../../cucumber/hlfv1/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore/key1.pem`);
    public static jsonFilePath: string = path.join(__dirname, `../../../cucumber/hlfv1/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/Org1Admin.json`);
    public static connectionProfilePath: string = path.join(__dirname, '../../../cucumber/hlfv1/connection.json');
    public static localWalletPath: string = path.join(__dirname, '..', '..', '..', 'cucumber', 'tmp', 'wallets', FabricWalletUtil.LOCAL_WALLET);

    mySandBox: sinon.SinonSandbox;
    userInputUtilHelper: UserInputUtilHelper;

    constructor(sandbox: sinon.SinonSandbox, userInputUtilHelper: UserInputUtilHelper) {
        this.mySandBox = sandbox;
        this.userInputUtilHelper = userInputUtilHelper;
    }

    public async createCAIdentity(walletName: string, identityName: string, attributes: string = '[]'): Promise<void> {
        let walletEntry: FabricWalletRegistryEntry;
        if (walletName === FabricWalletUtil.LOCAL_WALLET) {
            walletEntry = new FabricWalletRegistryEntry();
            walletEntry.name = FabricWalletUtil.LOCAL_WALLET;
            walletEntry.walletPath = WalletAndIdentityHelper.localWalletPath;
        } else {
            walletEntry = await FabricWalletRegistry.instance().get(walletName);
        }

        const fabricWalletGenerator: IFabricWalletGenerator = FabricWalletGeneratorFactory.createFabricWalletGenerator();
        const wallet: IFabricWallet = await fabricWalletGenerator.getWallet(walletEntry.name);
        const identityExists: boolean = await wallet.exists(identityName);

        if (!identityExists) {
            this.userInputUtilHelper.inputBoxStub.withArgs('Provide a name for the identity').resolves(identityName);

            if (attributes !== '[]') {
                // The user has given us attributes
                this.userInputUtilHelper.showYesNoQuickPick.withArgs('Do you want to add attributes to the identity?').resolves(UserInputUtil.YES);
                this.userInputUtilHelper.inputBoxStub.withArgs(`What are the attributes for the identity? e.g. [{ "name":"hello", "value":"world", "ecert":true }]`, '[]').resolves(attributes);

            } else {
                this.userInputUtilHelper.showYesNoQuickPick.withArgs('Do you want to add attributes to the identity?').resolves(UserInputUtil.NO);
            }

            await vscode.commands.executeCommand(ExtensionCommands.CREATE_NEW_IDENTITY);
        }
    }

    public async deleteCAIdentity(name: string): Promise<void> {
        const walletEntry: FabricWalletRegistryEntry = new FabricWalletRegistryEntry();
        walletEntry.name = FabricWalletUtil.LOCAL_WALLET;
        walletEntry.walletPath = WalletAndIdentityHelper.localWalletPath;

        const fabricWalletGenerator: IFabricWalletGenerator = FabricWalletGeneratorFactory.createFabricWalletGenerator();
        const wallet: IFabricWallet = await fabricWalletGenerator.getWallet(walletEntry.name);
        const identityExists: boolean = await wallet.exists(name);

        if (identityExists) {
            this.userInputUtilHelper.showWalletsQuickPickStub.withArgs('Choose the wallet containing the identity that you want to delete').resolves({
                label: FabricWalletUtil.LOCAL_WALLET_DISPLAY_NAME,
                data: walletEntry
            });
            this.userInputUtilHelper.showIdentitiesQuickPickStub.withArgs('Choose the identities to delete').resolves([name]);
            this.userInputUtilHelper.showConfirmationWarningMessageStub.withArgs(`This will delete ${name} from your file system. Do you want to continue?`).resolves(true);

            await vscode.commands.executeCommand(ExtensionCommands.DELETE_IDENTITY);
        }
    }

    public async createWallet(name: string, identityName: string, mspid: string, method: string): Promise<void> {
        const exists: boolean = await FabricWalletRegistry.instance().exists(name);

        if (!exists) {
            this.userInputUtilHelper.showAddWalletOptionsQuickPickStub.resolves(UserInputUtil.WALLET_NEW_ID);
            this.userInputUtilHelper.inputBoxStub.withArgs('Enter a name for the wallet').resolves(name);

            this.setIdentityStubs(method, identityName, mspid);
            await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET);
        } else {
            const wallet: IFabricWallet = await FabricWalletGeneratorFactory.createFabricWalletGenerator().getWallet(name);
            const identities: FabricIdentity[] = await wallet.getIdentities();
            const identity: FabricIdentity = identities.find((_identity: FabricIdentity) => {
                return _identity.name === identityName;
            });

            if (!identity) {
                await this.createIdentity(name, identityName, mspid, method);
            }
        }
    }

    public async createIdentity(walletName: string, identityName: string, mspid: string, method: string): Promise<void> {
        this.setIdentityStubs(method, identityName, mspid);
        const wallet: FabricWalletRegistryEntry = await FabricWalletRegistry.instance().get(walletName);
        await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET_IDENTITY, wallet);
    }

    private setIdentityStubs(method: string, identityName: string, mspid: string): void {
        this.userInputUtilHelper.inputBoxStub.withArgs('Provide a name for the identity').resolves(identityName);
        this.userInputUtilHelper.inputBoxStub.withArgs('Enter MSPID').resolves(mspid);

        if (method === 'certs') {
            this.userInputUtilHelper.showAddIdentityMethodStub.resolves(UserInputUtil.ADD_CERT_KEY_OPTION);
            this.userInputUtilHelper.showGetCertKeyStub.resolves({ certificatePath: WalletAndIdentityHelper.certPath, privateKeyPath: WalletAndIdentityHelper.keyPath });
        } else if (method === 'JSON file') {
            this.userInputUtilHelper.showAddIdentityMethodStub.resolves(UserInputUtil.ADD_JSON_ID_OPTION);
            this.userInputUtilHelper.browseStub.resolves(vscode.Uri.file(WalletAndIdentityHelper.jsonFilePath));
        } else {
            // use enroll id and secret
            this.userInputUtilHelper.showAddIdentityMethodStub.resolves(UserInputUtil.ADD_ID_SECRET_OPTION);
            const gatewayRegistryEntry: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
            gatewayRegistryEntry.name = 'myGateway';

            this.userInputUtilHelper.showGatewayQuickPickStub.resolves({ data: gatewayRegistryEntry });
            this.userInputUtilHelper.getEnrollIdSecretStub.resolves({ enrollmentID: 'admin', enrollmentSecret: 'adminpw' });
        }
    }
}
