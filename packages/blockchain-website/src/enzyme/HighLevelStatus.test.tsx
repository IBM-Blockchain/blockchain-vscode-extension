import React from 'react';
import renderer from 'react-test-renderer';
import { mount, ReactWrapper } from 'enzyme';
import chai from 'chai';
import sinon from 'sinon';
import Axios from 'axios';
import sinonChai from 'sinon-chai';
import HighLevelStatus from '../components/HighLevelStatus/HighLevelStatus';
chai.should();
chai.use(sinonChai);

const githubProject: string = 'IBM-Blockchain/blockchain-vscode-extension';

// Github URLs
const issuesStatusApiUrl: string = 'https://api.github.com/repos/' + githubProject + '/issues?labels=status';

describe('HighLevelStatus', () => {
    let mySandBox: sinon.SinonSandbox;
    let axiosGetStub: sinon.SinonStub;

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
        axiosGetStub = mySandBox.stub(Axios, 'get');
        axiosGetStub.returns({
            data: [
                {
                    url: 'someURL',
                    title: 'someTitle',
                    labels: [
                        {
                            id: 'someLabelID',
                            name: 'sev1'
                        },
                        {
                            id: 'someOtherLabelID',
                            name: 'status'
                        }
                    ]
                },
                {
                    url: 'someOtherURL',
                    title: 'someOtherTitle',
                    labels: [
                        {
                            id: 'someLabelID',
                            name: 'sev2'
                        },
                        {
                            id: 'someOtherLabelID',
                            name: 'status'
                        }
                    ]
                },
                {
                    url: 'someOtherURL1',
                    title: 'someOtherTitle1',
                    labels: [
                        {
                            id: 'someLabelID1',
                            name: 'sev3'
                        },
                        {
                            id: 'someOtherLabelID',
                            name: 'status'
                        }
                    ]
                },
                {
                    url: 'anotherURL',
                    title: 'anotherTitle',
                    labels: [
                        {
                            id: 'anotherLabelID',
                            name: 'sev1'
                        },
                        {
                            id: 'someOtherLabelID',
                            name: 'status'
                        }
                    ]
                }
            ]
        });
    });

    afterEach(async () => {
        mySandBox.restore();
    });

    it('should render the expected snapshot', async () => {
        const component: any = renderer
            .create(<HighLevelStatus />)
            .toJSON();
        expect(component).toMatchSnapshot();
    });

    it('should output current status when successful api call and no incidents', async () => {
        axiosGetStub.returns({
            data: [
                {}
            ]});
        const component: ReactWrapper<{}, {description: string, icon: string}, HighLevelStatus> = await mount(<HighLevelStatus/>);
        axiosGetStub.should.have.been.calledOnceWithExactly(issuesStatusApiUrl);
        component.state().description.should.equal('There are no known issues');
    });

    it('should output current status when successful api call and sev2 or sev3 incidents', async () => {
        axiosGetStub.returns({
            data: [
                {
                    url: 'someOtherURL',
                    title: 'someOtherTitle',
                    labels: [
                        {
                            id: 'someLabelID',
                            name: 'sev2'
                        },
                        {
                            id: 'someOtherLabelID',
                            name: 'status'
                        }
                    ]
                },
                {
                    url: 'someOtherURL1',
                    title: 'someOtherTitle1',
                    labels: [
                        {
                            id: 'someLabelID1',
                            name: 'sev3'
                        },
                        {
                            id: 'someOtherLabelID',
                            name: 'status'
                        }
                    ]
                }
            ]});
        const component: ReactWrapper<{}, {description: string, icon: string}, HighLevelStatus> = await mount(<HighLevelStatus/>);
        axiosGetStub.should.have.been.calledOnceWithExactly(issuesStatusApiUrl);
        component.state().description.should.equal('There is at least one sev2 or sev3 issue');
    });

    it('should output current status when successful api call and sev1 incident', async () => {
        axiosGetStub.returns({
            data: [
                {
                    url: 'someURL',
                    title: 'someTitle',
                    labels: [
                        {
                            id: 'someLabelID',
                            name: 'sev1'
                        },
                        {
                            id: 'someOtherLabelID',
                            name: 'status'
                        }
                    ]
                }
            ]});
        const component: ReactWrapper<{}, {description: string, icon: string}, HighLevelStatus> = await mount(<HighLevelStatus/>);
        axiosGetStub.should.have.been.calledOnceWithExactly(issuesStatusApiUrl);
        component.state().description.should.equal('There is at least one sev1 issue');
    });

    it('should output worst current status when successful api call and there multiple different severity incidents', async () => {
        const component: ReactWrapper<{}, {description: string, icon: string}, HighLevelStatus> = await mount(<HighLevelStatus/>);
        axiosGetStub.should.have.been.calledOnceWithExactly(issuesStatusApiUrl);
        component.state().description.should.equal('There is at least one sev1 issue');
    });

    it('should output nothing when unsuccessful api call', async () => {
        axiosGetStub.returns(undefined);
        const component: ReactWrapper<{}, {description: string, icon: string}, HighLevelStatus> = await mount(<HighLevelStatus/>);
        axiosGetStub.should.have.been.calledOnceWithExactly(issuesStatusApiUrl);
        component.state().description.should.equal(''); // i.e. an icon/status was not shown to the user
    });
});
