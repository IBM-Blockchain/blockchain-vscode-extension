import React from 'react';
import renderer from 'react-test-renderer';
import { mount, ReactWrapper } from 'enzyme';
import chai from 'chai';
import sinonChai from 'sinon-chai';

import HeadingCombo from '../../src/components/elements/HeadingCombo/HeadingCombo';

chai.should();
chai.use(sinonChai);

interface IProps {
    comboStyle?: string;
    headingText: string;
    headingStyle?: string;
    subheadingText: string;
    subheadingStyle?: string;
}

describe('HeadingCombo component', () => {
    it('should render the expected snapshot', () => {
        const component: any = renderer
            .create(<HeadingCombo headingText='Here Is A Heading' subheadingText='And here is a subheading'/>)
            .toJSON();
        expect(component).toMatchSnapshot();
    });

    it('should apply any additional styles that are provided', () => {
        const component: ReactWrapper<IProps> = mount (
            <HeadingCombo
                headingText='Here Is A Heading'
                subheadingText='And here is a subheading'
                comboStyle='extra-style-1'
                headingStyle='extra-style-2'
                subheadingStyle='extra-style-3'
            />
        );
        component.find('div').hasClass('extra-style-1').should.equal(true);
        component.find('h3').hasClass('extra-style-2').should.equal(true);
        component.find('p').hasClass('extra-style-3').should.equal(true);
    });
});
