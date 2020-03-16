import React from 'react';
import renderer from 'react-test-renderer';
import { mount, ReactWrapper } from 'enzyme';
import chai from 'chai';
import sinon from 'sinon';
import Axios from 'axios';
import sinonChai from 'sinon-chai';
import CurrentVersion from '../components/CurrentVersion/CurrentVersion';
chai.should();
chai.use(sinonChai);

const githubProject: string = 'IBM-Blockchain/blockchain-vscode-extension';

// Github URLs
const currentReleaseApiUrl: string = 'https://api.github.com/repos/' + githubProject + '/releases/latest';

describe('CurrentVersion', () => {
    let mySandBox: sinon.SinonSandbox;
    let axiosGetStub: sinon.SinonStub;

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
        axiosGetStub = mySandBox.stub(Axios, 'get');
        axiosGetStub.returns({
            data: {name: 'someVersion'}
        });
    });

    afterEach(async () => {
        mySandBox.restore();
    });

    it('should render the expected snapshot', async () => {
        const component: any = renderer
            .create(<CurrentVersion />)
            .toJSON();
        expect(component).toMatchSnapshot();
    });

    it('should output latest version when successful api call', async () => {
        const component: ReactWrapper<{}, {currentVersion: any}, CurrentVersion> = await mount(<CurrentVersion/>);
        axiosGetStub.should.have.been.calledOnceWithExactly(currentReleaseApiUrl);
        component.state().currentVersion.should.equal('someVersion');
    });

    it('should output nothing when unsuccessful api call', async () => {
        axiosGetStub.returns(undefined);
        const component: ReactWrapper<{}, {currentVersion: any}, CurrentVersion> = await mount(<CurrentVersion/>);
        axiosGetStub.should.have.been.calledOnceWithExactly(currentReleaseApiUrl);
        component.state().should.deep.equal({
            currentVersion: ''
        });
    });
});
