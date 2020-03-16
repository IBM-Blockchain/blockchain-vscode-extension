import React, { Component } from 'react';
import Axios from 'axios';
import './HighLevelStatus.scss';
import checkmark from '../../checkmark.svg';
import error from '../../error.svg';
import warning from '../../warning.svg';

const githubProject: string = 'IBM-Blockchain/blockchain-vscode-extension';

// Github URLs
const issuesStatusApiUrl: string = 'https://api.github.com/repos/' + githubProject + '/issues?labels=status';

interface StatusState {
    description: string;
    icon: string;
}

class HighLevelStatus extends Component<{}, StatusState> {

    constructor(props: any) {
        super(props);
        this.state = {
            description: '',
            icon: ''
        };
    }

    async componentDidMount(): Promise<void> {
        let description: string;
        let icon: string;
        let sev1Count: number = 0;
        let sev2Count: number = 0;
        let sev3Count: number = 0;

        try {
            const response: any = await Axios.get(issuesStatusApiUrl);
            const allIssues: any = response.data;
            allIssues.forEach((issue: any) => {
                if (issue.labels) {
                    issue.labels.forEach((label: any) => {
                        if (label.name === 'sev1') {
                            sev1Count += 1;
                        } else if (label.name === 'sev2') {
                            sev2Count += 1;
                        } else if (label.name === 'sev3') {
                            sev3Count += 1;
                        }
                    });
                }
            });
            if (sev1Count > 0) {
                icon = error;
                description = 'There is at least one sev1 issue';
            } else if (sev1Count > 0 || sev2Count > 0) {
                icon = warning;
                description = 'There are at least one sev2 or sev3 issue';
            } else {
                icon = checkmark;
                description = 'There are no known issues';
            }

            this.setState({
                description: description,
                icon: icon
            });
        } catch (error) {
            return;
        }
    }

    render(): JSX.Element {
        if (this.state.icon !== '') {
            return(
                <p className='current-status'>
                    <span>
                        Current overall status: <span> </span> {/* Added a space after colon using span */}
                    </span>
                    <img className='icon' title={this.state.description} src={this.state.icon}/>
                </p>
            );
        } else {
            return <div/>;
        }
    }
}

export default HighLevelStatus;
