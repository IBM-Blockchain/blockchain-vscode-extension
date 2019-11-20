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

export enum LogType {
    SUCCESS = 'SUCCESS',
    ERROR = 'ERROR',
    INFO = 'INFO',
    IMPORTANT = 'IMPORTANT',
    YEOMAN = 'YEOMAN',
    WARNING = 'WARNING'
}

// tslint:disable no-console
export abstract class OutputAdapter {
    public log(type: LogType, popupMessage: string, outputMessage?: string, stackTrace?: string): void {
        if (type === LogType.ERROR) {
            if (popupMessage) {
                console.error(popupMessage);
            }

            if (outputMessage) {
                console.error(outputMessage);
            }

            if (stackTrace) {
                console.error(stackTrace);
            }
        } else {
            if (popupMessage) {
                console.log(popupMessage);
            }

            if (outputMessage) {
                console.log(outputMessage);
            }
        }
    }
}
