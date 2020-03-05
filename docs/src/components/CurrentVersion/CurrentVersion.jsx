import React, { Component } from 'react';
import Axios from 'axios';

var githubProject = 'IBM-Blockchain/blockchain-vscode-extension';

//Github URLs
var currentReleaseApiUrl = 'https://api.github.com/repos/'+githubProject+'/releases/latest';

class CurrentVersion extends Component {

    constructor() {
        super();
        this.state = {
            currentVersion: undefined
        }
    }

    async componentDidMount(){
        const response = await Axios.get(currentReleaseApiUrl);
        if (response) {
            this.setState({
                currentVersion : response.data.name
            })
        };
    }

    render(){
        if (this.state.currentVersion) {
            return(
                <p>
                    {'Latest version: ' + this.state.currentVersion}
                </p>
            );
        } else {
            return <div/>;
        }
    }
}

export default CurrentVersion;