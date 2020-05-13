/// <reference types="Cypress" />
import IPackageRegistryEntry from '../../src/interfaces/IPackageRegistryEntry';

chai.should();

describe('Deploy page', () => {
    const packageOne: IPackageRegistryEntry = {name: 'mycontract', version: '0.0.1', path: '/package/one', sizeKB: 9000};
    const packageTwo: IPackageRegistryEntry = {name: 'othercontract', version: '0.0.2', path: '/package/two', sizeKB: 12000};
    const deployData: {channelName: string, environmentName: string, packageEntries: IPackageRegistryEntry[]} = {channelName: 'mychannel', environmentName: 'myEnvironment', packageEntries: [packageOne, packageTwo]};

    const mockMessage: {path: string, deployData: any} = {
        path: 'deploy',
        deployData
    };

    beforeEach(() => {
        cy.visit('build/index.html').then((window: Window) => {
            window.postMessage(mockMessage, '*');
        });

        cy.get('.vscode-dark').invoke('attr', 'class', 'vscode-light'); // Use the light theme as components render properly.
    });

    it('should open the deploy page and show the correct channel name and environment name', () => {
        const subheadingContainer: Cypress.Chainable<JQuery<HTMLElement>> = cy.get('.heading-combo-container');
        subheadingContainer.contains(deployData.channelName);
        subheadingContainer.contains(deployData.environmentName);
    });

    it(`shouldn't be able to click Next`, () => {
        const nextButton: Cypress.Chainable<JQuery<HTMLButtonElement>> = cy.get('button').contains('Next');
        nextButton.should('be.disabled');
    });

    it(`should be able to select a package and click Next to step two`, () => {
        const _package: string = `${packageOne.name}@${packageOne.version} (packaged)`;

        cy.get('#package-select').click(); // Expand dropdown
        cy.get('#package-select').contains(_package).click(); // Click on option

        const nextButton: Cypress.Chainable<JQuery<HTMLButtonElement>> = cy.get('button').contains('Next');
        nextButton.should('not.be.disabled');
        nextButton.click();
    });

    it(`should be able to go back from step two`, () => {
        const _package: string = `${packageOne.name}@${packageOne.version} (packaged)`;

        cy.get('#package-select').click(); // Expand dropdown
        cy.get('#package-select').contains(_package).click(); // Click on option

        const nextButton: Cypress.Chainable<JQuery<HTMLButtonElement>> = cy.get('button').contains('Next');
        nextButton.should('not.be.disabled');
        nextButton.click();

        const backButton: Cypress.Chainable<JQuery<HTMLButtonElement>> = cy.get('button').contains('Back');
        backButton.should('not.be.disabled');
        backButton.click();
    });

    it(`should be able to go from step two to step three`, () => {
        const _package: string = `${packageOne.name}@${packageOne.version} (packaged)`;

        cy.get('#package-select').click(); // Expand dropdown
        cy.get('#package-select').contains(_package).click(); // Click on option

        let nextButton: Cypress.Chainable<JQuery<HTMLButtonElement>> = cy.get('button').contains('Next');
        nextButton.should('not.be.disabled');
        nextButton.click();

        nextButton = cy.get('button').contains('Next');
        nextButton.should('not.be.disabled');
        nextButton.click();
    });

    it(`should be able to go back from step three to step two`, () => {
        const _package: string = `${packageOne.name}@${packageOne.version} (packaged)`;

        cy.get('#package-select').click(); // Expand dropdown
        cy.get('#package-select').contains(_package).click(); // Click on option

        let nextButton: Cypress.Chainable<JQuery<HTMLButtonElement>> = cy.get('button').contains('Next');
        nextButton.should('not.be.disabled');
        nextButton.click();

        nextButton = cy.get('button').contains('Next');
        nextButton.should('not.be.disabled');
        nextButton.click();

        const backButton: Cypress.Chainable<JQuery<HTMLButtonElement>> = cy.get('button').contains('Back');
        backButton.should('not.be.disabled');
        backButton.click();
    });

    it(`should keep the changed definition name and version in step two when going back`, () => {
        const _package: string = `${packageOne.name}@${packageOne.version} (packaged)`;

        cy.get('#package-select').click(); // Expand dropdown
        cy.get('#package-select').contains(_package).click(); // Click on option

        let nextButton: Cypress.Chainable<JQuery<HTMLButtonElement>> = cy.get('button').contains('Next');
        nextButton.should('not.be.disabled');
        nextButton.click();

        let nameInput: Cypress.Chainable<JQuery<HTMLInputElement>> = cy.get('#nameInput');

        nameInput.click();
        nameInput.clear(); // Delete all

        nextButton = cy.get('button').contains('Next');
        nextButton.should('be.disabled');

        nameInput = cy.get('#nameInput');
        nameInput.type('newDefinition');

        let versionInput: Cypress.Chainable<JQuery<HTMLInputElement>> = cy.get('#versionInput');

        versionInput.click();
        versionInput.clear(); // Delete all

        nextButton = cy.get('button').contains('Next');
        nextButton.should('be.disabled');

        versionInput = cy.get('#versionInput');
        versionInput.type('0.0.2');

        const backButton: Cypress.Chainable<JQuery<HTMLButtonElement>> = cy.get('button').contains('Back');
        backButton.should('not.be.disabled');
        backButton.click();

        nextButton = cy.get('button').contains('Next');
        nextButton.should('not.be.disabled');
        nextButton.click();

        nameInput = cy.get('#nameInput');
        nameInput.should('contain.value', 'newDefinition');

        versionInput = cy.get('#versionInput');
        versionInput.should('contain.value', '0.0.2');
    });

    it('should use default definition name and version if package is changed', () => {
        const _packageOne: string = `${packageOne.name}@${packageOne.version} (packaged)`;
        const _packageTwo: string = `${packageTwo.name}@${packageTwo.version} (packaged)`;

        cy.get('#package-select').click(); // Expand dropdown
        cy.get('#package-select').contains(_packageOne).click(); // Click on option

        let nextButton: Cypress.Chainable<JQuery<HTMLButtonElement>> = cy.get('button').contains('Next');
        nextButton.should('not.be.disabled');
        nextButton.click();

        let nameInput: Cypress.Chainable<JQuery<HTMLInputElement>> = cy.get('#nameInput');

        nameInput.click();
        nameInput.clear(); // Delete all

        nextButton = cy.get('button').contains('Next');
        nextButton.should('be.disabled');

        nameInput = cy.get('#nameInput');
        nameInput.type('newDefinition');

        let versionInput: Cypress.Chainable<JQuery<HTMLInputElement>> = cy.get('#versionInput');

        versionInput.click();
        nameInput.clear(); // Delete all

        nextButton = cy.get('button').contains('Next');
        nextButton.should('be.disabled');

        nameInput = cy.get('#versionInput');
        nameInput.type('0.0.2');

        const backButton: Cypress.Chainable<JQuery<HTMLButtonElement>> = cy.get('button').contains('Back');
        backButton.should('not.be.disabled');
        backButton.click();

        cy.get('#package-select').click(); // Expand dropdown
        cy.get('#package-select').contains(_packageTwo).click(); // Click on option

        nextButton = cy.get('button').contains('Next');
        nextButton.should('not.be.disabled');
        nextButton.click();

        nameInput = cy.get('#nameInput');
        nameInput.should('contain.value', packageTwo.name);

        versionInput = cy.get('#versionInput');
        versionInput.should('contain.value', packageTwo.version);
    });
});
