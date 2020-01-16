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

// tslint:disable no-var-requires
const {Certificate} = require('@fidm/x509');

const ENCODING: string = 'utf8';

export interface Attribute {
    name: string;
    value: string;
    ecert: boolean;
}

export class FabricCertificate {

    public static validateCertificate(cert: string): void {
        try {
            Certificate.fromPEM(cert); // This will throw an error if invalid
        } catch (error) {
            throw new Error(`Invalid certificate: ${error.message}`);
        }
    }

    public static validatePrivateKey(key: string): void {

        if (!key.includes('-----BEGIN PRIVATE KEY-----') || !key.includes('-----END PRIVATE KEY-----')) {
            throw new Error('Invalid private key');
        }

    }

    public static loadFileFromDisk(path: string): string {
        return fs.readFileSync(path, ENCODING);
    }

    private certificate: any;

    constructor(cert: string) {
        this.certificate = Certificate.fromPEM(cert);
    }

    public getCommonName(): string {
        return this.certificate.subject.commonName;
    }

    public getAttributes(): any {
        const magicObject: any = this.certificate.extensions.find((attrObj: any) => {
            return attrObj.id === '1.2.3.4.5.6.7.8.1'; // No-one knows why the id of the object is '1.2.3.4.5.6.7.8.1'. However, this is definitely the one we want...
        });

        if (magicObject) {
            const attrString: string = magicObject.value.toString('utf8');
            const attrObject: any = JSON.parse(attrString);
            return attrObject.attrs;
        } else {
            return {};
        }

    }
}
