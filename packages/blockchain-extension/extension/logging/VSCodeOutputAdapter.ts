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

import { LogType, OutputAdapter } from 'ibm-blockchain-platform-common';
import * as vscode from 'vscode';

export abstract class VSCodeOutputAdapter extends OutputAdapter {
    public channelName: string;

    private outputChannel: vscode.OutputChannel;
    private console: boolean = !!process.env.BLOCKCHAIN_VSCODE_CONSOLE_OUTPUT;
    protected constructor(channelName: string) {
        super();
        this.channelName = channelName;
        this.outputChannel = vscode.window.createOutputChannel(channelName);
    }

    /**
     * Used to log a message to the output and display a popup message.
     * @param type {LogType} The type of log message
     * @param popupMessage {String} The message to be displayed to a vscode.window showInformationMessage/showErrorMessage. Leave as undefined to just log the outputMessage to the console.
     * @param outputMessage {String} The message to be displayed to the users output log. If not provided, the outputMessage will be the same as the popupMessage.
     * @param stackTrace {String} The stack trace of the error.
     * @param skipNextLine {Boolean} Provide a gap between the next console message
     * @returns {void}
     */
    log(type: LogType, popupMessage: string, outputMessage?: string, stackTrace?: string, skipNextLine?: boolean): void {
        if (!popupMessage && !outputMessage) {
            return;
        }

        // If no output message is given, the same message is shown in the log and popup
        if (!outputMessage) {
            outputMessage = popupMessage;
        }

        if (this.console) {
            super.log(type, popupMessage, outputMessage, stackTrace);
        }

        this.appendLine(type, outputMessage, skipNextLine);

        // If a popup message is given, create a popup
        if (popupMessage) {
            if (type === LogType.ERROR) {
                vscode.window.showErrorMessage(popupMessage);
            } else {
                vscode.window.showInformationMessage(popupMessage);
            }
        }

        if (stackTrace) {
            this.appendLine(type, stackTrace);
        }

    }

    show(): void {
        this.outputChannel.show();
    }

    setConsole(console: boolean): void {
        this.console = console;
    }

    appendLine(type: string, value: string, skipNextLine?: boolean): void {
        // In future it would be nice to log ANSI colours. This is being blocked by https://github.com/Microsoft/vscode/issues/571
        this.outputChannel.appendLine(`[${this.getTimestamp()}] [${type}] ${value}`);
        if (skipNextLine) {
            this.outputChannel.appendLine('');
        }
    }

    getTimestamp(): string {
        let dateTime: string = new Date().toLocaleString(); // Example format 02/11/2018, 10:47:21
        dateTime = dateTime.replace(',', ''); // Remove comma
        return dateTime;
    }

}
