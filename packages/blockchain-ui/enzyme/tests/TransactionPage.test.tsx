// tslint:disable no-unused-expression
import React from 'react';
import renderer from 'react-test-renderer';
import { mount } from 'enzyme';
import {act} from 'react-dom/test-utils';
import TransactionPage from '../../src/components/pages/TransactionPage/TransactionPage';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import ITransaction from '../../src/interfaces/ITransaction';
import ISmartContract from '../../src/interfaces/ISmartContract';
import IDataFileTransaction from '../../src/interfaces/IDataFileTransaction';
import IAssociatedTxData from '../../src/interfaces/IAssociatedTxdata';
import TransactionInputContainer from '../../src/components/elements/TransactionInputContainer/TransactionInputContainer';

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
        namespace: 'GreenContract',
        peerNames: ['peer1', 'peer2'],
        contractName: 'GreenContract',
    };

    const transactionViewData: {gatewayName: string, smartContracts: ISmartContract[], associatedTxdata: IAssociatedTxData, txdataTransactions: IDataFileTransaction[], preselectedSmartContract: ISmartContract | undefined, preselectedTransaction: ITransaction } = {
        gatewayName: 'myGateway',
        smartContracts: [greenContract],
        associatedTxdata: {},
        txdataTransactions: [],
        preselectedSmartContract: greenContract,
        preselectedTransaction: { name: '', parameters: [], returns: { type: '' }, tag: [] },
    };

    const mockTransactionOutput: string = 'here is some transaction output';
    const moreMockTransactionOutput: string = 'here is some more transaction output';

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
        postMessageHandlerStub = mySandBox.stub();
    });

    afterEach(async () => {
        mySandBox.restore();
    });

    it('should render the expected snapshot', async () => {
        const component: any = renderer
            .create(<TransactionPage transactionViewData={transactionViewData} transactionOutput={mockTransactionOutput}/>)
            .toJSON();
        expect(component).toMatchSnapshot();
    });

    it('should not show the contract selection dropdown when a single smartContract is passed, and it should be made active as it is the only one', () => {
        const multipleContractsTransactionData = { ...transactionViewData };
        multipleContractsTransactionData.smartContracts = [
            greenContract,
        ];
        multipleContractsTransactionData.preselectedSmartContract = undefined;
        const component: any = mount(<TransactionPage transactionViewData={multipleContractsTransactionData} transactionOutput={mockTransactionOutput}/>);
        expect(component.state()).toHaveProperty('smartContracts', multipleContractsTransactionData.smartContracts);
        expect(component.state()).toHaveProperty('activeSmartContract', multipleContractsTransactionData.smartContracts[0]);

        const contractDropdown: any = component.find('#contract-select');
        expect(contractDropdown.exists()).toBeFalsy();
    });

    it('should show the contract selection dropdown when multiple smartContracts are passed', () => {
        const multipleContractsTransactionData = { ...transactionViewData };
        multipleContractsTransactionData.smartContracts = [
            greenContract,
            { ...greenContract, contractName: 'other contract' },
        ];
        const component: any = mount(<TransactionPage transactionViewData={multipleContractsTransactionData} transactionOutput={mockTransactionOutput}/>);
        expect(component.state()).toHaveProperty('smartContracts', multipleContractsTransactionData.smartContracts);

        const contractDropdown: any = component.find('#contract-select');
        expect(contractDropdown.exists()).toBeTruthy();
    });

    it('should show the contract selection dropdown and an active contract when multiple smartContracts are passed and one is chosen', () => {
        const multipleContractsTransactionData = { ...transactionViewData };
        multipleContractsTransactionData.smartContracts = [
            greenContract,
            { ...greenContract, contractName: 'other contract' },
        ];
        multipleContractsTransactionData.preselectedSmartContract = undefined;

        let component: any = mount(<TransactionPage transactionViewData={multipleContractsTransactionData} transactionOutput={mockTransactionOutput}/>);
        expect(component.state()).toHaveProperty('smartContracts', multipleContractsTransactionData.smartContracts);
        expect(component.state()).toHaveProperty('activeSmartContract', undefined);

        let contractDropdown: any = component.find('#contract-select').at(0);
        act(() => {
            contractDropdown.prop('onChange')({ selectedItem: 'other contract' });
        });

        component.update();
        expect(component.state()).toHaveProperty('activeSmartContract', multipleContractsTransactionData.smartContracts[1]);
    });

    it('should update the preselectedContract when multiple smartContracts are sent', () => {
        const multipleContractsTransactionData = { ...transactionViewData };
        multipleContractsTransactionData.smartContracts = [
            greenContract,
            { ...greenContract, contractName: 'other contract' },
        ];
        multipleContractsTransactionData.preselectedSmartContract = undefined;

        let component: any = mount(<TransactionPage transactionViewData={multipleContractsTransactionData} transactionOutput={mockTransactionOutput}/>);
        expect(component.state()).toHaveProperty('preselectedSmartContract', undefined);

        component.setProps({ transactionViewData: { ...multipleContractsTransactionData, preselectedSmartContract: multipleContractsTransactionData.smartContracts[1] } });
        expect(component.state()).toHaveProperty('preselectedSmartContract', multipleContractsTransactionData.smartContracts[1]);
    });

    it('should update the smartContract when a new one is passed down through props', async () => {
        const componentDidUpdateSpy: sinon.SinonSpy = mySandBox.spy(TransactionPage.prototype, 'componentDidUpdate');
        const component: any = mount(<TransactionPage transactionViewData={transactionViewData} transactionOutput={mockTransactionOutput}/>);
        expect(component.state()).toHaveProperty('smartContracts', [greenContract]);

        const newContract: ISmartContract =  { ...greenContract, name: 'updatedContract' };
        component.setProps({
            transactionViewData: {
                smartContracts: [newContract],
            }
        });

        componentDidUpdateSpy.should.have.been.called;
        component.state().smartContracts.should.deep.equal([newContract]);
    });

    it('should clear the activeSmartContract when no smartContracts are sent', () => {
        let component: any = mount(<TransactionPage transactionViewData={transactionViewData} transactionOutput={mockTransactionOutput}/>);

        component.setProps({ transactionViewData: { ...transactionViewData, smartContracts: [] } });
        expect(component.state()).toHaveProperty('smartContracts', []);
        expect(component.state()).toHaveProperty('activeSmartContract', undefined);
    });

    it('should persist the activeSmartContract as it still exists when smartContracts are updated', () => {
        const twoContractsTransactionData = { ...transactionViewData };
        twoContractsTransactionData.smartContracts = [
            greenContract,
            { ...greenContract, contractName: 'other contract' },
        ];
        twoContractsTransactionData.preselectedSmartContract = twoContractsTransactionData.smartContracts[1];

        let component: any = mount(<TransactionPage transactionViewData={twoContractsTransactionData} transactionOutput={mockTransactionOutput}/>);
        expect(component.state()).toHaveProperty('activeSmartContract', twoContractsTransactionData.smartContracts[1]);


        const threeContractsTransactionData = { ...twoContractsTransactionData };
        threeContractsTransactionData.smartContracts = [
            greenContract,
            { ...greenContract, contractName: 'other contract' },
            { ...greenContract, contractName: 'another contract' },
        ];
        component.setProps({ transactionViewData: { ...threeContractsTransactionData } });
        expect(component.state()).toHaveProperty('smartContracts', threeContractsTransactionData.smartContracts);
        expect(component.state()).toHaveProperty('activeSmartContract', threeContractsTransactionData.smartContracts[1]);
    });

    it('should leave the activeSmartContract as undefined when it is already undefined and the smartContracts are updated', () => {
        const twoContractsTransactionData = { ...transactionViewData };
        twoContractsTransactionData.smartContracts = [
            greenContract,
            { ...greenContract, contractName: 'other contract' },
        ];
        twoContractsTransactionData.preselectedSmartContract = undefined;

        let component: any = mount(<TransactionPage transactionViewData={twoContractsTransactionData} transactionOutput={mockTransactionOutput}/>);
        expect(component.state()).toHaveProperty('activeSmartContract', undefined);


        const threeContractsTransactionData = { ...twoContractsTransactionData };
        threeContractsTransactionData.smartContracts = [
            greenContract,
            { ...greenContract, contractName: 'other contract' },
            { ...greenContract, contractName: 'another contract' },
        ];
        component.setProps({ transactionViewData: { ...threeContractsTransactionData } });
        expect(component.state()).toHaveProperty('smartContracts', threeContractsTransactionData.smartContracts);
        expect(component.state()).toHaveProperty('activeSmartContract', undefined);
    });

    it('should update the associatedTxdata when something new is passed down through props', async () => {
        const componentDidUpdateSpy: sinon.SinonSpy = mySandBox.spy(TransactionPage.prototype, 'componentDidUpdate');
        const component: any = mount(<TransactionPage transactionViewData={transactionViewData} transactionOutput={mockTransactionOutput}/>);
        expect(component.state()).toHaveProperty('associatedTxdata', {});

        component.setProps({
            transactionViewData: {
                smartContracts: [greenContract],
                associatedTxdata: 'new data',
            }
        });

        componentDidUpdateSpy.should.have.been.called;
        component.state().associatedTxdata.should.equal('new data');
    });

    it('should update the transaction output when something new is passed down through props', async () => {
        const componentDidUpdateSpy: sinon.SinonSpy = mySandBox.spy(TransactionPage.prototype, 'componentDidUpdate');
        const component: any = mount(<TransactionPage transactionViewData={transactionViewData} transactionOutput={mockTransactionOutput}/>);
        component.state().transactionOutput.should.equal(mockTransactionOutput);

        component.setProps({
            transactionOutput: moreMockTransactionOutput
        });
        componentDidUpdateSpy.should.have.been.called;
        component.state().transactionSubmitted.should.equal(false);
        component.state().transactionOutput.should.equal(moreMockTransactionOutput);
    });

    it('should show the loading spinner when setTransactionSubmitted is called with true', () => {
        const loadingID = '#output-loading';
        let component: any = mount(<TransactionPage transactionViewData={transactionViewData} transactionOutput={mockTransactionOutput}/>);
        component.state().transactionSubmitted.should.be.false;
        expect(component.find(loadingID).exists()).toBeFalsy();

        act(() => {
            component.find(TransactionInputContainer).prop('setTransactionSubmitted')(true);
        });
        component = component.update();

        component.state().transactionSubmitted.should.be.true;
        expect(component.find(loadingID).exists()).toBeTruthy();
    });
});
