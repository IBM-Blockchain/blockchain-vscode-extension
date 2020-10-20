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
import Axios from 'axios';
import { CloudAccountApi } from '../interfaces/cloud-account-api';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LogType } from 'ibm-blockchain-platform-common';
import { URL } from 'url';

/*
 * This file will hold functions to allow interaction with other extensions.
 */
export class ExtensionsInteractionUtil {

    public static isIBMCloudExtensionInstalled(): boolean {
        return !!vscode.extensions.getExtension( 'IBM.ibmcloud-account' );
    }

    public static async getIBMCloudExtension(): Promise<CloudAccountApi> {
        const  cloudAccountExtension: vscode.Extension<any> = vscode.extensions.getExtension( 'IBM.ibmcloud-account' );
        if ( !cloudAccountExtension ) {
            throw new Error('IBM Cloud Account extension must be installed');
        }
        const commands: string[] = await vscode.commands.getCommands();
        // Determine if the IBM Cloud Account extension supports the ping command. If it
        // does, call the ping command to activate the extension if it is not activated.
        // We need to do this as the activate() call does not work on current versions of
        // Eclipse Che/Theia: https://github.com/eclipse-theia/theia/issues/8463
        const hasPing: boolean = commands.includes('ibmcloud-account.ping');
        if (hasPing) {
            await vscode.commands.executeCommand('ibmcloud-account.ping');
        } else if ( !cloudAccountExtension.isActive ) {
            await cloudAccountExtension.activate();
        }
        return cloudAccountExtension.exports;
    }

    public static async cloudAccountGetAccessToken(userInteraction: boolean = true): Promise<string> {
        const cloudAccount: CloudAccountApi = await this.getIBMCloudExtension();

        const isLoggedIn: boolean = await cloudAccount.loggedIn();
        let result: boolean;
        if ( !isLoggedIn ) {
            if (userInteraction) {
                // If not logged in, ask the user to login, and then to select the account.
                result = await vscode.commands.executeCommand('ibmcloud-account.login');
                if (!result) {
                    return;
                }
            } else {
                // Just return if we are not supposed request user interaction.
                return;
            }
        } else {
            const hasAccount: boolean = await cloudAccount.accountSelected();
            if ( !hasAccount ) {
                if (userInteraction) {
                    // If not logged in, this will first ask the user to login, and then to select the account.
                    result = await vscode.commands.executeCommand('ibmcloud-account.selectAccount');
                    if (!result) {
                        return;
                    }
                } else {
                    // Just return if we are not supposed request user interaction.
                    return;
                }
            }
        }

        const accessToken: string = await cloudAccount.getAccessToken();

        return accessToken;
    }

    public static async cloudAccountIsLoggedIn(): Promise<boolean> {
        const cloudAccount: CloudAccountApi = await this.getIBMCloudExtension();

        return await cloudAccount.loggedIn();
    }

    public static async cloudAccountHasSelectedAccount(): Promise<boolean> {
        const cloudAccount: CloudAccountApi = await this.getIBMCloudExtension();

        return await cloudAccount.accountSelected();
    }

    public static async cloudAccountAnyIbpResources(): Promise<boolean> {
        const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
        let anyIbpResources: boolean = false;
        const accessToken: string = await this.cloudAccountGetAccessToken();
        if (!accessToken) {
            return;
        }
        const requestOptions: any = { headers: { Authorization: `Bearer ${accessToken}` } };
        const baseUrl: string = 'https://resource-controller.cloud.ibm.com';
        let resourcesUrl: string = `${baseUrl}/v2/resource_instances`;
        while (resourcesUrl && !anyIbpResources) {
            try {
                const response: any = await Axios.get(resourcesUrl, requestOptions);

                anyIbpResources =  response.data.resources.some((resource: any) => resource.resource_plan_id === 'blockchain-standard');

                if (response.data.next_url) {
                    resourcesUrl = `${baseUrl}${response.data.next_url}`;
                } else {
                    break;
                }
            } catch (error) {
                resourcesUrl = null;
                outputAdapter.log(LogType.ERROR, `Error fetching IBP resources: ${error.message}`, `Error fetching IBP resources: ${error.toString()}`);
            }
        }
        return anyIbpResources;
    }

    public static async cloudAccountGetIbpResources(): Promise<any[]> {
        const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
        const ibpResources: any[] = [];
        const accessToken: string = await this.cloudAccountGetAccessToken();
        if (!accessToken) {
            return;
        }
        const requestOptions: any = { headers: { Authorization: `Bearer ${accessToken}` } };
        const baseUrl: string = 'https://resource-controller.cloud.ibm.com';
        let resourcesUrl: string = `${baseUrl}/v2/resource_instances`;
        while (resourcesUrl) {
            try {
                const response: any = await Axios.get(resourcesUrl, requestOptions);

                for (const resource of response.data.resources) {
                    if ( resource.resource_plan_id === 'blockchain-standard' ) {
                        ibpResources.push(resource);
                    }
                }
                if (response.data.next_url) {
                    resourcesUrl = `${baseUrl}${response.data.next_url}`;
                } else {
                    break;
                }
            } catch (error) {
                resourcesUrl = null;
                outputAdapter.log(LogType.ERROR, `Error fetching IBP resources: ${error.message}`, `Error fetching IBP resources: ${error.toString()}`);
            }
        }
        return ibpResources;
    }

    public static async cloudAccountGetApiEndpoint(ibpResource: any, accessToken: string): Promise<string> {
        const requestOptions: any = { headers: { Authorization: `Bearer ${accessToken}` } };

        const dashboardUrl: URL = new URL(ibpResource.dashboard_url);
        const encodedCrn: string = encodeURIComponent(ibpResource.crn);
        const consoleStatus: any = await Axios.get(`${dashboardUrl.origin}/api/alternative-auth/resources/${encodedCrn}/optools`, requestOptions);

        if (consoleStatus.status !== 200) {
            throw new Error(`Got status ${consoleStatus.status}. Please make sure the IBM Blockchain Platform Console deployment has finished before adding environment.`);
        }

        return consoleStatus.data.endpoint;
    }

}
