/// <reference types="Cypress" />

chai.should();
describe('Cypress', () => {
    it('is working', () => {
        cy.visit('build/index.html').then((window) => {
            window.postMessage('/one', '*'); // This is needed to trigger the `window.addEventListener`
        });

        cy.get('#checkboxOne').then((checkbox: any) => {
            const label: any[] = checkbox.siblings('label');
            label.should.have.text('checkboxOne Label');
        });

        cy.get('#buttonOne').contains('Do Nothing').click();

        cy.focused().should('have.id', 'buttonOne').and('have.class', 'bx--btn--primary');
        cy.focused().should('have.css', 'border-color').and('eq', 'rgb(255, 255, 255)');

    });
});
