import React from 'react';
import renderer from 'react-test-renderer';
import chai from 'chai';
import sinonChai from 'sinon-chai';
import DeployExplanation from '../../src/components/elements/DeployExplanation/DeployExplanation';
import TransactionOutput from '../../src/components/elements/TransactionOutput/TransactionOutput';
chai.should();
chai.use(sinonChai);

describe('DeployExplanation component', () => {
    it('should render the expected snapshot when showing the v2 deploy view', () => {
        const component: any = renderer
            .create(<DeployExplanation showV2Explanation={true}/>)
            .toJSON();
        expect(component).toMatchSnapshot();
    });

    it('should render the expected snapshot when showing the v1 deploy view', () => {
        const component: any = renderer
            .create(<DeployExplanation showV2Explanation={false}/>)
            .toJSON();
        expect(component).toMatchSnapshot();
    });
});
