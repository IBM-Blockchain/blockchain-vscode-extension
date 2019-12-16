/// <reference types="Cypress" />
import ITransaction from '../../src/interfaces/ITransaction';
import ISmartContract from '../../src/interfaces/ISmartContract';
chai.should();

describe('Transaction home screen', () => {

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
