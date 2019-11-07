import React from 'react';
import './TransactionSidebar.scss';
import SidebarPanel from '../TransactionSidebarPanel/TransactionSidebarPanel';

function TransactionSidebar(): any {
    return (
        <div className='sidebar-container' id='sidebar-container'>
            <SidebarPanel panelType={'buttons'}/>
            <SidebarPanel panelType={'filters'}/>
            <SidebarPanel panelType={'log'}/>
        </div>
    );
}

export default TransactionSidebar;
