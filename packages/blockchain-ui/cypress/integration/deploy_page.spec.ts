/// <reference types="Cypress" />
import IPackageRegistryEntry from '../../src/interfaces/IPackageRegistryEntry';
import Utils from '../../src/Utils';
chai.should();

describe('V2 Deploy Page', () => {
    const packageOne: IPackageRegistryEntry = { name: 'mycontract', version: '0.0.1', path: '/package/one', sizeKB: 9000 };
    const packageTwo: IPackageRegistryEntry = { name: 'othercontract', version: '0.0.2', path: '/package/two', sizeKB: 12000 };
    const deployData: { channelName: string, hasV1Capabilities: boolean, environmentName: string, packageEntries: IPackageRegistryEntry[], workspaceNames: string[], selectedPackage: IPackageRegistryEntry | undefined, committedDefinitions: string[], environmentPeers: string[], discoveredPeers: string[], orgMap: any, orgApprovals: any } = { channelName: 'mychannel', hasV1Capabilities: false, environmentName: 'myEnvironment', packageEntries: [packageOne, packageTwo], workspaceNames: ['workspaceOne'], selectedPackage: undefined, committedDefinitions: [], environmentPeers: ['Org1Peer1'], discoveredPeers: ['Org2Peer1'], orgMap: { Org1MSP: ['Org1Peer1'], Org2MSP: ['Org2Peer1'] }, orgApprovals: { Org1MSP: false, Org2MSP: false } };

    const mockMessage: { path: string, deployData: any } = {
        path: 'deploy',
        deployData
    };

    beforeEach(() => {
        Utils.postToVSCode = () => { return; };

        cy.visit('build/index.html').then((window: Window) => {
            window.postMessage(mockMessage, '*');

            cy.get('.vscode-dark').invoke('attr', 'class', 'vscode-light'); // Use the light theme as components render properly.
        });

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

    it(`should be able to toggle 'Perform Commit'`, () => {
        const _package: string = `${packageOne.name}@${packageOne.version} (packaged)`;

        cy.get('#package-select').click(); // Expand dropdown
        cy.get('#package-select').contains(_package).click(); // Click on option

        let nextButton: Cypress.Chainable<JQuery<HTMLButtonElement>> = cy.get('button').contains('Next');
        nextButton.should('not.be.disabled');
        nextButton.click();

        nextButton = cy.get('button').contains('Next');
        nextButton.should('not.be.disabled');
        nextButton.click();

        const advancedSection: Cypress.Chainable<JQuery<HTMLElement>> = cy.get('#advancedAccordion');
        advancedSection.click();

        const commitToggle: Cypress.Chainable<JQuery<HTMLButtonElement>> = cy.get('#commitToggle');
        commitToggle.should('be.checked');

        commitToggle.uncheck({ force: true });
        commitToggle.should('not.be.checked');

        commitToggle.check({ force: true });
        commitToggle.should('be.checked');
    });

    it('should be able to select a workspace', () => {
        const _package: string = `workspaceOne (open project)`;

        cy.get('#package-select').click(); // Expand dropdown
        cy.get('#package-select').contains(_package).click(); // Click on option

        let nextButton: Cypress.Chainable<JQuery<HTMLButtonElement>> = cy.get('button').contains('Next');
        nextButton.should('be.disabled');

        const packageButton: Cypress.Chainable<JQuery<HTMLButtonElement>> = cy.get('button').contains('Package');
        packageButton.should('not.be.disabled');

        cy.stub(packageButton, 'click');
        packageButton.click();

        const packageThree: IPackageRegistryEntry = {
            name: 'newPackage',
            version: '0.0.1',
            sizeKB: 40000,
            path: '/some/path'
        };

        const newData: { channelName: string, environmentName: string, packageEntries: IPackageRegistryEntry[], workspaceNames: string[], selectedPackage: IPackageRegistryEntry | undefined } = { channelName: 'mychannel', environmentName: 'myEnvironment', packageEntries: [packageOne, packageTwo, packageThree], workspaceNames: ['workspaceOne'], selectedPackage: packageThree };
        const newMessage: { path: string, deployData: any } = {
            path: 'deploy',
            deployData: newData
        };

        cy.visit('build/index.html').then((window: Window) => {

            window.postMessage(newMessage, '*');
            cy.get('.vscode-dark').invoke('attr', 'class', 'vscode-light'); // Use the light theme as components render properly.

            // Simulate componentWillReceiveProps selected new package
            cy.get('#package-select').click();
            cy.get('#package-select').contains(_package).click(); // Click on option
            cy.get('#package-select').click();
            cy.get('#package-select').contains('newPackage@0.0.1 (packaged)').click(); // Click on option
        });

        nextButton = cy.get('button').contains('Next');
        nextButton.should('not.be.disabled');

    });

    it(`should keep the changed endorsement policy in step two when going back`, () => {
        const _package: string = `${packageOne.name}@${packageOne.version} (packaged)`;

        cy.get('#package-select').click(); // Expand dropdown
        cy.get('#package-select').contains(_package).click(); // Click on option

        let nextButton: Cypress.Chainable<JQuery<HTMLButtonElement>> = cy.get('button').contains('Next');
        nextButton.should('not.be.disabled');
        nextButton.click();

        let endorsementInput: Cypress.Chainable<JQuery<HTMLInputElement>> = cy.get('#endorsementInput');
        endorsementInput.should('contain.value', '');

        endorsementInput.click();
        endorsementInput.type('OR("Org1MSP.member","Org2MSP.member")');

        const backButton: Cypress.Chainable<JQuery<HTMLButtonElement>> = cy.get('button').contains('Back');
        backButton.should('not.be.disabled');
        backButton.click();

        nextButton = cy.get('button').contains('Next');
        nextButton.should('not.be.disabled');
        nextButton.click();

        endorsementInput = cy.get('#endorsementInput');
        endorsementInput.should('contain.value', 'OR("Org1MSP.member","Org2MSP.member")');
    });

    it('should be able to select peers', () => {
        const _package: string = `${packageOne.name}@${packageOne.version} (packaged)`;

        cy.get('#package-select').click(); // Expand dropdown
        cy.get('#package-select').contains(_package).click(); // Click on option

        let nextButton: Cypress.Chainable<JQuery<HTMLButtonElement>> = cy.get('button').contains('Next');
        nextButton.should('not.be.disabled');
        nextButton.click();
        nextButton.click();

        let customizeCommitSection: Cypress.Chainable<JQuery<HTMLElement>> = cy.get('#advancedAccordion');
        customizeCommitSection.click();

        let selectPeersButton: Cypress.Chainable<JQuery<HTMLElement>> = cy.get('#peer-select');
        selectPeersButton.click();
        let peerTwo: Cypress.Chainable<JQuery<HTMLElement>> = cy.get('span').contains('Org2Peer1');
        peerTwo.click();

        const backButton: Cypress.Chainable<JQuery<HTMLButtonElement>> = cy.get('button').contains('Back');
        backButton.should('not.be.disabled');
        backButton.click();

        nextButton = cy.get('button').contains('Next');
        nextButton.click();

        customizeCommitSection = cy.get('#advancedAccordion');
        customizeCommitSection.click();

        selectPeersButton = cy.get('#peer-select');
        selectPeersButton.click();

        peerTwo = cy.get('span').contains('Org2Peer1');
        peerTwo.should('have.attr', 'data-contained-checkbox-state', 'false');

        cy.get('tr[id="Org1MSP-row"]').should((row: JQuery<HTMLElement>) => {
            const cells: JQuery<HTMLElement> = row.find('td');
            expect(cells.eq(0)).to.contain('Org1MSP');
            expect(cells.eq(1)).to.contain('Pending (part of this deploy)');
        });

        cy.get('tr[id="Org2MSP-row"]').should((row: JQuery<HTMLElement>) => {
            const cells: JQuery<HTMLElement> = row.find('td');
            expect(cells.eq(0)).to.contain('Org2MSP');
            expect(cells.eq(1)).to.contain('Not approved');
        });
    });
});

describe('V1 Deploy Page', () => {
    const packageOne: IPackageRegistryEntry = { name: 'mycontract', version: '0.0.1', path: '/package/one', sizeKB: 9000 };
    const packageTwo: IPackageRegistryEntry = { name: 'othercontract', version: '0.0.2', path: '/package/two', sizeKB: 12000 };
    const deployData: { channelName: string, hasV1Capabilities: boolean, environmentName: string, packageEntries: IPackageRegistryEntry[], workspaceNames: string[], selectedPackage: IPackageRegistryEntry | undefined, committedDefinitions: string[], environmentPeers: string[], discoveredPeers: string[], orgMap: any, orgApprovals: any } = { channelName: 'mychannel', hasV1Capabilities: true, environmentName: 'myEnvironment', packageEntries: [packageOne, packageTwo], workspaceNames: ['workspaceOne'], selectedPackage: undefined, committedDefinitions: [], environmentPeers: ['Org1Peer1'], discoveredPeers: ['Org2Peer1'], orgMap: { Org1MSP: ['Org1Peer1'], Org2MSP: ['Org2Peer1'] }, orgApprovals: { Org1MSP: false, Org2MSP: false } };

    const v1Message: { path: string, deployData: any } = {
        path: 'deploy',
        deployData
    };

    beforeEach(() => {
        Utils.postToVSCode = () => { return; };

        cy.visit('build/index.html').then((window: Window) => {
            window.postMessage(v1Message, '*');

            cy.get('.vscode-dark').invoke('attr', 'class', 'vscode-light'); // Use the light theme as components render properly.
        });

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

    it('should be able to select a workspace', () => {
        const _package: string = `workspaceOne (open project)`;

        cy.get('#package-select').click(); // Expand dropdown
        cy.get('#package-select').contains(_package).click(); // Click on option

        let nextButton: Cypress.Chainable<JQuery<HTMLButtonElement>> = cy.get('button').contains('Next');
        nextButton.should('be.disabled');

        const packageButton: Cypress.Chainable<JQuery<HTMLButtonElement>> = cy.get('button').contains('Package');
        packageButton.should('not.be.disabled');

        cy.stub(packageButton, 'click');
        packageButton.click();

        const packageThree: IPackageRegistryEntry = {
            name: 'newPackage',
            version: '0.0.1',
            sizeKB: 40000,
            path: '/some/path'
        };

        const newData: { channelName: string, environmentName: string, packageEntries: IPackageRegistryEntry[], workspaceNames: string[], selectedPackage: IPackageRegistryEntry | undefined } = { channelName: 'mychannel', environmentName: 'myEnvironment', packageEntries: [packageOne, packageTwo, packageThree], workspaceNames: ['workspaceOne'], selectedPackage: packageThree };
        const newMessage: { path: string, deployData: any } = {
            path: 'deploy',
            deployData: newData
        };

        cy.visit('build/index.html').then((window: Window) => {

            window.postMessage(newMessage, '*');
            cy.get('.vscode-dark').invoke('attr', 'class', 'vscode-light'); // Use the light theme as components render properly.

            // Simulate componentWillReceiveProps selected new package
            cy.get('#package-select').click();
            cy.get('#package-select').contains(_package).click(); // Click on option
            cy.get('#package-select').click();
            cy.get('#package-select').contains('newPackage@0.0.1 (packaged)').click(); // Click on option
        });

        nextButton = cy.get('button').contains('Next');
        nextButton.should('not.be.disabled');

    });

    it(`should keep the changed endorsement policy in step two when going back`, () => {
        const _package: string = `${packageOne.name}@${packageOne.version} (packaged)`;

        cy.get('#package-select').click(); // Expand dropdown
        cy.get('#package-select').contains(_package).click(); // Click on option

        let nextButton: Cypress.Chainable<JQuery<HTMLButtonElement>> = cy.get('button').contains('Next');
        nextButton.should('not.be.disabled');
        nextButton.click();

        let endorsementInput: Cypress.Chainable<JQuery<HTMLInputElement>> = cy.get('#endorsementInput');
        endorsementInput.should('contain.value', '');

        endorsementInput.click();
        endorsementInput.type('OR("Org1MSP.member","Org2MSP.member")');

        const backButton: Cypress.Chainable<JQuery<HTMLButtonElement>> = cy.get('button').contains('Back');
        backButton.should('not.be.disabled');
        backButton.click();

        nextButton = cy.get('button').contains('Next');
        nextButton.should('not.be.disabled');
        nextButton.click();

        endorsementInput = cy.get('#endorsementInput');
        endorsementInput.should('contain.value', 'OR("Org1MSP.member","Org2MSP.member")');
    });

});
