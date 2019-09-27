import React from 'react';
import { Component } from 'react';
import { mount, ShallowWrapper, shallow } from 'enzyme';
import OneComponent from '../../src/components/OneComponent';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
chai.should();
chai.use(sinonChai);
const should: Chai.Should = chai.should();
describe('hello', () => {

    let mySandBox: sinon.SinonSandbox;
    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
    });

    it('should do something', async () => {
        const mountedComponent: any = mount(<OneComponent />);
        const html: string = mountedComponent.html();
        should.exist(html);
    });
});
