/// <reference types="Cypress" />
import ITransaction from '../../src/interfaces/ITransaction';
import ISmartContract from '../../src/interfaces/ISmartContract';
chai.should();

describe('Cypress', () => {

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

    const blueContract: ISmartContract = {
        name: 'blueContract',
        version: '0.0.1',
        channel: 'mychannel',
        label: 'blueContract@0.0.1',
        transactions: [transactionOne, transactionTwo],
        namespace: 'BlueContract'
    };

    describe('Transaction home screen', () => {

        const mockMessage: {path: string, state: {gatewayName: string, smartContracts: Array<ISmartContract>, activeSmartContract: ISmartContract}} = {
            path: 'transaction',
            state: {
                gatewayName: 'myGateway',
                smartContracts: [greenContract, blueContract],
                activeSmartContract: greenContract
            }
        };

        beforeEach(() => {
            cy.visit('build/index.html').then((window: Window) => {
                window.postMessage(mockMessage, '*');
            });

             // @ts-ignore
            cy.window().its('app')
                .then((app: any) => {
                    cy.stub(app, 'postMessageHandler').as('postMessageStub');
                });
        });

        it('should correctly display the gatewayName', () => {
            cy.get('h2').contains('myGateway');
            cy.get('.contents-container > p').contains('myGateway');
        });

        it('should correctly display the currently active smart contract', () => {
            cy.get('#smart-contract-select').contains('greenContract@0.0.1');
            cy.get('.contents-container > p').contains('greenContract@0.0.1');
        });

        it('should allow switching between smart contracts', () => {
            cy.get('#smart-contract-select').select('blueContract@0.0.1');
            cy.get('#smart-contract-select').contains('blueContract@0.0.1');
            cy.get('.contents-container > p').contains('blueContract@0.0.1');
        });

        it('should navigate to the create screen', () => {
            cy.get('#recent-txns-table-btn').click();
            cy.get('@postMessageStub').should('be.calledWith', 'create');
        });
    });

    describe('Transaction create screen', () => {

        const mockMessage: {path: string, state: {gatewayName: string, smartContracts: Array<ISmartContract>, activeSmartContract: ISmartContract}} = {
            path: 'transaction/create',
            state: {
                gatewayName: 'myGateway',
                smartContracts: [greenContract, blueContract],
                activeSmartContract: greenContract
            }
        };

        const mockOutput: {output: string} = {
            output: 'some transaction output'
        };

        beforeEach(() => {
            cy.visit('build/index.html').then((window: Window) => {
                window.postMessage(mockMessage, '*');
            });

            // @ts-ignore
            cy.window().its('app')
                .then((app: any) => {
                    cy.stub(app, 'postMessageHandler').as('postMessageStub');
                });
        });

        it('should navigate back to the home screen', () => {
            cy.get('.home-link').click();
            cy.get('@postMessageStub').should('be.calledWith', 'home');
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

            cy.get('@postMessageStub').should('be.called');

            cy.window().then((window: Window) => {
                window.postMessage(mockOutput, '*');
            });

            cy.get('.output-body').contains(mockOutput.output);
        });

        it(`can evaluate a transaction with the user's input`, () => {
            cy.get('#transaction-name-select').select('transactionTwo');
            cy.get('#arguments-text-area').type('{leftarrow}{leftarrow}{leftarrow}big');

            cy.get('#evaluate-button').click();

            cy.get('@postMessageStub').should('be.called');

            cy.window().then((window: Window) => {
                window.postMessage(mockOutput, '*');
            });

            cy.get('.output-body').contains(mockOutput.output);
        });
    });
});
