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

import { OutputAdapter } from './OutputAdapter';
import * as vscode from 'vscode';

export class VSCodeOutputAdapter implements OutputAdapter {

    public static instance(): VSCodeOutputAdapter {
        return VSCodeOutputAdapter._instance;
    }

    private static _instance: VSCodeOutputAdapter = new VSCodeOutputAdapter();

    private outputChannel: vscode.OutputChannel;

    private constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Blockchain');
    }

    log(value: string): void {
        this.outputChannel.show();
        this.outputChannel.appendLine(value);
    }

    error(value: string): void {
        this.outputChannel.show();
        this.outputChannel.appendLine(value);
    }

    show() {
        this.outputChannel.show();
    }

}
