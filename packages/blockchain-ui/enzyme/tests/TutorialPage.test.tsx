import React from 'react';
import renderer from 'react-test-renderer';
import chai from 'chai';
import sinonChai from 'sinon-chai';

import TutorialPage from '../../src/components/pages/TutorialPage/TutorialPage';
import ITutorialObject from '../../src/interfaces/ITutorialObject';

chai.should();
chai.use(sinonChai);

describe('TutorialPage component', () => {

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
            .create(<TutorialPage tutorialData={tutorialData}/>)
            .toJSON();
        expect(component).toMatchSnapshot();
    });
});
