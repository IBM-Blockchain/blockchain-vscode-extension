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

import TelemetryReporter from 'vscode-extension-telemetry';
import { ExtensionUtil } from './ExtensionUtil';
export class Reporter {

    public static instance(): Reporter {
        return this._instance;
    }

    private static _instance: Reporter = new Reporter();

    private key: string = Buffer.from('M2I5NDRlY2MtYzI0Yy00ODgzLTkxMGItZjg4ZWFlZDkwMTc1', 'base64').toString();

    private telemetryReporter: TelemetryReporter;

    private constructor() {
        this.telemetryReporter = new TelemetryReporter('IBMBlockchain.ibm-blockchain-platform', this.getVersion(), this.key);
    }

    public sendTelemetryEvent(eventName: string, properties?: {[key: string]: string}): void {
        const packageJson: any = ExtensionUtil.getPackageJSON();
        if (packageJson.production === true) {
            this.telemetryReporter.sendTelemetryEvent(eventName, properties);
        }
    }

    public async dispose(): Promise<void> {
        await this.telemetryReporter.dispose();
    }

    private getVersion(): string {
        const packageJson: any = ExtensionUtil.getPackageJSON();
        return packageJson.version;
    }
}
