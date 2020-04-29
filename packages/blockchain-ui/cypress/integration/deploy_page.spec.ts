/// <reference types="Cypress" />
chai.should();

describe('Deploy page', () => {
    const deployData: {channelName: string, environmentName: string} = {channelName: 'mychannel', environmentName: 'myEnvironment'};

    const mockMessage: {path: string, deployData: any} = {
        path: 'deploy',
        deployData
    };

    beforeEach(() => {
        cy.visit('build/index.html').then((window: Window) => {
            window.postMessage(mockMessage, '*');
        });
    });

    it('should open the deploy page and show the correct channel name and environment name', () => {
        const subheadingContainer: any = cy.get('.heading-combo-container');
        subheadingContainer.contains(deployData.channelName);
        subheadingContainer.contains(deployData.environmentName);
    });
});
