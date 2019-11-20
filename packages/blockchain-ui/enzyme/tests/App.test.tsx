import React from 'react';
import { mount } from 'enzyme';
import App from '../../src/App';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import ISmartContract from '../../src/interfaces/ISmartContract';
import ITransaction from '../../src/interfaces/ITransaction';
import Utils from '../../src/Utils';
chai.should();
chai.use(sinonChai);

describe('App', () => {

    let mySandBox: sinon.SinonSandbox;

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

    const mockState: { smartContracts: Array<ISmartContract>, activeSmartContract: ISmartContract } = {
        smartContracts: [greenContract, blueContract],
        activeSmartContract: greenContract
    };

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
    });

    afterEach(async () => {
        mySandBox.restore();
    });

    it('should redirect to the transaction home view', async () => {
        const component: any = mount(<App/>);

        const msg: MessageEvent = new MessageEvent('message', {
            data: {
                path: '/transaction',
                state: mockState
            }
        });
        dispatchEvent(msg);
        expect(component.state().redirectPath).toBe('/transaction');
    });

    it('should redirect to the transaction create view', async () => {
        const component: any = mount(<App/>);

        const msg: MessageEvent = new MessageEvent('message', {
            data: {
                path: '/transaction/create',
                    state: {
                        smartContracts: [greenContract, blueContract],
                        activeSmartContract: greenContract
                    }
            }
        });
        dispatchEvent(msg);
        expect(component.state().redirectPath).toBe('/transaction/create');
    });

    it('does not overwrite state when redirecting to a different page', async () => {
        const component: any = mount(<App/>);

        const msg: MessageEvent = new MessageEvent('message', {
            data: {
                path: '/transaction',
                state: mockState
            }
        });
        dispatchEvent(msg);
        expect(component.state().childState).toBe(mockState);

        Utils.changeRoute('/transaction/create');
        expect(component.state().childState).toBe(mockState);
    });

    it('updates the state correctly when switching smart contracts', async () => {
        const component: any = mount(<App/>);

        const msg: MessageEvent = new MessageEvent('message', {
            data: {
                path: '/transaction',
                state: mockState
            }
        });
        dispatchEvent(msg);
        expect(component.state().childState.activeSmartContract).toBe(greenContract);

        component.instance().switchSmartContract('blueContract@0.0.1');
        expect(component.state().childState.activeSmartContract).toBe(blueContract);
    });

});
