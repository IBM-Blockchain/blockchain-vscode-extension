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

export class DependencyProperties {
    static readonly DOCKER_REQUIRED_VERSION: string = '>=17.6.2';
    static readonly DOCKER_COMPOSE_REQUIRED_VERSION: string = '>=1.14.0';
    static readonly NODEJS_REQUIRED_VERSION: string =  '>=10.15.3 < 11.0.0|| >=12.13.1 < 13.0.0';
    static readonly NPM_REQUIRED_VERSION: string = '>=6.0.0';
    static readonly OPENSSL_REQUIRED_VERSION: string = '1.0.2';
    static readonly GO_REQUIRED_VERSION: string = '>=1.12.0';
    static readonly JAVA_REQUIRED_VERSION: string = '1.8.x';

    static readonly NODEJS_TEST_RUNNER_EXTENSION: string = 'oshri6688.javascript-test-runner';
    static readonly GO_LANGUAGE_EXTENSION: string = 'golang.go';
    static readonly JAVA_LANGUAGE_EXTENSION: string = 'redhat.java';
    static readonly JAVA_DEBUG_EXTENSION: string = 'vscjava.vscode-java-debug';
    static readonly JAVA_TEST_RUNNER_EXTENSION: string = 'vscjava.vscode-java-test';
    static readonly IBM_CLOUD_ACCOUNT_EXTENSION: string = 'IBM.ibmcloud-account';
}

export interface Dependency {
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
    ibmCloudAccountExtension: DependencyWithVersion;
}

export interface Dependencies extends RequiredDependencies, OptionalDependencies {}

export const defaultDependencies: { required: RequiredDependencies, optional: OptionalDependencies } = {
    required: {
        docker: {
            name: 'Docker',
            required: true,
            version: undefined,
            url: 'https://docs.docker.com/install/#supported-platforms',
            requiredVersion: DependencyProperties.DOCKER_REQUIRED_VERSION,
            requiredLabel: '',
            tooltip: `Used to download Hyperledger Fabric images and manage containers for local environments.`,
        },
        dockerCompose: {
            name: 'Docker Compose',
            required: true,
            version: undefined,
            url: 'https://docs.docker.com/compose/install/',
            requiredVersion: DependencyProperties.DOCKER_COMPOSE_REQUIRED_VERSION,
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
            required: false,
            version: undefined,
            url: 'https://www.openssl.org/community/binaries.html',
            requiredVersion: DependencyProperties.OPENSSL_REQUIRED_VERSION,
            requiredLabel: 'only',
            tooltip: 'Install the Win64 version into `C:\\OpenSSL-Win64` on 64-bit systems`. Required for smart contract and applications using v1.x of the Fabric contract API and SDK.'
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
            requiredVersion: DependencyProperties.NODEJS_REQUIRED_VERSION,
            requiredLabel: 'only',
            tooltip: 'Required for developing JavaScript and TypeScript smart contracts. If installing Node and npm using a manager such as \'nvm\' or \'nodenv\', you will need to set the default/global version and restart VS Code for the version to be detected by the Prerequisites page.'
        },
        nodeTestRunnerExtension: {
            name: 'Node Test Runner Extension',
            required: false,
            version: undefined,
            url: `vscode:extension/${DependencyProperties.NODEJS_TEST_RUNNER_EXTENSION}`,
            requiredVersion: undefined,
            requiredLabel: '',
            tooltip: 'Used for running Node smart contract functional tests.'
        },
        npm: {
            name: 'npm',
            required: false,
            version: undefined,
            url: 'https://nodejs.org/en/download/releases',
            requiredVersion: DependencyProperties.NPM_REQUIRED_VERSION,
            requiredLabel: '',
            tooltip: 'Required for installing JavaScript and TypeScript smart contract dependencies. If installing Node and npm using a manager such as \'nvm\' or \'nodenv\', you will need to set the default/global version and restart VS Code for the version to be detected by the Prerequisites page.'
        },
        go: {
            name: 'Go',
            required: false,
            version: undefined,
            url: 'https://golang.org/dl/',
            requiredVersion: DependencyProperties.GO_REQUIRED_VERSION,
            requiredLabel: '',
            tooltip: 'Required for developing Go smart contracts.'
        },
        goExtension: {
            name: 'Go Extension',
            required: false,
            version: undefined,
            url: `vscode:extension/${DependencyProperties.GO_LANGUAGE_EXTENSION}`,
            requiredVersion: '',
            requiredLabel: '',
            tooltip: 'Provides language support for Go.'
        },
        java: {
            name: 'Java OpenJDK 8',
            required: false,
            version: undefined,
            url: 'https://adoptopenjdk.net/?variant=openjdk8',
            requiredVersion: DependencyProperties.JAVA_REQUIRED_VERSION,
            requiredLabel: 'only',
            tooltip: 'Required for developing Java smart contracts.'
        },
        javaLanguageExtension: {
            name: 'Java Language Support Extension',
            required: false,
            version: undefined,
            url: `vscode:extension/${DependencyProperties.JAVA_LANGUAGE_EXTENSION}`,
            requiredVersion: undefined,
            requiredLabel: '',
            tooltip: 'Provides language support for Java.'
        },
        javaDebuggerExtension: {
            name: 'Java Debugger Extension',
            required: false,
            version: undefined,
            url: `vscode:extension/${DependencyProperties.JAVA_DEBUG_EXTENSION}`,
            requiredVersion: undefined,
            requiredLabel: '',
            tooltip: 'Used for debugging Java smart contracts.'
        },
        javaTestRunnerExtension: {
            name: 'Java Test Runner Extension',
            required: false,
            version: undefined,
            url: `vscode:extension/${DependencyProperties.JAVA_TEST_RUNNER_EXTENSION}`,
            requiredVersion: undefined,
            requiredLabel: '',
            tooltip: 'Used for running Java smart contract functional tests.'
        },
        ibmCloudAccountExtension: {
            name: 'IBM Cloud Account Extension',
            required: false,
            version: undefined,
            url: `vscode:extension/${DependencyProperties.IBM_CLOUD_ACCOUNT_EXTENSION}`,
            requiredVersion: undefined,
            requiredLabel: '',
            tooltip: 'Required for discovering IBM Blockchain Platform on IBM Cloud networks.',
        },
    },
};
