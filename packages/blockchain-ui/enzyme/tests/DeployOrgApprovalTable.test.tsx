import React from 'react';
import renderer from 'react-test-renderer';
import chai from 'chai';
import sinonChai from 'sinon-chai';
import DeployOrgApprovalTable from '../../src/components/elements/DeployOrgApprovalTable/DeployOrgApprovalTable';
import { ShallowWrapper, shallow } from 'enzyme';
chai.should();
chai.use(sinonChai);

// tslint:disable no-unused-expression

describe('DeployOrgApprovalTable component', () => {
    let defaultProps: { orgApprovals: any, orgMap: any, environmentPeers: string[] };

    beforeEach(() => {
        defaultProps = {
            orgApprovals: {
                Org1MSP: true,
                Org2MSP: false
            },
            orgMap: {
                Org1MSP: ['Org1Peer1'],
                Org2MSP: ['Org2Peer1']
            },
            environmentPeers: [
                'Org1Peer1'
            ]
        };
    });

    it('should render the expected snapshot', () => {
        const component: any = renderer
            .create(<DeployOrgApprovalTable {...defaultProps} />)
            .toJSON();
        expect(component).toMatchSnapshot();
    });

    it('should show which orgs have approved the definition', () => {
        const component: ShallowWrapper<any> = shallow(<DeployOrgApprovalTable {...defaultProps}/>);
        component.html().includes(`<tr id="Org1MSP-row"><td>Org1MSP</td><td>Approved</td></tr><tr id="Org2MSP-row"><td>Org2MSP</td><td>Not approved</td></tr>`).should.equal(true);
        component.html().includes(`<p>Commit has already been performed for this definition name and version.</p>`).should.equal(false);
    });

    it('should show which orgs will approve the definition when deployed', () => {
        defaultProps.orgApprovals = {
            Org1MSP: false,
            Org2MSP: false
        };
        const component: ShallowWrapper<any> = shallow(<DeployOrgApprovalTable {...defaultProps}/>);
        component.html().includes(`<tr id="Org1MSP-row"><td>Org1MSP</td><td>Pending (part of this deploy)</td></tr><tr id="Org2MSP-row"><td>Org2MSP</td><td>Not approved</td></tr>`).should.equal(true);
        component.html().includes(`<p>Commit has already been performed for this definition name and version.</p>`).should.equal(false);
    });

    it('should show error if unable to get org approvals', () => {
        defaultProps.orgApprovals = {};
        const component: ShallowWrapper<any> = shallow(<DeployOrgApprovalTable {...defaultProps}/>);
        component.html().includes(`<p>Commit has already been performed for this definition name and version.</p>`).should.equal(true);
        component.html().includes(`<tr><td>Org1MSP</td><td>Approved</td></tr><tr><td>Org2MSP</td><td>Not approved</td></tr>`).should.equal(false);
    });

    it('should not show org approval table if no response from vs code', () => {
        defaultProps.orgApprovals = undefined;
        const component: ShallowWrapper<any> = shallow(<DeployOrgApprovalTable {...defaultProps}/>);
        component.html().includes(`<p>Retrieving organization approvals...</p>`).should.equal(true);
    });
});
