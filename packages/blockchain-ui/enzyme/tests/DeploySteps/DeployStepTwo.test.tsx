import React from 'react';
import renderer from 'react-test-renderer';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { ReactWrapper, mount } from 'enzyme';

import DeployStepTwo from '../../../src/components/elements/DeploySteps/DeployStepTwo/DeployStepTwo';
import IPackageRegistryEntry from '../../../src/interfaces/IPackageRegistryEntry';
import { TextInput } from 'carbon-components-react';

chai.should();
chai.use(sinonChai);

describe('DeployStepTwo component', () => {
    let mySandBox: sinon.SinonSandbox;

    let onDefinitionNameChangeStub: sinon.SinonStub;
    let onDefinitionVersionChangeStub: sinon.SinonStub;

    const packageOne: IPackageRegistryEntry = {name: 'mycontract', version: '0.0.1', path: '/package/one', sizeKB: 9000};

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();

        onDefinitionNameChangeStub = mySandBox.stub();
        onDefinitionVersionChangeStub = mySandBox.stub();
    });

    afterEach(async () => {
        mySandBox.restore();
    });

    describe('render', () => {
        it('should render the expected snapshot', () => {
            const component: any = renderer
                .create(<DeployStepTwo selectedPackage={packageOne} currentDefinitionName='' currentDefinitionVersion='' onDefinitionNameChange={onDefinitionNameChangeStub} onDefinitionVersionChange={onDefinitionVersionChangeStub} />)
                .toJSON();
            expect(component).toMatchSnapshot();
        });

        it('should show the current definition name if available', () => {

            const component: ReactWrapper<DeployStepTwo> = mount(<DeployStepTwo selectedPackage={packageOne} currentDefinitionName='definitionName' currentDefinitionVersion='' onDefinitionNameChange={onDefinitionNameChangeStub} onDefinitionVersionChange={onDefinitionVersionChangeStub} />);

            const definitionInput: ReactWrapper<any> = component.find(TextInput).at(0);
            const nameInputProps: any = definitionInput.props();
            nameInputProps.defaultValue.should.equal('definitionName');
        });

        it('should show the current definition version if available', () => {

            const component: ReactWrapper<DeployStepTwo> = mount(<DeployStepTwo selectedPackage={packageOne} currentDefinitionName='' currentDefinitionVersion='0.0.3' onDefinitionNameChange={onDefinitionNameChangeStub} onDefinitionVersionChange={onDefinitionVersionChangeStub} />);

            const definitionInput: ReactWrapper<any> = component.find(TextInput).at(1);
            const nameInputProps: any = definitionInput.props();
            nameInputProps.defaultValue.should.equal('0.0.3');
        });

    });

    describe('handleDefinitionNameChange', () => {
        it('should handle definition name change', () => {
            const component: ReactWrapper<DeployStepTwo> = mount(<DeployStepTwo selectedPackage={packageOne} currentDefinitionName='' currentDefinitionVersion='' onDefinitionNameChange={onDefinitionNameChangeStub} onDefinitionVersionChange={onDefinitionVersionChangeStub} />);
            const instance: DeployStepTwo = component.instance() as DeployStepTwo;
            const textInputData: any = {
                target: {
                    value: 'newDefinitionName'
                }
            };
            instance.handleDefinitionNameChange(textInputData);

            onDefinitionNameChangeStub.should.have.been.calledOnceWithExactly('newDefinitionName');
        });
    });

    describe('handleDefinitionVersionChange', () => {
        it('should handle definition version change', () => {
            const component: ReactWrapper<DeployStepTwo> = mount(<DeployStepTwo selectedPackage={packageOne} currentDefinitionName='' currentDefinitionVersion='' onDefinitionNameChange={onDefinitionNameChangeStub} onDefinitionVersionChange={onDefinitionVersionChangeStub} />);
            const instance: DeployStepTwo = component.instance() as DeployStepTwo;
            const textInputData: any = {
                target: {
                    value: '0.0.2'
                }
            };
            instance.handleDefinitionVersionChange(textInputData);

            onDefinitionVersionChangeStub.should.have.been.calledOnceWithExactly('0.0.2');
        });
    });

});
