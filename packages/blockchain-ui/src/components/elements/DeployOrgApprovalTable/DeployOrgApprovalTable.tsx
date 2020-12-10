import React, { FunctionComponent } from 'react';
import { DataTable, InlineNotification, TableContainer, Table, TableHead, TableRow, TableHeader, TableBody, TableCell } from 'carbon-components-react';

interface IProps {
    orgApprovals: any;
    orgMap: any;
    environmentPeers: string[];
}

const DeployOrgApprovalTable: FunctionComponent<IProps> = ({orgApprovals, orgMap, environmentPeers}) => {
    const headerData: { header: string, key: string }[] = [
        {
            header: 'Organization',
            key: 'organization',
        },
        {
            header: 'Approval status',
            key: 'status',
        }
    ];

    let tableElement: JSX.Element = <></>;

    if (orgApprovals) {
        const rowData: { id: string, organization: string, status: string }[] = [];

        const approvalEntries: any[] = Object.entries(orgApprovals);

        if (approvalEntries.length > 0) {
            for (const [org, approved] of approvalEntries) {

                let environmentPeer: string | undefined;
                if (!approved) {
                    // Org should be marked as pending if we're about to deploy on an organization's peers.
                    environmentPeer = orgMap[org].find((_peer: string) => environmentPeers.includes(_peer));
                }

                const entry: { id: string, organization: string, status: string } = {
                    id: org,
                    organization: org,
                    status: approved ? 'Approved' : environmentPeer ? 'Pending (part of this deploy)' : 'Not approved'
                };

                rowData.push(entry);

                tableElement = (
                    <DataTable
                        rows={rowData}
                        headers={headerData}
                        render={({ rows, headers, getHeaderProps }) => (
                            <TableContainer>
                                <Table size='short'>
                                    <TableHead>
                                        <TableRow>
                                            {headers.map((header) => (
                                                <TableHeader {...getHeaderProps({ header })}>
                                                    {header.header}
                                                </TableHeader>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {rows.map((row) => (
                                            <TableRow id={row.id + '-row'} key={row.id}>
                                                {row.cells.map((cell) => (
                                                    <TableCell key={cell.id}>{cell.value}</TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>)}
                    />
                );
            }
        } else {
            tableElement = (
                <InlineNotification
                    hideCloseButton={true}
                    kind='info'
                    lowContrast={true}
                    notificationType='inline'
                    role='alert'
                    statusIconDescription='describes the status icon'
                    subtitle={<p>Commit has already been performed for this definition name and version.</p>}
                    title='Unable to get organization approvals'
                />
            );
        }
    } else {
        tableElement = (<p>Retrieving organization approvals...</p>);
    }

    return tableElement;
};

export default DeployOrgApprovalTable;
