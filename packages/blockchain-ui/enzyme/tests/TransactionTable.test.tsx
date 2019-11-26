import React from 'react';
import { mount, shallow } from 'enzyme';
import TransactionTable from '../../src/components/TransactionTable/TransactionTable';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
chai.should();
chai.use(sinonChai);

describe('TransactionTable component', () => {

    let mySandBox: sinon.SinonSandbox;
    let mockTableProps: any;

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();

        mockTableProps = {
            title: 'Mock Table',
            description: 'A table that has been mocked.',
            rows: {
                id: '1',
                name: 'createAsset',
                arguments: 'AssetID: myAsset01',
                timestamp: '1:15pm',
                result: '✅'
            },
            buttonText: 'Click me',
            buttonFunction: mySandBox.stub()
        };
    });

    afterEach(async () => {
        mySandBox.restore();
    });

    it('should render the expected snapshot', async () => {
        const component: any = shallow(<TransactionTable {...mockTableProps}/>);
        expect(component.getElements()).toMatchSnapshot();
    });
});
