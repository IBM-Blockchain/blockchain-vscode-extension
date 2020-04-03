// tslint:disable: no-unused-expression
import React from 'react';
import { mount } from 'enzyme';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import App from '../../src/App';

chai.should();
chai.use(sinonChai);

describe('App', () => {

    let mySandBox: sinon.SinonSandbox;

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
    });

    afterEach(async () => {
        mySandBox.restore();
    });

    it('should redirect to the home page', async () => {
        const component: any = mount(<App/>);

        const msg: MessageEvent = new MessageEvent('message', {
            data: {
                path: '/home',
                version: '1.0.0'
            }
        });
        dispatchEvent(msg);
        component.state().redirectPath.should.equal('/home');
    });

    it('should redirect to the tutorial page', async () => {
        const component: any = mount(<App/>);

        const msg: MessageEvent = new MessageEvent('message', {
            data: {
                path: '/tutorials'
            }
        });
        dispatchEvent(msg);
        component.state().redirectPath.should.equal('/tutorials');
    });
});
