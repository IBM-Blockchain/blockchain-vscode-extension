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

        const mockMessage: {path: string, state: {smartContracts: Array<ISmartContract>, activeSmartContract: ISmartContract}} = {
            path: 'transaction',
            state: {
                smartContracts: [greenContract, blueContract],
                activeSmartContract: greenContract
            }
        };

        beforeEach(() => {
            cy.visit('build/index.html').then((window: Window) => {
                window.postMessage(mockMessage, '*');
            });
        });

        it('should correctly display the currently active smart contract', () => {
            cy.get('.titles-container > span').contains('greenContract@0.0.1');
            cy.get('.contents-left > p > span').contains('greenContract@0.0.1');
        });

        it('should correctly display the list of instantiated smart contracts', () => {
            cy.get('.contents-left > ul > li:first')
                .contains('greenContract@0.0.1')
                .should('have.class', 'smart-contract-item disabled-smart-contract');

            cy.get('.contents-left > ul > li:nth-of-type(2)')
                .contains('blueContract@0.0.1')
                .should('have.class', 'smart-contract-item clickable-smart-contract');
        });

        it('should allow switching between smart contracts', () => {
            cy.get('.contents-left > ul > li:nth-of-type(2)').click();

            cy.get('.titles-container > span').contains('blueContract@0.0.1');
            cy.get('.contents-left > p > span').contains('blueContract@0.0.1');

            cy.get('.contents-left > ul > li:first')
                .contains('greenContract@0.0.1')
                .should('have.class', 'smart-contract-item clickable-smart-contract');

            cy.get('.contents-left > ul > li:nth-of-type(2)')
                .contains('blueContract@0.0.1')
                .should('have.class', 'smart-contract-item disabled-smart-contract');
        });

        it('should navigate to the create screen', () => {
            cy.get('#create-button').click();
            cy.url().should('include', '/transaction/create');
        });
    });

    describe('Transaction create screen', () => {

        beforeEach(() => {

            const mockMessage: {path: string, state: {smartContracts: Array<ISmartContract>, activeSmartContract: ISmartContract}} = {
                path: 'transaction/create',
                state: {
                    smartContracts: [greenContract, blueContract],
                    activeSmartContract: greenContract
                }
            };
            cy.visit('build/index.html').then((window: Window) => {
                window.postMessage(mockMessage, '*');
            });
        });

        it('generates appropriate arguments when a transaction is selected', () => {
            cy.get('#transaction-name-select').select('transactionOne');
            cy.get('#arguments-text-area')
                .invoke('val')
                .then((text: JQuery<HTMLElement>): void => {
                    it('is a transaction create screen', () => {
                        expect(text).to.equal('name: ');
                    });
                });
        });

        it('replaces generated arguments when a new transaction is selected', () => {
            cy.get('#transaction-name-select').select('transactionOne');
            cy.get('#arguments-text-area')
                .invoke('val')
                .then((text: JQuery<HTMLElement>): void => {
                    it('is a transaction create screen', () => {
                        expect(text).to.equal('name: ');
                    });
                });

            cy.get('#transaction-name-select').select('transactionTwo');
            cy.get('#arguments-text-area')
                .invoke('val')
                .then((text: JQuery<HTMLElement>): void => {
                    it('is a transaction create screen', () => {
                        expect(text).to.equal('size: ');
                    });
                });
        });

        it('can navigate back to the home screen', () => {
            cy.get('.titles-container > span').click();
            cy.url().should('include', '/transaction');
        });
    });
});
