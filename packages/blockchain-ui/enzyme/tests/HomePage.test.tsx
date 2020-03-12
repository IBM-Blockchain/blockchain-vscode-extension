import React from 'react';
import renderer from 'react-test-renderer';
import chai from 'chai';
import sinonChai from 'sinon-chai';

import HomePage from '../../src/components/pages/HomePage/HomePage';

chai.should();
chai.use(sinonChai);

describe('HomePage component', () => {
    it('should render the expected snapshot', () => {
        const component: any = renderer
            .create(<HomePage extensionVersion='1.0.0'/>)
            .toJSON();
        expect(component).toMatchSnapshot();
    });
});
