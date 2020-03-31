import React from 'react';
import renderer from 'react-test-renderer';
import { mount, ReactWrapper } from 'enzyme';
import chai from 'chai';
import sinon, { SinonStub } from 'sinon';
import Axios from 'axios';
import sinonChai from 'sinon-chai';
import StatusList from '../components/StatusList/StatusList';
jest.useFakeTimers();
chai.should();
chai.use(sinonChai);

const githubProject: string = 'IBM-Blockchain/blockchain-vscode-extension';

// Github URLs
const issuesStatusApiUrl: string = 'https://api.github.com/repos/' + githubProject + '/issues?labels=status';

describe('StatusList', () => {
    let mySandBox: sinon.SinonSandbox;
    let axiosGetStub: sinon.SinonStub;

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
        axiosGetStub = mySandBox.stub(Axios, 'get');
        axiosGetStub.returns({data: [
        {
            url: 'incident1',
            title: 'someIncident',
            labels: [{
                id : 'someLabelID',
                name: 'sev3',
                description: 'someLabelDescription'
            }],
        },
        {
            url: 'incident2',
            title: 'someOtherIncident',
            labels: [{
                id : 'someLabelID',
                name: 'sev2',
                description: 'someLabelDescription'
            }],
        }]});
    });

    afterEach(async () => {
        mySandBox.restore();
    });

    it('should render the expected snapshot', async () => {
        const component: any = renderer
            .create(<StatusList />)
            .toJSON();
        expect(component).toMatchSnapshot();
    });

    it('should get latest incidents with a successful api call', async () => {
        const issues: any = [
            {
                url: 'incident1',
                title: 'someIncident',
                labels: [{
                    id : 'someLabelID',
                    name: 'sev3',
                    description: 'someLabelDescription'
                }],
            },
            {
                url: 'incident2',
                title: 'someOtherIncident',
                labels: [{
                    id : 'someLabelID',
                    name: 'sev2',
                    description: 'someLabelDescription'
                }],
            }];
        const component: ReactWrapper<{}, {issues: any, error: string}, StatusList> = await mount(<StatusList/>);
        component.state().should.deep.equal({issues, error: undefined});
        axiosGetStub.should.have.been.calledOnceWithExactly(issuesStatusApiUrl);
    });

    it('should show error if API call is unsuccessful', async () => {
        axiosGetStub.returns(undefined);
        const component: ReactWrapper<{}, {issues: any, error: string}, StatusList> = await mount(<StatusList/>);
        component.state().error.should.equal('Cannot load incidents from Github, sorry.');
        axiosGetStub.should.have.been.calledOnceWithExactly(issuesStatusApiUrl);
    });
});
