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
import { ExtensionUtil } from '../util/ExtensionUtil';
import { View } from './View';

export abstract class ReactView extends View {
    protected panelTitle: string;
    protected panelID: string;
    private readonly _extensionPath: string;

    constructor(context: vscode.ExtensionContext, panelID: string, panelTitle: string) {
        super(context, panelID,  panelTitle);
        this._extensionPath = ExtensionUtil.getExtensionPath();
    }

    async getHTMLString(): Promise<string> {
        const manifest: any = require(path.join(
            this._extensionPath,
            'build',
            'asset-manifest.json'
        ));
        const mainScript: any = manifest.files['main.js'];
        const mainStyle: any = manifest.files['main.css'];

        const scriptPathOnDisk: any = vscode.Uri.file(
            path.join(this._extensionPath, 'build', mainScript)
          );
        const scriptUri: any = scriptPathOnDisk.with({ scheme: 'vscode-resource' });
        const stylePathOnDisk: any = vscode.Uri.file(
            path.join(this._extensionPath, 'build', mainStyle)
          );
        const styleUri: any = stylePathOnDisk.with({ scheme: 'vscode-resource' });

        return `<!DOCTYPE html>
                  <html lang="en">
                  <head>
                      <meta charset="utf-8">
                      <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">

                      <title>React</title>
                      <link rel="stylesheet" type="text/css" href="${styleUri}">
                      <meta img-src vscode-resource: https: ;style-src vscode-resource: 'unsafe-inline' http: https: data:;">
                      <base href="${vscode.Uri.file(path.join(this._extensionPath, 'build')).with({
                scheme: 'vscode-resource'
              })}/">
              <script>
                const vscode = acquireVsCodeApi();
              </script>
              </head>
              <body class="vscode-dark">
              <noscript>You need to enable JavaScript to run this app.</noscript>
              <div id="root"></div>
              <script src="${scriptUri}"></script>

                  </body>
                  </html>`;
    }

    protected async abstract openPanelInner(panel: vscode.WebviewPanel): Promise<void>;

    protected abstract loadComponent(panel: vscode.WebviewPanel): void;
}
