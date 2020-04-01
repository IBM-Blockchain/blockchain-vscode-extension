import React, { Component } from 'react';
import './IssuesList.scss';

const githubProject: string = 'IBM-Blockchain/blockchain-vscode-extension';

// Github URLs
const issuesHtmlUrl: string = 'https://github.com/' + githubProject + '/issues?q=';
const newIssueUrl: string = 'https://github.com/' + githubProject + '/issues/new';

interface IssueProps {
    issues?: any;
    error?: string;
    title?: string;
    issueLabel?: string;
    newestMilestone?: any;
    milestoneNumber?: string;
}

class IssuesList extends Component<IssueProps, {}> {

    getLabel(issue: any): JSX.Element {
        if (issue.labels[0].name.startsWith('sev')) {
            let labelJSX: JSX.Element = <></>;

            const issueLabels: [{id: number, node_id: string, url: string, name: string, color: string, default: boolean, description: string}] = issue.labels;
            if (issueLabels[0].name === 'sev1') {
                labelJSX = (
                    <h3 className='label bg-sev1'> {'sev1'}
                    </h3>
                );
            } else if (issueLabels[0].name === 'sev2') {
                labelJSX = (
                    <h3 className='label bg-sev2'> {'sev2'}
                    </h3>
                );
            } else {
                labelJSX = (
                    <h3 className='label bg-sev3'> {'sev3'}
                    </h3>
                );
            }
            return labelJSX;

        } else {
            return <></>;
        }
    }

    render(): JSX.Element {
        let issueItems: any = (
            <div className='no-issues'>Please wait, loading status information</div>
        );
        if (this.props.error) {
            issueItems = (
                <div className='no-issues'> {this.props.error}</div>
            );
        } else if (this.props.issues !== undefined) {
            // Sort the incidents by severity
            let issuesArray: any = this.props.issues;
            const sortedArray: any = [];
            if (!this.props.newestMilestone) {
                issuesArray.map((issue: any) => {
                    let labels: any = issue.labels;
                    labels = labels.filter((label: {id: number, node_id: string, url: string, name: string, color: string, default: boolean, description: string}) => {
                        return(label.name.startsWith('sev') || label.name.startsWith('status'));
                    });
                    issue.labels = labels;
                    sortedArray.push(issue);
                });
                issuesArray = sortedArray.sort((a: any, b: any) => a.labels[0].name.localeCompare(b.labels[0].name));
            }

            issueItems = issuesArray.map((issue: any) => {
                const creationDate: Date = new Date(issue.created_at);
                const updateDate: Date = new Date(issue.updated_at);
                let updateOrCloseDate: string = 'Updated: ' + updateDate.toLocaleDateString();
                if (issue.state === 'closed') {
                    updateOrCloseDate = 'Resolved: ' + updateDate.toLocaleDateString();
                }

                return (
                    <div className='panel'>
                        <div>
                            <p className='issue-title'>
                                {(issue.state === 'closed' ? 'RESOLVED: ' : '') + issue.title + ' (#' + issue.number + ')'}
                            </p>
                        </div>
                        <div className='label-div'>
                            {this.getLabel(issue)}
                        </div>
                        <div>
                            <span className='date'>{'Reported: ' + creationDate.toLocaleDateString()}</span>
                            <br></br>
                            <span className='date'>{updateOrCloseDate}</span>
                        </div>
                        <a className='link view-issue' href={issue.html_url}>{'View on GitHub'}</a>
                    </div>
                );
            });

            if (issueItems.length === 0) {
                if (this.props.newestMilestone) { // Only issues in current milestone have this property.
                    issueItems = (
                        <div className='no-issues'>
                            No completed fixes yet!
                        </div>
                    );
                } else {
                    issueItems = (
                        <div className='no-issues'>
                            No incidents found!
                        </div>
                    );
                }
            }
        }

        let milestoneUrl: string = 'https://github.com/' + githubProject + '/milestone/';
        milestoneUrl += this.props.milestoneNumber;
        const milestoneRelease: boolean = (this.props.newestMilestone !== undefined) ? true : false;
        let reportIncident: JSX.Element;

        if (this.props.newestMilestone) {
            reportIncident = (<></>);
        } else {
            reportIncident = <span className='new-issue-position'>
                <a className='button' href={newIssueUrl}>Report a new issue</a>
                </span>;
        }

        return(
            <div>
                <div className='div-title'>
                    {this.props.title}

                    <div className='button-container'>
                        {milestoneRelease ? (
                            <span className='view-milestone'>
                                <a className='link' href={milestoneUrl}> {'See current milestone'} </a>
                            </span>
                        ) : (
                            <span className='view-all-position'>
                                <a className='link' href={issuesHtmlUrl}> {'View all on GitHub'} </a>
                            </span>
                        )}
                        {reportIncident}
                    </div>
                </div>
                <div className='flex-container'>
                    {issueItems}
                </div>
            </div>
        );
    }
}

export default IssuesList;
