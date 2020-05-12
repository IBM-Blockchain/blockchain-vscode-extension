import React from 'react';
import renderer from 'react-test-renderer';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import DeployPage from '../../src/components/pages/DeployPage/DeployPage';
import IPackageRegistryEntry from '../../src/interfaces/IPackageRegistryEntry';
import { ReactWrapper, mount, shallow, ShallowWrapper } from 'enzyme';
import DeployStepOne from '../../src/components/elements/DeploySteps/DeployStepOne/DeployStepOne';
import DeployStepTwo from '../../src/components/elements/DeploySteps/DeployStepTwo/DeployStepTwo';
import DeployStepThree from '../../src/components/elements/DeploySteps/DeployStepThree/DeployStepThree';
import Utils from '../../src/Utils';

chai.should();
chai.use(sinonChai);

describe('DeployPage component', () => {
    let mySandBox: sinon.SinonSandbox;

    let handleProgressChangeStub: sinon.SinonStub;
    let handlePackageChangeStub: sinon.SinonStub;
    let handleDefinitionNameChange: sinon.SinonStub;
    let handleDefinitionVersionChange: sinon.SinonStub;
    let postToVscodeStub: sinon.SinonStub;

    const packageOne: IPackageRegistryEntry = {name: 'mycontract', version: '0.0.1', path: '/package/one', sizeKB: 9000};
    const packageTwo: IPackageRegistryEntry = {name: 'othercontract', version: '0.0.2', path: '/package/two', sizeKB: 12000};
    const deployData: {channelName: string, environmentName: string, packageEntries: IPackageRegistryEntry[]} = {channelName: 'mychannel', environmentName: 'myEnvironment', packageEntries: [packageOne, packageTwo]};

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
    });

    afterEach(async () => {
        mySandBox.restore();
    });

    describe('render', () => {
        it('should render the expected snapshot', () => {
            const component: any = renderer
                .create(<DeployPage deployData={deployData} />)
                .toJSON();
            expect(component).toMatchSnapshot();
        });

        it('should load step one component', () => {
            const component: ShallowWrapper<DeployPage> = shallow(<DeployPage deployData={deployData} />);

            const doesStepOneExist: boolean = component.exists(DeployStepOne);
            doesStepOneExist.should.equal(true);

            const doesStepTwoExist: boolean = component.exists(DeployStepTwo);
            doesStepTwoExist.should.equal(false);

            const doesStepThreeExist: boolean = component.exists(DeployStepThree);
            doesStepThreeExist.should.equal(false);
        });

        it('should load step two component', () => {
            const component: ShallowWrapper<DeployPage> = shallow(<DeployPage deployData={deployData} />);

            component.setState({progressIndex: 1});

            const doesStepOneExist: boolean = component.exists(DeployStepOne);
            doesStepOneExist.should.equal(false);

            const doesStepTwoExist: boolean = component.exists(DeployStepTwo);
            doesStepTwoExist.should.equal(true);

            const doesStepThreeExist: boolean = component.exists(DeployStepThree);
            doesStepThreeExist.should.equal(false);
        });

        it('should load step three component', () => {
            const component: ShallowWrapper<DeployPage> = shallow(<DeployPage deployData={deployData} />);

            component.setState({progressIndex: 2});

            const doesStepOneExist: boolean = component.exists(DeployStepOne);
            doesStepOneExist.should.equal(false);

            const doesStepTwoExist: boolean = component.exists(DeployStepTwo);
            doesStepTwoExist.should.equal(false);

            const doesStepThreeExist: boolean = component.exists(DeployStepThree);
            doesStepThreeExist.should.equal(true);
        });
    });

    describe('handleProgressChange', () => {
        it('should update progress state', () => {

            const component: ReactWrapper<DeployPage> = mount(<DeployPage deployData={deployData} />);
            const instance: DeployPage = component.instance() as DeployPage;

            handleProgressChangeStub = mySandBox.stub(instance, 'setState').resolves();

            instance.handleProgressChange(1);

            handleProgressChangeStub.should.have.been.calledOnceWithExactly({progressIndex: 1});

        });

        it('should reset Next button when going back from Step 2 to Step 1 with errors', () => {
            const component: ReactWrapper<DeployPage> = mount(<DeployPage deployData={deployData} />);
            component.setState({selectedPackage: packageOne});
            const instance: DeployPage = component.instance() as DeployPage;

            handleProgressChangeStub = mySandBox.stub(instance, 'setState').resolves();

            instance.handleProgressChange(0);

            handleProgressChangeStub.should.have.been.calledOnceWithExactly({progressIndex: 0, disableNext: false});
        });
    });

    describe('handlePackageChange', () => {
        it('should update package selected and reset definition name and version (so defaults get used)', () => {

            const component: ReactWrapper<DeployPage> = mount(<DeployPage deployData={deployData} />);
            const instance: DeployPage = component.instance() as DeployPage;

            handlePackageChangeStub = mySandBox.stub(instance, 'setState').resolves();

            instance.handlePackageChange(packageTwo);

            handlePackageChangeStub.should.have.been.calledOnceWithExactly({selectedPackage: packageTwo, definitionName: packageTwo.name, definitionVersion: packageTwo.version, disableNext: false});

        });
    });

    describe('handleDefinitionNameChange', () => {
        it('should update definition name and disable Next button if name or version invalid', () => {

            const component: ReactWrapper<DeployPage> = mount(<DeployPage deployData={deployData} />);
            component.setState({versionInvalid: true});
            const instance: DeployPage = component.instance() as DeployPage;

            handleDefinitionNameChange = mySandBox.stub(instance, 'setState').resolves();

            instance.handleDefinitionNameChange('newName', true);

            handleDefinitionNameChange.should.have.been.calledOnceWithExactly({definitionName: 'newName', nameInvalid: true, disableNext: true});

        });

        it('should update definition name and enable Next button if name and version is valid', () => {

            const component: ReactWrapper<DeployPage> = mount(<DeployPage deployData={deployData} />);
            component.setState({versionInvalid: false});
            const instance: DeployPage = component.instance() as DeployPage;

            handleDefinitionNameChange = mySandBox.stub(instance, 'setState').resolves();

            instance.handleDefinitionNameChange('newName', false);

            handleDefinitionNameChange.should.have.been.calledOnceWithExactly({definitionName: 'newName', nameInvalid: false, disableNext: false});

        });
    });

    describe('handleDefinitionVersionChange', () => {
        it('should update definition version and disable Next button if name or version is invalid', () => {

            const component: ReactWrapper<DeployPage> = mount(<DeployPage deployData={deployData} />);
            component.setState({nameInvalid: true});

            const instance: DeployPage = component.instance() as DeployPage;

            handleDefinitionVersionChange = mySandBox.stub(instance, 'setState').resolves();

            instance.handleDefinitionVersionChange('0.0.3', true);

            handleDefinitionVersionChange.should.have.been.calledOnceWithExactly({definitionVersion: '0.0.3', versionInvalid: true, disableNext: true});

        });

        it('should update definition version and enable Next button if name and version are valid', () => {

            const component: ReactWrapper<DeployPage> = mount(<DeployPage deployData={deployData} />);
            component.setState({nameInvalid: false});

            const instance: DeployPage = component.instance() as DeployPage;

            handleDefinitionVersionChange = mySandBox.stub(instance, 'setState').resolves();

            instance.handleDefinitionVersionChange('0.0.3', false);

            handleDefinitionVersionChange.should.have.been.calledOnceWithExactly({definitionVersion: '0.0.3', versionInvalid: false, disableNext: false});

        });
    });

    describe('handleDeploy', () => {
        it('should send deploy message', () => {
            postToVscodeStub = mySandBox.stub(Utils, 'postToVSCode').returns(undefined);

            const component: ReactWrapper<DeployPage> = mount(<DeployPage deployData={deployData} />);
            const instance: DeployPage = component.instance() as DeployPage;

            instance.setState({
                environmentName: 'myEnvironment',
                channelName: 'myChannel',
                selectedPackage: packageTwo,
                definitionName: packageTwo.name,
                definitionVersion: packageTwo.version,
                commitSmartContract: undefined
            });

            instance.handleDeploy();

            postToVscodeStub.should.have.been.calledOnceWithExactly({
                command: 'deploy',
                data: {
                    environmentName: 'myEnvironment',
                    channelName: 'myChannel',
                    selectedPackage: packageTwo,
                    definitionName: packageTwo.name,
                    definitionVersion: packageTwo.version,
                    commitSmartContract: undefined
                }
            });
        });
    });

});
