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

export class Dependencies {

    static readonly NODEJS_REQUIRED: string =  '>=10.15.3 < 11.0.0|| >=12.15.0 < 13.0.0';
    static readonly NPM_REQUIRED: string = '>=6.0.0';
    static readonly DOCKER_REQUIRED: string = '>=17.6.2';
    static readonly DOCKER_COMPOSE_REQUIRED: string = '>=1.14.0';

    static readonly OPENSSL_REQUIRED: string = '1.0.2';

    static readonly GO_REQUIRED: string = '>=1.12.0';
    static readonly JAVA_REQUIRED: string = '1.8.x';

}
