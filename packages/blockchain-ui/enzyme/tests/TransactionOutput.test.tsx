// tslint:disable no-unused-expression
import React from 'react';
import renderer from 'react-test-renderer';
import { mount } from 'enzyme';
import TransactionOutput from '../../src/components/TransactionOutput/TransactionOutput';
import chai from 'chai';
import sinonChai from 'sinon-chai';
import IOutputObject from '../../src/interfaces/IOutputObject';
chai.should();
chai.use(sinonChai);

describe('TransactionOutput component', () => {

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
        transientData: '{"some": "data"}',
        output: 'No output returned from myOtherTransaction'
    };

    it('should render the expected snapshot when there is no provided output', async () => {
        const component: any = renderer
            .create(<TransactionOutput output={undefined}/>)
            .toJSON();
        expect(component).toMatchSnapshot();
    });

    it('should render the expected snapshot when there is output to display', async () => {
        const component: any = renderer
            .create(<TransactionOutput output={mockOutput}/>)
            .toJSON();
        expect(component).toMatchSnapshot();
    });

    it('should correctly set the state when output is provided', async () => {
        const component: any = mount(<TransactionOutput output={undefined}/>);
        component.state().outputArray.should.have.length(0);
        component.setProps({
            output: mockOutput
        });
        component.state().outputArray.should.have.length(1);
        component.state().outputArray[0].should.deep.equal(mockOutput);
    });

    it('should append new output to the existing output array', async () => {
        const component: any = mount(<TransactionOutput output={mockOutput}/>);
        component.state().outputArray.should.have.length(1);
        component.state().outputArray[0].should.deep.equal(mockOutput);
        component.setProps({
            output: moreMockOutput
        });
        component.state().outputArray.should.have.length(2);
        component.state().outputArray[0].should.deep.equal(mockOutput);
        component.state().outputArray[1].should.deep.equal(moreMockOutput);
    });

    it('should not append any undefined objects', async () => {
        const component: any = mount(<TransactionOutput output={mockOutput}/>);
        component.state().outputArray.should.have.length(1);
        component.state().outputArray[0].should.deep.equal(mockOutput);
        component.setProps({
            output: undefined
        });
        component.state().outputArray.should.have.length(1);
        component.state().outputArray[0].should.deep.equal(mockOutput);
    });
});
