import React  from 'react';
import renderer from 'react-test-renderer';
import { mount } from 'enzyme';
import SidebarPanel from '../../src/components/TransactionViewSidebarPanel/TransactionViewSidebarPanel';
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
            .create(<SidebarPanel panelType={'buttons'}></SidebarPanel>)
            .toJSON();
        expect(component).toMatchSnapshot();
    });

    it('should render the expected snapshot when panelType = \`filters\`', async () => {
        const component: any = renderer
            .create(<SidebarPanel panelType={'filters'}></SidebarPanel>)
            .toJSON();
        expect(component).toMatchSnapshot();
    });

    it('should render the expected snapshot when panelType = \`log\`', async () => {
        const component: any = renderer
            .create(<SidebarPanel panelType={'log'}></SidebarPanel>)
            .toJSON();
        expect(component).toMatchSnapshot();
    });

    it('will one day allow a user to create a new transaction', async() => {
        const createTxnSpy: sinon.SinonSpy = sinon.spy(SidebarPanel.prototype, 'createTxn');
        const component: any = mount(<SidebarPanel panelType='buttons'></SidebarPanel>);
        component.find('button[id=\'create-button\']').simulate('click');
        createTxnSpy.should.have.been.called;
    });
    
    it('will one day allow a user to create a new transaction', async() => {
        const importTxnSpy: sinon.SinonSpy = sinon.spy(SidebarPanel.prototype, 'importTxn');
        const component: any = mount(<SidebarPanel panelType='buttons'></SidebarPanel>);
        component.find('button[id=\'import-button\']').simulate('click');
        importTxnSpy.should.have.been.called;
    });

});
