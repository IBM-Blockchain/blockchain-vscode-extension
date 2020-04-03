import React from 'react';
import renderer from 'react-test-renderer';
import { mount, ReactWrapper } from 'enzyme';
import chai from 'chai';
import sinon from 'sinon';
import Axios from 'axios';
import sinonChai from 'sinon-chai';
import UpcomingList from '../components/UpcomingList/UpcomingList';

jest.useFakeTimers();
chai.should();
chai.use(sinonChai);

const githubProject: string = 'IBM-Blockchain/blockchain-vscode-extension';

const issuesNextApiUrl: string = 'https://api.github.com/repos/' + githubProject + '/issues?labels=next&state=closed&per_page=100';
const allMilestones: string = 'https://api.github.com/repos/' + githubProject + '/milestones';
// tslint:disable: no-unused-expression

describe('UpcomingList', () => {
    let mySandBox: sinon.SinonSandbox;
    let axiosGetStub: sinon.SinonStub;

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
        axiosGetStub = mySandBox.stub(Axios, 'get');
        axiosGetStub.onFirstCall().returns({data: [
            {
                url: 'milestoneOneURL',
                title: 'Work Items',
                due_on: null
            },
            {
                url: 'anotherMilestoneURL',
                title: 'Sprint x',
                due_on: '2020-03-23T07:00:00Z'
            },
            {
                url: 'moreMilestones',
                title: 'Sprint y',
                due_on: '2020-03-20T07:00:00Z'
            }
        ]});
        axiosGetStub.onSecondCall().returns({data: [
            {
                url: 'someURL',
                repository_url: 'someOtherURL',
                number: 1932,
                title: 'Some completed issue',
                state: 'closed',
                labels: [{
                    id : 'someLabelID',
                    name: 'bug',
                    description: 'someLabelDescription'
                }],
                milestone: {
                    number: 'milestoneNumber',
                    id: 'someMilestoneID',
                    title: 'Sprint x'
                }
            },
            {
                url: 'someURL1',
                repository_url: 'someOtherURL1',
                number: 1922,
                title: 'Some other completed issue',
                state: 'closed',
                labels: [{
                    id : 'someOtherLabelID',
                    name: 'enhancement',
                    description: 'someOtherLabelDescription'
                }],
                milestone: {
                    number: 'milestoneNumber',
                    id: 'someMilestoneID',
                    title: 'Sprint y'
                }
            }
        ]});
    });

    afterEach(async () => {
        mySandBox.restore();
    });

    it('should render the expected snapshot', async () => {
        const component: any = renderer
            .create(<UpcomingList />)
            .toJSON();
        expect(component).toMatchSnapshot();
    });

    it('should get the newest milestone with a successful api call', async () => {
        const component: ReactWrapper<{}, {issues: any, error: string, newestMilestone: any}, UpcomingList> = await mount(<UpcomingList/>);
        axiosGetStub.should.have.been.calledTwice;
        component.state().newestMilestone.should.deep.equal({
            url: 'anotherMilestoneURL',
            title: 'Sprint x',
            due_on: '2020-03-23T07:00:00Z'
        });
    });

    it('should show error when there is an unsuccessful milestone api call', async () => {
        axiosGetStub.onFirstCall().returns(undefined);
        const component: ReactWrapper<{}, {issues: any, error: string, newestMilestone: any}, UpcomingList> = await mount(<UpcomingList/>);
        axiosGetStub.should.have.been.calledTwice;
        component.state().error.should.equal('Cannot load from Github, sorry.');
    });

    it('should successfully make an API call to GitHub', async () => {
        await mount(<UpcomingList/>);
        axiosGetStub.should.have.been.calledTwice;
        axiosGetStub.getCall(0).should.have.been.calledWith(allMilestones);
        axiosGetStub.getCall(1).should.have.been.calledWith(issuesNextApiUrl);
    });

    it('should get latest completed issues with a successful api call', async () => {
        const issues: any = [
            {
                url: 'someURL',
                repository_url: 'someOtherURL',
                number: 1932,
                title: 'Some completed issue',
                state: 'closed',
                labels: [{
                    id : 'someLabelID',
                    name: 'bug',
                    description: 'someLabelDescription'
                }],
                milestone: {
                    number: 'milestoneNumber',
                    id: 'someMilestoneID',
                    title: 'Sprint x'
                }
            },
            {
                url: 'someURL1',
                repository_url: 'someOtherURL1',
                number: 1922,
                title: 'Some other completed issue',
                state: 'closed',
                labels: [{
                    id : 'someOtherLabelID',
                    name: 'enhancement',
                    description: 'someOtherLabelDescription'
                }]
            }];
        const component: ReactWrapper<{}, {issues: any, error: string, newestMilestone: any}, UpcomingList> = await mount(<UpcomingList/>);
        component.setState({
            issues: issues,
            error: undefined
        });
        axiosGetStub.should.have.been.calledTwice;
        component.text().includes('Some completed issue').should.be.true;
        component.state().issues.should.deep.equal(issues);
    });

    it('should show error when there is an unsuccessful api calls', async () => {
        axiosGetStub.onFirstCall().returns(undefined);
        axiosGetStub.onSecondCall().returns(undefined);
        const component: ReactWrapper<{}, {issues: any, error: string, newestMilestone: any}, UpcomingList> = await mount(<UpcomingList/>);
        component.state().error.should.equal('Cannot load from Github, sorry.');
        axiosGetStub.should.have.been.calledTwice;
    });
});
