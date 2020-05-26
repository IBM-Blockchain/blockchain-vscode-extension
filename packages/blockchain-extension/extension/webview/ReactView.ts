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
/* istanbul ignore file */
'use strict';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ExtensionUtil } from '../util/ExtensionUtil';
import { View } from './View';

// tslint:disable no-var-requires
const manifest: any = require('ibm-blockchain-platform-ui/build/asset-manifest.json');

export abstract class ReactView extends View {
    protected panelTitle: string;
    protected panelID: string;
    private readonly _extensionPath: string;

    constructor(context: vscode.ExtensionContext, panelID: string, panelTitle: string) {
        super(context, panelID,  panelTitle);
        this._extensionPath = path.join(ExtensionUtil.getExtensionPath(), 'node_modules', 'ibm-blockchain-platform-ui');
    }

    async getHTMLString(): Promise<string> {
        const mainScript: string = manifest.files['main.js'];
        const mainStyle: string = manifest.files['main.css'];

        const scriptPathOnDisk: vscode.Uri = vscode.Uri.file(
            path.join(this._extensionPath, 'build', mainScript)
          );
        const scriptContents: Buffer = fs.readFileSync(scriptPathOnDisk.fsPath);

        const stylePathOnDisk: vscode.Uri = vscode.Uri.file(
            path.join(this._extensionPath, 'build', mainStyle)
          );
        const styleContents: Buffer = fs.readFileSync(stylePathOnDisk.fsPath);

        const actualExtensionPath: string = ExtensionUtil.getExtensionPath();

        return `<!DOCTYPE html>
                  <html lang="en">
                  <head>
                      <meta charset="utf-8">
                      <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">

                      <title>React</title>
                      <style>${styleContents.toString()}</style>
                      <meta img-src vscode-resource: https: ;style-src vscode-resource: 'unsafe-inline' http: https: data:;">
                      <base href="${vscode.Uri.file(path.join(actualExtensionPath, 'build')).with({ scheme: 'vscode-resource' })}/">
              <script>
                const vscode = acquireVsCodeApi();
              </script>
              </head>
              <body class="vscode-dark">
              <noscript>You need to enable JavaScript to run this app.</noscript>
              <div id="root"></div>
              <script>${scriptContents.toString()}</script>

                  </body>
                  </html>`;
    }

    protected async abstract openPanelInner(panel: vscode.WebviewPanel): Promise<void>;

    protected abstract loadComponent(panel: vscode.WebviewPanel): void;
}
