import React, { Component } from 'react';
import './TransactionSidebarPanel.scss';
import { Button } from 'carbon-components-react';

interface SidebarPanelProps {
    panelType: 'buttons' | 'filters' | 'log';
}

interface SidebarPanelState {
    panelType: 'buttons' | 'filters' | 'log';
}

class TransactionSidebarPanel extends Component<SidebarPanelProps, SidebarPanelState> {

    constructor(props: Readonly<SidebarPanelProps>) {
        super(props);
        this.state = {
            panelType: this.props.panelType
        };
    }

    public createTxn(): void {
        dispatchEvent(new MessageEvent('message', {
            data: {
                path: '/transaction/create'
            }
        }));
    }

    public importTxn(): void {
        // tslint:disable-next-line: no-console
        console.log('import an existing transaction');
    }

    public render(): any {
        return this.getContents();
    }

    private getContents(): any {
        let panelTSX: any;

        if (this.state.panelType === 'buttons') {
            panelTSX = (
                <div className='panel-container'>
                    <Button id='create-button' size='field' onClick={this.createTxn}>Create a new transaction</Button>
                    <Button id='import-button' size='field' onClick={this.importTxn}>Import existing transaction</Button>
                 </div>
            );
        } else if (this.state.panelType === 'filters') {
            panelTSX = (
                <div className='panel-container'>
                    <h5>Filters</h5>
                </div>
            );
        } else {
            panelTSX = (
                <div className='panel-container'>
                    <h5>Transactions</h5>
                </div>
            );
        }

        return panelTSX;
    }
}

export default TransactionSidebarPanel;
