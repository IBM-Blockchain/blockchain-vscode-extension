
import React from 'react';
import renderer from 'react-test-renderer';
import TransactionCreate from '../../src/components/TransactionCreate/TransactionCreate';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
chai.should();
chai.use(sinonChai);

describe('TransactionCreate component', () => {
    let mySandbox: sinon.SinonSandbox;

    beforeEach(async () => {
        mySandbox = sinon.createSandbox();
    });

    afterEach(async () => {
        mySandbox.restore();
    });

    it('should render the expected snapshot', async () => {
        const component: any = renderer
            .create(<TransactionCreate/>)
            .toJSON();
        expect(component).toMatchSnapshot();
    });
});
