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
import { CloudAccountApi } from '../interfaces/cloud-account-api';

/*
 * This file will hold functions to allow interaction with other extensions.
 */
export class ExtensionsInteractionUtil {

    public static async cloudAccountGetAccessToken(fromAddEnvironment: boolean = false): Promise<string> {
        const  cloudAccountExtension: vscode.Extension<any> = vscode.extensions.getExtension( 'IBM.ibmcloud-account' );
        if ( !cloudAccountExtension.isActive ) {
            await cloudAccountExtension.activate();
        }
        const cloudAccount: CloudAccountApi = cloudAccountExtension.exports;

        let hasAccount: boolean;
        if (fromAddEnvironment) {
            // When adding environment, always ask the user to login, and then to select the account.
            await vscode.commands.executeCommand('ibmcloud-account.login');
        } else {
            hasAccount = await cloudAccount.accountSelected();
            if (!hasAccount) {
                // If not logged in, this will first ask the user to login, and then to select the account.
                await vscode.commands.executeCommand('ibmcloud-account.selectAccount');
            }
        }

        const isLoggedIn: boolean = await cloudAccount.loggedIn();
        if (!isLoggedIn) {
            return; // FIXME - evaluate if an error should be thrown after changes to cloud extension - tell the user we can't proceed without being logged in
        }

        hasAccount = await cloudAccount.accountSelected();
        if (!hasAccount) {
            return; // FIXME - evaluate if an error should be thrown after changes to cloud extension - tell the user we can't proceed without selecting an account
        }

        const accessToken: string = await cloudAccount.getAccessToken();

        return accessToken;
    }

}
