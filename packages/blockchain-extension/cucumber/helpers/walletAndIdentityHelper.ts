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
import { IFabricWallet, IFabricWalletGenerator, FabricIdentity, FabricWalletRegistry, FabricWalletRegistryEntry, FabricWalletGeneratorFactory, FabricGatewayRegistryEntry } from 'ibm-blockchain-platform-common';
chai.use(sinonChai);
chai.use(chaiAsPromised);

export class WalletAndIdentityHelper {

    public static certPath: string = path.join(__dirname, `../../../cucumber/hlfv1/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/Admin@org1.example.com-cert.pem`);
    public static keyPath: string = path.join(__dirname, `../../../cucumber/hlfv1/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore/key1.pem`);
    public static jsonFilePath: string = path.join(__dirname, `../../../cucumber/hlfv1/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/Org1Admin.json`);
    public static connectionProfilePath: string = path.join(__dirname, '../../../cucumber/hlfv1/connection.json');

    mySandBox: sinon.SinonSandbox;
    userInputUtilHelper: UserInputUtilHelper;

    constructor(sandbox: sinon.SinonSandbox, userInputUtilHelper: UserInputUtilHelper) {
        this.mySandBox = sandbox;
        this.userInputUtilHelper = userInputUtilHelper;
    }

    public async createCAIdentity(walletName: string, identityName: string, environmentName: string, attributes: string = '[]'): Promise<void> {
        const walletEntry: FabricWalletRegistryEntry = await FabricWalletRegistry.instance().get(walletName, environmentName);

        const fabricWalletGenerator: IFabricWalletGenerator = FabricWalletGeneratorFactory.getFabricWalletGenerator();
        const wallet: IFabricWallet = await fabricWalletGenerator.getWallet(walletEntry);
        const identityExists: boolean = await wallet.exists(identityName);

        let ca: string;
        if (process.env.OTHER_FABRIC) {
            // Using old Fabric
            ca = 'ca.example.com';
        } else {
            // Using new Ansible Fabric
            ca = 'Org1CA';
        }

        this.userInputUtilHelper.showCertificateAuthorityQuickPickStub.withArgs('Choose certificate authority to create a new identity with').resolves(ca);
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

    public async deleteCAIdentity(identityName: string, walletName: string, environmentName: string): Promise<void> {
        const walletEntry: FabricWalletRegistryEntry = await FabricWalletRegistry.instance().get(walletName, environmentName);

        const fabricWalletGenerator: IFabricWalletGenerator = FabricWalletGeneratorFactory.getFabricWalletGenerator();
        const wallet: IFabricWallet = await fabricWalletGenerator.getWallet(walletEntry);
        const identityExists: boolean = await wallet.exists(identityName);

        if (identityExists) {
            this.userInputUtilHelper.showWalletsQuickPickStub.withArgs('Choose the wallet containing the identity that you want to delete').resolves({
                label: walletEntry.displayName,
                data: walletEntry
            });
            this.userInputUtilHelper.showIdentitiesQuickPickStub.withArgs('Choose the identities to delete').resolves([identityName]);
            this.userInputUtilHelper.showConfirmationWarningMessageStub.withArgs(`This will delete ${identityName} from your file system. Do you want to continue?`).resolves(true);

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
            const walletEntry: FabricWalletRegistryEntry = await FabricWalletRegistry.instance().get(name);
            const wallet: IFabricWallet = await FabricWalletGeneratorFactory.getFabricWalletGenerator().getWallet(walletEntry);
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
        this.userInputUtilHelper.inputBoxStub.withArgs('Enter MSPID').resolves(mspid);

        if (method === 'certs') {
            this.userInputUtilHelper.showAddIdentityMethodStub.resolves(UserInputUtil.ADD_CERT_KEY_OPTION);
            this.userInputUtilHelper.inputBoxStub.withArgs('Provide a name for the identity').resolves(identityName);
            this.userInputUtilHelper.showGetCertKeyStub.resolves({ certificatePath: WalletAndIdentityHelper.certPath, privateKeyPath: WalletAndIdentityHelper.keyPath });
        } else if (method === 'JSON file') {
            const jsonPath: string = process.env.OPSTOOLS_FABRIC ? path.join(process.env.JSON_DIR, `${identityName}.json`) : WalletAndIdentityHelper.jsonFilePath;
            this.userInputUtilHelper.showAddIdentityMethodStub.resolves(UserInputUtil.ADD_JSON_ID_OPTION);
            this.userInputUtilHelper.browseStub.resolves(vscode.Uri.file(jsonPath));
        } else {
            // use enroll id and secret
            this.userInputUtilHelper.showAddIdentityMethodStub.resolves(UserInputUtil.ADD_ID_SECRET_OPTION);
            this.userInputUtilHelper.inputBoxStub.withArgs('Provide a name for the identity').resolves(identityName);
            const gatewayRegistryEntry: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
            gatewayRegistryEntry.name = 'myGateway';

            this.userInputUtilHelper.showGatewayQuickPickStub.resolves({ data: gatewayRegistryEntry });
            this.userInputUtilHelper.getEnrollIdSecretStub.resolves({ enrollmentID: 'admin', enrollmentSecret: 'adminpw' });
        }
    }
}
