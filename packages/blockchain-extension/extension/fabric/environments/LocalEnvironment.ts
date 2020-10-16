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

import { AnsibleEnvironment } from 'ibm-blockchain-platform-common';
import { CommandUtil } from '../../util/CommandUtil';

export class LocalEnvironment extends AnsibleEnvironment {

    public async teardown(): Promise<void> {
        try {
            if (process.platform === 'win32') {
                await CommandUtil.sendCommandWithOutput('cmd', ['/c', `teardown.cmd`], this.path);
            } else {
                await CommandUtil.sendCommandWithOutput('/bin/sh', [`teardown.sh`], this.path);
            }
        } catch (err) {
             // Ignore
        }
    }
}
