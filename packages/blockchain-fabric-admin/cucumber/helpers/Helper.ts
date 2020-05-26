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

import * as path from 'path';
import {Collection} from '../../src';
import * as fs from 'fs-extra';

export class Helper {
    public static TMP_DIR: string = path.join(__dirname, '..', '..', '..', 'cucumber', 'tmp');

    public static NETWORK_DIR: string = path.join(Helper.TMP_DIR, 'fabric-samples', 'test-network');

    public static PACKAGE_DIR: string = path.join(Helper.TMP_DIR, 'packages');

    public static org1Peer: string = 'peer0.org1.example.com';
    public static org2Peer: string = 'peer0.org2.example.com';
    public static orderer: string = 'orderer.example.com';

    public static async getCollectionConfig(): Promise<Collection[]> {
        const collectionConfigPath: string = path.join(Helper.TMP_DIR, 'fabric-samples', 'chaincode', 'marbles02_private', 'collections_config.json');
        const collectionConfig: Collection[] = await fs.readJson(collectionConfigPath);
        return collectionConfig;
    }
}
