import React from 'react';
import renderer from 'react-test-renderer';
import chai from 'chai';
import sinonChai from 'sinon-chai';

import TutorialPage from '../../src/components/pages/TutorialPage/TutorialPage';

chai.should();
chai.use(sinonChai);

describe('TutorialPage component', () => {

    const tutorialData: Array<{seriesName: string, seriesTutorials: any[]}> = [
        {
            seriesName: 'Basic tutorials',
            seriesTutorials: [
                {
                    title: 'a1',
                    length: '4 weeks',
                    file: 'some/file/path'
                }
            ]
        },
        {
            seriesName: 'Other tutorials',
            seriesTutorials: [
                {
                    title: 'something really interesting',
                    length: '10 minutes',
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
