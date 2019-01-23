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
import * as yaml from 'js-yaml';

import { IFabricConnection } from './IFabricConnection';
import { FabricConnection } from './FabricConnection';
import { OutputAdapter } from '../logging/OutputAdapter';

const ENCODING: string = 'utf8';

export class FabricClientConnection extends FabricConnection implements IFabricConnection {

    private connectionProfilePath: string;
    private certificatePath: string;
    private privateKeyPath: string;

    constructor(connectionData: { connectionProfilePath: string, certificatePath: string, privateKeyPath: string }, outputAdapter?: OutputAdapter) {
        super(outputAdapter);
        this.connectionProfilePath = connectionData.connectionProfilePath;
        this.certificatePath = connectionData.certificatePath;
        this.privateKeyPath = connectionData.privateKeyPath;
    }

    async connect(mspid?: string): Promise<void> {
        console.log('FabricClientConnection: connect');

        const connectionProfileContents: string = await this.loadFileFromDisk(this.connectionProfilePath);
        let connectionProfile: any;
        if (this.connectionProfilePath.endsWith('.json')) {
            connectionProfile = JSON.parse(connectionProfileContents);
        } else if (this.connectionProfilePath.endsWith('.yaml') || this.connectionProfilePath.endsWith('.yml')) {
            connectionProfile = yaml.safeLoad(connectionProfileContents);
        } else {
            console.log('Connection Profile given is not .json/.yaml format:', this.connectionProfilePath);
            throw new Error(`Connection profile must be in JSON or yaml format`);
        }
        console.log('printing connectionProfile:', connectionProfile);
        const certificate: string = await this.loadFileFromDisk(this.certificatePath);
        const privateKey: string = await this.loadFileFromDisk(this.privateKeyPath);
        await this.connectInner(connectionProfile, certificate, privateKey, mspid);
    }

    async getConnectionDetails(): Promise<{connectionProfilePath: string, certificatePath: string, privateKeyPath: string}> {
        const connectionDetails: {connectionProfilePath: string, certificatePath: string, privateKeyPath: string} = {
            connectionProfilePath: this.connectionProfilePath,
            certificatePath: this.certificatePath,
            privateKeyPath: this.privateKeyPath
        };
        return connectionDetails;
    }

    private async loadFileFromDisk(path: string): Promise<string> {
        console.log('loadFileFromDisk', path);
        return fs.readFile(path, ENCODING);
    }

}
