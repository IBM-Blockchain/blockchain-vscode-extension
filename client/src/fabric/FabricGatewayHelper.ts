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
import * as yaml from 'js-yaml';
import { UserInputUtil } from '../commands/UserInputUtil';

export class FabricGatewayHelper {
    // Wanted to type with FabricGatewayRegistryEntry but it failed

    public static async copyConnectionProfile(gatewayName: string, connectionProfilePath: string): Promise<string> {
        try {

            const extDir: string = vscode.workspace.getConfiguration().get('blockchain.ext.directory');
            const homeExtDir: string = await UserInputUtil.getDirPath(extDir);
            const profileDirPath: string = path.join(homeExtDir, gatewayName);
            const profileExists: boolean = await fs.pathExists(profileDirPath);

            if (!profileExists) {
                await fs.ensureDir(profileDirPath);
            }

            const connectionProfileFile: string = await fs.readFile(connectionProfilePath, 'utf8');
            let connectionProfile: any;
            let profilePath: string;

            if (connectionProfilePath.endsWith('.json')) {
                connectionProfile = JSON.parse(connectionProfileFile);
                profilePath = path.join(profileDirPath, 'connection.json');
            } else {
                // Assume its a yml/yaml file type
                connectionProfile = yaml.safeLoad(connectionProfileFile);
                profilePath = path.join(profileDirPath, 'connection.yml');
            }

            // Read the given connection profile

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

                            // Delete the key
                            delete connectionProfile[property][item].tlsCACerts.path;
                        }
                    }
                }
            }

            let connectionProfileData: any;

            if (connectionProfilePath.endsWith('.json')) {
                connectionProfileData = JSON.stringify(connectionProfile, null, 4);
            } else {
                // Assume its a yml/yaml file type
                connectionProfileData = yaml.dump(connectionProfile);
            }

            // Write the new connection profile to the blockchain extension directory
            await fs.writeFile(profilePath, connectionProfileData);

            return profilePath;

        } catch (error) {
            throw error;
        }
    }

}
