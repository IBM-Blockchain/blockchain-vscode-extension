import React from 'react';
import renderer from 'react-test-renderer';
import { mount, ReactWrapper } from 'enzyme';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import TutorialTile from '../../src/components/elements/TutorialTile/TutorialTile';
import ITutorialObject from '../../src/interfaces/ITutorialObject';
import Utils from '../../src/Utils';
import { ExtensionCommands } from '../../src/ExtensionCommands';

chai.should();
chai.use(sinonChai);

// tslint:disable no-unused-expression
interface IProps {
    tutorialObject: ITutorialObject;
}

describe('TutorialTile component', () => {
    let mySandBox: sinon.SinonSandbox;
    const tutorialObject: ITutorialObject = {
            title: 'a1',
            series: 'my series',
            firstInSeries: true,
            length: '4 weeks',
            objectives: [
                'objective 1',
                'objective 2',
                'objective 3'
            ],
            file: 'some/file/path'
    };

    beforeEach(() => {
        mySandBox = sinon.createSandbox();
    });

    it('should render the expected snapshot', () => {
        const component: any = renderer
            .create(<TutorialTile tutorialObject={tutorialObject}/>)
            .toJSON();
        expect(component).toMatchSnapshot();
    });

    it('should render a primary button if tutorial is first in series', () => {
        const component: ReactWrapper<IProps> = mount(<TutorialTile tutorialObject={tutorialObject}/>);
        component.find('button').at(1).hasClass('bx--btn--primary').should.equal(true);
    });

    it('should render a secondary button if tutorial is not first in series', () => {
        const anotherTutorialObject: ITutorialObject = {
            title: 'a4',
            series: 'my series',
            length: '3 weeks',
            objectives: [
                'objective 1',
                'objective 2',
                'objective 3'
            ],
            file: 'some/file/path'
        };
        const component: ReactWrapper<IProps> = mount(<TutorialTile tutorialObject={anotherTutorialObject}/>);
        component.find('button').at(1).hasClass('bx--btn--secondary').should.equal(true);
    });

    it(`should post a message to VS Code when the 'Open tutorial' button is clicked`, () => {
        const postToVSCodeStub: sinon.SinonStub = mySandBox.stub(Utils, 'postToVSCode').resolves();
        const component: ReactWrapper<IProps> = mount(<TutorialTile tutorialObject={tutorialObject}/>);
        component.find('button').at(1).simulate('click');
        postToVSCodeStub.should.have.been.calledOnceWithExactly({
            command: ExtensionCommands.OPEN_REACT_TUTORIAL_PAGE,
            data: [
                tutorialObject.series,
                tutorialObject.title
            ]
        });
    });

    it('should show badge available if the tutorial has a badge available', () => {
        const anotherTutorialObject: any = {
            title: 'a4',
            length: '3 weeks',
            badge: true,
            file: 'some/file/path',
            objectives: [
                'objective 1',
                'objective 2',
                'objective 3'
            ]
        };
        const component: ReactWrapper<IProps> = mount(<TutorialTile tutorialObject={anotherTutorialObject}/>);
        component.text().includes('Badge available').should.be.true;
    });

});
