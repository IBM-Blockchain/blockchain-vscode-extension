import React, { Component } from 'react';
import Axios, { AxiosResponse } from 'axios';
import IssuesList from '../IssuesList/IssuesList';

const githubProject: string = 'IBM-Blockchain/blockchain-vscode-extension';

// Github URLs
const issuesNextApiUrl: string = 'https://api.github.com/repos/' + githubProject + '/issues?labels=next&state=closed&per_page=100';
const allMilestones: string = 'https://api.github.com/repos/' + githubProject + '/milestones';

interface UpcomingState {
    issues: any;
    error: string | undefined;
    newestMilestone: any;
}

class UpcomingList extends Component<{}, UpcomingState> {

    constructor(props: Readonly<UpcomingState>) {
        super(props);
        this.state = {
            issues: undefined,
            error: undefined,
            newestMilestone: undefined
        };

        this.refreshIssues = this.refreshIssues.bind(this);
    }

    async componentDidMount(): Promise <void> {
        try {
            const milestoneResponse: AxiosResponse = await Axios.get(allMilestones);
            const currentMilestone: number = milestoneResponse.data.reduce((a: any, b: any) => {
                return (a.due_on > b.due_on) ? a : b;
            });
            this.setState({
                newestMilestone: currentMilestone
            });
        } catch (error) {
            this.setState({
                error : 'Cannot load from Github, sorry.'
            });
        }

        await this.refreshIssues();
    }

    async refreshIssues(): Promise<void> {
        try {
            const response: AxiosResponse = await Axios.get(issuesNextApiUrl);
            this.setState({
                issues: response.data
            });
        } catch (error) {
            this.setState({
                error : 'Cannot load from Github, sorry.'
            });
        }
    }

    render(): JSX.Element {
        let latestDueDate: string = '';
        let milestoneNumber: string = '';
        let issuesThisMilestone: any;
        if (this.state.newestMilestone) {
            const dt: Date = new Date(this.state.newestMilestone.due_on);

            // Set expected release date to milestone due_date minus days (thursday before)
            dt.setDate(dt.getDate() - 4);

            latestDueDate = dt.toLocaleDateString();
            milestoneNumber = this.state.newestMilestone.number;
        }

        if (this.state.issues || this.state.error) {
            if (this.state.issues && this.state.newestMilestone) {
                const milestoneTitle: string = this.state.newestMilestone.title;

                issuesThisMilestone = this.state.issues.filter((issue: any) => {
                    if (issue.milestone) {
                        if (issue.milestone.title === milestoneTitle) {
                            return issue;
                        }
                    }
                });
            }
            let title: string = '';
            let newMilestone: any;

            if (this.state.error) {
                title = 'Fixed in upcoming release';
                newMilestone = 'someMilestone';
            } else {
                title = 'Fixed in upcoming release (expected on ' + latestDueDate + ')';
                newMilestone = this.state.newestMilestone;
            }

            return (
                <div>
                    <IssuesList
                        key='issues'
                        issues={issuesThisMilestone}
                        error={this.state.error}
                        title={title}
                        issueLabel='next'
                        newestMilestone= {newMilestone}
                        milestoneNumber={milestoneNumber}>
                    </IssuesList>
                </div>
            );
        } else {
            return <></>;
        }
    }
}

export default UpcomingList;
