import React from 'react';
import renderer from 'react-test-renderer';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { ReactWrapper, mount, shallow, ShallowWrapper } from 'enzyme';

import DeployStepOne from '../../../src/components/elements/DeploySteps/DeployStepOne/DeployStepOne';
import IPackageRegistryEntry from '../../../src/interfaces/IPackageRegistryEntry';

chai.should();
chai.use(sinonChai);

// tslint:disable no-unused-expression

describe('DeployStepOne component', () => {
    let mySandBox: sinon.SinonSandbox;

    let onPackageChangeStub: sinon.SinonStub;
    let onPackageWorkspaceStub: sinon.SinonStub;
    let packageOne: IPackageRegistryEntry;
    let packageTwo: IPackageRegistryEntry;
    let packageThree: IPackageRegistryEntry;
    let chosenWorkspace: { language: string, name: string, version: string };

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();

        onPackageChangeStub = mySandBox.stub();
        onPackageWorkspaceStub = mySandBox.stub();
        packageOne = {name: 'mycontract', version: '0.0.1', path: '/package/one', sizeKB: 9000};
        packageTwo = {name: 'othercontract', version: '0.0.2', path: '/package/two', sizeKB: 12000};
        packageThree = {name: 'importedContract', path: '/package/two', sizeKB: 18000};
        chosenWorkspace = {language: 'node', name: 'mycontract', version: '0.0.1'};
    });

    afterEach(async () => {
        mySandBox.restore();
    });

    describe('render', () => {
        it('should render the expected snapshot', () => {
            const component: any = renderer
                .create(<DeployStepOne hasV1Capabilities={false} chosenWorkspaceData={undefined} packageEntries={[packageOne, packageTwo, packageThree]} selectedPackage={packageOne} selectedWorkspace={undefined} workspaceNames={['workspaceOne']} onPackageWorkspace={onPackageWorkspaceStub} deletedSelectedPackage={false} onPackageChange={onPackageChangeStub} />)
                .toJSON();
            expect(component).toMatchSnapshot();
        });

        it('should call use default chosen contract if no package passed through', () => {
            mount(<DeployStepOne hasV1Capabilities={false} chosenWorkspaceData={undefined} packageEntries={[packageOne, packageTwo, packageThree]} selectedPackage={undefined} selectedWorkspace={undefined} workspaceNames={['workspaceOne']} onPackageWorkspace={onPackageWorkspaceStub} deletedSelectedPackage={false} onPackageChange={onPackageChangeStub} />);
            onPackageChangeStub.should.not.have.been.calledWith(undefined);

        });

        it('should call onPackageChange if packge no longer exists', () => {
            mount(<DeployStepOne hasV1Capabilities={false} chosenWorkspaceData={undefined} packageEntries={[packageTwo, packageThree]} selectedPackage={packageOne} selectedWorkspace={undefined} workspaceNames={['workspaceOne']} onPackageWorkspace={onPackageWorkspaceStub} deletedSelectedPackage={false} onPackageChange={onPackageChangeStub} />);
            onPackageChangeStub.should.have.been.calledOnceWith(undefined);
        });

        it('should select package if it still exists', () => {
            mount(<DeployStepOne hasV1Capabilities={false} chosenWorkspaceData={undefined} packageEntries={[packageOne, packageTwo, packageThree]} selectedPackage={packageOne} selectedWorkspace={undefined} workspaceNames={['workspaceOne']} onPackageWorkspace={onPackageWorkspaceStub} deletedSelectedPackage={false} onPackageChange={onPackageChangeStub} />);
            onPackageChangeStub.should.not.have.been.calledWith(undefined);
        });

        it('should display warning that package has been deleted, whilst in step two or three', () => {
            const component: ShallowWrapper<DeployStepOne> = shallow(<DeployStepOne hasV1Capabilities={false} chosenWorkspaceData={undefined} packageEntries={[packageOne, packageTwo, packageThree]} selectedPackage={undefined} selectedWorkspace={undefined} workspaceNames={['workspaceOne']} onPackageWorkspace={onPackageWorkspaceStub} deletedSelectedPackage={true} onPackageChange={onPackageChangeStub} />);
            component.html().includes(`The package you selected has been deleted`).should.equal(true);
        });

        it('should display message that workspace must be packaged before it can be deployed', () => {
            const component: ShallowWrapper<DeployStepOne> = shallow(<DeployStepOne hasV1Capabilities={false} chosenWorkspaceData={undefined} packageEntries={[packageOne, packageTwo, packageThree]} selectedPackage={undefined} selectedWorkspace='workspaceOne' workspaceNames={['workspaceOne']} onPackageWorkspace={onPackageWorkspaceStub} deletedSelectedPackage={false} onPackageChange={onPackageChangeStub} />);
            component.html().includes(`The contract must be packaged`).should.equal(true);
        });

        it('should handle no workspaces being passed in', () => {
            const component: ShallowWrapper<DeployStepOne> = shallow(<DeployStepOne hasV1Capabilities={false} chosenWorkspaceData={undefined} packageEntries={[packageOne, packageTwo, packageThree]} selectedPackage={packageOne} selectedWorkspace={undefined} workspaceNames={[]} onPackageWorkspace={onPackageWorkspaceStub} deletedSelectedPackage={false} onPackageChange={onPackageChangeStub} />);
            component.html().includes(`(open project)`).should.equal(false);
        });

        it('should show inputs for packaging an open workspace', () => {
            const component: any = shallow(<DeployStepOne hasV1Capabilities={false} chosenWorkspaceData={undefined} packageEntries={[packageOne, packageTwo, packageThree]} selectedPackage={undefined} selectedWorkspace='workspaceOne' workspaceNames={['workspaceOne']} onPackageWorkspace={onPackageWorkspaceStub} deletedSelectedPackage={false} onPackageChange={onPackageChangeStub} />);
            chosenWorkspace.language = 'go';
            component.setProps({
                chosenWorkspaceData: chosenWorkspace
            });
            component.find('InlineNotification').prop('title').should.deep.equal('The contract must be packaged');
            component.find('ForwardRef(TextInput)').length.should.equal(2);
            component.find('ForwardRef(TextInput)').at(0).prop('labelText').should.deep.equal('Package name');
            component.find('ForwardRef(TextInput)').at(1).prop('labelText').should.deep.equal('Package version');
            component.find('ForwardRef(Button)').length.should.equal(1);
        });

        it('should disable inputs for packaging if open workspace is a node project', () => {
            const component: any = shallow(<DeployStepOne hasV1Capabilities={false} chosenWorkspaceData={undefined} packageEntries={[packageOne, packageTwo, packageThree]} selectedPackage={undefined} selectedWorkspace='workspaceOne' workspaceNames={['workspaceOne']} onPackageWorkspace={onPackageWorkspaceStub} deletedSelectedPackage={false} onPackageChange={onPackageChangeStub} />);
            component.setProps({
                chosenWorkspaceData: chosenWorkspace
            });
            component.find('InlineNotification').prop('title').should.deep.equal('The contract must be packaged');
            component.find('ForwardRef(TextInput)').length.should.equal(2);
            component.find('ForwardRef(TextInput)').at(0).prop('labelText').should.deep.equal('Package name');
            component.find('ForwardRef(TextInput)').at(0).prop('disabled').should.deep.equal(true);
            component.find('ForwardRef(TextInput)').at(1).prop('labelText').should.deep.equal('Package version');
            component.find('ForwardRef(TextInput)').at(1).prop('disabled').should.deep.equal(true);
            component.find('ForwardRef(Button)').length.should.equal(1);
        });
    });

    describe('componentWillReceiveProps', () => {

        it('should update packages if size of new list is different', () => {
            const component: ReactWrapper<DeployStepOne> = mount(<DeployStepOne hasV1Capabilities={false} chosenWorkspaceData={undefined} packageEntries={[packageOne, packageTwo, packageThree]} selectedPackage={packageOne} selectedWorkspace={undefined} workspaceNames={['workspaceOne']} onPackageWorkspace={onPackageWorkspaceStub} deletedSelectedPackage={false} onPackageChange={onPackageChangeStub} />);
            const instance: DeployStepOne = component.instance() as DeployStepOne;

            const setStateStub: sinon.SinonStub = mySandBox.stub(instance, 'setState');

            instance.componentWillReceiveProps({
                hasV1Capabilities: false,
                chosenWorkspaceData: undefined,
                packageEntries: [packageTwo, packageThree],
                selectedPackage: packageOne,
                onPackageChange: onPackageChangeStub,
                deletedSelectedPackage: false,
                workspaceNames: ['workspaceOne'],
                selectedWorkspace: undefined,
                onPackageWorkspace: onPackageWorkspaceStub
            });

            setStateStub.should.have.been.calledOnceWith({packageEntries: [packageTwo, packageThree]});
        });

        it('should update packages if the name of an entry is different', () => {
            const component: ReactWrapper<DeployStepOne> = mount(<DeployStepOne hasV1Capabilities={false} chosenWorkspaceData={undefined} packageEntries={[packageOne, packageTwo, packageThree]} selectedPackage={packageOne} selectedWorkspace={undefined} workspaceNames={['workspaceOne']} onPackageWorkspace={onPackageWorkspaceStub} deletedSelectedPackage={false} onPackageChange={onPackageChangeStub} />);
            const instance: DeployStepOne = component.instance() as DeployStepOne;

            const setStateStub: sinon.SinonStub = mySandBox.stub(instance, 'setState');

            const newPackage: IPackageRegistryEntry = {name: 'newPackage', version: '0.0.2', path: '/other/path', sizeKB: 4000};

            instance.componentWillReceiveProps({
                hasV1Capabilities: false,
                chosenWorkspaceData: undefined,
                packageEntries: [packageOne, newPackage, packageThree],
                selectedPackage: packageOne,
                onPackageChange: onPackageChangeStub,
                deletedSelectedPackage: false,
                workspaceNames: ['workspaceOne'],
                selectedWorkspace: undefined,
                onPackageWorkspace: onPackageWorkspaceStub
            });

            setStateStub.should.have.been.calledOnceWith({packageEntries: [packageOne, newPackage, packageThree]});
        });

        it('should update packages if the version of an entry is different', () => {
            const component: ReactWrapper<DeployStepOne> = mount(<DeployStepOne hasV1Capabilities={false} chosenWorkspaceData={undefined} packageEntries={[packageOne, packageTwo, packageThree]} selectedPackage={packageOne} selectedWorkspace={undefined} workspaceNames={['workspaceOne']} onPackageWorkspace={onPackageWorkspaceStub} deletedSelectedPackage={false} onPackageChange={onPackageChangeStub} />);
            const instance: DeployStepOne = component.instance() as DeployStepOne;

            const setStateStub: sinon.SinonStub = mySandBox.stub(instance, 'setState');

            const newPackage: IPackageRegistryEntry = {name: 'packageTwo', version: '0.0.3', path: '/other/path', sizeKB: 4000};

            instance.componentWillReceiveProps({
                hasV1Capabilities: false,
                chosenWorkspaceData: undefined,
                packageEntries: [packageOne, newPackage, packageThree],
                selectedPackage: packageOne,
                onPackageChange: onPackageChangeStub,
                deletedSelectedPackage: false,
                workspaceNames: ['workspaceOne'],
                selectedWorkspace: undefined,
                onPackageWorkspace: onPackageWorkspaceStub
            });

            setStateStub.should.have.been.calledOnceWith({packageEntries: [packageOne, newPackage, packageThree]});
        });

        it('should do nothing if received packages are the same', () => {
            const component: ReactWrapper<DeployStepOne> = mount(<DeployStepOne hasV1Capabilities={false} chosenWorkspaceData={undefined} packageEntries={[packageOne, packageTwo, packageThree]} selectedPackage={packageOne} selectedWorkspace={undefined} workspaceNames={['workspaceOne']} onPackageWorkspace={onPackageWorkspaceStub} deletedSelectedPackage={false} onPackageChange={onPackageChangeStub} />);
            const instance: DeployStepOne = component.instance() as DeployStepOne;

            const setStateStub: sinon.SinonStub = mySandBox.stub(instance, 'setState');

            instance.componentWillReceiveProps({
                hasV1Capabilities: false,
                chosenWorkspaceData: undefined,
                packageEntries: [packageOne, packageTwo, packageThree],
                selectedPackage: packageOne,
                onPackageChange: onPackageChangeStub,
                deletedSelectedPackage: false,
                workspaceNames: ['workspaceOne'],
                selectedWorkspace: undefined,
                onPackageWorkspace: onPackageWorkspaceStub
            });

            setStateStub.should.not.have.been.calledWith({packageEntries: [packageOne, packageTwo, packageThree]});
        });
    });

    describe('formatAllEntries', () => {
        it('should format all entries to strings', () => {
            const component: ReactWrapper<DeployStepOne> = mount(<DeployStepOne hasV1Capabilities={false} chosenWorkspaceData={undefined} packageEntries={[packageOne, packageTwo, packageThree]} selectedWorkspace={undefined} workspaceNames={['workspaceOne']} onPackageWorkspace={onPackageWorkspaceStub} selectedPackage={packageOne} deletedSelectedPackage={false} onPackageChange={onPackageChangeStub} />);
            const instance: DeployStepOne = component.instance() as DeployStepOne;
            const packageEntryStrings: string[] = instance.formatAllEntries();

            packageEntryStrings.should.deep.equal([`workspaceOne (open project)`, `${packageOne.name}@${packageOne.version} (packaged)`, `${packageTwo.name}@${packageTwo.version} (packaged)`, `${packageThree.name} (packaged)`]);
        });
    });

    describe('formatPackageEntry', () => {
        it('should format package with version', () => {
            const component: ReactWrapper<DeployStepOne> = mount(<DeployStepOne hasV1Capabilities={false} chosenWorkspaceData={undefined} packageEntries={[packageOne, packageTwo, packageThree]} selectedPackage={packageOne} selectedWorkspace={undefined} workspaceNames={['workspaceOne']} onPackageWorkspace={onPackageWorkspaceStub} deletedSelectedPackage={false} onPackageChange={onPackageChangeStub} />);
            const instance: DeployStepOne = component.instance() as DeployStepOne;
            const packageString: string = instance.formatPackageEntry(packageOne);
            packageString.should.equal(`${packageOne.name}@${packageOne.version} (packaged)`);
        });

        it('should format package without version', () => {
            const component: ReactWrapper<DeployStepOne> = mount(<DeployStepOne hasV1Capabilities={false} chosenWorkspaceData={undefined} packageEntries={[packageOne, packageTwo, packageThree]} selectedPackage={packageOne} selectedWorkspace={undefined} workspaceNames={['workspaceOne']} onPackageWorkspace={onPackageWorkspaceStub} deletedSelectedPackage={false} onPackageChange={onPackageChangeStub} />);
            const instance: DeployStepOne = component.instance() as DeployStepOne;
            const packageString: string = instance.formatPackageEntry(packageThree);
            packageString.should.equal(`${packageThree.name} (packaged)`);
        });

    });

    describe('formatWorkspaceEntry', () => {
        it('should format workspace entry', () => {
            const component: ReactWrapper<DeployStepOne> = mount(<DeployStepOne hasV1Capabilities={false} chosenWorkspaceData={undefined} packageEntries={[packageOne, packageTwo, packageThree]} selectedPackage={packageOne} selectedWorkspace={undefined} workspaceNames={['workspaceOne']} onPackageWorkspace={onPackageWorkspaceStub} deletedSelectedPackage={false} onPackageChange={onPackageChangeStub} />);
            const instance: DeployStepOne = component.instance() as DeployStepOne;
            const workspaceString: string = instance.formatWorkspaceEntry('workspaceOne');
            workspaceString.should.equal(`workspaceOne (open project)`);
        });

    });

    describe('selectPackage', () => {
        it('should be able to select a package with a version', () => {
            const component: ReactWrapper<DeployStepOne> = mount(<DeployStepOne hasV1Capabilities={false} chosenWorkspaceData={undefined} packageEntries={[packageOne, packageTwo, packageThree]} selectedPackage={packageOne} selectedWorkspace={undefined} workspaceNames={['workspaceOne']} onPackageWorkspace={onPackageWorkspaceStub} deletedSelectedPackage={false} onPackageChange={onPackageChangeStub} />);
            const instance: DeployStepOne = component.instance() as DeployStepOne;

            const dropdownEvent: any = {
                selectedItem: `${packageOne.name}@${packageOne.version} (packaged)`
            };

            instance.selectPackage(dropdownEvent);

            onPackageChangeStub.should.have.been.calledOnceWithExactly(packageOne);
        });

        it('should be able to select a package without a version', () => {
            const component: ReactWrapper<DeployStepOne> = mount(<DeployStepOne hasV1Capabilities={false} chosenWorkspaceData={undefined} packageEntries={[packageOne, packageTwo, packageThree]} selectedPackage={packageOne} selectedWorkspace={undefined} workspaceNames={['workspaceOne']} onPackageWorkspace={onPackageWorkspaceStub} deletedSelectedPackage={false} onPackageChange={onPackageChangeStub} />);
            const instance: DeployStepOne = component.instance() as DeployStepOne;

            const dropdownEvent: any = {
                selectedItem: `${packageThree.name} (packaged)`
            };

            instance.selectPackage(dropdownEvent);

            onPackageChangeStub.should.have.been.calledOnceWithExactly(packageThree);
        });

        it('should be able to select a workspace', () => {
            const component: ReactWrapper<DeployStepOne> = mount(<DeployStepOne hasV1Capabilities={false} chosenWorkspaceData={undefined} packageEntries={[packageOne, packageTwo, packageThree]} selectedPackage={undefined} selectedWorkspace='workspaceOne' workspaceNames={['workspaceOne']} onPackageWorkspace={onPackageWorkspaceStub} deletedSelectedPackage={false} onPackageChange={onPackageChangeStub} />);
            const instance: DeployStepOne = component.instance() as DeployStepOne;

            const dropdownEvent: any = {
                selectedItem: `workspaceOne (open project)`
            };

            instance.selectPackage(dropdownEvent);

            onPackageChangeStub.should.have.been.calledOnceWithExactly(undefined, 'workspaceOne');
        });
    });

    describe('handlePackageNameChange', () => {
        it('should update packageName when a new value is provided', () => {
            const component: ShallowWrapper<DeployStepOne> = shallow(<DeployStepOne hasV1Capabilities={false} chosenWorkspaceData={undefined} packageEntries={[packageOne, packageTwo, packageThree]} selectedPackage={packageOne} selectedWorkspace={undefined} workspaceNames={[]} onPackageWorkspace={onPackageWorkspaceStub} deletedSelectedPackage={false} onPackageChange={onPackageChangeStub} />);
            const instance: DeployStepOne = component.instance() as DeployStepOne;

            const mockNameChangeData: any = {
                target: {
                    value: 'myPackage'
                }
            };

            instance.handlePackageNameChange(mockNameChangeData);
            instance.state.packageName.should.deep.equal(mockNameChangeData.target.value);
        });
    });

    describe('handlePackageVersionChange', () => {
        it('should update packageVersion when a new value is provided', () => {
            const component: ShallowWrapper<DeployStepOne> = shallow(<DeployStepOne hasV1Capabilities={false} chosenWorkspaceData={undefined} packageEntries={[packageOne, packageTwo, packageThree]} selectedPackage={packageOne} selectedWorkspace={undefined} workspaceNames={[]} onPackageWorkspace={onPackageWorkspaceStub} deletedSelectedPackage={false} onPackageChange={onPackageChangeStub} />);
            const instance: DeployStepOne = component.instance() as DeployStepOne;

            const mockVersionChangeData: any = {
                target: {
                    value: '0.0.1'
                }
            };

            instance.handlePackageVersionChange(mockVersionChangeData);
            instance.state.packageVersion.should.deep.equal(mockVersionChangeData.target.value);
        });
    });

    describe('packageWorkspace', () => {
        it('should package node workspace', () => {
            const chosenWorkspaceData: { language: string, name: string, version: string } = {
                language: 'node',
                name: 'nodeProject',
                version: '0.0.1'
            };
            const component: ReactWrapper<DeployStepOne> = mount(<DeployStepOne hasV1Capabilities={false} chosenWorkspaceData={chosenWorkspaceData} packageEntries={[packageOne, packageTwo, packageThree]} selectedPackage={undefined} selectedWorkspace='workspaceOne' workspaceNames={['workspaceOne']} onPackageWorkspace={onPackageWorkspaceStub} deletedSelectedPackage={false} onPackageChange={onPackageChangeStub} />);
            const instance: DeployStepOne = component.instance() as DeployStepOne;

            instance.packageWorkspace();

            onPackageWorkspaceStub.should.have.been.calledOnceWithExactly('workspaceOne', chosenWorkspaceData.name, chosenWorkspaceData.version);
        });

        it('should package other workspace', () => {
            const chosenWorkspaceData: { language: string, name: string, version: string } = {
                language: 'java',
                name: '',
                version: ''
            };
            const component: ReactWrapper<DeployStepOne> = mount(<DeployStepOne hasV1Capabilities={false} chosenWorkspaceData={chosenWorkspaceData} packageEntries={[packageOne, packageTwo, packageThree]} selectedPackage={undefined} selectedWorkspace='workspaceOne' workspaceNames={['workspaceOne']} onPackageWorkspace={onPackageWorkspaceStub} deletedSelectedPackage={false} onPackageChange={onPackageChangeStub} />);
            component.setState({
                packageName: 'javaProject',
                packageVersion: '0.0.1'
            });
            const instance: DeployStepOne = component.instance() as DeployStepOne;

            instance.packageWorkspace();

            onPackageWorkspaceStub.should.have.been.calledOnceWithExactly('workspaceOne', 'javaProject', '0.0.1');
        });

        it('should not be able to package other workspace if missing package name', () => {
            const chosenWorkspaceData: { language: string, name: string, version: string } = {
                language: 'java',
                name: '',
                version: ''
            };
            const component: ReactWrapper<DeployStepOne> = mount(<DeployStepOne hasV1Capabilities={false} chosenWorkspaceData={chosenWorkspaceData} packageEntries={[packageOne, packageTwo, packageThree]} selectedPackage={undefined} selectedWorkspace='workspaceOne' workspaceNames={['workspaceOne']} onPackageWorkspace={onPackageWorkspaceStub} deletedSelectedPackage={false} onPackageChange={onPackageChangeStub} />);
            component.setState({ packageVersion: '0.0.1' });
            const packageSpy: sinon.SinonSpy = mySandBox.spy(DeployStepOne.prototype, 'packageWorkspace');
            component.find('ForwardRef(Button)').at(0).simulate('click');
            packageSpy.should.not.have.been.called;
        });

        it('should not be able to package other workspace if missing package version', () => {
            const chosenWorkspaceData: { language: string, name: string, version: string } = {
                language: 'java',
                name: '',
                version: ''
            };
            const component: ReactWrapper<DeployStepOne> = mount(<DeployStepOne hasV1Capabilities={false} chosenWorkspaceData={chosenWorkspaceData} packageEntries={[packageOne, packageTwo, packageThree]} selectedPackage={undefined} selectedWorkspace='workspaceOne' workspaceNames={['workspaceOne']} onPackageWorkspace={onPackageWorkspaceStub} deletedSelectedPackage={false} onPackageChange={onPackageChangeStub} />);
            component.setState({ packageName: '0.0.1' });
            const packageSpy: sinon.SinonSpy = mySandBox.spy(DeployStepOne.prototype, 'packageWorkspace');
            component.find('ForwardRef(Button)').at(0).simulate('click');
            packageSpy.should.not.have.been.called;
        });
    });

});
