import React from 'react';
import renderer from 'react-test-renderer';
import { mount } from 'enzyme';
import chai from 'chai';
import sinonChai from 'sinon-chai';

import DeployProgressBar from '../../src/components/elements/DeployProgressBar/DeployProgressBar';

chai.should();
chai.use(sinonChai);

describe('DeployProgressBar component', () => {
    it('should render the expected snapshot', () => {
        const component: any = renderer
            .create(<DeployProgressBar currentIndex={0}/>)
            .toJSON();
        expect(component).toMatchSnapshot();
    });
});
