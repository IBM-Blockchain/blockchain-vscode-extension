// tslint:disable no-unused-expression
import React from 'react';
import renderer from 'react-test-renderer';
import { mount } from 'enzyme';
import SidebarPanel from '../../src/components/TransactionSidebarPanel/TransactionSidebarPanel';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
chai.should();
chai.use(sinonChai);

describe('SidebarPanel component', () => {

    let mySandBox: sinon.SinonSandbox;

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
    });

    afterEach(async () => {
        mySandBox.restore();
    });

    it('should render the expected snapshot when panelType = \`buttons\`', async () => {
        const component: any = renderer
            .create(<SidebarPanel panelType={'buttons'}/>)
            .toJSON();
        expect(component).toMatchSnapshot();
    });

    it('should render the expected snapshot when panelType = \`filters\`', async () => {
        const component: any = renderer
            .create(<SidebarPanel panelType={'filters'}/>)
            .toJSON();
        expect(component).toMatchSnapshot();
    });

    it('should render the expected snapshot when panelType = \`log\`', async () => {
        const component: any = renderer
            .create(<SidebarPanel panelType={'log'}/>)
            .toJSON();
        expect(component).toMatchSnapshot();
    });

    it('should navigate to the create screen', async () => {
        const dispatchEventSpy: sinon.SinonSpy = sinon.spy(EventTarget.prototype, 'dispatchEvent');
        const component: any = mount(<SidebarPanel panelType='buttons'/>);
        component.find('#create-button').at(1).simulate('click');
        dispatchEventSpy.should.have.been.called;
    });

    it('will one day allow a user to create a new transaction', async () => {
        const importTxnSpy: sinon.SinonSpy = sinon.spy(SidebarPanel.prototype, 'importTxn');
        const component: any = mount(<SidebarPanel panelType='buttons'/>);
        component.find('#import-button').at(1).simulate('click');
        importTxnSpy.should.have.been.called;
    });

});
