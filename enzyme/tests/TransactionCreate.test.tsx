// tslint:disable no-unused-expression
import React from 'react';
import renderer from 'react-test-renderer';
import { mount } from 'enzyme';
import TransactionCreate from '../../src/components/TransactionCreate/TransactionCreate';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import ITransaction from '../../src/interfaces/ITransaction';
import ISmartContract from '../../src/interfaces/ISmartContract';
import Utils from '../../src/Utils';
chai.should();
chai.use(sinonChai);

describe('TransactionCreate component', () => {
    let mySandbox: sinon.SinonSandbox;
    let changeRouteStub: sinon.SinonStub;
    let getTransactionArgumentsSpy: sinon.SinonSpy;

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

    beforeEach(async () => {
        mySandbox = sinon.createSandbox();
        changeRouteStub = mySandbox.stub(Utils, 'changeRoute').resolves();
        getTransactionArgumentsSpy = mySandbox.spy(TransactionCreate.prototype, 'getTransactionArguments');
    });

    afterEach(async () => {
        mySandbox.restore();
    });

    it('should render the expected snapshot', async () => {
        const component: any = renderer
            .create(<TransactionCreate activeSmartContract={greenContract}/>)
            .toJSON();
        expect(component).toMatchSnapshot();
    });

    it('redirects back to the home page when the appropriate link is clicked on', async () => {
        const component: any = mount(<TransactionCreate activeSmartContract={greenContract}/>);
        component.find('.titles-container > span').simulate('click');
        changeRouteStub.should.have.been.called;
    });

    it('generates transaction arguments when an option from the transaction select is chosen', async () => {
        const component: any = mount(<TransactionCreate activeSmartContract={greenContract}/>);
        expect(component.state().transactionArguments).toBe('');
        component.find('select').at(0).prop('onChange')( { currentTarget: { value: 'transactionOne' } });
        getTransactionArgumentsSpy.should.have.been.called;
        expect(component.state().transactionArguments).toBe('name: \n');
    });

    it('does not generate arguments in the event that the chosen transaction doesn\'t exist', async () => {
        const component: any = mount(<TransactionCreate activeSmartContract={greenContract}/>);
        expect(component.state().transactionArguments).toBe('');
        component.find('select').at(0).prop('onChange')( { currentTarget: { value: 'anotherTransaction' } });
        getTransactionArgumentsSpy.should.have.been.called;
        expect(component.state().transactionArguments).toBe('');
    });

    it('updates when the user types in the textarea', async () => {
        const component: any = mount(<TransactionCreate activeSmartContract={greenContract}/>);
        expect(component.state().transactionArguments).toBe('');
        component.find('textarea').prop('onChange')( { currentTarget: { value: 'hello' } } );
        expect(component.state().transactionArguments).toBe('hello');
    });

});
