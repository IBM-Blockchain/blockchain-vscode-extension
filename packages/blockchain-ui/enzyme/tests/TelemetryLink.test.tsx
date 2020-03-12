import React from 'react';
import renderer from 'react-test-renderer';
import { mount } from 'enzyme';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import TelemetryLink from '../../src/components/elements/TelemetryLink/TelemetryLink';
import Utils from '../../src/Utils';

chai.should();
chai.use(sinonChai);

describe('TelemetryLink component', () => {
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
            .create(<TelemetryLink linkContents='my link' url='www.someurl.com'/>)
            .toJSON();
        expect(component).toMatchSnapshot();
    });

    it('should send telemetry information to VS Code when clicked', () => {
        const component: any = mount(<TelemetryLink linkContents='my link' url='www.someurl.com'/>);
        component.find('a').simulate('click');
        postToVSCodeStub.should.have.been.calledOnceWithExactly({
            command: 'telemetry',
            data: 'my link'
        });
    });

    it('should add any adidtional styles provided', () => {
        const component: any = mount(<TelemetryLink linkContents='my link' url='www.someurl.com' className='some-style'/>);
        component.find('a').hasClass('some-style').should.equal(true);
    });
});
