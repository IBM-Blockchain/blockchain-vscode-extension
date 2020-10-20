/// <reference types="Cypress" />
import ITransaction from '../../src/interfaces/ITransaction';
import ISmartContract from '../../src/interfaces/ISmartContract';
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
        namespace: 'GreenContract',
        peerNames: ['peer1', 'peer2']
    };

    const mockMessage: {path: string, transactionData: {gatewayName: string, smartContract: ISmartContract} } = {
        path: 'transaction',
        transactionData: {
            gatewayName: 'myGateway',
            smartContract: greenContract
        }
    };

    const mockOutput: {transactionOutput: string} = {
        transactionOutput: 'some transaction output'
    };

    beforeEach(() => {

        cy.visit('build/index.html').then((window: Window) => {
            window.postMessage(mockMessage, '*');
        });

        cy.get('.vscode-dark').invoke('attr', 'class', 'vscode-light'); // Use the light theme as components render properly.
    });

    it('generates appropriate arguments when a transaction is selected', () => {
        cy.get('#transaction-select').contains('Select the transaction name');
        cy.get('#transaction-select').click(); // Expand dropdown
        cy.get('#transaction-select').contains('transactionOne').click(); // Click on option
        cy.get('#transaction-select').contains('transactionOne');
        cy.get('#arguments-text-area')
            .invoke('val')
            .then((text: JQuery<HTMLElement>): void => {
                expect(text).to.equal('[\n  name: ""\n]');
            });
    });

    it('replaces generated arguments when a new transaction is selected', () => {
        cy.get('#transaction-select').contains('Select the transaction name');
        cy.get('#transaction-select').click(); // Expand dropdown
        cy.get('#transaction-select').contains('transactionOne').click(); // Click on option
        cy.get('#transaction-select').contains('transactionOne');
        cy.get('#arguments-text-area')
            .invoke('val')
            .then((text: JQuery<HTMLElement>): void => {
                expect(text).to.equal('[\n  name: ""\n]');
            });

        cy.get('#transaction-select').click(); // Expand dropdown
        cy.get('#transaction-select').contains('transactionTwo').click(); // Click on option
        cy.get('#transaction-select').contains('transactionTwo');
        cy.get('#arguments-text-area')
            .invoke('val')
            .then((text: JQuery<HTMLElement>): void => {
                expect(text).to.equal('[\n  size: ""\n]');
            });
    });

    it(`can submit a transaction with the user's input`, () => {
        cy.get('#transaction-select').contains('Select the transaction name');
        cy.get('#transaction-select').click(); // Expand dropdown
        cy.get('#transaction-select').contains('transactionOne').click(); // Click on option
        cy.get('#transaction-select').contains('transactionOne');

        cy.get('#arguments-text-area').type('{leftarrow}{leftarrow}{leftarrow}penguin');

        cy.get('#submit-button').click();

        cy.window().then((window: Window) => {
            window.postMessage(mockOutput, '*');
        });

        cy.get('.output-body').contains(mockOutput.transactionOutput);
    });

    it(`can submit a transaction with transient data`, () => {
        cy.get('#transaction-select').contains('Select the transaction name');
        cy.get('#transaction-select').click(); // Expand dropdown
        cy.get('#transaction-select').contains('transactionOne').click(); // Click on option
        cy.get('#transaction-select').contains('transactionOne');

        cy.get('#arguments-text-area').type('{leftarrow}{leftarrow}{leftarrow}penguin');
        cy.get('#transient-data-input').type('{"some": "data"}', {parseSpecialCharSequences: false});

        cy.get('#submit-button').click();

        cy.window().then((window: Window) => {
            window.postMessage(mockOutput, '*');
        });

        cy.get('.output-body').contains(mockOutput.transactionOutput);
    });

    it(`can submit a transaction with custom peer`, () => {
        cy.get('#transaction-select').contains('Select the transaction name');
        cy.get('#transaction-select').click(); // Expand dropdown
        cy.get('#transaction-select').contains('transactionOne').click(); // Click on option
        cy.get('#transaction-select').contains('transactionOne');

        cy.get('#peer-select').contains('Select peers');
        cy.get('#peer-select').click(); // Expand dropdown
        cy.get('#peer-select').contains('peer1').click(); // Click on option
        cy.get('#peer-select').contains('peer1');

        cy.get('#submit-button').click();

        cy.window().then((window: Window) => {
            window.postMessage(mockOutput, '*');
        });

        cy.get('.output-body').contains(mockOutput.transactionOutput);
    });

    it(`can evaluate a transaction with the user's input`, () => {
        cy.get('#transaction-select').contains('Select the transaction name');
        cy.get('#transaction-select').click(); // Expand dropdown
        cy.get('#transaction-select').contains('transactionTwo').click(); // Click on option
        cy.get('#transaction-select').contains('transactionTwo');

        cy.get('#arguments-text-area').type('{leftarrow}{leftarrow}{leftarrow}big');

        cy.get('#evaluate-button').click();

        cy.window().then((window: Window) => {
            window.postMessage(mockOutput, '*');
        });

        cy.get('.output-body').contains(mockOutput.transactionOutput);
    });

    it(`can evaluate a transaction with transient data`, () => {
        cy.get('#transaction-select').contains('Select the transaction name');
        cy.get('#transaction-select').click(); // Expand dropdown
        cy.get('#transaction-select').contains('transactionTwo').click(); // Click on option
        cy.get('#transaction-select').contains('transactionTwo');

        cy.get('#arguments-text-area').type('{leftarrow}{leftarrow}{leftarrow}big');
        cy.get('#transient-data-input').type('{"some": "data"}', {parseSpecialCharSequences: false});

        cy.get('#evaluate-button').click();

        cy.window().then((window: Window) => {
            window.postMessage(mockOutput, '*');
        });

        cy.get('.output-body').contains(mockOutput.transactionOutput);
    });

    it(`can submit a transaction with custom peer`, () => {
        cy.get('#transaction-select').contains('Select the transaction name');
        cy.get('#transaction-select').click(); // Expand dropdown
        cy.get('#transaction-select').contains('transactionOne').click(); // Click on option
        cy.get('#transaction-select').contains('transactionOne');

        cy.get('#peer-select').contains('Select peers');
        cy.get('#peer-select').click(); // Expand dropdown
        cy.get('#peer-select').contains('peer1').click(); // Click on option
        cy.get('#peer-select').contains('peer1');

        cy.get('#evaluate-button').click();

        cy.window().then((window: Window) => {
            window.postMessage(mockOutput, '*');
        });

        cy.get('.output-body').contains(mockOutput.transactionOutput);
    });
});
