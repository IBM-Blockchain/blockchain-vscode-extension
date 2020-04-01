import React from 'react';
import renderer from 'react-test-renderer';
import { mount, ReactWrapper } from 'enzyme';
import chai from 'chai';
import sinon, { SinonSandbox } from 'sinon';
import sinonChai from 'sinon-chai';
import IssuesList from '../components/IssuesList/IssuesList';
chai.should();
chai.use(sinonChai);

// tslint:disable: no-unused-expression

describe('IssuesList', () => {
    let mySandBox: sinon.SinonSandbox;

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
    });

    afterEach(async () => {
        mySandBox.restore();
    });

    it('should render the expected snapshot', async () => {
        const component: any = renderer
            .create(<IssuesList />)
            .toJSON();
        expect(component).toMatchSnapshot();
    });

    it('should show error test if error is passed as a prop', async () => {
        const component: ReactWrapper<{issues: any, error: string, title: string, issueLabel: string, newestMilestone: any, milestoneNumber: string}, {}, IssuesList> = await mount(<IssuesList error={'someError'}/>);
        component.text().includes('someError').should.be.true;
    });

    it('should show message if no incidents to show', async () => {
        const component: ReactWrapper<{issues: any, error: string, title: string, issueLabel: string, newestMilestone: any, milestoneNumber: string}, {}, IssuesList> = await mount(<IssuesList issues={[]}/>);
        component.text().includes('No incidents found!').should.be.true;
    });

    it('should show message if no completed issues to show from the most recent milestone', async () => {
        const component: ReactWrapper<{issues: any, error: string, title: string, issueLabel: string, newestMilestone: any, milestoneNumber: string}, {}, IssuesList> = await mount(<IssuesList issues={[]} newestMilestone={'someMilestone'}/>);
        component.text().includes('No completed fixes yet!').should.be.true;
    });

    it('should show any incidents', async () => {
        const incidents: any = [{
            url: 'someURL',
            repository_url: 'someOtherURL',
            number: 1946,
            title: 'someIncident issue',
            state: 'open',
            labels: [{
                id: 'someID',
                name: 'sev2',
                description: 'someDesc'
            }, {
                id: 'statusID',
                name: 'status',
                description: 'statusPage incidents'
            }],
            milestone: {
                url: 'someMilestoneURL',
                id: 'someID',
                number: 23,
                state: 'open'
            }
        },
        {
            url: 'someotherURL',
            repository_url: 'someURL',
            number: 1948,
            title: 'incident issue',
            state: 'open',
            labels: [{
                id: 'IDHere',
                name: 'sev1',
                description: 'descHere'
            }, {
                id: 'statusID',
                name: 'status',
                description: 'statusPage incidents'
            }],
        },
        {
            url: 'randomURL',
            repository_url: 'penguinURL',
            number: 1928,
            title: 'incident issue',
            state: 'open',
            labels: [{
                id: 'iD',
                name: 'sev3',
                description: 'desc'
            }, {
                id: 'statusID',
                name: 'status',
                description: 'statusPage incidents'
            }],
        }];
        const component: ReactWrapper<{issues: any, error: string, title: string, issueLabel: string, newestMilestone: any, milestoneNumber: string}, {}, IssuesList> = await mount(<IssuesList issues={incidents}/>);
        component.text().includes('someIncident issue').should.be.true;
    });

    it('should show any completed issues for the next release', async () => {
        const completedIssues: any = [{
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
                id: 'someMilestoneID'
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
                id: 'someMilestoneID'
            }
        }];
        const component: ReactWrapper<{issues: any, error: string, title: string, issueLabel: string, newestMilestone: any, milestoneNumber: string}, {}, IssuesList> = await mount(<IssuesList issues={completedIssues} newestMilestone={'someMilestone'}/>);
        component.text().includes('Some completed issue').should.be.true;
        component.text().includes('Some other completed issue').should.be.true;
    });
});
