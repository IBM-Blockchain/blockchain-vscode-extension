import React from 'react';
import renderer from 'react-test-renderer';
import TransactionViewSidebar from '../../src/components/TransactionViewSidebar/TransactionViewSidebar';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
chai.should();
chai.use(sinonChai);

describe('TransactionViewSidebar component', () => {

    let mySandBox: sinon.SinonSandbox;
    
    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
    });

    afterEach(async () => {
        mySandBox.restore();
    });

    it('should render the expected snapshot', async () => {
        const component: any = renderer
            .create(<TransactionViewSidebar/>)
            .toJSON();
        expect(component).toMatchSnapshot();
    });

});
