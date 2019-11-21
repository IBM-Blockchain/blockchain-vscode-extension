import React from 'react';
import renderer from 'react-test-renderer';
import TransactionSidebar from '../../src/components/TransactionSidebar/TransactionSidebar';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
chai.should();
chai.use(sinonChai);

describe('TransactionSidebar component', () => {

    let mySandBox: sinon.SinonSandbox;

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
    });

    afterEach(async () => {
        mySandBox.restore();
    });

    it('should render the expected snapshot', async () => {
        const component: any = renderer
            .create(<TransactionSidebar/>)
            .toJSON();
        expect(component).toMatchSnapshot();
    });

});
