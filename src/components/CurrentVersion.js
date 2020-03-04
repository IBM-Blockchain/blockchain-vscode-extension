import React, { Component } from 'react';
import $ from "jquery";


var githubProject = 'IBM-Blockchain/blockchain-vscode-extension';

//Github URLs
var currentReleaseApiUrl = 'https://api.github.com/repos/'+githubProject+'/releases/latest';

class CurrentVersion extends Component {

    constructor() {
        super();
        this.state = {
            currentVersion: undefined,
            error: undefined,
            refreshing: false
        }

        this.refreshVersion = this.refreshVersion.bind(this);
    }

    componentDidMount(){
        this.refreshVersion()
    }

    componentWillUnmount(){
    }

    refreshVersion(e){

        if (e !== undefined) {
            e.preventDefault();
        }

        this.setState({
            refreshing : true
        });

        var latestRelease = function(data){
            console.log(data);
            this.setState({
                currentVersion : data
            });
            //we add a timeout to give some UI feedback on the loading even if it is instantaneous
            setTimeout(function(){
                this.setState({
                    refreshing : false
                })
            }.bind(this),200);
        }.bind(this)

        $.get({
            url : currentReleaseApiUrl,
            success : latestRelease,
            error : function(){
                //we add a timeout to give some UI feedback on the loading even if it is instantaneous
                setTimeout(function(){
                    this.setState({
                        refreshing : false
                    });
                }.bind(this),200);
                this.setState({
                    error : 'Cannot get latest release from GitHub'
                });
            }.bind(this)
        });
    }

    getInitialState(){
        return {
            refreshing : false
        }
    }

    render(){
        if (this.state.currentVersion || this.state.error) {
            return(
                <p>
                    {'Latest version: ' + this.state.currentVersion.name}
                </p>
            );
        } else {
            return <></>;
        }
    }
}

export default CurrentVersion;