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
import { RequiredDependencies, OptionalDependencies, Dependencies, defaultDependencies } from './Dependencies';
import OS = require('os');

export class DependencyManager {

    public static instance(): DependencyManager {
        return this._instance;
    }

    private static _instance: DependencyManager = new DependencyManager();

    private constructor() {

    }

    public isValidDependency(dependency: any): boolean {
        const name: string = dependency.name;
        if (name === 'Node.js' || name === 'Java OpenJDK 8' || name === 'npm' || name === 'Docker' || name === 'Docker Compose' || name === 'Go' || name === 'OpenSSL' ) {
            if (dependency.version) {
                return semver.satisfies(dependency.version, dependency.requiredVersion);
            } else {
                return false;
            }
<<<<<<< HEAD
        } else if (name === 'Go Extension' || name === 'Java Language Support Extension' || name === 'Java Debugger Extension' || name === 'Java Test Runner Extension' || name === 'Node Test Runner Extension') {
=======
        } else if (name === 'C++ Build Tools' || name === 'Xcode' || name === 'Go Extension' || name === 'Java Language Support Extension' || name === 'Java Debugger Extension' || name === 'Java Test Runner Extension' || name === 'Node Test Runner Extension' || name === 'IBM Cloud Account Extension') {
>>>>>>> 3c52bfb7... Link to IBM Cloud Account Extension if it isn't installed, add to optional dependencies (#2713)
            if (dependency.version) {
                return true;
            } else {
                return false;
            }
        } else if (name === 'Docker for Windows' || name === 'System Requirements') {
            if (!dependency.complete) {
                dependency.complete = false;
            }
            return dependency.complete;
        }
        return false;
    }

    public async hasPreReqsInstalled(dependencies?: any, optionalInstalled: boolean = false): Promise<boolean> {
        if (!dependencies) {
            dependencies = await this.getPreReqVersions();
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

                if (!this.isValidDependency(dependencies.dockerForWindows)) {
                    return false;
                }
            }

        }

        // Optional installs
        if (optionalInstalled) {
            if (!this.isValidDependency(dependencies.node)) {
                return false;
            }

            if (!this.isValidDependency(dependencies.npm)) {
                return false;
            }

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

            if (!this.isValidDependency(dependencies.nodeTestRunnerExtension)) {
                return false;
            }

            if (!this.isValidDependency(dependencies.ibmCloudAccountExtension)) {
                return false;
            }
        }

        return true;
    }

    public async getPreReqVersions(): Promise<Dependencies> {
        // Only want to attempt to get extension context when activated.
        // We store whether the user has confirmed that they have met the System Requirements, so need to access the global state

        const extensionData: ExtensionData = GlobalState.get();

        // The order that we add dependencies to this object matters, as the webview will create the panels in the same order.
        // So we want to handle the optional dependencies last
        const getMultipleVersions: Array<Promise<any>> = [
            this.getRequiredDependencies(extensionData.dockerForWindows),
            this.getOptionalDependencies(),
        ];

        const [requiredDependencies, optionalDependencies] = await Promise.all(getMultipleVersions);

        const dependencies: Dependencies = {
            ...requiredDependencies,
            ...optionalDependencies,
        };

        return dependencies;
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

    private async getRequiredDependencies(dockerForWindows: boolean): Promise<RequiredDependencies> {
        // The order of the dependencies matters

        const localFabricEnabled: boolean = ExtensionUtil.getExtensionLocalFabricSetting();

        const isWindows: boolean = process.platform === 'win32';
        const dependencies: RequiredDependencies = {};

        if (localFabricEnabled) {
            const getDockerVersions: Array<Promise<string>> = [this.getDockerVersion(), this.getDockerComposeVersion()];
            const [dockerVersion, dockerComposeVersion] = await Promise.all(getDockerVersions);
            const systemRequirementsVersion: number = OS.totalmem() / 1073741824;

            dependencies.docker = {
                ...defaultDependencies.required.docker,
                version: dockerVersion,
            };

            dependencies.dockerCompose = {
                ...defaultDependencies.required.dockerCompose,
                version: dockerComposeVersion,
            };

            dependencies.systemRequirements = {
                ...defaultDependencies.required.systemRequirements,
                version: systemRequirementsVersion,
                complete: systemRequirementsVersion >= 4,
            };

            if (isWindows) {
                const opensslVersion: string = await this.getOpensslVersion();

                dependencies.openssl = {
                    ...defaultDependencies.required.openssl,
                    version: opensslVersion,
                };

                dependencies.dockerForWindows = {
                    ...defaultDependencies.required.dockerForWindows,
                    complete: !!dockerForWindows,
                };
            }

            return dependencies;
        }

        return {};
    }

    private async getOptionalDependencies(): Promise<OptionalDependencies> {
        // The order of the dependencies matters

        // System dependencies
        const getOptionalVersions: Array<Promise<string>> = [
            this.getNodeVersion(),
            this.getNPMVersion(),
            this.getGoVersion(),
            this.getJavaVersion(),
        ];
        const [nodeVersion, npmVersion, goVersion, javaVersion] = await Promise.all(getOptionalVersions);

        // VSCode extension dependencies
        const goExtensionVersion: string = this.getGoExtensionVersion();
        const javaLanguageExtensionVersion: string = this.getJavaLanguageExtensionVersion();
        const javaDebuggerExtensionVersion: string = this.getJavaDebuggerExtensionVersion();
        const javaTestRunnerExtensionVersion: string = this.getJavaTestRunnerExtensionVersion();
        const nodeTestRunnerExtensionVersion: string = this.getNodeTestRunnerExtensionVersion();

        const optionalDependencies: OptionalDependencies = {
            ...defaultDependencies.optional,
        };

        // Update versions
        optionalDependencies.node.version = nodeVersion;
        optionalDependencies.nodeTestRunnerExtension.version = nodeTestRunnerExtensionVersion;
        optionalDependencies.npm.version = npmVersion;
        optionalDependencies.go.version = goVersion;
        optionalDependencies.goExtension.version = goExtensionVersion;
        optionalDependencies.java.version = javaVersion;
        optionalDependencies.javaLanguageExtension.version = javaLanguageExtensionVersion;
        optionalDependencies.javaDebuggerExtension.version = javaDebuggerExtensionVersion;
        optionalDependencies.javaTestRunnerExtension.version = javaTestRunnerExtensionVersion;

        return optionalDependencies;
    }

    private async getDockerVersion(): Promise<string> {
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

    private async getDockerComposeVersion(): Promise<string> {
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

    private async getOpensslVersion(): Promise<string> {
        try {
            const win64: boolean = await fs.pathExists(`C:\\OpenSSL-Win64`);
            if (win64) {
                const binPath: string = path.win32.join('C:\\OpenSSL-Win64', 'bin', 'openssl.exe');
                const opensslResult: string = await CommandUtil.sendCommand(`${binPath} version`); // Format: OpenSSL 1.0.2k  26 Jan 2017
                if (this.isCommandFound(opensslResult)) {
                    const opensslMatchedVersion: string = opensslResult.match(/OpenSSL (\S*)/)[1]; // Format: 1.0.2k
                    const opensslVersionCoerced: semver.SemVer = semver.coerce(opensslMatchedVersion); // Format: X.Y.Z
                    const opensslVersion: string = semver.valid(opensslVersionCoerced); // Returns version
                    return opensslVersion;
                }
            }
        } catch (error) {
            // Ignore
        }
    }

    private async getNodeVersion(): Promise<string> {
        try {
            const nodeResult: string = await CommandUtil.sendCommand('node -v'); // Format: vX.Y.Z
            if (this.isCommandFound(nodeResult)) {
                const nodeVersion: string = nodeResult.substr(1);
                const nodeValid: string = semver.valid(nodeVersion); // Returns version
                return nodeValid;
            }
        } catch (error) {
            // Ignore
        }
    }

    private async getNPMVersion(): Promise<string> {
        try {
            const npmResult: string = await CommandUtil.sendCommand('npm -v'); // Format: X.Y.Z
            if (this.isCommandFound(npmResult)) {
                const npmVersion: string = semver.valid(npmResult); // Returns version
                return npmVersion;
            }
        } catch (error) {
            // Ignore
        }
    }

    private async getGoVersion(): Promise<string> {
        try {
            const goResult: string = await CommandUtil.sendCommand('go version'); // Format: go version go1.12.5 darwin/amd64
            if (this.isCommandFound(goResult)) {
                const goMatchedVersion: string = goResult.match(/go version go(.*) /)[1]; // Format: X.Y.Z or X.Y
                const goVersionCoerced: semver.SemVer = semver.coerce(goMatchedVersion); // Format: X.Y.Z
                const goVersion: string = semver.valid(goVersionCoerced); // Returns version
                return goVersion;
            }
        } catch (error) {
            // Ignore the error
        }
    }

    private getGoExtensionVersion(): string {
        try {
            const goExtensionResult: vscode.Extension<any> = vscode.extensions.getExtension('golang.go');
            if (goExtensionResult) {
                return goExtensionResult.packageJSON.version;
            }
        } catch (error) {
            // Ignore the error
        }
    }

    private async getJavaVersion(): Promise<string> {
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
                    return javaVersion;
                }
            }
        } catch (error) {
            // Ignore the error
        }
    }

    private getJavaLanguageExtensionVersion(): string {
        try {
            const javaLanguageExtensionResult: vscode.Extension<any> = vscode.extensions.getExtension('redhat.java');
            if (javaLanguageExtensionResult) {
                return javaLanguageExtensionResult.packageJSON.version;
            }
        } catch (error) {
            // Ignore the error
        }
    }

    private getJavaDebuggerExtensionVersion(): string {
        try {
            const javaDebuggerExtensionResult: vscode.Extension<any> = vscode.extensions.getExtension('vscjava.vscode-java-debug');
            if (javaDebuggerExtensionResult) {
                return javaDebuggerExtensionResult.packageJSON.version;
            }
        } catch (error) {
            // Ignore the error
        }
    }

    private getJavaTestRunnerExtensionVersion(): string {
        try {
            const javaTestRunnerExtensionResult: vscode.Extension<any> = vscode.extensions.getExtension('vscjava.vscode-java-test');
            if (javaTestRunnerExtensionResult) {
                return javaTestRunnerExtensionResult.packageJSON.version;
            }
        } catch (error) {
            // Ignore the error
        }

    }

    private getNodeTestRunnerExtensionVersion(): string {
        try {
            const nodeTestRunnerExtensionResult: vscode.Extension<any> = vscode.extensions.getExtension('oshri6688.javascript-test-runner');
            if (nodeTestRunnerExtensionResult) {
                return nodeTestRunnerExtensionResult.packageJSON.version;
            }
        } catch (error) {
            // Ignore the error
        }
<<<<<<< HEAD
=======

        dependencies.ibmCloudAccountExtension = { name: 'IBM Cloud Account Extension', required: false, version: undefined, url: 'vscode:extension/IBM.ibmcloud-account', requiredVersion: undefined, requiredLabel: '', tooltip: 'Required for discovering IBM Blockchain Platform on IBM Cloud networks.' };
        try {
            const ibmCloudAccountExtensionResult: vscode.Extension<any> = vscode.extensions.getExtension('IBM.ibmcloud-account');
            if (ibmCloudAccountExtensionResult) {
                const version: string = ibmCloudAccountExtensionResult.packageJSON.version;
                dependencies.ibmCloudAccountExtension.version = version;
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
            const che: boolean = ExtensionUtil.isChe();

            if (remote || che) {
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
                    let basePath: string = path.join(extensionPath, 'node_modules', 'grpc', 'src', 'node', 'extension_binary');

                    let origPath: string = path.join(basePath, `node-v${info.modules}-${os}-${architecture}-${thing}`);
                    let newPath: string = path.join(basePath, `electron-v${info.shortVersion}-${os}-${architecture}-${thing}`);

                    let exists: boolean = await fs.pathExists(origPath);
                    if (exists) {
                        await fs.remove(origPath);
                    }

                    await fs.rename(newPath, origPath);

                    // this is probably only needed in development
                    const otherGRPC: string[] = ['ibm-blockchain-platform-gateway-v1', 'ibm-blockchain-platform-environment-v1', 'ibm-blockchain-platform-wallet'];

                    for (const other of otherGRPC) {
                        basePath = path.join(extensionPath, 'node_modules', `${other}`, 'node_modules', 'grpc', 'src', 'node', 'extension_binary');

                        origPath = path.join(basePath, `node-v${info.modules}-${os}-${architecture}-${thing}`);
                        newPath = path.join(basePath, `electron-v${info.shortVersion}-${os}-${architecture}-${thing}`);

                        exists = await fs.pathExists(origPath);
                        if (exists) {
                            await fs.remove(origPath);
                        }

                        exists = await fs.pathExists(newPath);
                        if (exists) {
                            await fs.rename(newPath, origPath);
                        }
                    }
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

                let info: any[] = [];
                try {
                    const response: any = await Axios.get('https://raw.githubusercontent.com/electron/releases/master/lite.json');
                    info = response.data;
                } catch (error) {
                    // Will be handled by reading a local JSON file, on the next few lines.
                }

                if (!info || info.length === 0) {
                    const fallbackPath: string = path.join(__dirname, '..', '..', 'fallback-build-info.json');
                    info = await fs.readJSON(fallbackPath);
                }

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
                        const preBuiltBinarypath: string = `https://node-precompiled-binaries.grpc.io/grpc/v1.24.2/electron-v${_version.shortVersion}-${os}-${arch}-${thing}.tar.gz`;
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
            throw new Error(`Could not get electron version, ${error.message}`);
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
>>>>>>> 3c52bfb7... Link to IBM Cloud Account Extension if it isn't installed, add to optional dependencies (#2713)
    }
}
