import React from 'react';
import renderer from 'react-test-renderer';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { ReactWrapper, mount } from 'enzyme';

import DeployStepTwo from '../../../src/components/elements/DeploySteps/DeployStepTwo/DeployStepTwo';
import IPackageRegistryEntry from '../../../src/interfaces/IPackageRegistryEntry';
import { TextInput, FileUploaderItem } from 'carbon-components-react';

chai.should();
chai.use(sinonChai);

// tslint:disable no-unused-expression

describe('DeployStepTwo component', () => {
    let mySandBox: sinon.SinonSandbox;

    let onDefinitionNameChangeStub: sinon.SinonStub;
    let onDefinitionVersionChangeStub: sinon.SinonStub;
    let onCollectionChangeStub: sinon.SinonStub;

    const packageOne: IPackageRegistryEntry = {name: 'mycontract', version: '0.0.1', path: '/package/one', sizeKB: 9000};

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();

        onDefinitionNameChangeStub = mySandBox.stub();
        onDefinitionVersionChangeStub = mySandBox.stub();
        onCollectionChangeStub = mySandBox.stub();
    });

    afterEach(async () => {
        mySandBox.restore();
    });

    describe('render', () => {
        it('should render the expected snapshot', () => {
            const component: any = renderer
                .create(<DeployStepTwo selectedPackage={packageOne} currentDefinitionName='' currentDefinitionVersion='' currentCollectionFile={undefined} onDefinitionNameChange={onDefinitionNameChangeStub} onDefinitionVersionChange={onDefinitionVersionChangeStub} onCollectionChange={onCollectionChangeStub} />)
                .toJSON();
            expect(component).toMatchSnapshot();
        });

        it('should show the current definition name if available', () => {

            const component: ReactWrapper<DeployStepTwo> = mount(<DeployStepTwo selectedPackage={packageOne} currentDefinitionName='definitionName' currentDefinitionVersion='' currentCollectionFile={undefined} onDefinitionNameChange={onDefinitionNameChangeStub} onDefinitionVersionChange={onDefinitionVersionChangeStub} onCollectionChange={onCollectionChangeStub} />);

            const definitionInput: ReactWrapper<any> = component.find(TextInput).at(0);
            const nameInputProps: any = definitionInput.props();
            nameInputProps.defaultValue.should.equal('definitionName');
        });

        it('should show the current definition version if available', () => {

            const component: ReactWrapper<DeployStepTwo> = mount(<DeployStepTwo selectedPackage={packageOne} currentDefinitionName='' currentDefinitionVersion='0.0.3' currentCollectionFile={undefined} onDefinitionNameChange={onDefinitionNameChangeStub} onDefinitionVersionChange={onDefinitionVersionChangeStub} onCollectionChange={onCollectionChangeStub} />);

            const definitionInput: ReactWrapper<any> = component.find(TextInput).at(1);
            const nameInputProps: any = definitionInput.props();
            nameInputProps.defaultValue.should.equal('0.0.3');
        });

        it('should show uploaded collection', () => {
            const file: File = new File([], 'someFile');
            const component: ReactWrapper<DeployStepTwo> = mount(<DeployStepTwo selectedPackage={packageOne} currentDefinitionName='' currentDefinitionVersion='0.0.3' currentCollectionFile={file} onDefinitionNameChange={onDefinitionNameChangeStub} onDefinitionVersionChange={onDefinitionVersionChangeStub} onCollectionChange={onCollectionChangeStub} />);
            const uploadItem: ReactWrapper<any> = component.find(FileUploaderItem).at(0);
            const html: string = uploadItem.html();
            html.includes(`<p class="bx--file-filename">${file.name}</p>`).should.equal(true);
        });

    });

    describe('handleDefinitionNameChange', () => {
        it('should handle definition name change', () => {
            const component: ReactWrapper<DeployStepTwo> = mount(<DeployStepTwo selectedPackage={packageOne} currentDefinitionName='' currentDefinitionVersion='' currentCollectionFile={undefined} onDefinitionNameChange={onDefinitionNameChangeStub} onDefinitionVersionChange={onDefinitionVersionChangeStub} onCollectionChange={onCollectionChangeStub} />);
            const instance: DeployStepTwo = component.instance() as DeployStepTwo;
            const textInputData: any = {
                target: {
                    value: 'newDefinitionName'
                }
            };

            const isNameInvalidStub: sinon.SinonStub = mySandBox.stub(instance, 'isNameInvalid').returns(false);

            instance.handleDefinitionNameChange(textInputData);

            isNameInvalidStub.should.have.been.calledOnceWithExactly('newDefinitionName');
            onDefinitionNameChangeStub.should.have.been.calledOnceWithExactly('newDefinitionName', false);
        });
    });

    describe('handleDefinitionVersionChange', () => {
        it('should handle definition version change', () => {
            const component: ReactWrapper<DeployStepTwo> = mount(<DeployStepTwo selectedPackage={packageOne} currentDefinitionName='' currentDefinitionVersion='' currentCollectionFile={undefined} onDefinitionNameChange={onDefinitionNameChangeStub} onDefinitionVersionChange={onDefinitionVersionChangeStub} onCollectionChange={onCollectionChangeStub} />);
            const instance: DeployStepTwo = component.instance() as DeployStepTwo;
            const textInputData: any = {
                target: {
                    value: '0.0.2'
                }
            };

            const isVersionInvalidStub: sinon.SinonStub = mySandBox.stub(instance, 'isVersionInvalid').returns(false);

            instance.handleDefinitionVersionChange(textInputData);

            isVersionInvalidStub.should.have.been.calledOnceWithExactly('0.0.2');
            onDefinitionVersionChangeStub.should.have.been.calledOnceWithExactly('0.0.2', false);
        });
    });

    describe('isNameInvalid', () => {
        it('should handle empty name', async () => {
            const component: ReactWrapper<DeployStepTwo> = mount(<DeployStepTwo selectedPackage={packageOne} currentDefinitionName='' currentDefinitionVersion='' currentCollectionFile={undefined} onDefinitionNameChange={onDefinitionNameChangeStub} onDefinitionVersionChange={onDefinitionVersionChangeStub} onCollectionChange={onCollectionChangeStub} />);
            const instance: DeployStepTwo = component.instance() as DeployStepTwo;

            const result: boolean = instance.isNameInvalid('');
            result.should.equal(true);
        });

        it('should handle invalid name', async () => {
            const component: ReactWrapper<DeployStepTwo> = mount(<DeployStepTwo selectedPackage={packageOne} currentDefinitionName='' currentDefinitionVersion='' currentCollectionFile={undefined} onDefinitionNameChange={onDefinitionNameChangeStub} onDefinitionVersionChange={onDefinitionVersionChangeStub} onCollectionChange={onCollectionChangeStub} />);
            const instance: DeployStepTwo = component.instance() as DeployStepTwo;

            const result: boolean = instance.isNameInvalid('invalid#name');
            result.should.equal(true);
        });

        it('should handle valid name', async () => {
            const component: ReactWrapper<DeployStepTwo> = mount(<DeployStepTwo selectedPackage={packageOne} currentDefinitionName='' currentDefinitionVersion='' currentCollectionFile={undefined} onDefinitionNameChange={onDefinitionNameChangeStub} onDefinitionVersionChange={onDefinitionVersionChangeStub} onCollectionChange={onCollectionChangeStub} />);
            const instance: DeployStepTwo = component.instance() as DeployStepTwo;

            const result: boolean = instance.isNameInvalid('valid_contract-name-123');
            result.should.equal(false);
        });
    });

    describe('isVersionInvalid', () => {
        it('should handle empty version', async () => {
            const component: ReactWrapper<DeployStepTwo> = mount(<DeployStepTwo selectedPackage={packageOne} currentDefinitionName='' currentDefinitionVersion='' currentCollectionFile={undefined} onDefinitionNameChange={onDefinitionNameChangeStub} onDefinitionVersionChange={onDefinitionVersionChangeStub} onCollectionChange={onCollectionChangeStub} />);
            const instance: DeployStepTwo = component.instance() as DeployStepTwo;

            const result: boolean = instance.isVersionInvalid('');
            result.should.equal(true);
        });

        it('should handle valid version', async () => {
            const component: ReactWrapper<DeployStepTwo> = mount(<DeployStepTwo selectedPackage={packageOne} currentDefinitionName='' currentDefinitionVersion='' currentCollectionFile={undefined} onDefinitionNameChange={onDefinitionNameChangeStub} onDefinitionVersionChange={onDefinitionVersionChangeStub} onCollectionChange={onCollectionChangeStub} />);
            const instance: DeployStepTwo = component.instance() as DeployStepTwo;

            const result: boolean = instance.isVersionInvalid('0.0.1');
            result.should.equal(false);
        });
    });

    describe('collectionChange', () => {
        it('should pass a file to parent if selected', () => {
            const component: ReactWrapper<DeployStepTwo> = mount(<DeployStepTwo selectedPackage={packageOne} currentDefinitionName='' currentDefinitionVersion='' currentCollectionFile={undefined} onDefinitionNameChange={onDefinitionNameChangeStub} onDefinitionVersionChange={onDefinitionVersionChangeStub} onCollectionChange={onCollectionChangeStub} />);
            const instance: DeployStepTwo = component.instance() as DeployStepTwo;

            const file: File = new File([], 'someFile');
            const event: any = {
                target: {
                    files: [
                        file
                    ]
                }
            };

            instance.collectionChange(event);

            onCollectionChangeStub.should.have.been.calledOnceWithExactly(file);
        });

        it('should not pass a file to parent if not selected', () => {
            const component: ReactWrapper<DeployStepTwo> = mount(<DeployStepTwo selectedPackage={packageOne} currentDefinitionName='' currentDefinitionVersion='' currentCollectionFile={undefined} onDefinitionNameChange={onDefinitionNameChangeStub} onDefinitionVersionChange={onDefinitionVersionChangeStub} onCollectionChange={onCollectionChangeStub} />);
            const instance: DeployStepTwo = component.instance() as DeployStepTwo;

            const event: any = {
                target: {
                    files: []
                }
            };

            instance.collectionChange(event);

            onCollectionChangeStub.should.not.have.been.called;
        });
    });
});
