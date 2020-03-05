import React from 'react';
import renderer from 'react-test-renderer';
import { mount } from 'enzyme';
import chai from 'chai';
import sinon from 'sinon';
import Axios from 'axios';
import sinonChai from 'sinon-chai';
import CurrentVersion from '../components/CurrentVersion/CurrentVersion.jsx';
chai.should();
chai.use(sinonChai);

describe('CurrentVersion', () => {
    let mySandBox;
    let axiosGetStub;

    beforeEach(async() => {
        mySandBox = sinon.createSandbox();
        axiosGetStub = mySandBox.stub(Axios, 'get');
        axiosGetStub.resolves({
            data: {name: 'someVersion'}
        });
    });

    afterEach(async () => {
        mySandBox.restore();
    });

    it('should render the expected snapshot', async() => {
        const component = renderer
            .create(<CurrentVersion />)
            .toJSON(); 
        expect(component).toMatchSnapshot();
    });

    it('should output latest version when successful api call', async() => {     
        const component = await mount(<CurrentVersion/>);
        axiosGetStub.should.have.been.calledOnce;
        component.state().currentVersion.should.equal('someVersion');
    });

    it('should output nothing when unsuccessful api call', async() => {     
        axiosGetStub.resolves(undefined);
        const component = await mount(<CurrentVersion/>);
        axiosGetStub.should.have.been.calledOnce;
        component.state().should.deep.equal({
            currentVersion: undefined
        });
    });
});
