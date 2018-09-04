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

const ENCODING = 'utf8';

export class ParsedCertificate {

    private parsedCertificate: any;

    constructor(certificatePath: string) {
        const certFile: string = this.loadFileFromDisk(certificatePath);
        this.parsedCertificate = Certificate.fromPEM(certFile);
    }

    public getCommonName(): string {
        return this.parsedCertificate.subject.commonName;
    }

    private loadFileFromDisk(path: string): string {
        return fs.readFileSync(path, ENCODING) as string;
    }
}
