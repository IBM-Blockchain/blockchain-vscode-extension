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

import Dockerode = require('dockerode');

export interface ContainerPorts {
    [portAndProtocol: string]: Array<{
        HostIp: string;
        HostPort: string;
    }>;
}

export class Docker {

    public static fixHost(host: string): string {
        // Windows chokes on 0.0.0.0, so replace it with localhost.
        if (host === '0.0.0.0') {
            return 'localhost';
        }
        return host;
    }

    private docker: Dockerode;
    private name: string;

    constructor(name: string) {
        this.docker = new Dockerode();
        this.name = name;
    }

    public getContainerPrefix(): string {
        // Docker on Linux only supports basic characters for the project name.
        const sanitizedName: string = this.name.replace(/[^A-Za-z0-9]/g, '');
        return `fabricvscode${sanitizedName}`;
    }

    public async getContainerPorts(containerID: string): Promise<ContainerPorts> {
        const container: Dockerode.Container = this.docker.getContainer(containerID);
        const info: Dockerode.ContainerInspectInfo = await container.inspect();
        return info.NetworkSettings.Ports;
    }

    public async doesVolumeExist(volumeID: string): Promise<boolean> {
        try {
            const volume: Dockerode.Volume = this.docker.getVolume(volumeID);
            await volume.inspect();
            return true;
        } catch (error) {
            return false;
        }
    }

    public async isContainerRunning(containerID: string): Promise<boolean> {
        try {
            const container: Dockerode.Container = this.docker.getContainer(containerID);
            const info: Dockerode.ContainerInspectInfo = await container.inspect();
            return info.State.Running;
        } catch (error) {
            return false;
        }
    }
}
