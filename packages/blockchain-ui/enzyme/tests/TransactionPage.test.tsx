// tslint:disable no-unused-expression
import React from 'react';
import renderer from 'react-test-renderer';
import { mount } from 'enzyme';
import TransactionPage from '../../src/components/TransactionPage/TransactionPage';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import ITransaction from '../../src/interfaces/ITransaction';
import ISmartContract from '../../src/interfaces/ISmartContract';
import IOutputObject from '../../src/interfaces/IOutputObject';
chai.should();
chai.use(sinonChai);

describe('TransactionPage component', () => {
    let mySandBox: sinon.SinonSandbox;
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

    const mockOutput: IOutputObject = {
        transactionName: 'myTransaction',
        action: 'submitted',
        startTime: '1/7/2020, 9:21:34 AM',
        result: 'SUCCESS',
        endTime: '1/7/2020, 9:21:35 AM',
        args: ['myID'],
        output: 'No output returned from myTransaction'
    };

    const moreMockOutput: IOutputObject = {
        transactionName: 'myOtherTransaction',
        action: 'submitted',
        startTime: '1/7/2020, 9:22:11 AM',
        result: 'SUCCESS',
        endTime: '1/7/2020, 9:22:12 AM',
        args: ['myID'],
        output: 'No output returned from myOtherTransaction'
    };

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
        postMessageHandlerStub = mySandBox.stub();
    });

    afterEach(async () => {
        mySandBox.restore();
    });

    it('should render the expected snapshot', async () => {
        const component: any = renderer
            .create(<TransactionPage gatewayName={'my gateway'} smartContract={greenContract} transactionOutput={mockOutput} postMessageHandler={postMessageHandlerStub}/>)
            .toJSON();
        expect(component).toMatchSnapshot();
    });

    it('should update the transaction output when something new is passed down through props', async () => {
        const componentDidUpdateSpy: sinon.SinonSpy = mySandBox.spy(TransactionPage.prototype, 'componentDidUpdate');
        const component: any = mount(<TransactionPage gatewayName={'my gateway'} smartContract={greenContract} transactionOutput={mockOutput} postMessageHandler={postMessageHandlerStub}/>);
        component.state().transactionOutput.should.equal(mockOutput);

        component.setProps({
            transactionOutput: moreMockOutput
        });
        componentDidUpdateSpy.should.have.been.called;
        component.state().transactionOutput.should.equal(moreMockOutput);
    });
});
