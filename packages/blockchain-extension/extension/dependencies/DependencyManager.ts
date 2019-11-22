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

import { ExtensionUtil, EXTENSION_ID } from '../util/ExtensionUtil';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as vscode from 'vscode';
import * as semver from 'semver';
import Axios from 'axios';
import { VSCodeBlockchainOutputAdapter } from '../logging/VSCodeBlockchainOutputAdapter';
import { CommandUtil } from '../util/CommandUtil';
import { LogType } from '../logging/OutputAdapter';
import { GlobalState, ExtensionData } from '../util/GlobalState';
import { Dependencies } from './Dependencies';
import { FabricRuntimeUtil } from '../fabric/FabricRuntimeUtil';

export class DependencyManager {

    public static instance(): DependencyManager {
        return this._instance;
    }

    private static _instance: DependencyManager = new DependencyManager();

    private dependencies: Array<string> = [];

    private constructor() {

    }

    // Need this function as proxyquire doesn't work
    public async requireNativeDependencies(): Promise<void> {
        const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();
        const packageJSON: any = await this.getRawPackageJson();
        const nativeModules: string[] = packageJSON.nativeDependencies;
        for (const _module of nativeModules) {
            outputAdapter.log(LogType.INFO, undefined, `Attempting to require dependency: ${_module}`);
            require(_module);
        }
    }

    public async hasNativeDependenciesInstalled(): Promise<boolean> {
        const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();

        try {
            await this.requireNativeDependencies();
            return true; // Dependency has been required
        } catch (error) {
            outputAdapter.log(LogType.INFO, undefined, `Error requiring dependency: ${error.message}`);
            return false; // Dependency cannot be required
        }
    }

    public async installNativeDependencies(): Promise<void> {
        const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();

        this.loadDependencies();
        await this.installNativeDependenciesInternal();

        outputAdapter.log(LogType.INFO, undefined, 'Rewriting activation events');
        await this.rewritePackageJson();

        outputAdapter.log(LogType.INFO, undefined, 'Clearing extension cache');
        await this.clearExtensionCache();

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
        }

        if (!this.isValidDependency(dependencies.systemRequirements)) {
            return false;
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
            }

            if (!this.isValidDependency(dependencies.dockerForWindows)) {
                return false;
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
            node: {name: 'Node.js', required: true, version: undefined, url: 'https://nodejs.org/en/download/', requiredVersion: Dependencies.NODEJS_REQUIRED, requiredLabel: 'only', tooltip: 'Required for developing JavaScript and TypeScript smart contracts. If installing Node and npm using a manager such as \'nvm\' or \'nodenv\', you will need to set the default/global version and restart VS Code for the version to be detected by the Prerequisites page.' },
            npm: {name: 'npm', required: true, version: undefined, url: 'https://nodejs.org/en/download/', requiredVersion: Dependencies.NPM_REQUIRED, requiredLabel: '', tooltip: 'Required for installing JavaScript and TypeScript smart contract dependencies. If installing Node and npm using a manager such as \'nvm\' or \'nodenv\', you will need to set the default/global version and restart VS Code for the version to be detected by the Prerequisites page.' },
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
            dependencies.docker = {name: 'Docker', required: true, version: undefined, url: 'https://docs.docker.com/install/#supported-platforms', requiredVersion: Dependencies.DOCKER_REQUIRED, requiredLabel: '', tooltip: `Used to download Hyperledger Fabric images and manage containers for the ${FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME}.` };
            dependencies.dockerCompose = {name: 'Docker Compose', required: true, version: undefined, url: 'https://docs.docker.com/compose/install/', requiredVersion: Dependencies.DOCKER_COMPOSE_REQUIRED, requiredLabel: '', tooltip: `Used for managing and operating the individual ${FabricRuntimeUtil.LOCAL_FABRIC_DISPLAY_NAME} components.` };

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

        }

        if (process.platform === 'win32') {
            // Windows

            dependencies.dockerForWindows = {name: 'Docker for Windows', id: 'dockerForWindows', complete: undefined, checkbox: true, required: true, text: 'Docker for Windows must be configured to use Linux containers (this is the default)' };

            if (localFabricEnabled) {
                dependencies.openssl = {name: 'OpenSSL', required: true, version: undefined, url: 'http://slproweb.com/products/Win32OpenSSL.html', requiredVersion: Dependencies.OPENSSL_REQUIRED, requiredLabel: 'for Node 8.x and Node 10.x respectively'};
                dependencies.buildTools = {name: 'C++ Build Tools', required: true, version: undefined, url: 'https://github.com/felixrieseberg/windows-build-tools#windows-build-tools', requiredVersion: undefined, requiredLabel: undefined};
                try {
                    const opensslResult: string = await CommandUtil.sendCommand('openssl version -v'); // Format: OpenSSL 1.0.2k  26 Jan 2017
                    if (this.isCommandFound(opensslResult)) {
                        const opensslMatchedVersion: string = opensslResult.match(/OpenSSL (\S*)/)[1]; // Format: 1.0.2k
                        const opensslVersionCoerced: semver.SemVer = semver.coerce(opensslMatchedVersion); // Format: X.Y.Z
                        const opensslVersion: string = semver.valid(opensslVersionCoerced); // Returns version
                        if (opensslVersion) {
                            dependencies.openssl.version = opensslVersion;
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
            }

            if (!extensionData.dockerForWindows) {
                dependencies.dockerForWindows.complete = false;
            } else {
                dependencies.dockerForWindows.complete = true;
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

        dependencies.systemRequirements = { name: 'System Requirements', id: 'systemRequirements', complete: undefined, checkbox: true, required: true, text: 'In order to support the local runtime, please confirm your system has at least 4GB of RAM' };

        if (!extensionData.systemRequirements) {
            dependencies.systemRequirements.complete = false;
        } else {
            dependencies.systemRequirements.complete = true;
        }

        // We want to display the optional dependencies last

        // Go
        dependencies.go = {name: 'Go', required: false, version: undefined, url: 'https://golang.org/dl/', requiredVersion: Dependencies.GO_REQUIRED, requiredLabel: '', tooltip: 'Required for developing Go smart contracts.' };
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
        dependencies.goExtension = { name: 'Go Extension', required: false, version: undefined, url: 'vscode:extension/ms-vscode.Go', requiredVersion: '', requiredLabel: '', tooltip: 'Provides language support for Go.' };
        try {
            const goExtensionResult: vscode.Extension<any> = vscode.extensions.getExtension('ms-vscode.Go');
            if (goExtensionResult) {
                const version: string = goExtensionResult.packageJSON.version;
                dependencies.goExtension.version = version;
            }
        } catch (error) {
            // Ignore the error
        }

        // Java
        dependencies.java = {name: 'Java OpenJDK 8', required: false, version: undefined, url: 'https://adoptopenjdk.net/?variant=openjdk8', requiredVersion: Dependencies.JAVA_REQUIRED, requiredLabel: 'only', tooltip: 'Required for developing Java smart contracts.' };
        try {
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

    private isCommandFound(output: string): boolean {
        if (output.toLowerCase().includes('not found') || output.toLowerCase().includes('not recognized') || output.toLowerCase().includes('no such file or directory') || output.toLowerCase().includes('unable to get active developer directory')) {
            return false;
        } else {
            return true;
        }
    }

    private getPackageJsonPath(): string {
        return path.resolve(ExtensionUtil.getExtensionPath(), 'package.json');
    }

    private loadDependencies(): void {
        const packageJSON: any = ExtensionUtil.getPackageJSON();

        this.dependencies = packageJSON.nativeDependencies;
    }

    private async installNativeDependenciesInternal(): Promise<void> {
        const extensionPath: string = ExtensionUtil.getExtensionPath();

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'IBM Blockchain Platform Extension',
            cancellable: false
        }, async (progress: vscode.Progress<{ message: string }>) => {

            const outputAdapter: VSCodeBlockchainOutputAdapter = VSCodeBlockchainOutputAdapter.instance();

            const architecture: string = process.arch; // Returns the architecture Code is running on
            const os: string = process.platform;
            let thing: string;
            if (os === 'linux') {
                thing = 'glibc';
            } else {
                thing = 'unknown';
            }

            let runtime: string = 'electron';
            let info: { modules?: string, longVersion: string, shortVersion?: string };

            const remote: boolean = vscode.extensions.getExtension(EXTENSION_ID).extensionKind === vscode.ExtensionKind.Workspace;

            if (remote) {
                runtime = 'node';
                const nodeVersion: string = process.versions.node;
                info = {
                    longVersion: nodeVersion
                };
            } else {
                info = await this.getLocalRebuildInfo(os, architecture, thing);
            }

            outputAdapter.log(LogType.INFO, undefined, 'Updating native node modules');
            progress.report({ message: 'Updating native node modules' });

            for (const dependency of this.dependencies) {
                outputAdapter.log(LogType.INFO, undefined, 'Rebuilding native node modules');
                progress.report({ message: 'Rebuilding native node modules' });

                // npm needs to run in a shell on Windows
                const shell: boolean = (process.platform === 'win32') ? true : false;

                try {
                    const args: string[] = ['rebuild', dependency, `--target=${info.longVersion}`, `--runtime=${runtime}`, '--update-binary', '--fallback-to-build', `--target_arch=${architecture}`];
                    if (!remote) {
                        args.push('--dist-url=https://atom.io/download/electron');
                    }

                    await CommandUtil.sendCommandWithOutput('npm', args, extensionPath, null, outputAdapter, shell);

                } catch (error) {
                    outputAdapter.log(LogType.ERROR, `Could not rebuild native dependencies ${error.message}. Please ensure that you have node and npm installed`);
                    throw error;
                }

                if (!remote && semver.lt(info.longVersion, '6.0.0')) {
                    progress.report({ message: `Updating ${dependency}` });
                    outputAdapter.log(LogType.INFO, undefined, `Updating ${dependency}`);
                    const basePath: string = path.join(extensionPath, 'node_modules', 'grpc', 'src', 'node', 'extension_binary');

                    const origPath: string = path.join(basePath, `node-v${info.modules}-${os}-${architecture}-${thing}`);
                    const newPath: string = path.join(basePath, `electron-v${info.shortVersion}-${os}-${architecture}-${thing}`);

                    const exists: boolean = await fs.pathExists(origPath);
                    if (exists) {
                        await fs.remove(origPath);
                    }
                    await fs.rename(newPath, origPath);
                }
            }

            outputAdapter.log(LogType.SUCCESS, undefined, 'Finished updating native node modules');
            progress.report({ message: 'Finished updating native node modules' });
        });
    }

    private async getLocalRebuildInfo(os: string, arch: string, thing: string): Promise<{ modules: string, longVersion: string, shortVersion: string }> {
        try {
            const modules: string = process.versions.modules;
            const electronVersion: string = process.versions['electron'];

            let version: { longVersion: string, shortVersion: string };

            if (!electronVersion) {

                const response: any = await Axios.get('https://raw.githubusercontent.com/electron/releases/master/lite.json');
                let info: any[] = response.data;

                info = info.filter((_info: any) => {
                    return _info && _info.deps && _info.deps.modules === modules;
                });

                const filteredVersions: any[] = [];

                for (const _info of info) {
                    const tempVersion: string = `${semver.major(_info.version)}.${semver.minor(_info.version)}`;
                    const found: { longVersion: string, shortVersion: string } = filteredVersions.find((_version: { longVersion: string, shortVersion: string }) => _version.shortVersion === tempVersion);
                    if (!found) {
                        filteredVersions.push({ longVersion: _info.version, shortVersion: tempVersion });
                    }
                }

                if (filteredVersions.length === 0) {
                    throw new Error(`no matching electron versions for modules ${modules}`);
                }

                for (const _version of filteredVersions) {
                    try {
                        const preBuiltBinarypath: string = `https://node-precompiled-binaries.grpc.io/grpc/v1.23.3/electron-v${_version.shortVersion}-${os}-${arch}-${thing}.tar.gz`;
                        await Axios.get(preBuiltBinarypath);
                        // found one that exists so use it
                        version = _version;
                        break;
                    } catch (error) {
                        // don't care about the error here as if error then it probably doesn't exist
                    }
                }

                if (!version) {
                    // didn't find a prebuilt one so just pick the first and use that
                    version = filteredVersions[0];
                }
            } else {
                version = {
                    shortVersion: `${semver.major(electronVersion)}.${semver.minor(electronVersion)}`,
                    longVersion: electronVersion,
                };
            }

            return { modules: modules, longVersion: version.longVersion, shortVersion: version.shortVersion };
        } catch (error) {
            throw new Error(`Could not get electron verion, ${error.message}`);
        }
    }

    private async getRawPackageJson(): Promise<any> {
        // Use getRawPackageJson to read and write back to package.json
        // This prevents obtaining any of VSCode's expanded variables.
        const fileContents: Buffer = await fs.readFile(this.getPackageJsonPath());
        return JSON.parse(fileContents.toString());
    }

    private async writePackageJson(packageJson: any): Promise<void> {
        const packageJsonString: string = JSON.stringify(packageJson, null, 4);

        return fs.writeFile(this.getPackageJsonPath(), packageJsonString, 'utf8');
    }

    private async clearExtensionCache(): Promise<void> {
        const extensionPath: string = ExtensionUtil.getExtensionPath();
        const extensionsPath: string = path.resolve(extensionPath, '..');
        const currentDate: Date = new Date();
        await fs.utimes(extensionsPath, currentDate, currentDate);
    }

}
