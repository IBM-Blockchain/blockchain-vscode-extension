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

import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';
import { IFabricGatewayConnection, IFabricWallet } from '../..';

const should: Chai.Should = chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);
// tslint:disable no-unused-expression
describe('IFabricGatewayConnection', () => {

    class MyFabricGatewayConnection implements IFabricGatewayConnection {
        identityName: string;
        connect(_wallet: IFabricWallet, _identityName: string, _timeout: number): Promise<void> {
            throw new Error('Method not implemented.');
        }
        createChannelMap(): Promise<Map<string, string[]>> {
            throw new Error('Method not implemented.');
        }
        disconnect(): void {
            throw new Error('Method not implemented.');
        }
        getAllPeerNames(): string[] {
            throw new Error('Method not implemented.');
        }
        getAllChannelsForPeer(_peerName: string): Promise<string[]> {
            throw new Error('Method not implemented.');
        }
        getChannelPeersInfo(_channelName: string): Promise<{ name: string; mspID: string; }[]> {
            throw new Error('Method not implemented.');
        }
        getInstantiatedChaincode(_channelName: string): Promise<{ name: string; version: string; }[]> {
            throw new Error('Method not implemented.');
        }
        isIBPConnection(): boolean {
            throw new Error('Method not implemented.');
        }
        getMetadata(_instantiatedChaincodeName: string, _channel: string): Promise<any> {
            throw new Error('Method not implemented.');
        }
        submitTransaction(_chaincodeName: string, _transactionName: string, _channel: string, _args: string[], _namespace: string, _transientData: { [key: string]: Buffer; }, _evaluate?: boolean, _peerTargetNames?: string[]): Promise<string> {
            throw new Error('Method not implemented.');
        }
    }

    let sandbox: sinon.SinonSandbox;

    beforeEach(async () => {
        sandbox = sinon.createSandbox();
    });

    afterEach(async () => {
        sandbox.restore();
    });

    it('should be able create an instance of a gateway connection', () => {
        const myGatewayConnection: MyFabricGatewayConnection = new MyFabricGatewayConnection();

        should.exist(myGatewayConnection);
    });
});
