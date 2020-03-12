import React from 'react';
import renderer from 'react-test-renderer';
import { mount } from 'enzyme';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import CustomTile from '../../src/components/elements/CustomTile/CustomTile';
import Utils from '../../src/Utils';
import { ExtensionCommands } from '../../src/ExtensionCommands';

chai.should();
chai.use(sinonChai);

describe('CustomTile component', () => {
    let mySandBox: sinon.SinonSandbox;
    let postToVSCodeStub: sinon.SinonStub;

    beforeEach(() => {
        mySandBox = sinon.createSandbox();
        postToVSCodeStub = mySandBox.stub(Utils, 'postToVSCode').resolves();
    });

    afterEach(() => {
        mySandBox.restore();
    });

    it('should render the expected snapshot', () => {
        const component: any = renderer
            .create(<CustomTile title='My Tile' body='Some text I want to display in my tile'/>)
            .toJSON();
        expect(component).toMatchSnapshot();
    });

    it('should post to VS Code when the new tab button is clicked', () => {
        const component: any = mount(<CustomTile title='My Tile' body='Some text I want to display in my tile'/>);
        component.find('img').simulate('click');
        postToVSCodeStub.should.have.been.calledOnceWithExactly({
            command: ExtensionCommands.OPEN_TUTORIAL_GALLERY
        });
    });
});
