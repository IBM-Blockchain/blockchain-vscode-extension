/// <reference types="Cypress" />
import ITransaction from '../../src/interfaces/ITransaction';
import ISmartContract from '../../src/interfaces/ISmartContract';
import { ExtensionCommands } from '../../src/ExtensionCommands';
import Utils from '../../src/Utils';
chai.should();

describe('Transaction page', () => {
    const transactionOne: ITransaction = {
        name: 'transactionOne',
        parameters: [{
            description: '',
            name: 'name',
            schema: {}
        }],
        returns: {
            type: ''
        },
        tag: ['submit']
    };

    const transactionTwo: ITransaction = {
        name: 'transactionTwo',
        parameters: [{
            description: '',
            name: 'size',
            schema: {}
        }],
        returns: {
            type: ''
        },
        tag: ['submit']
    };

    const greenContract: ISmartContract = {
        name: 'greenContract',
        version: '0.0.1',
        channel: 'mychannel',
        label: 'greenContract@0.0.1',
        transactions: [transactionOne, transactionTwo],
        namespace: 'GreenContract'
    };

    const mockMessage: {path: string, gatewayName: string, smartContract: ISmartContract} = {
        path: 'transaction',
        gatewayName: 'myGateway',
        smartContract: greenContract
    };

    const mockOutput: {transactionOutput: string} = {
        transactionOutput: 'some transaction output'
    };

    beforeEach(() => {
        // cy.stub(Utils, 'postToVSCode').as('postToVSCodeStub');

        // Utils.postToVSCode = () => { return; };

        cy.visit('build/index.html').then((window: Window) => {
            window.postMessage(mockMessage, '*');
        });

        cy.get('.vscode-dark').invoke('attr', 'class', 'vscode-light'); // Use the light theme as components render properly.
    });

    it('generates appropriate arguments when a transaction is selected', () => {
        cy.get('#transaction-name-select').select('transactionOne');
        cy.get('#arguments-text-area')
            .invoke('val')
            .then((text: JQuery<HTMLElement>): void => {
                expect(text).to.equal('[\n  name: ""\n]');
            });
    });

    it('replaces generated arguments when a new transaction is selected', () => {
        cy.get('#transaction-name-select').select('transactionOne');
        cy.get('#arguments-text-area')
            .invoke('val')
            .then((text: JQuery<HTMLElement>): void => {
                expect(text).to.equal('[\n  name: ""\n]');
            });

        cy.get('#transaction-name-select').select('transactionTwo');
        cy.get('#arguments-text-area')
            .invoke('val')
            .then((text: JQuery<HTMLElement>): void => {
                expect(text).to.equal('[\n  size: ""\n]');
            });
    });

    it(`can submit a transaction with the user's input`, () => {
        cy.get('#transaction-name-select').select('transactionOne');
        cy.get('#arguments-text-area').type('{leftarrow}{leftarrow}{leftarrow}penguin');

        cy.get('#submit-button').click();

        cy.window().then((window: Window) => {
            window.postMessage(mockOutput, '*');
        });

        cy.get('.output-body').contains(mockOutput.transactionOutput);
    });

    it(`can submit a transaction with transient data`, () => {
        cy.get('#transaction-name-select').select('transactionOne');
        cy.get('#arguments-text-area').type('{leftarrow}{leftarrow}{leftarrow}penguin');
        cy.get('#transient-data-input').type('{"some": "data"}', {parseSpecialCharSequences: false});

        cy.get('#submit-button').click();

        cy.window().then((window: Window) => {
            window.postMessage(mockOutput, '*');
        });

        cy.get('.output-body').contains(mockOutput.transactionOutput);
    });

    it(`can evaluate a transaction with the user's input`, () => {
        cy.get('#transaction-name-select').select('transactionTwo');
        cy.get('#arguments-text-area').type('{leftarrow}{leftarrow}{leftarrow}big');

        cy.get('#evaluate-button').click();

        cy.window().then((window: Window) => {
            window.postMessage(mockOutput, '*');
        });

        cy.get('.output-body').contains(mockOutput.transactionOutput);
    });

    it(`can evaluate a transaction with transient data`, () => {
        cy.get('#transaction-name-select').select('transactionTwo');
        cy.get('#arguments-text-area').type('{leftarrow}{leftarrow}{leftarrow}big');
        cy.get('#transient-data-input').type('{"some": "data"}', {parseSpecialCharSequences: false});

        cy.get('#evaluate-button').click();

        cy.window().then((window: Window) => {
            window.postMessage(mockOutput, '*');
        });

        cy.get('.output-body').contains(mockOutput.transactionOutput);
    });
});
