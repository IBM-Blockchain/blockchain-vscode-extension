import React from 'react';
import renderer from 'react-test-renderer';
import chai from 'chai';
import sinonChai from 'sinon-chai';

import TutorialPage from '../../src/components/pages/TutorialPage/TutorialPage';

chai.should();
chai.use(sinonChai);

describe('TutorialPage component', () => {
    it('should render the expected snapshot', () => {
        const component: any = renderer
            .create(<TutorialPage/>)
            .toJSON();
        expect(component).toMatchSnapshot();
    });
});
