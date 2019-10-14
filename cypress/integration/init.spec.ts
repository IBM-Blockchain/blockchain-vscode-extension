/// <reference types="Cypress" />

chai.should();
describe('Cypress', () => {
    it('is working', () => {
        cy.visit('build/index.html').then((window) => {
            window.postMessage('/transaction', '*'); // This is needed to trigger the `window.addEventListener`
        });

        cy.get('#create-button').click();
        cy.focused().should('have.id', 'create-button');

        cy.get('#import-button').click();
        cy.focused().should('have.id', 'import-button');
    });

});
