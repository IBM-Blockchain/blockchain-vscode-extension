import React from 'react';
import renderer from 'react-test-renderer';
import { mount, ReactWrapper } from 'enzyme';
import chai from 'chai';
import sinonChai from 'sinon-chai';

import ButtonList from '../../src/components/elements/ButtonList/ButtonList';

chai.should();
chai.use(sinonChai);

describe('ButtonList component', () => {
    it('should render the expected snapshot', () => {
        const component: any = renderer
            .create(<ButtonList buttons={[]}/>)
            .toJSON();
        expect(component).toMatchSnapshot();
    });

    it('should render button', () => {
        const component: ReactWrapper<{buttons: any[]}, {}> = mount(<ButtonList buttons={[{label: 'Next', kind: 'primary', disabled: false}]}/>);
        component.text().should.equal('Next');
    });
});
