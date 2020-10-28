import React from 'react';
import renderer from 'react-test-renderer';
import chai from 'chai';
import sinonChai from 'sinon-chai';

import TutorialTabs from '../../src/components/elements/TutorialTabs/TutorialTabs';
import ITutorialObject from '../../src/interfaces/ITutorialObject';
import sinon, { SinonSandbox } from 'sinon';
import Utils from '../../src/Utils';
import { ReactWrapper, mount } from 'enzyme';
import { ExtensionCommands } from '../../src/ExtensionCommands';

chai.should();
chai.use(sinonChai);

// tslint:disable no-unused-expression

describe('TutorialTabs component', () => {

    let mySandBox: SinonSandbox;
    let savePDFHandlerStub: sinon.SinonStub;

    beforeEach(() => {
        mySandBox = sinon.createSandbox();
        savePDFHandlerStub = mySandBox.stub(Utils, 'postToVSCode').resolves();
    });

    afterEach(() => {
        mySandBox.restore();
    });

    const tutorialData: Array<{name: string, tutorials: ITutorialObject[], tutorialFolder: string, tutorialDescription?: string}> = [
        {
            name: 'Basic tutorials',
            tutorialFolder: 'basic-tutorials',
            tutorialDescription: 'some description',
            tutorials: [
                {
                    title: 'a1',
                    series: 'Basic tutorials',
                    length: '4 weeks',
                    objectives: [
                    'objective 1',
                    'objective 2',
                    'objective 3'
                    ],
                    file: 'some/file/path'
                }
            ]
        },
        {
            name: 'Joining a network',
            tutorialFolder: 'joining-a-network',
            tutorialDescription: 'another description',
            tutorials: [
                {
                    title: 'b1',
                    series: 'Joining a network',
                    length: '4 weeks',
                    objectives: [
                        'objective 1',
                        'objective 2',
                        'objective 3'
                    ],
                    file: 'some/other/file/path'
                }
            ]
        },
        {
            name: 'Other tutorials',
            tutorialFolder: 'other-tutorials',
            tutorials: [
                {
                    title: 'something really interesting',
                    series: 'Other tutorials',
                    length: '10 minutes',
                    objectives: [
                        'objective 1',
                        'objective 2',
                        'objective 3'
                    ],
                    file: 'another/file/path'
                }
            ]
        }
    ];

    it('should render the expected snapshot', () => {
        const component: any = renderer
            .create(<TutorialTabs tutorialData={tutorialData}/>)
            .toJSON();
        expect(component).toMatchSnapshot();
    });

    it('should render the expected snapshot when no tutorial data is received', () => {
        const component: any = renderer
            .create(<TutorialTabs tutorialData={[]}/>)
            .toJSON();
        expect(component).toMatchSnapshot();
    });

    it('should test link to download all tutorials is rendered if the series has pdf tutorials', () => {
        const otherTutorialData: Array<{name: string, tutorials: ITutorialObject[], tutorialFolder: string, tutorialDescription?: string}> = [
            {
                name: 'Basic tutorials',
                tutorialFolder: 'basic-tutorials',
                tutorialDescription: 'some desc',
                tutorials: [
                    {
                        title: 'a1',
                        series: 'Basic tutorials',
                        length: '4 weeks',
                        objectives: [
                        'objective 1',
                        'objective 2',
                        'objective 3'
                        ],
                        file: 'some/file/path'
                    }
                ]
            }
        ];
        const component: ReactWrapper<{tutorialObject: any, tutorialSeries: string}, {}> = mount(<TutorialTabs tutorialData={otherTutorialData}/>);
        component.find('p').at(0).hasClass('series-description').should.be.true;
        component.find('a').at(2).simulate('click');
        savePDFHandlerStub.should.have.been.calledOnceWithExactly({
            command: ExtensionCommands.SAVE_TUTORIAL_AS_PDF,
            data: [
                undefined,
                true,
                otherTutorialData[0].tutorialFolder
            ]
        });
    });

    it('should test there is no link to download all tutorials if the series does not have pdf tutorials', () => {
        const otherTutorialData: Array<{name: string, tutorials: ITutorialObject[], tutorialFolder: string, tutorialDescription?: string}> = [
            {
                name: 'Some tutorials',
                tutorialFolder: 'some-tutorials',
                tutorials: [
                    {
                        title: 'something really interesting',
                        series: 'Other tutorials',
                        length: '10 minutes',
                        objectives: [
                            'objective 1',
                            'objective 2',
                            'objective 3'
                        ],
                        file: 'another/file/path'
                    }
                ]
            }
        ];
        const component: ReactWrapper<{tutorialObject: any, tutorialSeries: string}, {}> = mount(<TutorialTabs tutorialData={otherTutorialData}/>);
        component.find('p').at(0).hasClass('series-description').should.be.false;
        component.find('a').at(2).exists().should.equal(false); // only two `a` tags exist - one for each tab
        savePDFHandlerStub.should.not.have.been.called;
    });
});
