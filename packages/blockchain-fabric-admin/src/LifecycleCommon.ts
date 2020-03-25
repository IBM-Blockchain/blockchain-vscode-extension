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

import {
    ProposalResponse,
    Utils
} from 'fabric-common';
import {format} from 'util';

const logger: any = Utils.getLogger('packager');

export class LifecycleCommon {

    public static async processResponse(responses: ProposalResponse): Promise<Buffer[]> {
        const payloads: Buffer[] = [];

        if (responses.errors && responses.errors.length > 0) {
            for (const error of responses.errors) {
                logger.error('Problem with response ::' + error);
                throw error;
            }
        } else if (responses.responses && responses.responses.length > 0) {
            logger.debug('checking the query response');
            for (const response of responses.responses) {
                if (response.response && response.response.status) {
                    if (response.response.status === 200) {
                        logger.debug('peer response %j', response);
                        payloads.push(response.response.payload);

                    } else {
                        throw new Error(format('failed with status:%s ::%s', response.response.status, response.response.message));
                    }
                } else {
                    throw new Error('failure in response');
                }
            }
        } else {
            throw new Error('No response returned');
        }

        return payloads;
    }
}
