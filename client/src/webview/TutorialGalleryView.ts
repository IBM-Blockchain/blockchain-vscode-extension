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
import * as vscode from 'vscode';
import * as ejs from 'ejs';
import * as path from 'path';
import { ExtensionUtil } from '../util/ExtensionUtil';
import { ExtensionCommands } from '../../ExtensionCommands';
import { View } from './View';
import { Reporter } from '../util/Reporter';

export class TutorialGalleryView extends View {

    constructor(context: vscode.ExtensionContext) {
        super(context, 'tutorialGallery', 'Tutorial Gallery');
    }

    async getTutorialGalleryPage(options: any): Promise<any> {
        const templatePath: string = path.join(__dirname, '..', '..', '..', 'templates', 'TutorialGallery.ejs');
        return await new Promise((resolve: any, reject: any): any => {
            ejs.renderFile(templatePath, options, { async: true }, (error: any, data: string) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(data);
                }
            });
        });
    }

    async getHTMLString(): Promise<string> {
        const extensionPath: string = ExtensionUtil.getExtensionPath();

        // Images
        const chevronDark: vscode.Uri = vscode.Uri.file(path.join(extensionPath, 'resources', 'dark', 'chevron.svg')).with({ scheme: 'vscode-resource' });
        const chevronLight: vscode.Uri = vscode.Uri.file(path.join(extensionPath, 'resources', 'light', 'chevron.svg')).with({ scheme: 'vscode-resource' });

        const images: any = {
            chevronLight: chevronLight,
            chevronDark: chevronDark
        };

        const allSeries: any[] = await this.getAllSeries();

        const options: any = {
            commands : {
                OPEN_TUTORIAL_PAGE: ExtensionCommands.OPEN_TUTORIAL_PAGE,
            },
            images: images,
            allSeries: allSeries
        };

        const tutorialGalleryString: string = await this.getTutorialGalleryPage(options);
        return tutorialGalleryString;
    }

    async openPanelInner(panel: vscode.WebviewPanel): Promise<void> {
        Reporter.instance().sendTelemetryEvent('openedView', {openedView: panel.title}); // Report that a user has opened a new panel
        return;
    }
}
