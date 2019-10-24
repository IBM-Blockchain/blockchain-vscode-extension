import React, { Component } from 'react';
import './TransactionViewSidebarPanel.scss';
import { Button } from 'carbon-components-react';

type SidebarPanelProps = {
    panelType: 'buttons' | 'filters' | 'log'
};

type SidebarPanelState = {
    panelType: 'buttons' | 'filters' | 'log'
};

class TransactionViewSidebarPanel extends Component<SidebarPanelProps, SidebarPanelState> {

    constructor(props: Readonly<SidebarPanelProps>) {
        super(props);
        this.state = {
            panelType: this.props.panelType
        }
    }

    public createTxn() {
        console.log('create a new transaction');
    }

    public importTxn() {
        console.log('import an existing transaction');
    }

    private getContents(): any {
        let panelTSX: any;

        if (this.state.panelType === 'buttons') {
            panelTSX = (
                <div className="panel-container">
                    <Button id="create-button" size='field' onClick={this.createTxn}>Create a new transaction</Button>
                    <Button id="import-button" size='field' onClick={this.importTxn}>Import existing transaction</Button>
                 </div>
            );
        } else if (this.state.panelType === 'filters') {
            panelTSX = (
                <div className="panel-container">
                    <h5>Filters</h5>
                </div>
            );
        } else {
            panelTSX = (
                <div className="panel-container">
                    <h5>Transactions</h5>
                </div>
            );
        }

        return panelTSX;
    }

    public render() {
        return this.getContents();
    }
}

export default TransactionViewSidebarPanel;
