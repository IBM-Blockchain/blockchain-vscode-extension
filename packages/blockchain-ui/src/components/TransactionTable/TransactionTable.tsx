import React, { Component } from 'react';
import './TransactionTable.scss';
import { Button, DataTable } from 'carbon-components-react';

const {
    TableContainer, Table,
    TableHead,
    TableHeader,
    TableRow,
    TableBody,
    TableCell,
    TableToolbar,
    TableToolbarContent,
    TableBatchActions,
    TableSelectAll,
    TableSelectRow
} = DataTable;

interface TableHeader {
    header: string;
    key: string;
}

interface TableRow {
    id: string;
    name: string;
    arguments: string;
    timestamp: string;
    result: string;
}

interface TableProps {
    id: string;
    title: string;
    description: string;
    rows: Array<TableRow> | Array<{id: string, name: string}>;
    buttonId: string;
    buttonText: string;
    buttonFunction: (viewToOpen: string) => void;
}

interface TableState {
    id: string;
    title: string;
    description: string;
    rows: Array<TableRow> | Array<{id: string, name: string}>;
    buttonId: string;
    buttonText: string;
    buttonFunction: (viewToOpen: string) => void;
}

class TransactionTable extends Component<TableProps, TableState> {

    constructor(props: Readonly<TableProps>) {
        super(props);
        this.state = {
            id: this.props.id,
            title: this.props.title,
            description: this.props.description,
            rows: (this.props.rows),
            buttonId: this.props.buttonId,
            buttonText: this.props.buttonText,
            buttonFunction: this.props.buttonFunction
        };
    }

    render(): JSX.Element {
        const tableHeaders: Array<TableHeader> = [
            { header: 'Name', key: 'name' },
            { header: 'Arguments', key: 'arguments' },
            { header: 'Timestamp', key: 'timestamp' },
            { header: 'Result', key: 'result' }
        ];
        return (
            <div className='transaction-table-container' id={this.state.id}>
                <DataTable
                    rows={this.state.rows}
                    headers={tableHeaders}
                    render={({ rows, headers, getHeaderProps, getSelectionProps, getBatchActionProps }: any): JSX.Element => (
                        <TableContainer title={this.state.title} description={this.state.description}>
                            <TableToolbar>
                                <TableBatchActions {...getBatchActionProps()}>
                                </TableBatchActions>
                                <TableToolbarContent>
                                    <Button id={this.state.buttonId} onClick={(): void => this.state.buttonFunction('create')}>{this.state.buttonText}</Button>
                                </TableToolbarContent>
                            </TableToolbar>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableSelectAll {...getSelectionProps()} />
                                        {headers.map((header: TableHeader) => (
                                            <TableHeader {...getHeaderProps({ header })}>
                                                {header.header}
                                            </TableHeader>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {rows.map((row: any) => (
                                        <TableRow key={row.id}>
                                            <TableSelectRow {...getSelectionProps({ row })} />
                                            {row.cells.map((cell: any) => (
                                                <TableCell key={cell.id}>{cell.value}</TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                />
            </div>
        );
    }
}

export default TransactionTable;
