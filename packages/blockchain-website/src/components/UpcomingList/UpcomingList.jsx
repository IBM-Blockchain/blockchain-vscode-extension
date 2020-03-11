import React, { Component } from 'react'
import Axios from 'axios'
import IssuesList from '../IssuesList/IssuesList'

const githubProject = 'IBM-Blockchain/blockchain-vscode-extension';

//Github URLs
const issuesNextApiUrl = 'https://api.github.com/repos/'+githubProject+'/issues?labels=next&state=closed&per_page=100'
const allMilestones = 'https://api.github.com/repos/'+githubProject+'/milestones'

class UpcomingList extends Component {

    constructor() {
        super();
        this.state = {
            issues: undefined,
            error: undefined
        }

        this.refreshIssues = this.refreshIssues.bind(this);
    }

    async componentDidMount(){
        const milestoneResponse = await Axios.get(allMilestones);
        if (milestoneResponse) {
            const newestMilestone = milestoneResponse.data.reduce(function(a,b) {
                return (a.due_on > b.due_on) ? a : b;
            });
            this.setState({
                newestMilestone: newestMilestone
            });
        } else {
            this.setState({
                error : 'Cannot load from Github, sorry.'
            });        }

        await this.refreshIssues()
    }

    async refreshIssues(){
        const response = await Axios.get(issuesNextApiUrl);
        if (response) {
            this.setState({
                issues: response.data
            });
        } else {
            this.setState({
                error : 'Cannot load from Github, sorry.'
            });
        }
    }

    render() {
        let latestDueDate = '';
        let milestoneNumber = '';
        let issuesThisMilestone;
        if (this.state.newestMilestone) {
            const dt = new Date(this.state.newestMilestone.due_on);

            // Set expected release date to milestone due_date minus days (thursday before)
            dt.setDate(dt.getDate()-4);

            latestDueDate = dt.toLocaleDateString();
            milestoneNumber = this.state.newestMilestone.number;
        }

        if (this.state.issues || this.state.error) {
            if (this.state.issues && this.state.newestMilestone) {
                const milestoneTitle = this.state.newestMilestone.title
                issuesThisMilestone = this.state.issues.filter(function(issue) {
                    if(issue.milestone) {
                        if (issue.milestone.title === milestoneTitle) {
                            return issue;
                        }
                    }
                });

            }
    
            return (
                <div>
                    <IssuesList 
                        key='issues' 
                        issues={issuesThisMilestone}
                        error={this.state.error}
                        refreshIssues={this.refreshIssues}
                        title={'Upcoming release: expected on ' + latestDueDate}
                        issueLabel='next'
                        newestMilestone= {this.state.newestMilestone}
                        milestoneNumber={milestoneNumber}>
                    </IssuesList>
                </div>
            );
        } else {
            return <></>;
        }
    }
}

export default UpcomingList