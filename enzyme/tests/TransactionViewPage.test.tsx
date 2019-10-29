// tslint:disable no-unused-expression
import React from 'react';
import renderer from 'react-test-renderer';
import { mount } from 'enzyme';
import TransactionViewPage from '../../src/components/TransactionViewPage/TransactionViewPage';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
chai.should();
chai.use(sinonChai);

describe('TransactionViewPage component', () => {

    let mySandBox: sinon.SinonSandbox;
    let switchSmartContractSpy: sinon.SinonSpy;

    const mockState: {smartContracts: Array<string>, activeSmartContract: string} = {
        smartContracts: ['greenContract@0.0.1', 'blueContract@0.0.1'],
        activeSmartContract: 'greenContract@0.0.1'
    };

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
        switchSmartContractSpy = mySandBox.spy(TransactionViewPage.prototype, 'switchSmartContract');
    });

    afterEach(async () => {
        mySandBox.restore();
    });

    it('should render the expected snapshot', async () => {
        const component: any = renderer
            .create(<TransactionViewPage messageData={mockState}/>)
            .toJSON();
        expect(component).toMatchSnapshot();
    });

    it('should change the active smart contract if another contract is selected', async () => {
        const component: any = mount(<TransactionViewPage messageData={mockState}/>);
        component.find('li').at(1).simulate('click');
        switchSmartContractSpy.should.have.been.calledOnce;
        expect(component.state().activeSmartContract).toBe('blueContract@0.0.1');
    });

    it('should do nothing if the current smart contract is selected', async () => {
        const component: any = mount(<TransactionViewPage messageData={mockState}/>);
        component.find('li').at(0).simulate('click');
        switchSmartContractSpy.should.not.have.been.called;
        expect(component.state().activeSmartContract).toBe('greenContract@0.0.1');
    });

});
