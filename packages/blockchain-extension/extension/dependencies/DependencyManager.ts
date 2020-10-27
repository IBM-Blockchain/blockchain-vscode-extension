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
import { RequiredDependencies, OptionalDependencies, Dependencies, defaultDependencies, DependencyProperties } from './Dependencies';
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

        const needsToBeInstalledWithSemver: Array<string> = [
            defaultDependencies.optional.node.name,
            defaultDependencies.optional.java.name,
            defaultDependencies.optional.npm.name,
            defaultDependencies.required.docker.name,
            defaultDependencies.required.dockerCompose.name,
            defaultDependencies.optional.go.name,
            defaultDependencies.required.openssl.name,
        ];

        const needsToBeInstalled: Array<string> = [
            defaultDependencies.optional.goExtension.name,
            defaultDependencies.optional.javaLanguageExtension.name,
            defaultDependencies.optional.javaDebuggerExtension.name,
            defaultDependencies.optional.javaTestRunnerExtension.name,
            defaultDependencies.optional.nodeTestRunnerExtension.name,
            defaultDependencies.optional.ibmCloudAccountExtension.name,
        ];

        const needsToBeComplete: Array<string> = [
            defaultDependencies.required.dockerForWindows.name,
            defaultDependencies.required.systemRequirements.name
        ];

        if (needsToBeInstalledWithSemver.includes(name)) {
            if (dependency.version) {
                return semver.satisfies(dependency.version, dependency.requiredVersion);
            } else {
                return false;
            }
        } else if (needsToBeInstalled.includes(name)) {
            if (dependency.version) {
                return true;
            } else {
                return false;
            }
        } else if (needsToBeComplete.includes(name)) {
            if (!dependency.complete) {
                dependency.complete = false;
            }
            return dependency.complete;
        }
        return false;
    }

    public areAllValidDependencies(properties: Array<string>, dependencies: any): boolean {
        return properties.every((property) => dependencies.hasOwnProperty(property) && this.isValidDependency(dependencies[property]));
    }

    public async hasPreReqsInstalled(dependencies?: any, optionalInstalled: boolean = false): Promise<boolean> {
        if (!dependencies) {
            dependencies = await this.getPreReqVersions();
        }

        const localFabricEnabled: boolean = ExtensionUtil.getExtensionLocalFabricSetting();
        if (localFabricEnabled) {
            const localFabricProperties: Array<string> = ['docker', 'dockerCompose', 'systemRequirements'];
            if (!this.areAllValidDependencies(localFabricProperties, dependencies)) {
                return false;
            }
        }

        if (process.platform === 'win32') {
            // Windows
            if (localFabricEnabled) {
                const windowsProperties: Array<string> = ['openssl', 'dockerForWindows'];
                if (!this.areAllValidDependencies(windowsProperties, dependencies)) {
                    return false;
                }
            }

        }

        // Optional installs
        if (optionalInstalled) {
            const optionalInstallProperties: Array<string> = Object.getOwnPropertyNames(defaultDependencies.optional);

            if (!this.areAllValidDependencies(optionalInstallProperties, dependencies)) {
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
        const goExtensionVersion: string = this.getExtensionVersion(DependencyProperties.GO_LANGUAGE_EXTENSION);
        const javaLanguageExtensionVersion: string = this.getExtensionVersion(DependencyProperties.JAVA_LANGUAGE_EXTENSION);
        const javaDebuggerExtensionVersion: string = this.getExtensionVersion(DependencyProperties.JAVA_DEBUG_EXTENSION);
        const javaTestRunnerExtensionVersion: string = this.getExtensionVersion(DependencyProperties.JAVA_TEST_RUNNER_EXTENSION);
        const nodeTestRunnerExtensionVersion: string = this.getExtensionVersion(DependencyProperties.NODEJS_TEST_RUNNER_EXTENSION);
        const ibmCloudAccountExtensionVersion: string = this.getExtensionVersion(DependencyProperties.IBM_CLOUD_ACCOUNT_EXTENSION);

        const optionalDependencies: OptionalDependencies = {
            ...defaultDependencies.optional,
        };

        // Update versions
        optionalDependencies.node.version = nodeVersion;
        optionalDependencies.npm.version = npmVersion;
        optionalDependencies.go.version = goVersion;
        optionalDependencies.goExtension.version = goExtensionVersion;
        optionalDependencies.java.version = javaVersion;
        optionalDependencies.javaLanguageExtension.version = javaLanguageExtensionVersion;
        optionalDependencies.javaDebuggerExtension.version = javaDebuggerExtensionVersion;
        optionalDependencies.javaTestRunnerExtension.version = javaTestRunnerExtensionVersion;
        optionalDependencies.nodeTestRunnerExtension.version = nodeTestRunnerExtensionVersion;
        optionalDependencies.ibmCloudAccountExtension.version = ibmCloudAccountExtensionVersion;

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

    private getExtensionVersion(extension: string): string {
        try {
            const nextensionResult: vscode.Extension<any> = vscode.extensions.getExtension(extension);
            if (nextensionResult) {
                return nextensionResult.packageJSON.version;
            }
        } catch (error) {
            // Ignore the error
        }
    }
}
