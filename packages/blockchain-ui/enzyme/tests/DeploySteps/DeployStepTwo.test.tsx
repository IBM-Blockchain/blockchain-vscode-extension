import React from 'react';
import renderer from 'react-test-renderer';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { ReactWrapper, mount } from 'enzyme';

import DeployStepTwo from '../../../src/components/elements/DeploySteps/DeployStepTwo/DeployStepTwo';
import IPackageRegistryEntry from '../../../src/interfaces/IPackageRegistryEntry';
import { TextInput, FileUploaderItem, PropTypes } from 'carbon-components-react';

chai.should();
chai.use(sinonChai);

// tslint:disable no-unused-expression

describe('DeployStepTwo component', () => {
    let mySandBox: sinon.SinonSandbox;

    let onDefinitionNameChangeStub: sinon.SinonStub;
    let onDefinitionVersionChangeStub: sinon.SinonStub;
    let onCollectionChangeStub: sinon.SinonStub;
    let onEndorsementPolicyChangeStub: sinon.SinonStub;
    let enableOrDisableNextStub: sinon.SinonStub;

    const packageOne: IPackageRegistryEntry = { name: 'mycontract', version: '0.0.1', path: '/package/one', sizeKB: 9000 };

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();

        onDefinitionNameChangeStub = mySandBox.stub();
        onDefinitionVersionChangeStub = mySandBox.stub();
        onCollectionChangeStub = mySandBox.stub();
        onEndorsementPolicyChangeStub = mySandBox.stub();
        enableOrDisableNextStub = mySandBox.stub();
    });

    afterEach(async () => {
        mySandBox.restore();
    });

    describe('render', () => {
        it('should render the expected snapshot', () => {
            const component: any = renderer
                .create(<DeployStepTwo hasV1Capabilities={false} selectedPackage={packageOne} currentDefinitionName='' currentDefinitionVersion='' currentCollectionFile={undefined} committedDefinitions={[]} endorsementPolicy={undefined} onDefinitionNameChange={onDefinitionNameChangeStub} onDefinitionVersionChange={onDefinitionVersionChangeStub} onCollectionChange={onCollectionChangeStub} onEndorsementPolicyChange={onEndorsementPolicyChangeStub} enableOrDisableNext={enableOrDisableNextStub} />)
                .toJSON();
            expect(component).toMatchSnapshot();
        });

        it('should show the current definition name if available', () => {

            const component: ReactWrapper<DeployStepTwo> = mount(<DeployStepTwo hasV1Capabilities={false} selectedPackage={packageOne} currentDefinitionName='definitionName' currentDefinitionVersion='' currentCollectionFile={undefined} committedDefinitions={[]} endorsementPolicy={undefined} onDefinitionNameChange={onDefinitionNameChangeStub} onDefinitionVersionChange={onDefinitionVersionChangeStub} onCollectionChange={onCollectionChangeStub} onEndorsementPolicyChange={onEndorsementPolicyChangeStub} enableOrDisableNext={enableOrDisableNextStub} />);

            const definitionInput: ReactWrapper<any> = component.find(TextInput).at(0);
            const nameInputProps: any = definitionInput.props();
            nameInputProps.defaultValue.should.equal('definitionName');
        });

        it('should show the current definition version if available', () => {

            const component: ReactWrapper<DeployStepTwo> = mount(<DeployStepTwo hasV1Capabilities={false} selectedPackage={packageOne} currentDefinitionName='' currentDefinitionVersion='0.0.3' currentCollectionFile={undefined} committedDefinitions={[]} endorsementPolicy={undefined} onDefinitionNameChange={onDefinitionNameChangeStub} onDefinitionVersionChange={onDefinitionVersionChangeStub} onCollectionChange={onCollectionChangeStub} onEndorsementPolicyChange={onEndorsementPolicyChangeStub} enableOrDisableNext={enableOrDisableNextStub} />);

            const definitionInput: ReactWrapper<any> = component.find(TextInput).at(1);
            const nameInputProps: any = definitionInput.props();
            nameInputProps.defaultValue.should.equal('0.0.3');
        });

        it('should show uploaded collection', () => {
            const file: File = new File([], 'someFile');
            const component: ReactWrapper<DeployStepTwo> = mount(<DeployStepTwo hasV1Capabilities={false} selectedPackage={packageOne} currentDefinitionName='' currentDefinitionVersion='0.0.3' currentCollectionFile={file} committedDefinitions={[]} endorsementPolicy={undefined} onDefinitionNameChange={onDefinitionNameChangeStub} onDefinitionVersionChange={onDefinitionVersionChangeStub} onCollectionChange={onCollectionChangeStub} onEndorsementPolicyChange={onEndorsementPolicyChangeStub} enableOrDisableNext={enableOrDisableNextStub} />);
            const uploadItem: ReactWrapper<any> = component.find(FileUploaderItem).at(0);
            const html: string = uploadItem.html();
            html.includes(`<p class="bx--file-filename">${file.name}</p>`).should.equal(true);
        });

        it('should let user know if a contract with the same definition name already exists', () => {
            const component: ReactWrapper<DeployStepTwo> = mount(<DeployStepTwo hasV1Capabilities={false} selectedPackage={packageOne} currentDefinitionName={packageOne.name} currentDefinitionVersion='0.0.5' currentCollectionFile={undefined} committedDefinitions={[`${packageOne.name}@${packageOne.version}`]} endorsementPolicy={undefined} onDefinitionNameChange={onDefinitionNameChangeStub} onDefinitionVersionChange={onDefinitionVersionChangeStub} onCollectionChange={onCollectionChangeStub} onEndorsementPolicyChange={onEndorsementPolicyChangeStub} enableOrDisableNext={enableOrDisableNextStub} />);
            const html: string = component.html();
            html.includes('This deployment will update the existing smart contract. Alternatively, provide a new name to deploy as a new definition.').should.equal(true);
        });

        it('should let user know if a contract with the same definition name and version already exists', () => {
            const component: ReactWrapper<DeployStepTwo> = mount(<DeployStepTwo hasV1Capabilities={false} selectedPackage={packageOne} currentDefinitionName={packageOne.name} currentDefinitionVersion={packageOne.version as string} currentCollectionFile={undefined} committedDefinitions={[`${packageOne.name}@${packageOne.version}`]} endorsementPolicy={undefined} onDefinitionNameChange={onDefinitionNameChangeStub} onDefinitionVersionChange={onDefinitionVersionChangeStub} onCollectionChange={onCollectionChangeStub} onEndorsementPolicyChange={onEndorsementPolicyChangeStub} enableOrDisableNext={enableOrDisableNextStub} />);
            const html: string = component.html();
            html.includes('We recommend changing the definition version to update the existing smart contract. Alternatively, provide a new name to deploy as a new definition.').should.equal(true);
        });

        it('should not tell the user that a definition with the name exists', () => {
            const component: ReactWrapper<DeployStepTwo> = mount(<DeployStepTwo hasV1Capabilities={false} selectedPackage={packageOne} currentDefinitionName='bob' currentDefinitionVersion='0.0.3' currentCollectionFile={undefined} committedDefinitions={['othercontract@0.0.3']} endorsementPolicy={undefined} onDefinitionNameChange={onDefinitionNameChangeStub} onDefinitionVersionChange={onDefinitionVersionChangeStub} onCollectionChange={onCollectionChangeStub} onEndorsementPolicyChange={onEndorsementPolicyChangeStub} enableOrDisableNext={enableOrDisableNextStub} />);
            const html: string = component.html();
            html.includes('This deployment will update the existing smart contract. Alternatively, provide a new name to deploy as a new definition.').should.equal(false);
            html.includes('We recommend changing the definition version to update the existing smart contract. Alternatively, provide a new name to deploy as a new definition.').should.equal(false);
        });

        it('[v1] should show the user an error and disable next button if a contract with the same name and version already exists', () => {
            const component: ReactWrapper<DeployStepTwo> = mount(<DeployStepTwo hasV1Capabilities={true} selectedPackage={packageOne} currentDefinitionName={packageOne.name} currentDefinitionVersion={packageOne.version as string} currentCollectionFile={undefined} committedDefinitions={[`${packageOne.name}@${packageOne.version}`]} endorsementPolicy={undefined} onDefinitionNameChange={onDefinitionNameChangeStub} onDefinitionVersionChange={onDefinitionVersionChangeStub} onCollectionChange={onCollectionChangeStub} onEndorsementPolicyChange={onEndorsementPolicyChangeStub} enableOrDisableNext={enableOrDisableNextStub} />);
            const html: string = component.html();
            html.includes('Please select a different smart contract to deploy.').should.equal(true);
            enableOrDisableNextStub.should.have.been.calledWith(true);
        });

        it('[v1] should tell the user that the existing smart contract will be upgraded', () => {
            const component: ReactWrapper<DeployStepTwo> = mount(<DeployStepTwo hasV1Capabilities={true} selectedPackage={packageOne} currentDefinitionName={packageOne.name} currentDefinitionVersion='0.0.5' currentCollectionFile={undefined} committedDefinitions={[`${packageOne.name}@${packageOne.version}`]} endorsementPolicy={undefined} onDefinitionNameChange={onDefinitionNameChangeStub} onDefinitionVersionChange={onDefinitionVersionChangeStub} onCollectionChange={onCollectionChangeStub} onEndorsementPolicyChange={onEndorsementPolicyChangeStub} enableOrDisableNext={enableOrDisableNextStub} />);
            const html: string = component.html();
            html.includes('This deployment will upgrade the existing smart contract.').should.equal(true);
        });

        it('should set endorsement policy if passed', () => {
            const component: ReactWrapper<DeployStepTwo> = mount(<DeployStepTwo hasV1Capabilities={false} selectedPackage={packageOne} currentDefinitionName='' currentDefinitionVersion='0.0.3' currentCollectionFile={undefined} committedDefinitions={[]} endorsementPolicy={'OR("Org1MSP.member","Org2MSP.member")'} onDefinitionNameChange={onDefinitionNameChangeStub} onDefinitionVersionChange={onDefinitionVersionChangeStub} onCollectionChange={onCollectionChangeStub} onEndorsementPolicyChange={onEndorsementPolicyChangeStub} enableOrDisableNext={enableOrDisableNextStub} />);
            const html: string = component.html();
            html.includes('value="OR(&quot;Org1MSP.member&quot;,&quot;Org2MSP.member&quot;)"').should.equal(true);
        });

    });

    describe('handleDefinitionNameChange', () => {
        it('should handle definition name change', () => {
            const component: ReactWrapper<DeployStepTwo> = mount(<DeployStepTwo hasV1Capabilities={false} selectedPackage={packageOne} currentDefinitionName='' currentDefinitionVersion='' currentCollectionFile={undefined} committedDefinitions={[]} endorsementPolicy={undefined} onDefinitionNameChange={onDefinitionNameChangeStub} onDefinitionVersionChange={onDefinitionVersionChangeStub} onCollectionChange={onCollectionChangeStub} onEndorsementPolicyChange={onEndorsementPolicyChangeStub} enableOrDisableNext={enableOrDisableNextStub} />);
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
            const component: ReactWrapper<DeployStepTwo> = mount(<DeployStepTwo hasV1Capabilities={false} selectedPackage={packageOne} currentDefinitionName='' currentDefinitionVersion='' currentCollectionFile={undefined} committedDefinitions={[]} endorsementPolicy={undefined} onDefinitionNameChange={onDefinitionNameChangeStub} onDefinitionVersionChange={onDefinitionVersionChangeStub} onCollectionChange={onCollectionChangeStub} onEndorsementPolicyChange={onEndorsementPolicyChangeStub} enableOrDisableNext={enableOrDisableNextStub} />);
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
            const component: ReactWrapper<DeployStepTwo> = mount(<DeployStepTwo hasV1Capabilities={false} selectedPackage={packageOne} currentDefinitionName='' currentDefinitionVersion='' currentCollectionFile={undefined} committedDefinitions={[]} endorsementPolicy={undefined} onDefinitionNameChange={onDefinitionNameChangeStub} onDefinitionVersionChange={onDefinitionVersionChangeStub} onCollectionChange={onCollectionChangeStub} onEndorsementPolicyChange={onEndorsementPolicyChangeStub} enableOrDisableNext={enableOrDisableNextStub} />);
            const instance: DeployStepTwo = component.instance() as DeployStepTwo;

            const result: boolean = instance.isNameInvalid('');
            result.should.equal(true);
        });

        it('should handle invalid name', async () => {
            const component: ReactWrapper<DeployStepTwo> = mount(<DeployStepTwo hasV1Capabilities={false} selectedPackage={packageOne} currentDefinitionName='' currentDefinitionVersion='' currentCollectionFile={undefined} committedDefinitions={[]} endorsementPolicy={undefined} onDefinitionNameChange={onDefinitionNameChangeStub} onDefinitionVersionChange={onDefinitionVersionChangeStub} onCollectionChange={onCollectionChangeStub} onEndorsementPolicyChange={onEndorsementPolicyChangeStub} enableOrDisableNext={enableOrDisableNextStub} />);
            const instance: DeployStepTwo = component.instance() as DeployStepTwo;

            const result: boolean = instance.isNameInvalid('invalid#name');
            result.should.equal(true);
        });

        it('should handle valid name', async () => {
            const component: ReactWrapper<DeployStepTwo> = mount(<DeployStepTwo hasV1Capabilities={false} selectedPackage={packageOne} currentDefinitionName='' currentDefinitionVersion='' currentCollectionFile={undefined} committedDefinitions={[]} endorsementPolicy={undefined} onDefinitionNameChange={onDefinitionNameChangeStub} onDefinitionVersionChange={onDefinitionVersionChangeStub} onCollectionChange={onCollectionChangeStub} onEndorsementPolicyChange={onEndorsementPolicyChangeStub} enableOrDisableNext={enableOrDisableNextStub} />);
            const instance: DeployStepTwo = component.instance() as DeployStepTwo;

            const result: boolean = instance.isNameInvalid('valid_contract-name-123');
            result.should.equal(false);
        });
    });

    describe('isVersionInvalid', () => {
        it('should handle empty version', async () => {
            const component: ReactWrapper<DeployStepTwo> = mount(<DeployStepTwo hasV1Capabilities={false} selectedPackage={packageOne} currentDefinitionName='' currentDefinitionVersion='' currentCollectionFile={undefined} committedDefinitions={[]} endorsementPolicy={undefined} onDefinitionNameChange={onDefinitionNameChangeStub} onDefinitionVersionChange={onDefinitionVersionChangeStub} onCollectionChange={onCollectionChangeStub} onEndorsementPolicyChange={onEndorsementPolicyChangeStub} enableOrDisableNext={enableOrDisableNextStub} />);
            const instance: DeployStepTwo = component.instance() as DeployStepTwo;

            const result: boolean = instance.isVersionInvalid('');
            result.should.equal(true);
        });

        it('should handle valid version', async () => {
            const component: ReactWrapper<DeployStepTwo> = mount(<DeployStepTwo hasV1Capabilities={false} selectedPackage={packageOne} currentDefinitionName='' currentDefinitionVersion='' currentCollectionFile={undefined} committedDefinitions={[]} endorsementPolicy={undefined} onDefinitionNameChange={onDefinitionNameChangeStub} onDefinitionVersionChange={onDefinitionVersionChangeStub} onCollectionChange={onCollectionChangeStub} onEndorsementPolicyChange={onEndorsementPolicyChangeStub} enableOrDisableNext={enableOrDisableNextStub} />);
            const instance: DeployStepTwo = component.instance() as DeployStepTwo;

            const result: boolean = instance.isVersionInvalid('0.0.1');
            result.should.equal(false);
        });
    });

    describe('handleCollectionChange', () => {
        it('should pass a file to parent if selected', () => {
            const component: ReactWrapper<DeployStepTwo> = mount(<DeployStepTwo hasV1Capabilities={false} selectedPackage={packageOne} currentDefinitionName='' currentDefinitionVersion='' currentCollectionFile={undefined} committedDefinitions={[]} endorsementPolicy={undefined} onDefinitionNameChange={onDefinitionNameChangeStub} onDefinitionVersionChange={onDefinitionVersionChangeStub} onCollectionChange={onCollectionChangeStub} onEndorsementPolicyChange={onEndorsementPolicyChangeStub} enableOrDisableNext={enableOrDisableNextStub} />);
            const instance: DeployStepTwo = component.instance() as DeployStepTwo;

            const file: File = new File([], 'someFile');
            const event: any = {
                target: {
                    files: [
                        file
                    ]
                }
            };

            instance.handleCollectionChange(event);

            onCollectionChangeStub.should.have.been.calledOnceWithExactly(file);
        });

        it('should not pass a file to parent if not selected', () => {
            const component: ReactWrapper<DeployStepTwo> = mount(<DeployStepTwo hasV1Capabilities={false} selectedPackage={packageOne} currentDefinitionName='' currentDefinitionVersion='' currentCollectionFile={undefined} committedDefinitions={[]} endorsementPolicy={undefined} onDefinitionNameChange={onDefinitionNameChangeStub} onDefinitionVersionChange={onDefinitionVersionChangeStub} onCollectionChange={onCollectionChangeStub} onEndorsementPolicyChange={onEndorsementPolicyChangeStub} enableOrDisableNext={enableOrDisableNextStub} />);
            const instance: DeployStepTwo = component.instance() as DeployStepTwo;

            const event: any = {
                target: {
                    files: []
                }
            };

            instance.handleCollectionChange(event);

            onCollectionChangeStub.should.not.have.been.called;
        });
    });

    describe('handleEndorsementPolicyChange', () => {
        it('should handle endorsement policy change', () => {
            const component: ReactWrapper<DeployStepTwo> = mount(<DeployStepTwo hasV1Capabilities={false} selectedPackage={packageOne} currentDefinitionName='' currentDefinitionVersion='' currentCollectionFile={undefined} committedDefinitions={[]} endorsementPolicy={undefined} onDefinitionNameChange={onDefinitionNameChangeStub} onDefinitionVersionChange={onDefinitionVersionChangeStub} onCollectionChange={onCollectionChangeStub} onEndorsementPolicyChange={onEndorsementPolicyChangeStub} enableOrDisableNext={enableOrDisableNextStub} />);
            const instance: DeployStepTwo = component.instance() as DeployStepTwo;

            const event: any = {
                target: {
                    value: ' OR("Org1MSP.member","Org2MSP.member")'
                }
            };

            instance.handleEndorsementPolicyChange(event);

            onEndorsementPolicyChangeStub.should.have.been.called;
        });
    });

    describe('componentWillReceiveProps', () => {
        it('should update current definition name', () => {
            const component: ReactWrapper<DeployStepTwo> = mount(<DeployStepTwo hasV1Capabilities={false} selectedPackage={packageOne} currentDefinitionName='someName' currentDefinitionVersion='0.0.1' currentCollectionFile={undefined} committedDefinitions={[]} endorsementPolicy={undefined} onDefinitionNameChange={onDefinitionNameChangeStub} onDefinitionVersionChange={onDefinitionVersionChangeStub} onCollectionChange={onCollectionChangeStub} onEndorsementPolicyChange={onEndorsementPolicyChangeStub} enableOrDisableNext={enableOrDisableNextStub} />);
            const instance: DeployStepTwo = component.instance() as DeployStepTwo;

            const setStateStub: sinon.SinonStub = mySandBox.stub(instance, 'setState');
            const newProps: any = { currentDefinitionName: 'newDefinitionName', currentDefinitionVersion: '0.0.1' };
            instance.componentWillReceiveProps(newProps);

            setStateStub.should.have.been.calledOnceWithExactly({ definitionNameValue: newProps.currentDefinitionName, definitionVersionValue: newProps.currentDefinitionVersion });
        });

        it('should update current definition version', () => {
            const component: ReactWrapper<DeployStepTwo> = mount(<DeployStepTwo hasV1Capabilities={false} selectedPackage={packageOne} currentDefinitionName='someName' currentDefinitionVersion='0.0.1' currentCollectionFile={undefined} committedDefinitions={[]} endorsementPolicy={undefined} onDefinitionNameChange={onDefinitionNameChangeStub} onDefinitionVersionChange={onDefinitionVersionChangeStub} onCollectionChange={onCollectionChangeStub} onEndorsementPolicyChange={onEndorsementPolicyChangeStub} enableOrDisableNext={enableOrDisableNextStub} />);
            const instance: DeployStepTwo = component.instance() as DeployStepTwo;

            const setStateStub: sinon.SinonStub = mySandBox.stub(instance, 'setState');
            const newProps: any = { currentDefinitionName: 'someName', currentDefinitionVersion: '0.0.2' };
            instance.componentWillReceiveProps(newProps);

            setStateStub.should.have.been.calledOnceWithExactly({ definitionNameValue: newProps.currentDefinitionName, definitionVersionValue: newProps.currentDefinitionVersion });
        });

        it(`shouldn't update definition name and version if they haven't changed`, () => {
            const component: ReactWrapper<DeployStepTwo> = mount(<DeployStepTwo hasV1Capabilities={false} selectedPackage={packageOne} currentDefinitionName='someName' currentDefinitionVersion='0.0.1' currentCollectionFile={undefined} committedDefinitions={[]} endorsementPolicy={undefined} onDefinitionNameChange={onDefinitionNameChangeStub} onDefinitionVersionChange={onDefinitionVersionChangeStub} onCollectionChange={onCollectionChangeStub} onEndorsementPolicyChange={onEndorsementPolicyChangeStub} enableOrDisableNext={enableOrDisableNextStub} />);
            const instance: DeployStepTwo = component.instance() as DeployStepTwo;

            const setStateStub: sinon.SinonStub = mySandBox.stub(instance, 'setState');
            const newProps: any = { currentDefinitionName: 'someName', currentDefinitionVersion: '0.0.1' };
            instance.componentWillReceiveProps(newProps);

            setStateStub.should.not.have.been.called;
        });
    });
});
