// tslint:disable no-unused-expression
import React from 'react';
import renderer from 'react-test-renderer';
import { mount } from 'enzyme';
import TransactionHome from '../../src/components/TransactionHome/TransactionHome';
import ITransaction from '../../src/interfaces/ITransaction';
import ISmartContract from '../../src/interfaces/ISmartContract';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
chai.should();
chai.use(sinonChai);

describe('TransactionHome component', () => {

    let mySandBox: sinon.SinonSandbox;
    let switchSmartContractStub: sinon.SinonStub;

    const mockTxn: ITransaction = {
        name: 'mockTxn',
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

    const greenContract: ISmartContract = {
        name: 'greenContract',
        version: '0.0.1',
        channel: 'mychannel',
        label: 'greenContract@0.0.1',
        transactions: [mockTxn],
        namespace: 'GreenContract'
    };

    const blueContract: ISmartContract = {
        name: 'blueContract',
        version: '0.0.1',
        channel: 'mychannel',
        label: 'blueContract@0.0.1',
        transactions: [mockTxn],
        namespace: 'BlueContract'
    };

    const mockState: {smartContracts: Array<ISmartContract>, activeSmartContract: ISmartContract} = {
        smartContracts: [greenContract, blueContract],
        activeSmartContract: greenContract
    };

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
        switchSmartContractStub = mySandBox.stub().resolves();
    });

    afterEach(async () => {
        mySandBox.restore();
    });

    it('should render the expected snapshot', async () => {
        const component: any = renderer
            .create(<TransactionHome messageData={mockState} switchSmartContract={switchSmartContractStub}/>)
            .toJSON();
        expect(component).toMatchSnapshot();
    });

    it('should change the active smart contract if another contract is selected', async () => {
        const component: any = mount(<TransactionHome messageData={mockState} switchSmartContract={switchSmartContractStub}/>);
        component.find('li').at(1).simulate('click');
        switchSmartContractStub.should.have.been.calledOnce;
    });

    it('should do nothing if the current smart contract is selected', async () => {
        const component: any = mount(<TransactionHome messageData={mockState} switchSmartContract={switchSmartContractStub}/>);
        component.find('li').at(0).simulate('click');
        switchSmartContractStub.should.not.have.been.called;
    });

});
