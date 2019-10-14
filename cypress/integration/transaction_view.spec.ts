/// <reference types="Cypress" />
chai.should();
describe('Cypress', () => {

    const mockMessage: {path: string, state: {smartContracts: Array<string>, activeSmartContract: string}} = {
        path: 'transaction',
        state: {
            smartContracts: ['greenContract@0.0.1', 'blueContract@0.0.1'],
            activeSmartContract: 'greenContract@0.0.1'
        }
    };

    beforeEach(() => {
        cy.visit('build/index.html').then((window: Window) => {
            window.postMessage(mockMessage, '*');
        });

    });

    it('is working', () => {
        cy.get('#create-button').click();
        cy.focused().should('have.id', 'create-button');

        cy.get('#import-button').click();
        cy.focused().should('have.id', 'import-button');
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

});
