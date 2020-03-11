import React, { Component } from 'react'; 
import IssuesList from '../IssuesList/IssuesList';
import Axios from 'axios';

const githubProject = 'IBM-Blockchain/blockchain-vscode-extension';

//Github URLs
const issuesStatusApiUrl = 'https://api.github.com/repos/'+githubProject+'/issues?labels=status'

class StatusList extends Component {

    constructor() {
        super();
        this.state = {
            issues: undefined,
            error: undefined
        }

        this.refreshIssues = this.refreshIssues.bind(this);
    }

    async componentDidMount(){
        await this.refreshIssues();
    }

    async refreshIssues() {

        const response = await Axios.get(issuesStatusApiUrl);
        if (response) {
            this.setState({
                issues : response.data
            });
        } else {
            this.setState({
                error : 'Cannot load incidents from Github, sorry.'
            });
        }
    }

    render() {
        if (this.state.issues || this.state.error) {
            return (
                <div>
                    <IssuesList 
                        key='issues' 
                        issues={this.state.issues}
                        error={this.state.error}
                        refreshIssues={this.refreshIssues}
                        title='Current Incidents'
                        issueLabel='status'>
                    </IssuesList>
                </div>
            );
        } else {
            return <></>;
        }
    }
}

export default StatusList;
