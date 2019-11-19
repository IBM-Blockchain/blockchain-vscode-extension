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

import { VSCodeOutputAdapter } from './VSCodeOutputAdapter';
import { FabricRuntimeUtil } from 'ibm-blockchain-platform-common';

export class VSCodeBlockchainDockerOutputAdapter extends VSCodeOutputAdapter {

    public static instance(): VSCodeBlockchainDockerOutputAdapter {
        return VSCodeBlockchainDockerOutputAdapter._instance;
    }

    private static _instance: VSCodeBlockchainDockerOutputAdapter = new VSCodeBlockchainDockerOutputAdapter(FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME);

    private constructor(channelName: string) {
        super(channelName);
    }
}
