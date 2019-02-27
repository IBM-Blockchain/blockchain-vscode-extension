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
import * as path from 'path';
import * as fs from 'fs-extra';
import { UserInputUtil } from '../commands/UserInputUtil';

export class FabricGatewayHelper {
    // Wanted to type with FabricGatewayRegistryEntry but it failed

    static readonly CONNECTION_PROFILE_PATH_DEFAULT: string = '<PATH_TO_CONNECTION_PROFILE_JSON>';
    static readonly WALLET_PATH_DEFAULT: string = '<PATH_TO_WALLET>';

    public static isCompleted(instance: any): boolean {
        const connectionComplete: boolean = this.connectionProfilePathComplete(instance);
        const walletPathComplete: boolean = this.walletPathComplete(instance);
        return (connectionComplete && walletPathComplete);
    }

    public static connectionProfilePathComplete(instance: any): boolean {
        return instance.connectionProfilePath !== this.CONNECTION_PROFILE_PATH_DEFAULT && instance.connectionProfilePath !== '';
    }

    public static walletPathComplete(instance: any): boolean {
        return instance.walletPath !== this.WALLET_PATH_DEFAULT && instance.walletPath !== '';
    }

    public static async copyConnectionProfile(gatewayName: string, connectionProfilePath: string): Promise<string> {
        try {

            const extDir: string = vscode.workspace.getConfiguration().get('blockchain.ext.directory');
            const homeExtDir: string = await UserInputUtil.getDirPath(extDir);
            const profileDirPath: string = path.join(homeExtDir, gatewayName);
            const profileExists: boolean = await fs.pathExists(profileDirPath);

            if (!profileExists) {
                await fs.ensureDir(profileDirPath);
            }

            // Read the given connection profile
            const connectionProfile: any = await fs.readJson(connectionProfilePath);

            const properties: string[] = ['peers', 'orderers', 'certificateAuthorities'];

            // Rewrite any TLS paths and create an inline pem instead
            for (const property of properties) {
                if (connectionProfile[property]) {
                    for (const item of Object.keys(connectionProfile[property])) {
                        if (connectionProfile[property][item].tlsCACerts && connectionProfile[property][item].tlsCACerts.path !== undefined) {
                            let tlsPath: string;
                            if (path.isAbsolute(connectionProfile[property][item].tlsCACerts.path)) {
                                tlsPath = connectionProfile[property][item].tlsCACerts.path;
                            } else {
                                tlsPath = path.resolve(path.dirname(connectionProfilePath), connectionProfile[property][item].tlsCACerts.path);
                            }
                            const tlsCertData: string = await fs.readFile(tlsPath, 'utf8');
                            connectionProfile[property][item].tlsCACerts.pem = tlsCertData;
                            connectionProfile[property][item].tlsCACerts.path = undefined;
                        }
                    }
                }
            }

            // Set the destination path
            const profilePath: string = path.join(profileDirPath, 'connection.json');

            // Create the connection profile JSON
            const connectionProfileJson: any = JSON.stringify(connectionProfile);

            // Write the new connection profile to the blockchain extension directory
            await fs.writeFile(profilePath, connectionProfileJson);

            return profilePath;

        } catch (error) {
            throw error;
        }
    }

}
