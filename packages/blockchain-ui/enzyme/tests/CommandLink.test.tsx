import React from 'react';
import renderer from 'react-test-renderer';
import { mount, ReactWrapper } from 'enzyme';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import CommandLink from '../../src/components/elements/CommandLink/CommandLink';
import Utils from '../../src/Utils';

chai.should();
chai.use(sinonChai);

interface IProps {
    commandName: string;
    linkContents: string;
    className?: string;
    commandData?: any;
    id?: string;
}

describe('CommandLink component', () => {
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
            .create(<CommandLink linkContents='my link' commandName='my command'/>)
            .toJSON();
        expect(component).toMatchSnapshot();
    });

    it('should call a command in VS Code when clicked', () => {
        const component: ReactWrapper<IProps> = mount(<CommandLink linkContents='my link' commandName='my command'/>);
        component.find('a').simulate('click');
        postToVSCodeStub.should.have.been.calledOnceWithExactly({
            command: 'my command'
        });
    });

    it('should post additional information to VS Code when provided', () => {
        const component: ReactWrapper<IProps> = mount(<CommandLink linkContents='my link' commandName='my command' commandData={['additional', 'information']}/>);
        component.find('a').simulate('click');
        postToVSCodeStub.should.have.been.calledOnceWithExactly({
            command: 'my command',
            data: ['additional', 'information']
        });
    });

    it('should add any additional styles provided', () => {
        const component: ReactWrapper<IProps> = mount(<CommandLink linkContents='my link' commandName='my command' className='some-style'/>);
        component.find('a').hasClass('some-style').should.equal(true);
    });
});
