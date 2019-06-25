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
import * as fs from 'fs-extra';
import { UserInputUtil } from '../../src/commands/UserInputUtil';
import { UserInputUtilHelper } from './userInputUtilHelper';
import { ExtensionCommands } from '../../ExtensionCommands';
import { IFabricWallet } from '../../src/fabric/IFabricWallet';
import { FabricWalletGeneratorFactory } from '../../src/fabric/FabricWalletGeneratorFactory';
import { FabricGatewayRegistryEntry } from '../../src/fabric/FabricGatewayRegistryEntry';
import { FabricWalletRegistryEntry } from '../../src/fabric/FabricWalletRegistryEntry';
import { FabricWalletUtil } from '../../src/fabric/FabricWalletUtil';

chai.use(sinonChai);
chai.use(chaiAsPromised);

export class WalletAndIdentityHelper {

    public static certPath: string = path.join(__dirname, `../../../cucumber/hlfv1/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/Admin@org1.example.com-cert.pem`);
    public static keyPath: string = path.join(__dirname, `../../../cucumber/hlfv1/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore/key1.pem`);
    public static jsonFilePath: string = path.join(__dirname, `../../../cucumber/hlfv1/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/Org1Admin.json`);
    public static connectionProfilePath: string = path.join(__dirname, '../../../cucumber/hlfv1/connection.json');
    public static localWalletPath: string = path.join(__dirname, '..', '..', '..', 'cucumber', 'tmp', FabricWalletUtil.LOCAL_WALLET);

    mySandBox: sinon.SinonSandbox;
    userInputUtilHelper: UserInputUtilHelper;

    constructor(sandbox: sinon.SinonSandbox, userInputUtilHelper: UserInputUtilHelper) {
        this.mySandBox = sandbox;
        this.userInputUtilHelper = userInputUtilHelper;
    }

    public async createCAIdentity(name: string): Promise<void> {
        const walletEntry: FabricWalletRegistryEntry = new FabricWalletRegistryEntry();
        walletEntry.name = FabricWalletUtil.LOCAL_WALLET;
        walletEntry.walletPath = WalletAndIdentityHelper.localWalletPath;

        const identityExists: boolean = await fs.pathExists(path.join(walletEntry.walletPath, name));
        if (!identityExists) {
            this.userInputUtilHelper.showCertificateAuthorityQuickPickStub.withArgs('Choose certificate authority to create a new identity with').resolves('ca.org1.example.com');
            this.userInputUtilHelper.inputBoxStub.withArgs('Provide a name for the identity').resolves(name);
            await vscode.commands.executeCommand(ExtensionCommands.CREATE_NEW_IDENTITY);
        }
    }

    public async createWallet(name: string, identityName: string, mspid: string, method: string): Promise<void> {
        this.userInputUtilHelper.showAddWalletOptionsQuickPickStub.resolves(UserInputUtil.WALLET_NEW_ID);
        this.userInputUtilHelper.inputBoxStub.withArgs('Enter a name for the wallet').resolves(name);

        this.setIdentityStubs(method, identityName, mspid);
        await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET);
    }

    public async createIdentity(walletName: string, identityName: string, mspid: string, method: string): Promise<void> {
        this.setIdentityStubs(method, identityName, mspid);
        const wallet: IFabricWallet = await FabricWalletGeneratorFactory.createFabricWalletGenerator().createLocalWallet(walletName);
        await vscode.commands.executeCommand(ExtensionCommands.ADD_WALLET_IDENTITY, wallet);
    }

    private setIdentityStubs(method: string, identityName: string, mspid: string): void {
        this.userInputUtilHelper.inputBoxStub.withArgs('Provide a name for the identity').resolves(identityName);
        this.userInputUtilHelper.inputBoxStub.withArgs('Enter MSPID').resolves(mspid);

        if (method === 'certs') {
            this.userInputUtilHelper.showAddIdentityMethodStub.resolves(UserInputUtil.ADD_CERT_KEY_OPTION);
            this.userInputUtilHelper.showGetCertKeyStub.resolves({ certificatePath: WalletAndIdentityHelper.certPath, privateKeyPath: WalletAndIdentityHelper.keyPath });
        } else if (method === 'json file') {
            this.userInputUtilHelper.showAddIdentityMethodStub.resolves(UserInputUtil.ADD_JSON_ID_OPTION);
            this.userInputUtilHelper.browseStub.resolves(vscode.Uri.file(WalletAndIdentityHelper.jsonFilePath));
        } else {
            // use enroll id and secret
            this.userInputUtilHelper.showAddIdentityMethodStub.resolves(UserInputUtil.ADD_ID_SECRET_OPTION);
            const gatewayRegistryEntry: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
            gatewayRegistryEntry.name = 'myGateway';
            gatewayRegistryEntry.connectionProfilePath = WalletAndIdentityHelper.connectionProfilePath;
            this.userInputUtilHelper.showGatewayQuickPickStub.resolves({ data: gatewayRegistryEntry });
            this.userInputUtilHelper.getEnrollIdSecretStub.resolves({ enrollmentID: 'admin', enrollmentSecret: 'adminpw' });
        }
    }
}
