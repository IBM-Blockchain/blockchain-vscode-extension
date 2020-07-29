import React from 'react';
import renderer from 'react-test-renderer';
import chai from 'chai';
import sinonChai from 'sinon-chai';

import Fabric2Page from '../../src/components/pages/Fabric2Page/Fabric2Page';

chai.should();
chai.use(sinonChai);

describe('Fabric2Page component', () => {
    it('should render the expected snapshot', () => {
        const component: any = renderer
            .create(<Fabric2Page/>)
            .toJSON();
        expect(component).toMatchSnapshot();
    });
});
