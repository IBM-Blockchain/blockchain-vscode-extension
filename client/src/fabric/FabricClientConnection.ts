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

import { IFabricConnection } from './IFabricConnection';
import { FabricConnection } from './FabricConnection';

const ENCODING = 'utf8';

export class FabricClientConnection extends FabricConnection implements IFabricConnection {

    private connectionProfilePath: string;
    private certificatePath: string;
    private privateKeyPath: string;

    constructor(connectionData: { connectionProfilePath: string, certificatePath: string, privateKeyPath: string }) {
        super();
        this.connectionProfilePath = connectionData.connectionProfilePath;
        this.certificatePath = connectionData.certificatePath;
        this.privateKeyPath = connectionData.privateKeyPath;
    }

    async connect(): Promise<void> {
        console.log('connect');
        const connectionProfileContents: string = await this.loadFileFromDisk(this.connectionProfilePath);
        const connectionProfile = JSON.parse(connectionProfileContents);
        const certificate: string = await this.loadFileFromDisk(this.certificatePath);
        const privateKey: string = await this.loadFileFromDisk(this.privateKeyPath);
        await this.connectInner(connectionProfile, certificate, privateKey);
    }

    private async loadFileFromDisk(path: string): Promise<string> {
        console.log('loadFileFromDisk', path);
        return fs.readFile(path, ENCODING);
    }

}
