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

// tslint:disable no-unused-expression

describe('DeployPage component', () => {
    let mySandBox: sinon.SinonSandbox;

    let setStateStub: sinon.SinonStub;
    let postToVscodeStub: sinon.SinonStub;

    const packageOne: IPackageRegistryEntry = {name: 'mycontract', version: '0.0.1', path: '/package/one', sizeKB: 9000};
    const packageTwo: IPackageRegistryEntry = {name: 'othercontract', version: '0.0.2', path: '/package/two', sizeKB: 12000};
    const packageThree: IPackageRegistryEntry = {name: 'importedContract', path: '/package/three', sizeKB: 16000};
    let deployData: {channelName: string, environmentName: string, packageEntries: IPackageRegistryEntry[], workspaceNames: string[], selectedPackage: IPackageRegistryEntry | undefined};

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
        deployData = {channelName: 'mychannel', environmentName: 'myEnvironment', packageEntries: [packageOne, packageTwo, packageThree], workspaceNames: ['workspaceOne'], selectedPackage: undefined};
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

        it('should handle passing in a selected package', () => {
            deployData.selectedPackage = packageTwo;

            const component: ReactWrapper<DeployPage> = mount(<DeployPage deployData={deployData} />);

            component.html().includes(`${packageTwo.name}@${packageTwo.version} (packaged)`).should.equal(true);
        });
    });

    describe('handleProgressChange', () => {
        it('should update progress state', () => {

            const component: ReactWrapper<DeployPage> = mount(<DeployPage deployData={deployData} />);
            const instance: DeployPage = component.instance() as DeployPage;

            setStateStub = mySandBox.stub(instance, 'setState').resolves();

            instance.handleProgressChange(1);

            setStateStub.should.have.been.calledOnceWithExactly({progressIndex: 1});

        });

        it('should reset Next button when going back from Step 2 to Step 1 with errors', () => {
            const component: ReactWrapper<DeployPage> = mount(<DeployPage deployData={deployData} />);
            component.setState({selectedPackage: packageOne});
            const instance: DeployPage = component.instance() as DeployPage;

            setStateStub = mySandBox.stub(instance, 'setState').resolves();

            instance.handleProgressChange(0);

            setStateStub.should.have.been.calledOnceWithExactly({progressIndex: 0, disableNext: false});
        });
    });

    describe('handlePackageChange', () => {
        it('should update package selected with version and reset definition name and version (so defaults get used)', () => {

            const component: ReactWrapper<DeployPage> = mount(<DeployPage deployData={deployData} />);
            const instance: DeployPage = component.instance() as DeployPage;

            setStateStub = mySandBox.stub(instance, 'setState').resolves();

            instance.handlePackageChange(packageTwo);

            setStateStub.should.have.been.calledOnceWithExactly({selectedPackage: packageTwo, definitionName: packageTwo.name, definitionVersion: packageTwo.version, disableNext: false, deletedSelectedPackage: false, selectedWorkspace: undefined});

        });

        it('should update package selected without version and reset definition name and set default definition version', () => {

            const component: ReactWrapper<DeployPage> = mount(<DeployPage deployData={deployData} />);
            const instance: DeployPage = component.instance() as DeployPage;

            setStateStub = mySandBox.stub(instance, 'setState').resolves();

            instance.handlePackageChange(packageThree);

            setStateStub.should.have.been.calledOnceWithExactly({selectedPackage: packageThree, definitionName: packageThree.name, definitionVersion: '0.0.1', disableNext: false, deletedSelectedPackage: false, selectedWorkspace: undefined});

        });

        it('should handle an undefined package (package got deleted, so got set to default value)', () => {
            const component: ReactWrapper<DeployPage> = mount(<DeployPage deployData={deployData} />);
            const instance: DeployPage = component.instance() as DeployPage;

            setStateStub = mySandBox.stub(instance, 'setState').resolves();

            instance.handlePackageChange(undefined);

            setStateStub.should.have.been.calledOnceWithExactly({selectedPackage: undefined, selectedWorkspace: undefined, disableNext: true});

        });

        it('should handle a workspace selected', () => {
            const component: ReactWrapper<DeployPage> = mount(<DeployPage deployData={deployData} />);
            const instance: DeployPage = component.instance() as DeployPage;

            setStateStub = mySandBox.stub(instance, 'setState').resolves();

            instance.handlePackageChange(undefined, 'workspaceOne');

            setStateStub.should.have.been.calledOnceWithExactly({selectedPackage: undefined, disableNext: true, selectedWorkspace: 'workspaceOne', deletedSelectedPackage: false});
        });
    });

    describe('handleDefinitionNameChange', () => {
        it('should update definition name and disable Next button if name or version invalid', () => {

            const component: ReactWrapper<DeployPage> = mount(<DeployPage deployData={deployData} />);
            component.setState({versionInvalid: true});
            const instance: DeployPage = component.instance() as DeployPage;

            setStateStub = mySandBox.stub(instance, 'setState').resolves();

            instance.handleDefinitionNameChange('newName', true);

            setStateStub.should.have.been.calledOnceWithExactly({definitionName: 'newName', nameInvalid: true, disableNext: true});

        });

        it('should update definition name and enable Next button if name and version is valid', () => {

            const component: ReactWrapper<DeployPage> = mount(<DeployPage deployData={deployData} />);
            component.setState({versionInvalid: false});
            const instance: DeployPage = component.instance() as DeployPage;

            setStateStub = mySandBox.stub(instance, 'setState').resolves();

            instance.handleDefinitionNameChange('newName', false);

            setStateStub.should.have.been.calledOnceWithExactly({definitionName: 'newName', nameInvalid: false, disableNext: false});

        });
    });

    describe('handleDefinitionVersionChange', () => {
        it('should update definition version and disable Next button if name or version is invalid', () => {

            const component: ReactWrapper<DeployPage> = mount(<DeployPage deployData={deployData} />);
            component.setState({nameInvalid: true});

            const instance: DeployPage = component.instance() as DeployPage;

            setStateStub = mySandBox.stub(instance, 'setState').resolves();

            instance.handleDefinitionVersionChange('0.0.3', true);

            setStateStub.should.have.been.calledOnceWithExactly({definitionVersion: '0.0.3', versionInvalid: true, disableNext: true});

        });

        it('should update definition version and enable Next button if name and version are valid', () => {

            const component: ReactWrapper<DeployPage> = mount(<DeployPage deployData={deployData} />);
            component.setState({nameInvalid: false});

            const instance: DeployPage = component.instance() as DeployPage;

            setStateStub = mySandBox.stub(instance, 'setState').resolves();

            instance.handleDefinitionVersionChange('0.0.3', false);

            setStateStub.should.have.been.calledOnceWithExactly({definitionVersion: '0.0.3', versionInvalid: false, disableNext: false});

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
                definitionVersion: packageTwo.version as string,
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

    describe('handlePackageWorkspace', () => {
        it('should handle a workspace being packaged', () => {
            postToVscodeStub = mySandBox.stub(Utils, 'postToVSCode').returns(undefined);

            const component: ReactWrapper<DeployPage> = mount(<DeployPage deployData={deployData} />);
            const instance: DeployPage = component.instance() as DeployPage;

            instance.handlePackageWorkspace('workspaceOne');

            postToVscodeStub.should.have.been.calledOnceWithExactly({
                command: 'package',
                data: {
                    workspaceName: 'workspaceOne'
                }
            });
        });
    });

    describe('handleCommitChange', () => {
        it('should update commit value', () => {

            const component: ReactWrapper<DeployPage> = mount(<DeployPage deployData={deployData} />);
            const instance: DeployPage = component.instance() as DeployPage;

            setStateStub = mySandBox.stub(instance, 'setState').resolves();

            instance.handleCommitChange(false);

            setStateStub.should.have.been.calledWithExactly({commitSmartContract: false});

            instance.handleCommitChange(true);

            setStateStub.should.have.been.calledWithExactly({commitSmartContract: true});

        });
    });

    describe('componentWillReceiveProps', () => {
        it('should do nothing if there is no package selected', () => {
            const component: ReactWrapper<DeployPage> = mount(<DeployPage deployData={deployData} />);
            const instance: DeployPage = component.instance() as DeployPage;

            setStateStub = mySandBox.stub(instance, 'setState').resolves();

            instance.componentWillReceiveProps({
                deployData: {
                    packageEntries: []
                }
            });

            setStateStub.should.not.have.been.called;
        });

        it('should do nothing if the selected package (with version) still exists', () => {
            const component: ReactWrapper<DeployPage> = mount(<DeployPage deployData={deployData} />);
            const instance: DeployPage = component.instance() as DeployPage;
            instance.setState({selectedPackage: packageOne});
            setStateStub = mySandBox.stub(instance, 'setState').resolves();

            instance.componentWillReceiveProps({
                deployData: {
                    packageEntries: [packageOne]
                }
            });

            setStateStub.should.not.have.been.called;
        });

        it('should do nothing if the selected package (without version) still exists', () => {
            const component: ReactWrapper<DeployPage> = mount(<DeployPage deployData={deployData} />);
            const instance: DeployPage = component.instance() as DeployPage;
            instance.setState({selectedPackage: packageThree});
            setStateStub = mySandBox.stub(instance, 'setState').resolves();

            instance.componentWillReceiveProps({
                deployData: {
                    packageEntries: [packageThree]
                }
            });

            setStateStub.should.not.have.been.called;
        });

        it(`should do nothing if the selected package doesnt exist in Step One`, () => {
            const component: ReactWrapper<DeployPage> = mount(<DeployPage deployData={deployData} />);
            const instance: DeployPage = component.instance() as DeployPage;
            instance.setState({selectedPackage: packageOne, progressIndex: 0});
            setStateStub = mySandBox.stub(instance, 'setState').resolves();

            instance.componentWillReceiveProps({
                deployData: {
                    packageEntries: []
                }
            });

            setStateStub.should.not.have.been.called;
        });

        it(`should set state if the selected package doesnt exist in Step Two (or Three)`, () => {
            const component: ReactWrapper<DeployPage> = mount(<DeployPage deployData={deployData} />);
            const instance: DeployPage = component.instance() as DeployPage;
            instance.setState({selectedPackage: packageOne, progressIndex: 1});
            setStateStub = mySandBox.stub(instance, 'setState').resolves();

            instance.componentWillReceiveProps({
                deployData: {
                    packageEntries: []
                }
            });

            setStateStub.should.have.been.calledWith({progressIndex: 0, selectedPackage: undefined, disableNext: true, deletedSelectedPackage: true});

        });

        it('should update selected package if passed into app', () => {
            const component: ReactWrapper<DeployPage> = mount(<DeployPage deployData={deployData} />);
            const instance: DeployPage = component.instance() as DeployPage;

            setStateStub = mySandBox.stub(instance, 'setState').resolves();

            const workspacePackage: IPackageRegistryEntry = {
                name: 'createdFromWorkspace',
                version: '0.0.1',
                sizeKB: 30000,
                path: '/somet/path'
            };

            instance.componentWillReceiveProps({
                deployData: {
                    selectedPackage: workspacePackage
                }
            });

            setStateStub.should.have.been.calledWith({selectedPackage: workspacePackage, disableNext: false});
        });
    });

});
