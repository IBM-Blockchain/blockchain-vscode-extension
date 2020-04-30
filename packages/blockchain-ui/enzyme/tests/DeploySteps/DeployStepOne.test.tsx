import React from 'react';
import renderer from 'react-test-renderer';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { ReactWrapper, mount } from 'enzyme';

import DeployStepOne from '../../../src/components/elements/DeploySteps/DeployStepOne/DeployStepOne';
import IPackageRegistryEntry from '../../../src/interfaces/IPackageRegistryEntry';

chai.should();
chai.use(sinonChai);

describe('DeployStepOne component', () => {
    let mySandBox: sinon.SinonSandbox;

    let onPackageChangeStub: sinon.SinonStub;
    const packageOne: IPackageRegistryEntry = {name: 'mycontract', version: '0.0.1', path: '/package/one', sizeKB: 9000};
    const packageTwo: IPackageRegistryEntry = {name: 'othercontract', version: '0.0.2', path: '/package/two', sizeKB: 12000};

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();

        onPackageChangeStub = mySandBox.stub();
    });

    afterEach(async () => {
        mySandBox.restore();
    });

    describe('render', () => {
        it('should render the expected snapshot', () => {
            const component: any = renderer
                .create(<DeployStepOne packageEntries={[packageOne, packageTwo]} selectedPackage={packageOne} onPackageChange={onPackageChangeStub} />)
                .toJSON();
            expect(component).toMatchSnapshot();
        });

    });

    describe('formatPackageEntries', () => {
        it('should format packages to strings', () => {
            const component: ReactWrapper<DeployStepOne> = mount(<DeployStepOne packageEntries={[packageOne, packageTwo]} selectedPackage={packageOne} onPackageChange={onPackageChangeStub} />);
            const instance: DeployStepOne = component.instance() as DeployStepOne;
            const packageEntryStrings: string[] = instance.formatPackageEntries();

            packageEntryStrings.should.deep.equal([`${packageOne.name}@${packageOne.version} (packaged)`, `${packageTwo.name}@${packageTwo.version} (packaged)`]);
        });
    });

    describe('selectPackage', () => {
        it('should be able to select a package', () => {
            const component: ReactWrapper<DeployStepOne> = mount(<DeployStepOne packageEntries={[packageOne, packageTwo]} selectedPackage={packageOne} onPackageChange={onPackageChangeStub} />);
            const instance: DeployStepOne = component.instance() as DeployStepOne;

            const dropdownEvent: any = {
                selectedItem: `${packageOne.name}@${packageOne.version} (packaged)`
            };

            instance.selectPackage(dropdownEvent);

            onPackageChangeStub.should.have.been.calledOnceWithExactly(packageOne);
        });
    });

});
