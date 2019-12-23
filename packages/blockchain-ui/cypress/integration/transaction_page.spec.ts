/// <reference types="Cypress" />
import ITransaction from '../../src/interfaces/ITransaction';
import ISmartContract from '../../src/interfaces/ISmartContract';
import IOutputObject from '../../src/interfaces/IOutputObject';
chai.should();

describe('Transaction page', () => {
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
            name: 'colour',
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

    const mockMessage: {path: string, state: {gatewayName: string, smartContract: ISmartContract}} = {
        path: 'transaction',
        state: {
            gatewayName: 'myGateway',
            smartContract: greenContract
        }
    };

    const mockOutput: IOutputObject = {
        transactionName: 'transactionOne',
        action: 'submitted',
        startTime: '1/7/2020, 9:21:34 AM',
        result: 'SUCCESS',
        endTime: '1/7/2020, 9:21:35 AM',
        args: ['penguin'],
        output: 'No output returned from transactionOne'
    };

    const moreMockOutput: IOutputObject = {
        transactionName: 'transactionTwo',
        action: 'evaluated',
        startTime: '1/7/2020, 9:22:11 AM',
        result: 'SUCCESS',
        endTime: '1/7/2020, 9:22:12 AM',
        args: ['blue'],
        transientData: '{"some": "data"}',
        output: 'No output returned from transactionTwo'
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

    it(`can submit a transaction with the user's input via the submit button`, () => {
        cy.get('#transaction-name-select').select('transactionOne');
        cy.get('#arguments-text-area').type('["penguin"]');

        cy.get('#submit-button').click();

        cy.get('@postMessageStub').should('be.calledWith',
            'submit', {
                args: '["penguin"]',
                channelName: 'mychannel',
                evaluate: false,
                namespace: 'GreenContract',
                peerTargetNames: [],
                smartContract: 'greenContract',
                transactionName: 'transactionOne',
                transientData: ''
            }
        );
    });

    it(`can submit a transaction with transient data via the submit button`, () => {
        cy.get('#transaction-name-select').select('transactionOne');
        cy.get('#arguments-text-area').type('["penguin"]');
        cy.get('#transient-data-input').type('{"some": "data"}', {parseSpecialCharSequences: false});

        cy.get('#submit-button').click();

        cy.get('@postMessageStub').should('be.calledWith',
            'submit', {
                args: '["penguin"]',
                channelName: 'mychannel',
                evaluate: false,
                namespace: 'GreenContract',
                peerTargetNames: [],
                smartContract: 'greenContract',
                transactionName: 'transactionOne',
                transientData: '{"some": "data"}'
            }
        );
    });

    it(`can evaluate a transaction with the user's input via the evaluate button`, () => {
        cy.get('#transaction-name-select').select('transactionTwo');
        cy.get('#arguments-text-area').type('["blue"]');

        cy.get('#evaluate-button').click();

        cy.get('@postMessageStub').should('be.calledWith',
            'evaluate', {
                args: '["blue"]',
                channelName: 'mychannel',
                evaluate: true,
                namespace: 'GreenContract',
                peerTargetNames: [],
                smartContract: 'greenContract',
                transactionName: 'transactionTwo',
                transientData: ''
            }
        );
    });

    it(`can evaluate a transaction with transient data via the evaluate button`, () => {
        cy.get('#transaction-name-select').select('transactionTwo');
        cy.get('#arguments-text-area').type('["blue"]');
        cy.get('#transient-data-input').type('{"some": "data"}', {parseSpecialCharSequences: false});

        cy.get('#evaluate-button').click();

        cy.get('@postMessageStub').should('be.calledWith',
            'evaluate', {
                args: '["blue"]',
                channelName: 'mychannel',
                evaluate: true,
                namespace: 'GreenContract',
                peerTargetNames: [],
                smartContract: 'greenContract',
                transactionName: 'transactionTwo',
                transientData: '{"some": "data"}'
            }
        );
    });

    it('displays received output in the output panel', () => {
        cy.get('.output-body').contains('No transaction output available. Submit/evaluate to produce an output.');

        cy.window().then((window: Window) => {
            window.postMessage({
                output: mockOutput
            }, '*');
        });

        cy.get('.output-body').should('not.contain', 'No transaction output available. Submit/evaluate to produce an output.');
        cy.get('.output-body').contains(`${mockOutput.transactionName} ${mockOutput.action} [${mockOutput.startTime}]`);
        cy.get('.output-body').contains(`Result: ${mockOutput.result} [${mockOutput.endTime}]`);
        cy.get('.output-body').contains(`Args: [${mockOutput.args}]`);
        cy.get('.output-body').contains(`${mockOutput.output}`);
    });

    it('appends new output to the existing information in the output panel', () => {
        cy.get('.output-body').contains('No transaction output available. Submit/evaluate to produce an output.');

        cy.window().then((window: Window) => {
            window.postMessage({
                output: mockOutput
            }, '*');
        });

        cy.get('.output-body').should('not.contain', 'No transaction output available. Submit/evaluate to produce an output.');

        cy.get('.output-body > :nth-child(1)').contains(`${mockOutput.transactionName} ${mockOutput.action} [${mockOutput.startTime}]`);
        cy.get('.output-body > :nth-child(1)').contains(`Result: ${mockOutput.result} [${mockOutput.endTime}]`);
        cy.get('.output-body > :nth-child(1)').contains(`Args: [${mockOutput.args}]`);
        cy.get('.output-body > :nth-child(1)').contains(`${mockOutput.output}`);

        cy.window().then((window: Window) => {
            window.postMessage({
                output: moreMockOutput
            }, '*');
        });

        cy.get('.output-body > :nth-child(2)').contains(`${moreMockOutput.transactionName} ${moreMockOutput.action} [${moreMockOutput.startTime}]`);
        cy.get('.output-body > :nth-child(2)').contains(`Result: ${moreMockOutput.result} [${moreMockOutput.endTime}]`);
        cy.get('.output-body > :nth-child(2)').contains(`Args: [${moreMockOutput.args}]`);
        cy.get('.output-body > :nth-child(2)').contains(`${moreMockOutput.output}`);

    });

});
