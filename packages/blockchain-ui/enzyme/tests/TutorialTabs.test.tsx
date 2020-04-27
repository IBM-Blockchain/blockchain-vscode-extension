import React from 'react';
import renderer from 'react-test-renderer';
import chai from 'chai';
import sinonChai from 'sinon-chai';

import TutorialTabs from '../../src/components/elements/TutorialTabs/TutorialTabs';
import ITutorialObject from '../../src/interfaces/ITutorialObject';

chai.should();
chai.use(sinonChai);

describe('TutorialTabs component', () => {

    const tutorialData: Array<{name: string, tutorials: ITutorialObject[]}> = [
        {
            name: 'Basic tutorials',
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
            name: 'Other tutorials',
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
});
