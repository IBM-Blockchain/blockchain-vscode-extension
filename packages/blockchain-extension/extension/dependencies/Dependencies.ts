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

export class DependencyVersions {

    static readonly DOCKER_REQUIRED: string = '>=17.6.2';
    static readonly DOCKER_COMPOSE_REQUIRED: string = '>=1.14.0';

    static readonly NODEJS_REQUIRED: string = '8.x || 10.x';
    static readonly NPM_REQUIRED: string = '>=6.0.0';
    static readonly OPENSSL_REQUIRED: string = '1.0.2 || 1.1.1';
    static readonly GO_REQUIRED: string = '>=1.12.0';
    static readonly JAVA_REQUIRED: string = '1.8.x';
}

interface Dependency {
    name: string;
    required: boolean;
}

export interface DependencyWithVersion extends Dependency {
    version: string;
    url: string;
    requiredVersion: string;
    requiredLabel: string;
    tooltip: string;
}

export interface DependencyWithComplete extends Dependency {
    complete: boolean;
    id: string;
    checkbox: boolean;
    text: string;
    // System properties uses a version for amount of memory
    version?: any;
}

export interface RequiredDependencies {
    docker?: DependencyWithVersion;
    dockerCompose?: DependencyWithVersion;
    systemRequirements?: DependencyWithComplete;
    openssl?: DependencyWithVersion;
    dockerForWindows?: DependencyWithComplete;
}

export interface OptionalDependencies {
    node: DependencyWithVersion;
    nodeTestRunnerExtension: DependencyWithVersion;
    npm: DependencyWithVersion;
    go: DependencyWithVersion;
    goExtension: DependencyWithVersion;
    java: DependencyWithVersion;
    javaLanguageExtension: DependencyWithVersion;
    javaDebuggerExtension: DependencyWithVersion;
    javaTestRunnerExtension: DependencyWithVersion;
}

export interface Dependencies extends RequiredDependencies, OptionalDependencies {}

export const defaultDependencies: { required: RequiredDependencies, optional: OptionalDependencies } = {
    required: {
        docker: {
            name: 'Docker',
            required: true,
            version: undefined,
            url: 'https://docs.docker.com/install/#supported-platforms',
            requiredVersion: DependencyVersions.DOCKER_REQUIRED,
            requiredLabel: '',
            tooltip: `Used to download Hyperledger Fabric images and manage containers for local environments.`,
        },
        dockerCompose: {
            name: 'Docker Compose',
            required: true,
            version: undefined,
            url: 'https://docs.docker.com/compose/install/',
            requiredVersion: DependencyVersions.DOCKER_COMPOSE_REQUIRED,
            requiredLabel: '',
            tooltip: `Used for managing and operating the individual local environment components.`
        },
        systemRequirements: {
            name: 'System Requirements',
            required: true,
            id: 'systemRequirements',
            complete: undefined,
            checkbox: false,
            text: 'In order to support the local runtime, please confirm your system has at least 4GB of RAM'
        },
        openssl: {
            name: 'OpenSSL',
            required: true,
            version: undefined,
            url: 'http://slproweb.com/products/Win32OpenSSL.html',
            requiredVersion: DependencyVersions.OPENSSL_REQUIRED,
            requiredLabel: 'for Node 8.x and Node 10.x respectively',
            tooltip: 'Install the Win32 version into `C:\\OpenSSL-Win32` on 32-bit systems and the Win64 version into `C:\\OpenSSL-Win64` on 64-bit systems`.'
        },
        dockerForWindows: {
            name: 'Docker for Windows',
            required: true,
            id: 'dockerForWindows',
            complete: undefined,
            checkbox: true,
            text: 'Docker for Windows must be configured to use Linux containers (this is the default)'
        },
    },
    optional: {
        node: {
            name: 'Node.js',
            required: false,
            version: undefined,
            url: 'https://nodejs.org/en/download/releases',
            requiredVersion: DependencyVersions.NODEJS_REQUIRED,
            requiredLabel: 'only',
            tooltip: 'Required for developing JavaScript and TypeScript smart contracts. If installing Node and npm using a manager such as \'nvm\' or \'nodenv\', you will need to set the default/global version and restart VS Code for the version to be detected by the Prerequisites page.'
        },
        nodeTestRunnerExtension: {
            name: 'Node Test Runner Extension',
            required: false,
            version: undefined,
            url: 'vscode:extension/oshri6688.javascript-test-runner',
            requiredVersion: undefined,
            requiredLabel: '',
            tooltip: 'Used for running Node smart contract functional tests.'
        },
        npm: {
            name: 'npm',
            required: false,
            version: undefined,
            url: 'https://nodejs.org/en/download/releases',
            requiredVersion: DependencyVersions.NPM_REQUIRED,
            requiredLabel: '',
            tooltip: 'Required for installing JavaScript and TypeScript smart contract dependencies. If installing Node and npm using a manager such as \'nvm\' or \'nodenv\', you will need to set the default/global version and restart VS Code for the version to be detected by the Prerequisites page.'
        },
        go: {
            name: 'Go',
            required: false,
            version: undefined,
            url: 'https://golang.org/dl/',
            requiredVersion: DependencyVersions.GO_REQUIRED,
            requiredLabel: '',
            tooltip: 'Required for developing Go smart contracts.'
        },
        goExtension: {
            name: 'Go Extension',
            required: false,
            version: undefined,
            url: 'vscode:extension/golang.go',
            requiredVersion: '',
            requiredLabel: '',
            tooltip: 'Provides language support for Go.'
        },
        java: {
            name: 'Java OpenJDK 8',
            required: false,
            version: undefined,
            url: 'https://adoptopenjdk.net/?variant=openjdk8',
            requiredVersion: DependencyVersions.JAVA_REQUIRED,
            requiredLabel: 'only',
            tooltip: 'Required for developing Java smart contracts.'
        },
        javaLanguageExtension: {
            name: 'Java Language Support Extension',
            required: false,
            version: undefined,
            url: 'vscode:extension/redhat.java',
            requiredVersion: undefined,
            requiredLabel: '',
            tooltip: 'Provides language support for Java.'
        },
        javaDebuggerExtension: {
            name: 'Java Debugger Extension',
            required: false,
            version: undefined,
            url: 'vscode:extension/vscjava.vscode-java-debug',
            requiredVersion: undefined,
            requiredLabel: '',
            tooltip: 'Used for debugging Java smart contracts.'
        },
        javaTestRunnerExtension: {
            name: 'Java Test Runner Extension',
            required: false,
            version: undefined,
            url: 'vscode:extension/vscjava.vscode-java-test',
            requiredVersion: undefined,
            requiredLabel: '',
            tooltip: 'Used for running Java smart contract functional tests.'
        },
    },
};
