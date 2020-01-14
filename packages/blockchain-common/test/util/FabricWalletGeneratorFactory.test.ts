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
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import { IFabricWalletGenerator } from '../../src/interfaces/IFabricWalletGenerator';
import { FabricWalletGeneratorFactory } from '../../src/util/FabricWalletGeneratorFactory';
import { FabricWalletRegistryEntry } from '../../src/registries/FabricWalletRegistryEntry';

chai.use(sinonChai);

// tslint:disable no-unused-expression

describe('FabricWalletGeneratorFactory', () => {

    class TestGenerator implements IFabricWalletGenerator {
        public async getWallet(walletRegsitryEntry: FabricWalletRegistryEntry): Promise<any> {
            return walletRegsitryEntry;
        }
    }

    let generator: TestGenerator;

    beforeEach(() => {
        generator = new TestGenerator();
    });

    describe('setFabricWalletGenerator', () => {
        it('should set the generator', () => {
            FabricWalletGeneratorFactory['instance'] = null;

            FabricWalletGeneratorFactory.setFabricWalletGenerator(generator);

            FabricWalletGeneratorFactory['instance'].should.exist;
        });
    });

    describe('getFabricWalletGenerator', () => {
        it('should get the generator', () => {
            FabricWalletGeneratorFactory['instance'] = generator;

            const result: TestGenerator = FabricWalletGeneratorFactory.getFabricWalletGenerator();

            result.should.exist;
        });

        it('should throw an error if instance not set', () => {
            FabricWalletGeneratorFactory['instance'] = null;

            ((): any => {
                FabricWalletGeneratorFactory.getFabricWalletGenerator();
            }).should.throw('Must call setFabricWalletGenerator first!');
        });
    });
});
