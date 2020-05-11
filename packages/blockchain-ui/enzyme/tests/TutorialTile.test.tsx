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
    let postToVSCodeStub: sinon.SinonStub;

    beforeEach(() => {
        mySandBox = sinon.createSandbox();
        postToVSCodeStub = mySandBox.stub(Utils, 'postToVSCode').resolves();
    });

    afterEach(() => {
        mySandBox.restore();
    });

    const tutorialObject: ITutorialObject = {
            title: 'a1',
            series: 'Basic tutorials',
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
        const component: ReactWrapper<IProps> = mount(<TutorialTile tutorialObject={tutorialObject}/>);
        component.find('button').at(1).hasClass('bx--btn--primary').should.equal(true);
    });

    it('should render a secondary button if tutorial is not first in series', () => {
        const anotherTutorialObject: ITutorialObject = {
            title: 'a4',
            series: 'Basic tutorials',
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
        const component: ReactWrapper<IProps> = mount(<TutorialTile tutorialObject={tutorialObject}/>);
        component.find('button').at(1).simulate('click');
        postToVSCodeStub.should.have.been.calledOnceWithExactly({
            command: ExtensionCommands.OPEN_TUTORIAL_PAGE,
            data: [
                tutorialObject.series,
                tutorialObject.title
            ]
        });
        component.find('button').at(1).hasClass('bx--btn--primary').should.equal(true);
    });

    it('should test user is able to download a tutorial as a pdf', () => {

        const component: ReactWrapper<IProps> = mount(<TutorialTile tutorialObject={tutorialObject}/>);

        component.find('button').at(0).simulate('click');
        postToVSCodeStub.should.have.been.calledOnceWithExactly({
            command: ExtensionCommands.SAVE_TUTORIAL_AS_PDF,
            data: [
                tutorialObject
            ]
        });
        component.find('button').at(0).hasClass('bx--btn--ghost').should.equal(true);
    });

    it('should show badge available if the tutorial has a badge available', () => {
        const anotherTutorialObject: ITutorialObject = {
            title: 'a4',
            length: '3 weeks',
            badge: true,
            file: 'some/file/path',
            series: 'someSeries',
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
