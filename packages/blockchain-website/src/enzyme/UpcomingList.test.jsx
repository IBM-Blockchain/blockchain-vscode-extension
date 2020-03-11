import React from 'react';
import renderer from 'react-test-renderer';
import { mount } from 'enzyme';
import chai from 'chai';
import sinon from 'sinon';
import Axios from 'axios';
import sinonChai from 'sinon-chai';
import UpcomingList from '../components/UpcomingList/UpcomingList.jsx';

jest.useFakeTimers();
chai.should();
chai.use(sinonChai);

const githubProject = 'IBM-Blockchain/blockchain-vscode-extension';

const issuesNextApiUrl = 'https://api.github.com/repos/'+githubProject+'/issues?labels=next&state=closed&per_page=100'
const allMilestones = 'https://api.github.com/repos/'+githubProject+'/milestones'

describe('UpcomingList', () => {
    let mySandBox;
    let axiosGetStub;

    beforeEach(async() => {
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
                repositoryurl: 'someOtherURL',
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
                repositoryurl: 'someOtherURL1',
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

    it('should render the expected snapshot', async() => {
        const component = renderer
            .create(<UpcomingList />)
            .toJSON(); 
        expect(component).toMatchSnapshot();
    });

    it('should get the newest milestone with a successful api call', async() => {
        const component = await mount(<UpcomingList/>);
        axiosGetStub.should.have.been.calledTwice;
        component.state().newestMilestone.should.deep.equal({
            url: 'anotherMilestoneURL',
            title: 'Sprint x',
            due_on: '2020-03-23T07:00:00Z'
        });
    });

    it('should show error when there is an unsuccessful milestone api call', async() => {
        axiosGetStub.onFirstCall().returns(undefined);
        const component = await mount(<UpcomingList/>);
        axiosGetStub.should.have.been.calledTwice;
        component.state().error.should.equal('Cannot load from Github, sorry.');
    });

    it('should successfully make an API call to GitHub', async () => {
        await mount(<UpcomingList/>);
        axiosGetStub.should.have.been.calledTwice;
        axiosGetStub.getCall(0).should.have.been.calledWith(allMilestones);
        axiosGetStub.getCall(1).should.have.been.calledWith(issuesNextApiUrl);
    });

    it('should get latest completed issues with a successful api call', async() => {   
        const issues = [
            {
                url: 'someURL',
                repositoryurl: 'someOtherURL',
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
                repositoryurl: 'someOtherURL1',
                number: 1922,
                title: 'Some other completed issue',
                state: 'closed',
                labels: [{
                    id : 'someOtherLabelID',
                    name: 'enhancement',
                    description: 'someOtherLabelDescription'
                }]
            }];  
        const component = await mount(<UpcomingList/>);
        component.setState({
            issues: issues,
            error: undefined
        })
        axiosGetStub.should.have.been.calledTwice;
        component.text().includes('Some completed issue').should.be.true;
        component.state().issues.should.deep.equal(issues);
    });

    it('should show error when there is an unsuccessful api calls', async() => {
        axiosGetStub.onFirstCall().returns(undefined);
        axiosGetStub.onSecondCall().returns(undefined);
        const component = await mount(<UpcomingList/>);
        component.state().error.should.equal('Cannot load from Github, sorry.');
        axiosGetStub.should.have.been.calledTwice;
    });
});
