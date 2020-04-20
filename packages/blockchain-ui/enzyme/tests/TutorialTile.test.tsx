import React from 'react';
import renderer from 'react-test-renderer';
import chai from 'chai';
import sinonChai from 'sinon-chai';

import TutorialTile from '../../src/components/elements/TutorialTile/TutorialTile';
import { mount, ReactWrapper } from 'enzyme';

chai.should();
chai.use(sinonChai);

// tslint:disable: no-unused-expression

describe('TutorialTile component', () => {

    const tutorialObject: any = {
            title: 'a1',
            firstInSeries: true,
            length: '4 weeks',
            objectives: [
                'objective 1',
                'objective 2',
                'objective 3'
            ],
            file: 'some/file/path'
    };

    it('should render the expected snapshot', () => {
        const component: any = renderer
            .create(<TutorialTile tutorialObject={tutorialObject}/>)
            .toJSON();
        expect(component).toMatchSnapshot();
    });

    it('should render a primary button if tutorial is first in series', () => {
        const component: ReactWrapper<{tutorialObject: any}, {}> = mount(<TutorialTile tutorialObject={tutorialObject}/>);
        component.find('button').at(1).hasClass('bx--btn--primary').should.equal(true);
    });

    it('should render a secondary button if tutorial is not first in series', () => {
        const anotherTutorialObject: any = {
            title: 'a4',
            length: '3 weeks',
            objectives: [
                'objective 1',
                'objective 2',
                'objective 3'
            ],
            file: 'some/file/path'
        };
        const component: ReactWrapper<{tutorialObject: any}, {}> = mount(<TutorialTile tutorialObject={anotherTutorialObject}/>);
        component.find('button').at(1).hasClass('bx--btn--secondary').should.equal(true);
    });

});
