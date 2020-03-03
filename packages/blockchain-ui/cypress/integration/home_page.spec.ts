/// <reference types="Cypress" />
chai.should();

describe('Home page', () => {
    const mockMessage: {path: string, version: string} = {
        path: 'home',
        version: '1.0.0'
    };

    beforeEach(() => {
        cy.visit('build/index.html').then((window: Window) => {
            window.postMessage(mockMessage, '*');
        });
    });

    it('should open the home page and show the correct version', () => {
        cy.get('.extension-version').contains(mockMessage.version);
    });
});
