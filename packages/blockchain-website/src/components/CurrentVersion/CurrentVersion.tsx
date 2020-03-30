import React, { Component } from 'react';
import Axios, { AxiosResponse } from 'axios';
import './CurrentVersion.scss';

const githubProject: string = 'IBM-Blockchain/blockchain-vscode-extension';

// Github URLs
const currentReleaseApiUrl: string = 'https://api.github.com/repos/' + githubProject + '/releases/latest';
const allReleases: string = 'https://github.com/' + githubProject + '/releases/';

interface VersionState {
    currentVersion: string;
}

class CurrentVersion extends Component<{}, VersionState> {

    constructor(props: Readonly<VersionState>) {
        super(props);
        this.state = {
            currentVersion: ''
        };
    }

    async componentDidMount(): Promise<void> {
        try {
            const response: AxiosResponse = await Axios.get(currentReleaseApiUrl);
            this.setState({
                currentVersion : response.data.name
            });
        } catch (error) {
            return;
        }
    }

    render(): JSX.Element {
        if (this.state.currentVersion.length !== 0) {
            return(
                <p className='latest-version'>
                    {'Latest release: '}
                    <a className='current-version-link' href={allReleases}>
                        {this.state.currentVersion}
                    </a>
                </p>
            );
        } else {
            return <div/>;
        }
    }
}

export default CurrentVersion;
