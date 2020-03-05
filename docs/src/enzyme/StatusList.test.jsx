import React from 'react';
import renderer from 'react-test-renderer';
import { mount } from 'enzyme';
import chai from 'chai';
import sinon from 'sinon';
import Axios from 'axios';
import sinonChai from 'sinon-chai';
import StatusList from '../components/StatusList/StatusList.jsx';
chai.should();
chai.use(sinonChai);

describe('StatusList', () => {
    let mySandBox;
    let axiosGetStub;

    beforeEach(async() => {
        mySandBox = sinon.createSandbox();
        axiosGetStub = mySandBox.stub(Axios, 'get');
        axiosGetStub.resolves([
        {
            url: 'incident1',
            title: 'someIncident'
        },
        {
            url: 'incident2',
            title: 'someOtherIncident'
        }]);
    });

    afterEach(async () => {
        mySandBox.restore();
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
        // axiosGetStub.should.have.been.calledOnce;
        component.state().should.equal({issues, undefined, refreshing: false});
    });
});