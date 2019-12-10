// tslint:disable no-unused-expression
import React from 'react';
import { mount, shallow } from 'enzyme';
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
    let postMessageHandlerStub: sinon.SinonStub;

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

    const mockState: {gatewayName: 'myGateway', smartContracts: Array<ISmartContract>, activeSmartContract: ISmartContract} = {
        gatewayName: 'myGateway',
        smartContracts: [greenContract, blueContract],
        activeSmartContract: greenContract
    };

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
        switchSmartContractStub = mySandBox.stub().resolves();
        postMessageHandlerStub = mySandBox.stub().resolves();
    });

    afterEach(async () => {
        mySandBox.restore();
    });

    it('should render the expected snapshot', async () => {
        const component: any = shallow(<TransactionHome {...mockState} switchSmartContract={switchSmartContractStub} postMessageHandler={postMessageHandlerStub}/>);
        expect(component.getElements()).toMatchSnapshot();
    });

    it('should correctly set the state', async () => {
        const component: any = mount(<TransactionHome {...mockState} switchSmartContract={switchSmartContractStub} postMessageHandler={postMessageHandlerStub}/>);
        component.state().should.deep.equal({
            activeSmartContractLabel: mockState.activeSmartContract.label,
            gatewayName: mockState.gatewayName,
            postMessageHandler: postMessageHandlerStub,
            smartContractLabels: [
                greenContract.label,
                blueContract.label
            ],
            switchSmartContract: switchSmartContractStub
        });
    });

    it('should attempt to switch the active smart contract if another contract is selected', async () => {
        const component: any = mount(<TransactionHome {...mockState} switchSmartContract={switchSmartContractStub} postMessageHandler={postMessageHandlerStub}/>);
        component.find('select').at(0).prop('onChange')( { currentTarget: { value: blueContract.label } } );
        switchSmartContractStub.should.have.been.calledOnceWithExactly(blueContract.label);
    });

    it('should update the active smart contract when a new one is passed down through props', async () => {
        const componentDidUpdateSpy: sinon.SinonSpy = mySandBox.spy(TransactionHome.prototype, 'componentDidUpdate');
        const component: any = mount(<TransactionHome {...mockState} switchSmartContract={switchSmartContractStub} postMessageHandler={postMessageHandlerStub}/>);
        component.state().activeSmartContractLabel.should.equal(greenContract.label);

        component.setProps({
            gatewayName: 'myGateway',
            activeSmartContract: blueContract,
            smartContracts: greenContract, blueContract
        });
        componentDidUpdateSpy.should.have.been.called;
        component.state().activeSmartContractLabel.should.equal(blueContract.label);
    });

    it('called the expected command when the recent transactions table button is clicked', async () => {
        const component: any = mount(<TransactionHome {...mockState} switchSmartContract={switchSmartContractStub} postMessageHandler={postMessageHandlerStub}/>);
        component.find('#recent-txns-table-btn').at(1).simulate('click');
        postMessageHandlerStub.should.have.been.calledWith('create');
    });

    it('called the expected command when the saved transactions table button is clicked', async () => {
        const component: any = mount(<TransactionHome {...mockState} switchSmartContract={switchSmartContractStub} postMessageHandler={postMessageHandlerStub}/>);
        component.find('#saved-txns-table-btn').at(1).simulate('click');
        postMessageHandlerStub.should.have.been.calledWith('import');
    });

});
