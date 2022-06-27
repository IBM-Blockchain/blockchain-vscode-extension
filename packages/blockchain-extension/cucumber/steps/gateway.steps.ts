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
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as vscode from 'vscode';
import { IFabricGatewayConnection } from 'ibm-blockchain-platform-common';
import { FabricGatewayConnectionManager } from '../../extension/fabric/FabricGatewayConnectionManager';
import { MetadataUtil } from '../../extension/util/MetadataUtil';

// tslint:disable:no-unused-expression

chai.use(sinonChai);
chai.use(chaiAsPromised);

module.exports = function(): any {
    /**
     * Given
     */

    this.Given(/the gateway '(.*?)' is created/, this.timeout, async (gateway: string) => {
        this.gateway = gateway;

        await this.gatewayHelper.createGateway(gateway);
    });

    this.Given(/I have created a gateway '(.*)' from an? '(.*)'(?: with an msp "(.*)" and CA name "(.*)")?/, this.timeout, async (gateway: string, method: string, mspName?: string, caName?: string) => {
        this.gateway = gateway;

        let fromEnvironment: boolean = false;
        if (method === 'environment') {
            fromEnvironment = true;

        }

        await this.gatewayHelper.createGateway(gateway, fromEnvironment, this.environmentName, mspName, caName);
    });

    this.Given(/I'm connected to the '(.*?)' gateway( without association)?/, this.timeout, async (gateway: string, withoutAssociation: string) => {

        this.gateway = gateway;

        let hasAssociation: boolean = true;
        if (withoutAssociation) {
            hasAssociation = false;
        }

        await this.gatewayHelper.connectToFabric(this.gateway, this.wallet, this.identity, hasAssociation);
    });

    this.Given(/^the transaction '(.*?)' has been submitted on the channel '(.*?)' with args '(.*?)' ?(?:and with the transient data )?('.*?')?$/, this.timeout, async (transaction: string, channel: string, args: string, transientData: string) => {
        // submit tx
        await this.gatewayHelper.submitTransaction(this.contractDefinitionName, this.contractDefinitionVersion, this.contractLanguage, transaction, channel, args, this.gateway, `${this.contractAssetType}Contract`, transientData, false);
    });

    this.Given('the contract has been associated with a directory of transaction data', this.timeout, async () => {
        await this.gatewayHelper.associateTransactionDataDirectory(this.contractDefinitionName, this.contractDefinitionVersion, this.gateway);
    });

    /**
     * When
     */

    this.When(/I create a gateway '(.*)' from an? '(.*)'/, this.timeout, async (gateway: string, method: string) => {
        this.gateway = gateway;

        let fromEnvironment: boolean = false;
        if (method === 'environment') {
            fromEnvironment = true;

        }

        await this.gatewayHelper.createGateway(gateway, fromEnvironment, this.environmentName);
    });

    this.When(/connecting to the '(.*?)' gateway( without association)?/, this.timeout, async (gateway: string, withoutAssociation: string) => {

        this.gateway = gateway;

        let hasAssociation: boolean = true;
        if (withoutAssociation) {
            hasAssociation = false;
        }

        await this.gatewayHelper.connectToFabric(gateway, this.wallet, this.identity, hasAssociation);
    });

    this.When('I generate a {string} functional test for a {string} contract', this.timeout, async (testLanguage: string, contractLanguage: string) => {

        await this.generatedTestsHelper.generateSmartContractTests(this.contractDefinitionName, '0.0.1', testLanguage, this.gateway);
        this.testLanguage = testLanguage;
        this.contractLanguage = contractLanguage;
    });

    this.When(/^I (submit|evaluate) the transaction '(.*?)' on the channel '(.*?)' with args '(.*?)' ?(?:and with the transient data )?('.*?')?$/, this.timeout, async (submitEvaluate: string, transaction: string, channel: string, args: string, transientData: string) => {
        let evaluateBoolean: boolean;
        if (submitEvaluate === 'submit') {
            evaluateBoolean = false;
        } else if (submitEvaluate === 'evaluate') {
            evaluateBoolean = true;
        }
        await this.gatewayHelper.submitTransaction(this.contractDefinitionName, this.contractDefinitionVersion, this.contractLanguage, transaction, channel, args, this.gateway, this.namespace, transientData, evaluateBoolean);
    });

    this.When(/^I (submit|evaluate) the transaction '(.*?)' on the channel '(.*?)' using the transaction data labelled '(.*?)'$/, this.timeout, async (submitEvaluate: string, transaction: string, channel: string, transactionLabel: string) => {
        let evaluateBoolean: boolean;
        if (submitEvaluate === 'submit') {
            evaluateBoolean = false;
        } else if (submitEvaluate === 'evaluate') {
            evaluateBoolean = true;
        }
        await this.gatewayHelper.submitTransaction(this.contractDefinitionName, this.contractDefinitionVersion, this.contractLanguage, transaction, channel, undefined, this.gateway, this.namespace, undefined, evaluateBoolean, transactionLabel);
    });

    this.When('I export the connection profile', this.timeout, async () => {
        await this.gatewayHelper.exportConnectionProfile(this.gateway);
    });

    /**
     * Then
     */

    this.Then('a functional test file with .{string} extension for the {string} contract {string} version {string} with assets {string} should exist and contain the correct contents',
              this.timeout,
              async (fileExtension: string, testLanguage: string, contractName: string, version: string, assetType: string) => {
                let functionalDirPath: string;
                let capsContractName: string;
                let fileName: string;
                let filePath: string;
                if (testLanguage === 'Java') {
                    const capsAssetType: string = assetType[0].toUpperCase() + assetType.slice(1);
                    const versionPlain: string = version.replace(/\./g, '');
                    capsContractName = contractName[0].toUpperCase() + contractName.slice(1);
                    fileName = `Fv${capsAssetType}Contract${capsContractName}${versionPlain}Test.java`;
                    functionalDirPath = path.join(this.contractDirectory, 'src', 'test', 'java', 'org', 'example');
                } else if (testLanguage === 'Golang') {
                    fileName = `fv-${assetType}Contract-${contractName}@${version}_test.go`;
                    functionalDirPath = this.contractDirectory;
                } else {
                    fileName = `${assetType}Contract-${contractName}@${version}.test.${fileExtension}`;
                    functionalDirPath = path.join(this.contractDirectory, 'functionalTests');
                }
                filePath = path.join(functionalDirPath, fileName);
                const exists: boolean = await fs.pathExists(filePath);
                exists.should.equal(true);

                const testFileContentsBuffer: Buffer = await fs.readFile(filePath);
                const testFileContents: string = testFileContentsBuffer.toString();
                // Did it open?
                const textEditors: readonly vscode.TextEditor[] = vscode.window.visibleTextEditors;
                const openFileNameArray: string[] = [];
                for (const textEditor of textEditors) {
                    openFileNameArray.push(textEditor.document.fileName);
                }
                openFileNameArray.includes(filePath).should.be.true;

                // Get the smart contract metadata
                const connection: IFabricGatewayConnection = FabricGatewayConnectionManager.instance().getConnection();
                const smartContractTransactionsMap: Map<string, string[]> = await MetadataUtil.getTransactionNames(connection, this.contractDefinitionName, 'mychannel');
                let smartContractTransactionsArray: string[];
                for (const name of smartContractTransactionsMap.keys()) {
                    smartContractTransactionsArray = smartContractTransactionsMap.get(name);
                }
                // Check the test file was populated properly
                if (testLanguage === 'Java') {
                    testFileContents.includes(capsContractName).should.be.true;
                    testFileContents.includes('builder.connect').should.be.true;
                } else if (testLanguage === 'Golang') {
                    testFileContents.includes(contractName).should.be.true;
                    testFileContents.includes('gw.Connect').should.be.true;
                } else {
                    testFileContents.includes(this.contractDefinitionName).should.be.true;
                    testFileContents.includes('gateway.connect').should.be.true;
                }
                testFileContents.startsWith('/*').should.be.true;
                testFileContents.includes(testLanguage === 'Golang' ? 'transaction.Submit' : (testLanguage === 'Java' ? 'transaction.submit' : 'submitTransaction')).should.be.true;
                testFileContents.includes(smartContractTransactionsArray[0]).should.be.true;
                testFileContents.includes(smartContractTransactionsArray[1]).should.be.true;
                testFileContents.includes(smartContractTransactionsArray[2]).should.be.true;
    });

    this.Then('the tests should be runnable', this.timeout, async () => {
        if (this.contractLanguage === 'TypeScript' || this.contractLanguage === 'Java') {
            const testRunResult: boolean = await this.generatedTestsHelper.runSmartContractTests(this.contractDefinitionName, this.testLanguage, this.contractAssetType);
            testRunResult.should.equal(true);
        }
    });

    this.Then('a connection profile exists', this.timeout, async () => {
        const profilePath: string = path.join(__dirname, '../../../cucumber/tmp/profiles');

        const name: string = this.gateway;

        const exists: boolean = await fs.pathExists(path.join(profilePath, `${name}_connection.json`));

        exists.should.equal(true);
    });
};
