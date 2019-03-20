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
import * as fs from 'fs-extra';
import * as FabricCAServices from 'fabric-ca-client';
import * as yaml from 'js-yaml';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { LogType } from '../logging/OutputAdapter';

export class FabricCertificateAuthority {

    public static async enroll(connectionProfilePath: string, enrollmentID: string, enrollmentSecret: string): Promise<{certificate: string, privateKey: string}> {
        const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
        try {

            // Read connection profile
            const connectionProfileFile: string = await fs.readFile(connectionProfilePath, 'utf8');
            let connectionProfile: any;

            if (connectionProfilePath.endsWith('.json')) {
                connectionProfile = JSON.parse(connectionProfileFile);
            } else {
                // Assume its a yml/yaml file type
                connectionProfile = yaml.safeLoad(connectionProfileFile);
            }

            // Get a list of CAs
            const caKeys: any[] = Object.keys(connectionProfile.certificateAuthorities);

            // Assume this will always give us a working CA
            const caUrl: string = connectionProfile.certificateAuthorities[caKeys[0]].url;

            const certificateAuthority: FabricCAServices = new FabricCAServices(caUrl);

            const enrollment: any = await certificateAuthority.enroll({enrollmentID, enrollmentSecret});
            return { certificate: enrollment.certificate, privateKey: enrollment.key.toBytes()};
        } catch (error) {
            outputAdapter.log(LogType.ERROR, `Unable to enroll with certificate authority: ${error.message}`, `Unable to enroll with certificate authority: ${error.toString()}`);
            throw error;
        }
    }
}
