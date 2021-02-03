/// <reference types="Cypress" />
import ITransaction from '../../src/interfaces/ITransaction';
import ISmartContract from '../../src/interfaces/ISmartContract';
import IAssociatedTxdata from '../../src/interfaces/IAssociatedTxdata';
import IDataFileTransaction from '../../src/interfaces/IDataFileTransaction';
import { ITransactionViewData } from '../../src/interfaces/IAppState';

chai.should();

interface IMessage {
    path: string;
    transactionViewData: ITransactionViewData;
}

describe('Transaction page', () => {
    const emptyTransaction: ITransaction = {
        name: '',
        parameters: [],
        returns: {
            type: '',
        },
        tag: [],
    };

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
        contractName: 'GreenContract',
        peerNames: ['peer1', 'peer2']
    };

    const mockMessage: IMessage = {
        path: 'transaction',
        transactionViewData: {
            gatewayName: 'myGateway',
            smartContracts: [greenContract],
            preselectedSmartContract: greenContract,
            preselectedTransaction: emptyTransaction,
            associatedTxdata: {},
        }
    };

    const mockOutput: {transactionOutput: string} = {
        transactionOutput: 'some transaction output'
    };

    const txdataTransactions: IDataFileTransaction[] = [{ transactionName: transactionOne.name, transactionLabel: transactionOne.name, txDataFile: '', arguments: [], transientData: {} }];

    const associatedTxdata: IAssociatedTxdata = {
        [greenContract.name]: {
            channelName: 'mychannel',
            transactionDataPath: 'transactionDataPath',
            transactions: txdataTransactions,
        }
    };


    beforeEach(() => {
        cy.visit('build/index.html').then((window: Window) => {
            window.postMessage(mockMessage, '*');
        });

        cy.get('.vscode-dark').invoke('attr', 'class', 'vscode-light'); // Use the light theme as components render properly.
    });

    describe('Manual Input', () => {
        it('generates appropriate arguments when a transaction is selected', () => {
            cy.get('#transaction-select').contains('Select the transaction name');
            cy.get('#transaction-select').click(); // Expand dropdown
            cy.get('#transaction-select').contains('transactionOne').click(); // Click on option
            cy.get('#transaction-select').contains('transactionOne');
            cy.get('#arguments-text-area')
                .invoke('val')
                .then((text: JQuery<HTMLElement>): void => {
                    expect(text).to.equal('{\n  "name": ""\n}');
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
                    expect(text).to.equal('{\n  "name": ""\n}');
                });

            cy.get('#transaction-select').click(); // Expand dropdown
            cy.get('#transaction-select').contains('transactionTwo').click(); // Click on option
            cy.get('#transaction-select').contains('transactionTwo');
            cy.get('#arguments-text-area')
                .invoke('val')
                .then((text: JQuery<HTMLElement>): void => {
                    expect(text).to.equal('{\n  "size": ""\n}');
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
            cy.get('#peer-select').click(); // Close dropdown

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
            cy.get('#peer-select').click(); // Close dropdown

            cy.get('#evaluate-button').click();

            cy.window().then((window: Window) => {
                window.postMessage(mockOutput, '*');
            });

            cy.get('.output-body').contains(mockOutput.transactionOutput);
        });
    });

    describe('Data file input', () => {
        beforeEach(() => {
            cy.get('[data-testid="content-switch-data"]').click();
        });

        it(`can submit a transaction with custom peer when a data directory is associated`, () => {
            const message: IMessage = {
                path: mockMessage.path,
                transactionViewData: {
                    ...mockMessage.transactionViewData,
                    associatedTxdata,
                }
            };
            cy.window().then((window: Window) => {
                window.postMessage(message, '*');
            });

            cy.get('#transaction-data-select').contains('Select the transaction name');
            cy.get('#transaction-data-select').click(); // Expand dropdown
            cy.get('#transaction-data-select').contains('transactionOne').click(); // Click on option
            cy.get('#transaction-data-select').contains('transactionOne');

            cy.get('#peer-select').contains('Select peers');
            cy.get('#peer-select').click(); // Expand dropdown
            cy.get('#peer-select').contains('peer1').click(); // Click on option
            cy.get('#peer-select').contains('peer1');
            cy.get('#peer-select').click(); // Close dropdown

            cy.get('#submit-button').click();

            cy.window().then((window: Window) => {
                window.postMessage(mockOutput, '*');
            });

            cy.get('.output-body').contains(mockOutput.transactionOutput);
        });

        it(`can evaluate a transaction with custom peer when a data directory is associated`, () => {
            const message: IMessage = {
                path: mockMessage.path,
                transactionViewData: {
                    ...mockMessage.transactionViewData,
                    associatedTxdata,
                }
            };
            cy.window().then((window: Window) => {
                window.postMessage(message, '*');
            });

            cy.get('#transaction-data-select').contains('Select the transaction name');
            cy.get('#transaction-data-select').click(); // Expand dropdown
            cy.get('#transaction-data-select').contains('transactionOne').click(); // Click on option
            cy.get('#transaction-data-select').contains('transactionOne');

            cy.get('#peer-select').contains('Select peers');
            cy.get('#peer-select').click(); // Expand dropdown
            cy.get('#peer-select').contains('peer1').click(); // Click on option
            cy.get('#peer-select').contains('peer1');
            cy.get('#peer-select').click(); // Close dropdown

            cy.get('#evaluate-button').click();

            cy.window().then((window: Window) => {
                window.postMessage(mockOutput, '*');
            });

            cy.get('.output-body').contains(mockOutput.transactionOutput);
        });
    });
});
