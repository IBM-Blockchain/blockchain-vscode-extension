import React from 'react';
import renderer from 'react-test-renderer';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import DeployStepThree from '../../../src/components/elements/DeploySteps/DeployStepThree/DeployStepThree';
import IPackageRegistryEntry from '../../../src/interfaces/IPackageRegistryEntry';
import { ReactWrapper, mount, shallow, ShallowWrapper } from 'enzyme';

chai.should();
chai.use(sinonChai);

// tslint:disable: no-unused-expression

describe('DeployStepThree component', () => {
    let mySandBox: sinon.SinonSandbox;

    const packageOne: IPackageRegistryEntry = { name: 'mycontract', version: '0.0.1', path: '/package/one', sizeKB: 9000 };
    const packageOneUpgrade: IPackageRegistryEntry = { name: 'mycontract', version: '0.0.1', path: '/package/one', sizeKB: 9000 };
    const packageTwo: IPackageRegistryEntry = { name: 'importedContract', path: '/package/one', sizeKB: 9000 };

    let commitChangeStub: sinon.SinonStub;
    let changePeersStub: sinon.SinonStub;
    let getOrgApprovalStub: sinon.SinonStub;
    let instantiateFunctionNameChangeStub: sinon.SinonStub;
    let instantiateFunctionArgsChangeStub: sinon.SinonStub;

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
        commitChangeStub = mySandBox.stub();
        changePeersStub = mySandBox.stub();
        getOrgApprovalStub = mySandBox.stub();
        instantiateFunctionNameChangeStub = mySandBox.stub();
        instantiateFunctionArgsChangeStub = mySandBox.stub();
    });

    afterEach(async () => {
        mySandBox.restore();
    });

    describe('render', () => {
        it('should render the expected snapshot when showing v2 deploy view', () => {
            const component: any = renderer
                .create(<DeployStepThree hasV1Capabilities={false} committedDefinitions={[]} environmentPeers={['Org1Peer1']} discoveredPeers={['Org2Peer1']} orgMap={{ Org1MSP: ['Org1Peer1'], Org2MSP: ['Org2Peer1'] }} orgApprovals={{ Org1MSP: true, Org2MSP: false }} selectedPeers={['Org2Peer1']} selectedPackage={packageOne} channelName='mychannel' commitSmartContract={undefined} onPeerChange={changePeersStub} onCommitChange={commitChangeStub} onGetOrgApproval={getOrgApprovalStub} onInstantiateFunctionNameChange={instantiateFunctionNameChangeStub} onInstantiateFunctionArgsChange={instantiateFunctionArgsChangeStub} />)
                .toJSON();
            expect(component).toMatchSnapshot();
        });

        it('should render the expected snapshot when showing v1 deploy view', () => {
            const component: any = renderer
                .create(<DeployStepThree hasV1Capabilities={true}  committedDefinitions={[]}environmentPeers={['Org1Peer1']} discoveredPeers={['Org2Peer1']} orgMap={{ Org1MSP: ['Org1Peer1'], Org2MSP: ['Org2Peer1'] }} orgApprovals={{ Org1MSP: true, Org2MSP: false }} selectedPeers={['Org2Peer1']} selectedPackage={packageOne} channelName='mychannel' commitSmartContract={undefined} onPeerChange={changePeersStub} onCommitChange={commitChangeStub} onGetOrgApproval={getOrgApprovalStub} onInstantiateFunctionNameChange={instantiateFunctionNameChangeStub} onInstantiateFunctionArgsChange={instantiateFunctionArgsChangeStub} />)
                .toJSON();
            expect(component).toMatchSnapshot();
        });

        it('should show the correct dialogs when upgrading in v1 deploy view', () => {
            const component: ShallowWrapper<DeployStepThree> = shallow(<DeployStepThree hasV1Capabilities={true} committedDefinitions={['mycontract@0.0.1']} environmentPeers={['Org1Peer1']} discoveredPeers={['Org2Peer1']} orgMap={{ Org1MSP: ['Org1Peer1'], Org2MSP: ['Org2Peer1'] }} orgApprovals={{ Org1MSP: true, Org2MSP: false }} selectedPeers={['Org2Peer1']} selectedPackage={packageOneUpgrade} channelName='mychannel' commitSmartContract={undefined} onPeerChange={changePeersStub} onCommitChange={commitChangeStub} onGetOrgApproval={getOrgApprovalStub} onInstantiateFunctionNameChange={instantiateFunctionNameChangeStub} onInstantiateFunctionArgsChange={instantiateFunctionArgsChangeStub} />);
            // todo assertions
        });

        it('should display package with a version', async () => {
            const component: ShallowWrapper<DeployStepThree> = shallow(<DeployStepThree hasV1Capabilities={false} committedDefinitions={[]} environmentPeers={['Org1Peer1']} discoveredPeers={['Org2Peer1']} orgMap={{ Org1MSP: ['Org1Peer1'], Org2MSP: ['Org2Peer1'] }} orgApprovals={{ Org1MSP: true, Org2MSP: false }} selectedPeers={['Org2Peer1']} selectedPackage={packageOne} channelName='mychannel' commitSmartContract={undefined} onPeerChange={changePeersStub} onCommitChange={commitChangeStub} onGetOrgApproval={getOrgApprovalStub} onInstantiateFunctionNameChange={instantiateFunctionNameChangeStub} onInstantiateFunctionArgsChange={instantiateFunctionArgsChangeStub} />);
            component.html().includes(`\`${packageOne.name}@${packageOne.version}\``).should.equal(true);
        });

        it('should display package without a version', async () => {
            const component: ShallowWrapper<DeployStepThree> = shallow(<DeployStepThree hasV1Capabilities={false} committedDefinitions={[]} environmentPeers={['Org1Peer1']} discoveredPeers={['Org2Peer1']} orgMap={{ Org1MSP: ['Org1Peer1'], Org2MSP: ['Org2Peer1'] }} orgApprovals={{ Org1MSP: true, Org2MSP: false }} selectedPeers={['Org2Peer1']} selectedPackage={packageTwo} channelName='mychannel' commitSmartContract={undefined} onPeerChange={changePeersStub} onCommitChange={commitChangeStub} onGetOrgApproval={getOrgApprovalStub} onInstantiateFunctionNameChange={instantiateFunctionNameChangeStub} onInstantiateFunctionArgsChange={instantiateFunctionArgsChangeStub} />);
            component.html().includes(`\`${packageTwo.name}\``).should.equal(true);
        });

        it('should show commit list item if toggled on', async () => {
            const component: ReactWrapper<DeployStepThree> = mount(<DeployStepThree hasV1Capabilities={false} committedDefinitions={[]} environmentPeers={['Org1Peer1']} discoveredPeers={['Org2Peer1']} orgMap={{ Org1MSP: ['Org1Peer1'], Org2MSP: ['Org2Peer1'] }} orgApprovals={{ Org1MSP: true, Org2MSP: false }} selectedPeers={['Org2Peer1']} selectedPackage={packageOne} channelName='mychannel' commitSmartContract={undefined} onPeerChange={changePeersStub} onCommitChange={commitChangeStub} onGetOrgApproval={getOrgApprovalStub} onInstantiateFunctionNameChange={instantiateFunctionNameChangeStub} onInstantiateFunctionArgsChange={instantiateFunctionArgsChangeStub} />);

            component.setState({ showCommitListItem: true });

            const doesCommitListItemExist: any = component.text().includes('Commit the definition to `mychannel`');
            doesCommitListItemExist.should.equal(true);
        });

        it('should not show commit list item if toggled off', async () => {
            const component: ReactWrapper<DeployStepThree> = mount(<DeployStepThree hasV1Capabilities={false} committedDefinitions={[]} environmentPeers={['Org1Peer1']} discoveredPeers={['Org2Peer1']} orgMap={{ Org1MSP: ['Org1Peer1'], Org2MSP: ['Org2Peer1'] }} orgApprovals={{ Org1MSP: true, Org2MSP: false }} selectedPeers={['Org2Peer1']} selectedPackage={packageOne} channelName='mychannel' commitSmartContract={undefined} onPeerChange={changePeersStub} onCommitChange={commitChangeStub} onGetOrgApproval={getOrgApprovalStub} onInstantiateFunctionNameChange={instantiateFunctionNameChangeStub} onInstantiateFunctionArgsChange={instantiateFunctionArgsChangeStub} />);

            component.setState({ showCommitListItem: false });

            const doesCommitListItemExist: any = component.text().includes('Commit the definition to `mychannel`');
            doesCommitListItemExist.should.equal(false);
        });
    });

    describe('toggleCommit', () => {

        it('toggle should be set to true if no prop passed', async () => {
            const component: ReactWrapper<DeployStepThree> = mount(<DeployStepThree hasV1Capabilities={false} committedDefinitions={[]} environmentPeers={['Org1Peer1']} discoveredPeers={['Org2Peer1']} orgMap={{ Org1MSP: ['Org1Peer1'], Org2MSP: ['Org2Peer1'] }} orgApprovals={{ Org1MSP: true, Org2MSP: false }} selectedPeers={['Org2Peer1']} selectedPackage={packageOne} channelName='mychannel' commitSmartContract={undefined} onPeerChange={changePeersStub} onCommitChange={commitChangeStub} onGetOrgApproval={getOrgApprovalStub} onInstantiateFunctionNameChange={instantiateFunctionNameChangeStub} onInstantiateFunctionArgsChange={instantiateFunctionArgsChangeStub} />);
            const instance: DeployStepThree = component.instance() as DeployStepThree;
            instance.state.showCommitListItem.should.equal(true);
        });

        it('toggle should be set to prop value if undefined', async () => {
            let component: ReactWrapper<DeployStepThree> = mount(<DeployStepThree hasV1Capabilities={false} committedDefinitions={[]} environmentPeers={['Org1Peer1']} discoveredPeers={['Org2Peer1']} orgMap={{ Org1MSP: ['Org1Peer1'], Org2MSP: ['Org2Peer1'] }} orgApprovals={{ Org1MSP: true, Org2MSP: false }} selectedPeers={['Org2Peer1']} selectedPackage={packageOne} channelName='mychannel' commitSmartContract={false} onPeerChange={changePeersStub} onCommitChange={commitChangeStub} onGetOrgApproval={getOrgApprovalStub} onInstantiateFunctionNameChange={instantiateFunctionNameChangeStub} onInstantiateFunctionArgsChange={instantiateFunctionArgsChangeStub} />);
            let instance: DeployStepThree = component.instance() as DeployStepThree;
            instance.state.showCommitListItem.should.equal(false);

            component = mount(<DeployStepThree hasV1Capabilities={false} committedDefinitions={[]} environmentPeers={['Org1Peer1']} discoveredPeers={['Org2Peer1']} orgMap={{ Org1MSP: ['Org1Peer1'], Org2MSP: ['Org2Peer1'] }} orgApprovals={{ Org1MSP: true, Org2MSP: false }} selectedPeers={['Org2Peer1']} selectedPackage={packageOne} channelName='mychannel' commitSmartContract={true} onPeerChange={changePeersStub} onCommitChange={commitChangeStub} onGetOrgApproval={getOrgApprovalStub} onInstantiateFunctionNameChange={instantiateFunctionNameChangeStub} onInstantiateFunctionArgsChange={instantiateFunctionArgsChangeStub} />);
            instance = component.instance() as DeployStepThree;
            instance.state.showCommitListItem.should.equal(true);
        });

        it('should set state correctly when toggled off and on again', async () => {

            const component: ReactWrapper<DeployStepThree> = mount(<DeployStepThree hasV1Capabilities={false} committedDefinitions={[]} environmentPeers={['Org1Peer1']} discoveredPeers={['Org2Peer1']} orgMap={{ Org1MSP: ['Org1Peer1'], Org2MSP: ['Org2Peer1'] }} orgApprovals={{ Org1MSP: true, Org2MSP: false }} selectedPeers={['Org2Peer1']} selectedPackage={packageOne} channelName='mychannel' commitSmartContract={undefined} onPeerChange={changePeersStub} onCommitChange={commitChangeStub} onGetOrgApproval={getOrgApprovalStub} onInstantiateFunctionNameChange={instantiateFunctionNameChangeStub} onInstantiateFunctionArgsChange={instantiateFunctionArgsChangeStub} />);
            const instance: DeployStepThree = component.instance() as DeployStepThree;

            const setState: sinon.SinonStub = mySandBox.stub(instance, 'setState').resolves();

            instance.toggleCommit(false, 'some_id', { some: 'event' });

            setState.should.have.been.calledWithExactly({ showCommitListItem: false });
            commitChangeStub.should.have.been.calledWith(false);

            instance.toggleCommit(true, 'other_id', { some: 'otherEvent' });

            setState.should.have.been.calledWithExactly({ showCommitListItem: true });
            commitChangeStub.should.have.been.calledWith(true);
        });
    });

    describe('changePeers', () => {
        it('should set state when toggled', async () => {

            const component: ReactWrapper<DeployStepThree> = mount(<DeployStepThree hasV1Capabilities={false} committedDefinitions={[]} environmentPeers={['Org1Peer1']} discoveredPeers={['Org2Peer1']} orgMap={{ Org1MSP: ['Org1Peer1'], Org2MSP: ['Org2Peer1'] }} orgApprovals={{ Org1MSP: true, Org2MSP: false }} selectedPeers={['Org2Peer1']} selectedPackage={packageOne} channelName='mychannel' commitSmartContract={undefined} onPeerChange={changePeersStub} onCommitChange={commitChangeStub} onGetOrgApproval={getOrgApprovalStub} onInstantiateFunctionNameChange={instantiateFunctionNameChangeStub} onInstantiateFunctionArgsChange={instantiateFunctionArgsChangeStub} />);
            const instance: DeployStepThree = component.instance() as DeployStepThree;

            const event: { selectedItems: { id: string, label: string }[] } = { selectedItems: [{ id: 'Org1Peer1', label: 'Org1Peer1' }, { id: 'Org2Peer1', label: 'Org2Peer1' }] };

            instance.changePeers(event);

            changePeersStub.should.have.been.calledOnceWithExactly(['Org1Peer1', 'Org2Peer1']);

        });
    });

    describe('formatDiscoveredPeers', () => {
        it('should format discovered peer list for dropdown', () => {
            const component: ReactWrapper<DeployStepThree> = mount(<DeployStepThree hasV1Capabilities={false} committedDefinitions={[]} environmentPeers={['Org1Peer1']} discoveredPeers={['Org2Peer1']} orgMap={{ Org1MSP: ['Org1Peer1'], Org2MSP: ['Org2Peer1'] }} orgApprovals={{ Org1MSP: true, Org2MSP: false }} selectedPeers={['Org2Peer1']} selectedPackage={packageOne} channelName='mychannel' commitSmartContract={undefined} onPeerChange={changePeersStub} onCommitChange={commitChangeStub} onGetOrgApproval={getOrgApprovalStub} onInstantiateFunctionNameChange={instantiateFunctionNameChangeStub} onInstantiateFunctionArgsChange={instantiateFunctionArgsChangeStub} />);
            const instance: DeployStepThree = component.instance() as DeployStepThree;
            const formattedPeers: { id: string, label: string }[] = instance.formatDiscoveredPeers(['Org1Peer1', 'Org2Peer1']);
            formattedPeers.should.deep.equal([{ id: 'Org1Peer1', label: 'Org1Peer1' }, { id: 'Org2Peer1', label: 'Org2Peer1' }]);
        });
    });

    describe('handleInstantiateFunctionNameChange', () => {
        it('should call name change function received in props', () => {
            const component: ReactWrapper<DeployStepThree> = mount(<DeployStepThree hasV1Capabilities={true}  committedDefinitions={[]}environmentPeers={['Org1Peer1']} discoveredPeers={['Org2Peer1']} orgMap={{ Org1MSP: ['Org1Peer1'], Org2MSP: ['Org2Peer1'] }} orgApprovals={{ Org1MSP: true, Org2MSP: false }} selectedPeers={['Org2Peer1']} selectedPackage={packageOne} channelName='mychannel' commitSmartContract={undefined} onPeerChange={changePeersStub} onCommitChange={commitChangeStub} onGetOrgApproval={getOrgApprovalStub} onInstantiateFunctionNameChange={instantiateFunctionNameChangeStub} onInstantiateFunctionArgsChange={instantiateFunctionArgsChangeStub} />);
            const instance: DeployStepThree = component.instance() as DeployStepThree;
            const mockEvent: any = { target: { value: 'myFunction'} };
            instance.handleInstantiateFunctionNameChange(mockEvent);
            instantiateFunctionNameChangeStub.should.have.been.calledOnceWithExactly(mockEvent.target.value);
        });
    });

    describe('handleInstantiateFunctionArgsChange', () => {
        it('should call args change function received in props', () => {
            const component: ReactWrapper<DeployStepThree> = mount(<DeployStepThree hasV1Capabilities={true}  committedDefinitions={[]}environmentPeers={['Org1Peer1']} discoveredPeers={['Org2Peer1']} orgMap={{ Org1MSP: ['Org1Peer1'], Org2MSP: ['Org2Peer1'] }} orgApprovals={{ Org1MSP: true, Org2MSP: false }} selectedPeers={['Org2Peer1']} selectedPackage={packageOne} channelName='mychannel' commitSmartContract={undefined} onPeerChange={changePeersStub} onCommitChange={commitChangeStub} onGetOrgApproval={getOrgApprovalStub} onInstantiateFunctionNameChange={instantiateFunctionNameChangeStub} onInstantiateFunctionArgsChange={instantiateFunctionArgsChangeStub} />);
            const instance: DeployStepThree = component.instance() as DeployStepThree;
            const mockEvent: any = { currentTarget: { value: '["arg1"], ["arg2"]'} };
            instance.handleInstantiateFunctionArgsChange(mockEvent);
            instantiateFunctionArgsChangeStub.should.have.been.calledOnceWithExactly(mockEvent.currentTarget.value);
        });
    });

});
