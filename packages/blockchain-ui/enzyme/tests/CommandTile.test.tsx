import React from 'react';
import renderer from 'react-test-renderer';
import { mount, ReactWrapper } from 'enzyme';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import CommandTile from '../../src/components/elements/CommandTile/CommandTile';
import Utils from '../../src/Utils';

chai.should();
chai.use(sinonChai);

interface IProps {
    title: string;
    body: string;
    options: { actionType: 'app' | 'vscode', command?: string, path?: string };
}

describe('CommandTile component', () => {
    let mySandBox: sinon.SinonSandbox;
    let postToVSCodeStub: sinon.SinonStub;
    let changeRouteStub: sinon.SinonStub;

    beforeEach(() => {
        mySandBox = sinon.createSandbox();
        postToVSCodeStub = mySandBox.stub(Utils, 'postToVSCode').resolves();
        changeRouteStub = mySandBox.stub(Utils, 'changeRoute').resolves();
    });

    afterEach(() => {
        mySandBox.restore();
    });

    it('should render the expected snapshot', () => {
        const options: {actionType: 'app' | 'vscode', command: string} = {
            actionType: 'vscode',
            command: 'some_command'
        };

        const component: any = renderer
            .create(<CommandTile title='My Tile' body='Some text I want to display in my tile' options={options}/>)
            .toJSON();
        expect(component).toMatchSnapshot();
    });

    it('should post to VS Code', () => {
        const options: {actionType: 'app' | 'vscode', command: string} = {
            actionType: 'vscode',
            command: 'some_command'
        };

        const component: ReactWrapper<IProps> = mount(<CommandTile title='My Tile' body='Some text I want to display in my tile' options={options}/>);
        component.find('.bx--tile').simulate('click');
        postToVSCodeStub.should.have.been.calledOnceWithExactly({
            command: options.command
        });
    });

    it('should redirect to another link in the app', () => {
        const options: {actionType: 'app' | 'vscode', path: string} = {
            actionType: 'app',
            path: 'some/path'
        };

        const component: ReactWrapper<IProps> = mount(<CommandTile title='My Tile' body='Some text I want to display in my tile' options={options}/>);
        component.find('.bx--tile').simulate('click');
        changeRouteStub.should.have.been.calledOnceWithExactly(options.path);
    });
});
