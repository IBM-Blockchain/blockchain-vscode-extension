import React from 'react';
import renderer from 'react-test-renderer';
import InlineSelect from '../../src/components/elements/InlineSelect/InlineSelect';
import { SelectItem } from 'carbon-components-react';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
chai.should();
chai.use(sinonChai);

describe('InlineSelect component', () => {

    let mySandBox: sinon.SinonSandbox;

    const mockOptions: Array<JSX.Element> = [
        <SelectItem disabled={false} hidden={false} text='Inline Select Option 1' value={'Inline Select Option 1'}/>,
        <SelectItem disabled={false} hidden={false} text='Inline Select Option 2' value={'Inline Select Option 2'}/>
    ];

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
    });

    afterEach(async () => {
        mySandBox.restore();
    });

    it('should render the expected snapshot', () => {
        const onChangeStub: sinon.SinonStub = mySandBox.stub();
        const component: any = renderer
            .create(<InlineSelect id='my-inline-select' labelText='My Inline Select' contents={mockOptions} onChangeCallback={onChangeStub}/>)
            .toJSON();
        expect(component).toMatchSnapshot();
    });
});
