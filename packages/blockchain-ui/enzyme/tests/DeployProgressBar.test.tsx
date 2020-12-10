import React from 'react';
import renderer from 'react-test-renderer';
import chai from 'chai';
import sinonChai from 'sinon-chai';

import DeployProgressBar from '../../src/components/elements/DeployProgressBar/DeployProgressBar';

chai.should();
chai.use(sinonChai);

describe('DeployProgressBar component', () => {
    it('should render the expected snapshot when showing v1 deploy view', () => {
        const component: any = renderer
            .create(<DeployProgressBar currentIndex={0} hasV1Capabilities={false}/>)
            .toJSON();
        expect(component).toMatchSnapshot();
    });

    it('should render the expected snapshot when showing v2 deploy view', () => {
        const component: any = renderer
            .create(<DeployProgressBar currentIndex={0} hasV1Capabilities={true}/>)
            .toJSON();
        expect(component).toMatchSnapshot();
    });
});
