import React from 'react';
import { shallow } from 'enzyme';
import { mount } from 'enzyme';
import App from '../../src/App';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
chai.should();
chai.use(sinonChai);

describe('App', () => {
    it('should bla bla', async() => {
        const wrapper = shallow(<App />);
        expect(wrapper.find(Foo)).to.have.lengthOf(3);
    });
});
