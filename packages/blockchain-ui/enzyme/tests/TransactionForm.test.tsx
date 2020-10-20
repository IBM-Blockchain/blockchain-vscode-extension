// tslint:disable no-unused-expression
import React from 'react';
import renderer from 'react-test-renderer';
import { mount } from 'enzyme';
import TransactionForm from '../../src/components/elements/TransactionForm/TransactionForm';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import ITransaction from '../../src/interfaces/ITransaction';
import ISmartContract from '../../src/interfaces/ISmartContract';
import Utils from '../../src/Utils';
import { ExtensionCommands } from '../../src/ExtensionCommands';
chai.should();
chai.use(sinonChai);

describe('TransactionForm component', () => {
    let mySandbox: sinon.SinonSandbox;
    let getTransactionArgumentsSpy: sinon.SinonSpy;
    let postToVSCodeStub: sinon.SinonStub;

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
        namespace: 'GreenContract',
        peerNames: ['peer1', 'peer2']
    };

    beforeEach(async () => {
        mySandbox = sinon.createSandbox();
        getTransactionArgumentsSpy = mySandbox.spy(TransactionForm.prototype, 'generateTransactionArguments');
        postToVSCodeStub = mySandbox.stub(Utils, 'postToVSCode');
    });

    afterEach(async () => {
        mySandbox.restore();
    });

    it('should render the expected snapshot', async () => {
        const component: any = renderer
            .create(<TransactionForm smartContract={greenContract}/>)
            .toJSON();
        expect(component).toMatchSnapshot();
    });

    it('generates transaction arguments when an option from the transaction select is chosen', async () => {
        const component: any = mount(<TransactionForm smartContract={greenContract}/>);
        component.state().transactionArguments.should.equal('');
        component.find('Dropdown').at(0).prop('onChange')( { selectedItem: 'transactionOne' } );
        getTransactionArgumentsSpy.should.have.been.called;
        component.state().activeTransaction.should.deep.equal(transactionOne);
        component.state().transactionArguments.should.equal('[\n  name: ""\n]');
    });

    it('does not generate arguments in the event that the chosen transaction doesn\'t have any parameters', async () => {
        const component: any = mount(<TransactionForm smartContract={greenContract}/>);
        component.state().transactionArguments.should.equal('');
        component.find('Dropdown').at(0).prop('onChange')( { selectedItem: 'transactionTwo' } );
        getTransactionArgumentsSpy.should.have.been.called;
        component.state().activeTransaction.should.deep.equal(transactionTwo);
        component.state().transactionArguments.should.equal('');
    });

    it('does not generate arguments in the event that the chosen transaction doesn\'t exist', async () => {
        const component: any = mount(<TransactionForm smartContract={greenContract}/>);
        component.state().transactionArguments.should.equal('');
        component.find('Dropdown').at(0).prop('onChange')( { selectedItem: 'anotherTransaction' } );
        getTransactionArgumentsSpy.should.have.been.called;
        component.state().transactionArguments.should.equal('');
    });

    it('updates when the user types in the textarea', async () => {
        const component: any = mount(<TransactionForm smartContract={greenContract}/>);
        component.state().transactionArguments.should.equal('');
        component.find('textarea').prop('onChange')( { currentTarget: { value: 'some arguments' } } );
        component.state().transactionArguments.should.equal('some arguments');
    });

    it('updates when the user types in the transient data input box', async () => {
        const component: any = mount(<TransactionForm smartContract={greenContract}/>);
        component.state().transientData.should.equal('');
        component.find('#transient-data-input').at(0).prop('onChange')( { currentTarget: { value: 'some transient data'} } );
        component.state().transientData.should.equal('some transient data');
    });

    it('should update state when a peer is selected', async () => {
        const onChangeEvent: { selectedItems: { id: string; label: string}[] } = {
            selectedItems: [{
                id: 'peer1',
                label: 'peer1'
            }]
        };
        const component: any = mount(<TransactionForm smartContract={greenContract}/>);
        component.state().selectedPeerNames.should.deep.equal(greenContract.peerNames);
        component.find('MultiSelect').at(0).prop('onChange')(onChangeEvent);
        component.state().selectedPeerNames.should.deep.equal(['peer1']);
    });

    it('should attempt to submit a transaction when the submit button is clicked ', async () => {
        const component: any = mount(<TransactionForm smartContract={greenContract}/>);
        component.setState({
            activeTransaction: transactionOne,
            transactionArguments: '[\nname: "Green"\n]'
        });
        component.find('#submit-button').at(1).simulate('click');
        postToVSCodeStub.should.have.been.calledOnceWithExactly({
            command: ExtensionCommands.SUBMIT_TRANSACTION,
            data: {
                args: '["Green"]',
                channelName: 'mychannel',
                evaluate: false,
                namespace: 'GreenContract',
                peerTargetNames: greenContract.peerNames,
                smartContract: 'greenContract',
                transactionName: 'transactionOne',
                transientData: ''
            }
        });
    });

    it('should attempt to evaluate a transaction when the evaluate button is clicked', async () => {
        const component: any = mount(<TransactionForm smartContract={greenContract}/>);
        component.setState({
            activeTransaction: transactionOne,
            transactionArguments: '[\nname: "Green"\n]'
        });
        component.find('#evaluate-button').at(1).simulate('click');
        postToVSCodeStub.should.have.been.calledOnceWithExactly({
            command: ExtensionCommands.EVALUATE_TRANSACTION,
            data: {
                args: '["Green"]',
                channelName: 'mychannel',
                evaluate: true,
                namespace: 'GreenContract',
                peerTargetNames: greenContract.peerNames,
                smartContract: 'greenContract',
                transactionName: 'transactionOne',
                transientData: ''
            }
        });
    });

    it('should attempt to submit a transaction with transient data when the submit button is clicked ', async () => {
        const component: any = mount(<TransactionForm smartContract={greenContract}/>);
        component.setState({
            activeTransaction: transactionOne,
            transactionArguments: '[\nname: "Green"\n]',
            transientData: '{"some": "data"}'
        });
        component.find('#submit-button').at(1).simulate('click');
        postToVSCodeStub.should.have.been.calledOnceWithExactly({
            command: ExtensionCommands.SUBMIT_TRANSACTION,
            data: {
                args: '["Green"]',
                channelName: 'mychannel',
                evaluate: false,
                namespace: 'GreenContract',
                peerTargetNames: greenContract.peerNames,
                smartContract: 'greenContract',
                transactionName: 'transactionOne',
                transientData: '{"some": "data"}'
            }
        });
    });

    it('should attempt to evaluate a transaction with transient data when the evaluate button is clicked', async () => {
        const component: any = mount(<TransactionForm smartContract={greenContract}/>);
        component.setState({
            activeTransaction: transactionOne,
            transactionArguments: '[\nname: "Green"\n]',
            transientData: '{"some": "data"}'
        });
        component.find('#evaluate-button').at(1).simulate('click');
        postToVSCodeStub.should.have.been.calledOnceWithExactly({
            command: ExtensionCommands.EVALUATE_TRANSACTION,
            data: {
                args: '["Green"]',
                channelName: 'mychannel',
                evaluate: true,
                namespace: 'GreenContract',
                peerTargetNames: greenContract.peerNames,
                smartContract: 'greenContract',
                transactionName: 'transactionOne',
                transientData: '{"some": "data"}'
            }
        });
    });

    it('should attempt to submit a transaction with custom peers when the submit button is clicked ', async () => {
        const component: any = mount(<TransactionForm smartContract={greenContract}/>);
        component.setState({
            activeTransaction: transactionOne,
            transactionArguments: '[\nname: "Green"\n]',
            transientData: '{"some": "data"}',
            selectedPeerNames: ['peer1']
        });
        component.find('#submit-button').at(1).simulate('click');
        postToVSCodeStub.should.have.been.calledOnceWithExactly({
            command: ExtensionCommands.SUBMIT_TRANSACTION,
            data: {
                args: '["Green"]',
                channelName: 'mychannel',
                evaluate: false,
                namespace: 'GreenContract',
                peerTargetNames: ['peer1'],
                smartContract: 'greenContract',
                transactionName: 'transactionOne',
                transientData: '{"some": "data"}'
            }
        });
    });

    it('should attempt to evaluate a transaction with transient data when the evaluate button is clicked', async () => {
        const component: any = mount(<TransactionForm smartContract={greenContract}/>);
        component.setState({
            activeTransaction: transactionOne,
            transactionArguments: '[\nname: "Green"\n]',
            transientData: '{"some": "data"}',
            selectedPeerNames: ['peer1']
        });
        component.find('#evaluate-button').at(1).simulate('click');
        postToVSCodeStub.should.have.been.calledOnceWithExactly({
            command: ExtensionCommands.EVALUATE_TRANSACTION,
            data: {
                args: '["Green"]',
                channelName: 'mychannel',
                evaluate: true,
                namespace: 'GreenContract',
                peerTargetNames: ['peer1'],
                smartContract: 'greenContract',
                transactionName: 'transactionOne',
                transientData: '{"some": "data"}'
            }
        });
    });

    it('should do nothing if no transaction has been selected', async () => {
        const component: any = mount(<TransactionForm smartContract={greenContract}/>);
        component.find('#submit-button').at(1).simulate('click');
        postToVSCodeStub.should.not.have.been.called;
    });
});
