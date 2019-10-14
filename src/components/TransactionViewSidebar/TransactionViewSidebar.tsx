import React from 'react';
import './TransactionViewSidebar.scss';
import SidebarPanel from '../TransactionViewSidebarPanel/TransactionViewSidebarPanel';

function TransactionViewSidebar(): any {

        return (
            <div className="sidebar-container" id="sidebar-container">
                <SidebarPanel panelType={'buttons'}/>
                <SidebarPanel panelType={'filters'}/>
                <SidebarPanel panelType={'log'}/>
            </div>
        );
}

export default TransactionViewSidebar;
