import React from 'react';
import renderer from 'react-test-renderer';
import { mount } from 'enzyme';
import chai from 'chai';
import sinon from 'sinon';
import Axios from 'axios';
import sinonChai from 'sinon-chai';
import StatusList from '../components/StatusList/StatusList.jsx';
jest.useFakeTimers();
chai.should();
chai.use(sinonChai);

describe('StatusList', () => {
    let mySandBox;
    let axiosGetStub;
    let clock;

    beforeEach(async() => {
        mySandBox = sinon.createSandbox();
        axiosGetStub = mySandBox.stub(Axios, 'get');
        axiosGetStub.returns({data: [
        {
            url: 'incident1',
            title: 'someIncident'
        },
        {
            url: 'incident2',
            title: 'someOtherIncident'
        }]});
        clock = sinon.useFakeTimers(); 
    });

    afterEach(async () => {
        mySandBox.restore();
        clock.restore();
    });

    it('should render the expected snapshot', async() => {
        const component = renderer
            .create(<StatusList />)
            .toJSON(); 
        expect(component).toMatchSnapshot();
    });

    it('should get latest incidents with a successful api call', async() => {   
        const issues = [
            {
                url: 'incident1',
                title: 'someIncident'
            },
            {
                url: 'incident2',
                title: 'someOtherIncident'
            }];  
        const component = await mount(<StatusList/>);
        axiosGetStub.should.have.been.calledOnce;
        component.state().should.deep.equal({issues, error: undefined});
    });

    it('should show error if API call is unsuccessful', async() => {
        axiosGetStub.returns(undefined);
        const component = await mount(<StatusList/>);
        clock.tick(200);
        component.state().error.should.equal('Cannot load incidents from Github, sorry.');
        axiosGetStub.should.have.been.calledOnce;
    });
});