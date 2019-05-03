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

import { YeomanAdapter } from '../util/YeomanAdapter';
import * as GeneratorFabric from 'generator-fabric';
import * as GeneratorFabricChaincode from 'generator-fabric/generators/chaincode';
import * as GeneratorFabricContract from 'generator-fabric/generators/contract';
import * as GeneratorFabricNetwork from 'generator-fabric/generators/network';
import * as util from 'util';
import * as yeoman from 'yeoman-environment';

export class YeomanUtil {

    public static async run(generator: string, options: object): Promise<void> {
        const cwd: string = process.cwd();
        try {
            const env: any = yeoman.createEnv([], {}, new YeomanAdapter());
            env.registerStub(GeneratorFabric, 'fabric', require.resolve('generator-fabric'));
            env.registerStub(GeneratorFabricChaincode, 'fabric:chaincode', require.resolve('generator-fabric/generators/chaincode'));
            env.registerStub(GeneratorFabricContract, 'fabric:contract', require.resolve('generator-fabric/generators/contract'));
            env.registerStub(GeneratorFabricNetwork, 'fabric:network', require.resolve('generator-fabric/generators/network'));
            env.runAsync = util.promisify(env.run);
            await env.runAsync(generator, options);
        } finally {
            process.chdir(cwd);
        }
    }

}
