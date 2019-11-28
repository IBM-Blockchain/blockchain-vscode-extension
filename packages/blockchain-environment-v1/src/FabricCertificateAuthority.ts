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
import * as FabricCAServices from 'fabric-ca-client';
import { LogType, OutputAdapter, ConsoleOutputAdapter, IFabricCertificateAuthority } from 'ibm-blockchain-platform-common';
export class FabricCertificateAuthority implements IFabricCertificateAuthority {

    public static instance(): FabricCertificateAuthority {
        return FabricCertificateAuthority._instance;
    }

    private static _instance: FabricCertificateAuthority = new FabricCertificateAuthority();

    public async enroll(caUrl: string, enrollmentID: string, enrollmentSecret: string, caName?: string, outputAdapter?: OutputAdapter): Promise<{ certificate: string, privateKey: string }> {
        if (!outputAdapter) {
            outputAdapter = ConsoleOutputAdapter.instance();
        }

        try {
            const certificateAuthority: FabricCAServices = new FabricCAServices(caUrl, undefined, caName);

            const enrollment: any = await certificateAuthority.enroll({ enrollmentID, enrollmentSecret });
            return { certificate: enrollment.certificate, privateKey: enrollment.key.toBytes() };
        } catch (error) {
            outputAdapter.log(LogType.ERROR, `Unable to enroll with certificate authority: ${error.message}`, `Unable to enroll with certificate authority: ${error.toString()}`);
            throw error;
        }
    }
}
