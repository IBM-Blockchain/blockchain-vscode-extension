import React from 'react';
import renderer from 'react-test-renderer';
import TransactionViewPage from '../../src/components/TransactionViewPage/TransactionViewPage';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
chai.should();
chai.use(sinonChai);

describe('TransactionViewPage component', () => {

    let mySandBox: sinon.SinonSandbox;

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
    });

    afterEach(async () => {
        mySandBox.restore();
    });

    it('should render the expected snapshot', async () => {
        const component: any = renderer
            .create(<TransactionViewPage activeSmartContract="penguinContract@0.0.1"/>)
            .toJSON();
        expect(component).toMatchSnapshot();
    });   

});
