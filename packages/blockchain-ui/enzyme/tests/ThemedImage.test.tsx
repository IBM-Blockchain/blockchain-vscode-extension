import React from 'react';
import renderer from 'react-test-renderer';
import { mount } from 'enzyme';
import chai from 'chai';
import sinonChai from 'sinon-chai';

import ThemedImage from '../../src/components/elements/ThemedImage/ThemedImage';
import lightImg from '../../src/resources/devLearnerLight.svg';
import darkImg from '../../src/resources/devLearnerDark.svg';

chai.should();
chai.use(sinonChai);

describe('ThemedImage component', () => {
    it('should render the expected snapshot', () => {
        const component: any = renderer
            .create(<ThemedImage lightImg={lightImg} darkImg={darkImg} altText='' id='test-themed-image'/>)
            .toJSON();
        expect(component).toMatchSnapshot();
    });

    it('should add any additional styles provided', () => {
        const component: any = mount(<ThemedImage lightImg={lightImg} darkImg={darkImg} altText='' id='test-themed-image' className='some-class'/>);
        component.find('img').at(0).hasClass('some-class').should.equal(true);
        component.find('img').at(1).hasClass('some-class').should.equal(true);
    });
});
