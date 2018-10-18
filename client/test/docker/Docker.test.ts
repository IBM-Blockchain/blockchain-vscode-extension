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

import Dockerode = require('dockerode');
import { Container } from 'dockerode';
import ContainerImpl = require('dockerode/lib/container');

import * as chai from 'chai';
import * as sinon from 'sinon';
import { Docker, ContainerPorts } from '../../src/docker/Docker';

chai.should();

// tslint:disable no-unused-expression
describe('Docker', () => {

    let sandbox: sinon.SinonSandbox;
    let mockPeerContainer: sinon.SinonStubbedInstance<Container>;
    let mockPeerInspect: any;

    let docker: Docker;

    beforeEach(async () => {

        sandbox = sinon.createSandbox();
        mockPeerContainer = sinon.createStubInstance(ContainerImpl);
        mockPeerInspect = {
            NetworkSettings: {
                Ports: {
                    '7051/tcp': [{HostIp: '0.0.0.0', HostPort: '12345'}],
                    '7053/tcp': [{HostIp: '0.0.0.0', HostPort: '12346'}]
                }
            },
            State: {
                Running: true
            }
        };
        mockPeerContainer.inspect.resolves(mockPeerInspect);

        const dockerodeStub: sinon.SinonStubbedInstance<Dockerode> = sandbox.createStubInstance(Dockerode);
        dockerodeStub.getContainer.withArgs('fabricvscoderuntime1_peer0.org1.example.com_1').returns(mockPeerContainer);

        docker = new Docker('runtime1');
        docker['docker'] = dockerodeStub;
    });

    afterEach(async () => {
        sandbox.restore();
    });

    describe('getContainerPrefix', () => {
        it('should get the containerPrefix and replace any illegal characters', () => {
            const docker2: Docker = new Docker('&&&&Cake&&&Biscuit123&&&');
            const result: string = docker2.getContainerPrefix();
            result.should.equal('fabricvscodeCakeBiscuit123');
        });
    });

    describe('fixhost', () => {
        it('should fix the hostname if set to 0.0.0.0', () => {
            const result: string = Docker.fixHost('0.0.0.0');

            result.should.equal('localhost');
        });

        it('should not fix if not set to 0.0.0.0', () => {
            const result: string = Docker.fixHost('127.0.0.1');

            result.should.equal('127.0.0.1');
        });
    });

    describe('getContainerPorts', () => {
        it('should get the ports for a container', async () => {
            const prefix: string = docker.getContainerPrefix();
            const ports: ContainerPorts = await docker.getContainerPorts(`${prefix}_peer0.org1.example.com_1`);
            ports.should.deep.equal(mockPeerInspect.NetworkSettings.Ports);
        });
    });

    describe('#isContainerRunning', () => {

        it('should return true if container is running', async () => {
            const prefix: string = docker.getContainerPrefix();

            await docker.isContainerRunning(`${prefix}_peer0.org1.example.com_1`).should.eventually.be.true;
        });

        it('should return false if the container does not exist', async () => {
            const prefix: string = docker.getContainerPrefix();

            mockPeerContainer.inspect.rejects(new Error('blah'));
            await docker.isContainerRunning(`${prefix}_peer0.org1.example.com_1`).should.eventually.be.false;
        });

        it('should return false if the container is not running', async () => {
            const prefix: string = docker.getContainerPrefix();

            mockPeerInspect.State.Running = false;
            await docker.isContainerRunning(`${prefix}_peer0.org1.example.com_1`).should.eventually.be.false;
        });
    });
});
