// tslint:disable no-unused-expression
import React from 'react';
import renderer from 'react-test-renderer';
import { mount } from 'enzyme';
import TransactionForm from '../../src/components/TransactionForm/TransactionForm';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import ITransaction from '../../src/interfaces/ITransaction';
import ISmartContract from '../../src/interfaces/ISmartContract';
chai.should();
chai.use(sinonChai);

describe('TransactionForm component', () => {
    let mySandbox: sinon.SinonSandbox;
    let postMessageHandlerStub: sinon.SinonStub;

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
        parameters: [],
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

    beforeEach(async () => {
        mySandbox = sinon.createSandbox();
        postMessageHandlerStub = mySandbox.stub();
    });

    afterEach(async () => {
        mySandbox.restore();
    });

    it('should render the expected snapshot', async () => {
        const component: any = renderer
            .create(<TransactionForm smartContract={greenContract} postMessageHandler={postMessageHandlerStub}/>)
            .toJSON();
        expect(component).toMatchSnapshot();
    });

    it('updates the currently selected transaction through the transaction select', async () => {
        const component: any = mount(<TransactionForm smartContract={greenContract} postMessageHandler={postMessageHandlerStub}/>);
        const oldTxnValue: ITransaction | undefined = component.state().activeTransaction; // value will be undefined until a transaction is selected
        component.find('select').at(0).prop('onChange')( { currentTarget: { value: 'transactionOne' } } );
        component.state().activeTransaction.should.not.deep.equal(oldTxnValue);
        component.state().activeTransaction.should.deep.equal(transactionOne);
    });

    it('updates when the user types in the textarea', async () => {
        const component: any = mount(<TransactionForm smartContract={greenContract} postMessageHandler={postMessageHandlerStub}/>);
        component.state().transactionArguments.should.equal('');
        component.find('textarea').prop('onChange')( { currentTarget: { value: 'some arguments' } } );
        component.state().transactionArguments.should.equal('some arguments');
    });

    it('updates when the user types in the transient data input box', async () => {
        const component: any = mount(<TransactionForm smartContract={greenContract} postMessageHandler={postMessageHandlerStub}/>);
        component.state().transientData.should.equal('');
        component.find('#transient-data-input').at(0).prop('onChange')( { currentTarget: { value: 'some transient data'} } );
        component.state().transientData.should.equal('some transient data');
    });

    it('should attempt to submit a transaction when the submit button is clicked ', async () => {
        const component: any = mount(<TransactionForm smartContract={greenContract} postMessageHandler={postMessageHandlerStub}/>);
        component.setState({
            activeTransaction: transactionOne,
            transactionArguments: '["Green"]'
        });
        component.find('#submit-button').at(1).simulate('click');
        postMessageHandlerStub.should.have.been.calledOnceWithExactly(
            'submit', {
                args: '["Green"]',
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

    it('should attempt to evaluate a transaction when the evaluate button is clicked', async () => {
        const component: any = mount(<TransactionForm smartContract={greenContract} postMessageHandler={postMessageHandlerStub}/>);
        component.setState({
            activeTransaction: transactionOne,
            transactionArguments: '["Green"]'
        });
        component.find('#evaluate-button').at(1).simulate('click');
        postMessageHandlerStub.should.have.been.calledOnceWithExactly(
            'evaluate', {
                args: '["Green"]',
                channelName: 'mychannel',
                evaluate: true,
                namespace: 'GreenContract',
                peerTargetNames: [],
                smartContract: 'greenContract',
                transactionName: 'transactionOne',
                transientData: ''
            }
        );
    });

    it('should attempt to submit a transaction with transient data when the submit button is clicked ', async () => {
        const component: any = mount(<TransactionForm smartContract={greenContract} postMessageHandler={postMessageHandlerStub}/>);
        component.setState({
            activeTransaction: transactionOne,
            transactionArguments: '["Green"]',
            transientData: '{"some": "data"}'
        });
        component.find('#submit-button').at(1).simulate('click');
        postMessageHandlerStub.should.have.been.calledOnceWithExactly(
            'submit', {
                args: '["Green"]',
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

    it('should attempt to evaluate a transaction with transient data when the evaluate button is clicked', async () => {
        const component: any = mount(<TransactionForm smartContract={greenContract} postMessageHandler={postMessageHandlerStub}/>);
        component.setState({
            activeTransaction: transactionOne,
            transactionArguments: '["Green"]',
            transientData: '{"some": "data"}'
        });
        component.find('#evaluate-button').at(1).simulate('click');
        postMessageHandlerStub.should.have.been.calledOnceWithExactly(
            'evaluate', {
                args: '["Green"]',
                channelName: 'mychannel',
                evaluate: true,
                namespace: 'GreenContract',
                peerTargetNames: [],
                smartContract: 'greenContract',
                transactionName: 'transactionOne',
                transientData: '{"some": "data"}'
            }
        );
    });

    it('should do nothing if no transaction has been selected', async () => {
        const component: any = mount(<TransactionForm smartContract={greenContract} postMessageHandler={postMessageHandlerStub}/>);
        component.find('#submit-button').at(1).simulate('click');
        postMessageHandlerStub.should.not.have.been.called;
    });
});
