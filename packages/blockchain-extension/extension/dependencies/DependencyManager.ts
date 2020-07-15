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

import { ExtensionUtil } from '../util/ExtensionUtil';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as vscode from 'vscode';
import * as semver from 'semver';
import { CommandUtil } from '../util/CommandUtil';
import { GlobalState, ExtensionData } from '../util/GlobalState';
import { Dependencies } from './Dependencies';

export class DependencyManager {

    public static instance(): DependencyManager {
        return this._instance;
    }

    private static _instance: DependencyManager = new DependencyManager();

    private constructor() {

    }

    public isValidDependency(dependency: any): boolean {
        const name: string = dependency.name;
        if (name === 'Node.js' || name === 'Java OpenJDK 8' || name === 'npm' || name === 'Docker' || name === 'Docker Compose' || name === 'Go' || name === 'OpenSSL') {
            if (dependency.version) {
                return semver.satisfies(dependency.version, dependency.requiredVersion);
            } else {
                return false;
            }
        } else if (name === 'C++ Build Tools' || name === 'Xcode' || name === 'Go Extension' || name === 'Java Language Support Extension' || name === 'Java Debugger Extension' || name === 'Java Test Runner Extension') {
            if (dependency.version) {
                return true;
            } else {
                return false;
            }
        } else if (name === 'Docker for Windows' || name === 'System Requirements') {
            return dependency.complete;
        }
    }

    public async hasPreReqsInstalled(dependencies?: any, optionalInstalled: boolean = false): Promise<boolean> {
        if (!dependencies) {
            dependencies = await this.getPreReqVersions();
        }

        if (!this.isValidDependency(dependencies.node)) {
            return false;
        }

        if (!this.isValidDependency(dependencies.npm)) {
            return false;
        }

        const localFabricEnabled: boolean = ExtensionUtil.getExtensionLocalFabricSetting();
        if (localFabricEnabled) {
            if (!this.isValidDependency(dependencies.docker)) {
                return false;
            }

            if (!this.isValidDependency(dependencies.dockerCompose)) {
                return false;
            }

            if (!this.isValidDependency(dependencies.systemRequirements)) {
                return false;
            }
        }

        if (process.platform === 'win32') {
            // Windows

            if (localFabricEnabled) {
                if (!this.isValidDependency(dependencies.openssl)) {
                    return false;
                }

                if (!this.isValidDependency(dependencies.buildTools)) {
                    return false;
                }

                if (!this.isValidDependency(dependencies.dockerForWindows)) {
                    return false;
                }
            }

        }

        if (process.platform === 'darwin') {
            // Mac
            if (!this.isValidDependency(dependencies.xcode)) {
                return false;
            }
        }

        // Optional installs
        if (optionalInstalled) {
            if (!this.isValidDependency(dependencies.go)) {
                return false;
            }

            if (!this.isValidDependency(dependencies.goExtension)) {
                return false;
            }

            if (!this.isValidDependency(dependencies.java)) {
                return false;
            }

            if (!this.isValidDependency(dependencies.javaLanguageExtension)) {
                return false;
            }

            if (!this.isValidDependency(dependencies.javaDebuggerExtension)) {
                return false;
            }

            if (!this.isValidDependency(dependencies.javaTestRunnerExtension)) {
                return false;
            }

        }

        return true;
    }

    public async getPreReqVersions(): Promise<any> {

        // Only want to attempt to get extension context when activated.
        // We store whether the user has confirmed that they have met the System Requirements, so need to access the global state

        const extensionData: ExtensionData = GlobalState.get();

        // The order that we add dependencies to this object matters, as the webview will create the panels in the same order.
        // So we want to handle the optional dependencies last

        const dependencies: any = {
            node: { name: 'Node.js', required: true, version: undefined, url: 'https://nodejs.org/en/download/releases', requiredVersion: Dependencies.NODEJS_REQUIRED, requiredLabel: 'only', tooltip: 'Required for developing JavaScript and TypeScript smart contracts. If installing Node and npm using a manager such as \'nvm\' or \'nodenv\', you will need to set the default/global version and restart VS Code for the version to be detected by the Prerequisites page.' },
            npm: { name: 'npm', required: true, version: undefined, url: 'https://nodejs.org/en/download/releases', requiredVersion: Dependencies.NPM_REQUIRED, requiredLabel: '', tooltip: 'Required for installing JavaScript and TypeScript smart contract dependencies. If installing Node and npm using a manager such as \'nvm\' or \'nodenv\', you will need to set the default/global version and restart VS Code for the version to be detected by the Prerequisites page.' },
        };

        // Node
        try {
            const nodeResult: string = await CommandUtil.sendCommand('node -v'); // Format: vX.Y.Z
            if (this.isCommandFound(nodeResult)) {
                const nodeVersion: string = nodeResult.substr(1);
                const nodeValid: string = semver.valid(nodeVersion); // Returns version
                if (nodeValid) {
                    dependencies.node.version = nodeVersion;
                }
            }
        } catch (error) {
            // Ignore
        }

        // npm
        try {
            const npmResult: string = await CommandUtil.sendCommand('npm -v'); // Format: X.Y.Z
            if (this.isCommandFound(npmResult)) {
                const npmVersion: string = semver.valid(npmResult); // Returns version
                if (npmVersion) {
                    dependencies.npm.version = npmVersion;
                }
            }
        } catch (error) {
            // Ignore
        }

        const localFabricEnabled: boolean = ExtensionUtil.getExtensionLocalFabricSetting();
        if (localFabricEnabled) {
            dependencies.docker = { name: 'Docker', required: true, version: undefined, url: 'https://docs.docker.com/install/#supported-platforms', requiredVersion: Dependencies.DOCKER_REQUIRED, requiredLabel: '', tooltip: `Used to download Hyperledger Fabric images and manage containers for local environments.` };
            dependencies.dockerCompose = { name: 'Docker Compose', required: true, version: undefined, url: 'https://docs.docker.com/compose/install/', requiredVersion: Dependencies.DOCKER_COMPOSE_REQUIRED, requiredLabel: '', tooltip: `Used for managing and operating the individual local environment components.` };

            // Docker
            const dockerVersion: string = await this.getDockerVersion();
            if (dockerVersion) {
                dependencies.docker.version = dockerVersion;
            }

            // docker-compose
            const composeVersion: string = await this.getDockerComposeVersion();
            if (composeVersion) {
                dependencies.dockerCompose.version = composeVersion;
            }

            dependencies.systemRequirements = { name: 'System Requirements', id: 'systemRequirements', complete: undefined, checkbox: true, required: true, text: 'In order to support the local runtime, please confirm your system has at least 4GB of RAM' };

            if (!extensionData.systemRequirements) {
                dependencies.systemRequirements.complete = false;
            } else {
                dependencies.systemRequirements.complete = true;
            }

        }

        if (process.platform === 'win32') {
            // Windows

            if (localFabricEnabled) {
                dependencies.dockerForWindows = { name: 'Docker for Windows', id: 'dockerForWindows', complete: undefined, checkbox: true, required: true, text: 'Docker for Windows must be configured to use Linux containers (this is the default)' };

                dependencies.openssl = { name: 'OpenSSL', required: true, version: undefined, url: 'http://slproweb.com/products/Win32OpenSSL.html', requiredVersion: Dependencies.OPENSSL_REQUIRED, requiredLabel: 'for Node 8.x and Node 10.x respectively', tooltip: 'Install the Win32 version into `C:\\OpenSSL-Win32` on 32-bit systems and the Win64 version into `C:\\OpenSSL-Win64` on 64-bit systems`.' };
                dependencies.buildTools = { name: 'C++ Build Tools', required: true, version: undefined, url: 'https://github.com/felixrieseberg/windows-build-tools#windows-build-tools', requiredVersion: undefined, requiredLabel: undefined };
                try {
                    const win32: boolean = await fs.pathExists(`C:\\OpenSSL-Win32`);
                    const win64: boolean = await fs.pathExists(`C:\\OpenSSL-Win64`);
                    if (win32 || win64) {
                        const arch: string = (win32) ? '32' : '64';
                        const binPath: string = path.win32.join(`C:\\OpenSSL-Win${arch}`, 'bin', 'openssl.exe');
                        const opensslResult: string = await CommandUtil.sendCommand(`${binPath} version`); // Format: OpenSSL 1.0.2k  26 Jan 2017
                        if (this.isCommandFound(opensslResult)) {
                            const opensslMatchedVersion: string = opensslResult.match(/OpenSSL (\S*)/)[1]; // Format: 1.0.2k
                            const opensslVersionCoerced: semver.SemVer = semver.coerce(opensslMatchedVersion); // Format: X.Y.Z
                            const opensslVersion: string = semver.valid(opensslVersionCoerced); // Returns version
                            if (opensslVersion) {
                                dependencies.openssl.version = opensslVersion;
                            }
                        }
                    }
                } catch (error) {
                    // Ignore
                }

                try {
                    const buildToolsResult: string = await CommandUtil.sendCommand('npm ls -g windows-build-tools');
                    if (this.isCommandFound(buildToolsResult)) {
                        const buildToolsMatchedVersion: string = buildToolsResult.match(/windows-build-tools@(\S*)/)[1]; // Format: X.Y.Z
                        const buildToolsVersion: string = semver.valid(buildToolsMatchedVersion); // Returns version
                        if (buildToolsVersion) {
                            dependencies.buildTools.version = buildToolsVersion;
                        }
                    }
                } catch (error) {
                    // Ignore
                }

                if (!extensionData.dockerForWindows) {
                    dependencies.dockerForWindows.complete = false;
                } else {
                    dependencies.dockerForWindows.complete = true;
                }
            }

        }

        if (process.platform === 'darwin') {
            // Mac

            dependencies['xcode'] = { name: 'Xcode', required: true, version: undefined, url: 'https://apps.apple.com/gb/app/xcode/id497799835', requiredVersion: undefined, requiredLabel: undefined, tooltip: 'Required for installing JavaScript and TypeScript smart contract dependencies.' };
            try {
                const xcodeInstalled: string = await CommandUtil.sendCommand('xcode-select -p'); // Get path of active developer directory
                if (this.isCommandFound(xcodeInstalled)) {
                    const xcodeResult: string = await CommandUtil.sendCommand('xcode-select -v'); // Get path of active developer directory
                    const xcodeVersion: string = xcodeResult.match(/xcode-select version (\S*)./)[1]; // Format: XYZ
                    dependencies.xcode.version = xcodeVersion;

                }
            } catch (error) {
                // Ignore
            }
        }

        // We want to display the optional dependencies last

        // Go
        dependencies.go = { name: 'Go', required: false, version: undefined, url: 'https://golang.org/dl/', requiredVersion: Dependencies.GO_REQUIRED, requiredLabel: '', tooltip: 'Required for developing Go smart contracts.' };
        try {
            const goResult: string = await CommandUtil.sendCommand('go version'); // Format: go version go1.12.5 darwin/amd64
            if (this.isCommandFound(goResult)) {
                const goMatchedVersion: string = goResult.match(/go version go(.*) /)[1]; // Format: X.Y.Z or X.Y
                const goVersionCoerced: semver.SemVer = semver.coerce(goMatchedVersion); // Format: X.Y.Z
                const goVersion: string = semver.valid(goVersionCoerced); // Returns version
                if (goVersion) {
                    dependencies.go.version = goVersion;
                }
            }
        } catch (error) {
            // Ignore the error
        }

        // Go Extension
        dependencies.goExtension = { name: 'Go Extension', required: false, version: undefined, url: 'vscode:extension/golang.go', requiredVersion: '', requiredLabel: '', tooltip: 'Provides language support for Go.' };
        try {
            const goExtensionResult: vscode.Extension<any> = vscode.extensions.getExtension('golang.go');
            if (goExtensionResult) {
                const version: string = goExtensionResult.packageJSON.version;
                dependencies.goExtension.version = version;
            }
        } catch (error) {
            // Ignore the error
        }

        // Java
        dependencies.java = { name: 'Java OpenJDK 8', required: false, version: undefined, url: 'https://adoptopenjdk.net/?variant=openjdk8', requiredVersion: Dependencies.JAVA_REQUIRED, requiredLabel: 'only', tooltip: 'Required for developing Java smart contracts.' };
        try {

            let getVersion: boolean = true;

            if (process.platform === 'darwin') {
                const javaPath: string = '/Library/Java/JavaVirtualMachines'; // This is the standard Mac install location.
                const javaDirExists: boolean = await fs.pathExists(javaPath);
                getVersion = javaDirExists;
            }

            if (getVersion) {
                // For some reason, the response is going to stderr, so we have to redirect it to stdout.
                const javaResult: string = await CommandUtil.sendCommand('java -version 2>&1'); // Format: openjdk|java version "1.8.0_212"
                if (this.isCommandFound(javaResult)) {
                    const javaMatchedVersion: string = javaResult.match(/(openjdk|java) version "(.*)"/)[2]; // Format: X.Y.Z_A
                    const javaVersionCoerced: semver.SemVer = semver.coerce(javaMatchedVersion); // Format: X.Y.Z
                    const javaVersion: string = semver.valid(javaVersionCoerced); // Returns version
                    if (javaVersion) {
                        dependencies.java.version = javaVersion;
                    }
                }
            }
        } catch (error) {
            // Ignore the error
        }

        // Java Language Support Extension
        dependencies.javaLanguageExtension = { name: 'Java Language Support Extension', required: false, version: undefined, url: 'vscode:extension/redhat.java', requiredVersion: undefined, requiredLabel: '', tooltip: 'Provides language support for Java.' };
        try {
            const javaLanguageExtensionResult: vscode.Extension<any> = vscode.extensions.getExtension('redhat.java');
            if (javaLanguageExtensionResult) {
                const version: string = javaLanguageExtensionResult.packageJSON.version;
                dependencies.javaLanguageExtension.version = version;
            }
        } catch (error) {
            // Ignore the error
        }

        // Java Debugger Extension
        dependencies.javaDebuggerExtension = { name: 'Java Debugger Extension', required: false, version: undefined, url: 'vscode:extension/vscjava.vscode-java-debug', requiredVersion: undefined, requiredLabel: '', tooltip: 'Used for debugging Java smart contracts.' };
        try {
            const javaDebuggerExtensionResult: vscode.Extension<any> = vscode.extensions.getExtension('vscjava.vscode-java-debug');
            if (javaDebuggerExtensionResult) {
                const version: string = javaDebuggerExtensionResult.packageJSON.version;
                dependencies.javaDebuggerExtension.version = version;
            }
        } catch (error) {
            // Ignore the error
        }

        // Java Debugger Extension
        dependencies.javaTestRunnerExtension = { name: 'Java Test Runner Extension', required: false, version: undefined, url: 'vscode:extension/vscjava.vscode-java-test', requiredVersion: undefined, requiredLabel: '', tooltip: 'Used for running Java smart contract functional tests.' };
        try {
            const javaTestRunnerExtensionResult: vscode.Extension<any> = vscode.extensions.getExtension('vscjava.vscode-java-test');
            if (javaTestRunnerExtensionResult) {
                const version: string = javaTestRunnerExtensionResult.packageJSON.version;
                dependencies.javaTestRunnerExtension.version = version;
            }
        } catch (error) {
            // Ignore the error
        }

        return dependencies;

    }

    public async rewritePackageJson(): Promise<void> {
        // Replace activationEvents with the events that the extension should be activated for subsequent sessions.
        const packageJson: any = await this.getRawPackageJson();

        packageJson.activationEvents = [];

        packageJson.actualActivationEvents.onView.forEach((event: string) => {
            packageJson.activationEvents.push('onView:' + event);
        });

        packageJson.actualActivationEvents.onCommand.forEach((event: string) => {
            packageJson.activationEvents.push('onCommand:' + event);
        });

        packageJson.actualActivationEvents.other.forEach((event: string) => {
            packageJson.activationEvents.push(event);
        });

        return this.writePackageJson(packageJson);
    }

    public async getDockerVersion(): Promise<string> {
        try {
            const dockerResult: string = await CommandUtil.sendCommand('docker -v'); // Format: Docker version X.Y.Z-ce, build e68fc7a
            if (this.isCommandFound(dockerResult)) {
                const dockerMatchedVersion: string = dockerResult.match(/version (.*),/)[1]; // Format: X.Y.Z-ce "version 18.06.1-ce,"
                const dockerCleaned: string = semver.clean(dockerMatchedVersion, { loose: true });
                const dockerVersionCoerced: semver.SemVer = semver.coerce(dockerCleaned); // Format: X.Y.Z
                const dockerVersion: string = semver.valid(dockerVersionCoerced); // Returns version
                return dockerVersion;
            }
        } catch (error) {
            // Ignore
            return;
        }
    }

    public async getDockerComposeVersion(): Promise<string> {
        try {
            const composeResult: string = await CommandUtil.sendCommand('docker-compose -v'); // Format: docker-compose version 1.22.0, build f46880f
            if (this.isCommandFound(composeResult)) {
                const composeMatchedVersion: string = composeResult.match(/version (.*),/)[1]; // Format: X.Y.Z
                const composeCleaned: string = semver.clean(composeMatchedVersion, { loose: true });
                const composeVersionCoerced: semver.SemVer = semver.coerce(composeCleaned); // Format: X.Y.Z
                const composeVersion: string = semver.valid(composeVersionCoerced); // Returns version
                return composeVersion;
            }
        } catch (error) {
            // Ignore
            return;
        }
    }

    public async clearExtensionCache(): Promise<void> {
        const extensionPath: string = ExtensionUtil.getExtensionPath();
        const extensionsPath: string = path.resolve(extensionPath, '..');
        const currentDate: Date = new Date();
        await fs.utimes(extensionsPath, currentDate, currentDate);
    }

    public getPackageJsonPath(): string {
        return path.resolve(ExtensionUtil.getExtensionPath(), 'package.json');
    }

    public async getRawPackageJson(): Promise<any> {
        // Use getRawPackageJson to read and write back to package.json
        // This prevents obtaining any of VSCode's expanded variables.
        const fileContents: string = await fs.readFile(this.getPackageJsonPath(), 'utf8');
        return JSON.parse(fileContents);
    }

    public async writePackageJson(packageJson: any): Promise<void> {
        const packageJsonString: string = JSON.stringify(packageJson, null, 4);

        return fs.writeFile(this.getPackageJsonPath(), packageJsonString, 'utf8');
    }

    private isCommandFound(output: string): boolean {
        if (output.toLowerCase().includes('not found') || output.toLowerCase().includes('not recognized') || output.toLowerCase().includes('no such file or directory') || output.toLowerCase().includes('unable to get active developer directory')) {
            return false;
        } else {
            return true;
        }
    }
}
