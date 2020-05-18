import React from 'react';
import renderer from 'react-test-renderer';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import DeployStepThree from '../../../src/components/elements/DeploySteps/DeployStepThree/DeployStepThree';
import IPackageRegistryEntry from '../../../src/interfaces/IPackageRegistryEntry';
import { ReactWrapper, mount } from 'enzyme';

chai.should();
chai.use(sinonChai);

describe('DeployStepThree component', () => {
    let mySandBox: sinon.SinonSandbox;

    const packageOne: IPackageRegistryEntry = {name: 'mycontract', version: '0.0.1', path: '/package/one', sizeKB: 9000};

    let commitChangeStub: sinon.SinonStub;
    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
        commitChangeStub = mySandBox.stub();
    });

    afterEach(async () => {
        mySandBox.restore();
    });

    describe('render', () => {
        it('should render the expected snapshot', () => {
            const component: any = renderer
                .create(<DeployStepThree selectedPackage={packageOne} channelName='mychannel' commitSmartContract={undefined} onCommitChange={commitChangeStub} />)
                .toJSON();
            expect(component).toMatchSnapshot();
        });

        it('should show commit list item if toggled on', async () => {
            const component: ReactWrapper<DeployStepThree> = mount(<DeployStepThree selectedPackage={packageOne} channelName='mychannel' commitSmartContract={undefined} onCommitChange={commitChangeStub} />);

            component.setState({showCommitListItem: true});

            const doesCommitListItemExist: any = component.text().includes('Commit the definition to `mychannel`');
            doesCommitListItemExist.should.equal(true);
        });

        it('should not show commit list item if toggled off', async () => {
            const component: ReactWrapper<DeployStepThree> = mount(<DeployStepThree selectedPackage={packageOne} channelName='mychannel' commitSmartContract={undefined} onCommitChange={commitChangeStub} />);

            component.setState({showCommitListItem: false});

            const doesCommitListItemExist: any = component.text().includes('Commit the definition to `mychannel`');
            doesCommitListItemExist.should.equal(false);
        });
    });

    describe('toggleCommit', () => {

        it('toggle should be set to true if no prop passed', async () => {
            const component: ReactWrapper<DeployStepThree> = mount(<DeployStepThree selectedPackage={packageOne} channelName='mychannel' commitSmartContract={undefined} onCommitChange={commitChangeStub} />);
            const instance: DeployStepThree = component.instance() as DeployStepThree;
            instance.state.showCommitListItem.should.equal(true);
        });

        it('toggle should be set to prop value if undefined', async () => {
            let component: ReactWrapper<DeployStepThree> = mount(<DeployStepThree selectedPackage={packageOne} channelName='mychannel' commitSmartContract={false} onCommitChange={commitChangeStub} />);
            let instance: DeployStepThree = component.instance() as DeployStepThree;
            instance.state.showCommitListItem.should.equal(false);

            component = mount(<DeployStepThree selectedPackage={packageOne} channelName='mychannel' commitSmartContract={true} onCommitChange={commitChangeStub} />);
            instance = component.instance() as DeployStepThree;
            instance.state.showCommitListItem.should.equal(true);
        });

        it('should set state correctly when toggled off and on again', async () => {

            const component: ReactWrapper<DeployStepThree> = mount(<DeployStepThree selectedPackage={packageOne} channelName='mychannel' commitSmartContract={undefined} onCommitChange={commitChangeStub} />);
            const instance: DeployStepThree = component.instance() as DeployStepThree;

            const setState: sinon.SinonStub = mySandBox.stub(instance, 'setState').resolves();

            instance.toggleCommit(false, 'some_id', {some: 'event'});

            setState.should.have.been.calledWithExactly({showCommitListItem: false});
            commitChangeStub.should.have.been.calledWith(false);

            instance.toggleCommit(true, 'other_id', {some: 'otherEvent'});

            setState.should.have.been.calledWithExactly({showCommitListItem: true});
            commitChangeStub.should.have.been.calledWith(true);
        });
    });

    describe('changePeers', () => {
        it('should set state when toggled', async () => {

            const component: ReactWrapper<DeployStepThree> = mount(<DeployStepThree selectedPackage={packageOne} channelName='mychannel' commitSmartContract={undefined} onCommitChange={commitChangeStub} />);
            const instance: DeployStepThree = component.instance() as DeployStepThree;

            // TODO: Update when code is implemented.

            instance.changePeers({selectedItems: [{id: 'hello', label: 'world'}]});

        });
    });

});
