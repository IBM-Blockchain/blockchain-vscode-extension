import React, { Component } from 'react'; 
import IssuesList from './IssuesList';
import $ from "jquery";

var githubProject = 'IBM-Blockchain/blockchain-vscode-extension';

//Github URLs
var issuesStatusApiUrl = 'https://api.github.com/repos/'+githubProject+'/issues?labels=status'

class StatusList extends Component {

    constructor() {
        super();
        this.state = {
            issues: undefined,
            error: undefined,
            refreshing: false
        }

        this.refreshIssues = this.refreshIssues.bind(this);
    }

    componentDidMount(){
        this.refreshIssues()
        // this.checkerId = setInterval(this.refreshIssues,10000);
    }

    componentWillUnmount(){
        // clearInterval(this.refreshIssues);
    }

    refreshIssues(e){

        if (e !== undefined) {
            e.preventDefault();
        }

        this.setState({
            refreshing : true
        });

        var updateIssues = function(data){
            this.setState({
                issues : data
            });
            //we add a timeout to give some UI feedback on the loading even if it is instantaneous
            setTimeout(function(){
                this.setState({
                    refreshing : false
                })
            }.bind(this),200);
        }.bind(this)

        $.get({
            url : issuesStatusApiUrl,
            success : updateIssues,
            error : function(){
                //we add a timeout to give some UI feedback on the loading even if it is instantaneous
                setTimeout(function(){
                    this.setState({
                        refreshing : false
                    });
                }.bind(this),200);
                this.setState({
                    error : 'Cannot load incidents from Github, sorry.'
                });
            }.bind(this)
        });
    }

    getInitialState(){
        return {
            refreshing : false
        }
    }
    render() {
        if (this.state.issues || this.state.error) {
            return (
                <div>
                    <IssuesList 
                        key='issues' issues={this.state.issues}
                        refreshing={this.state.refreshing}
                        error={this.state.error}
                        refreshIssues={this.refreshIssues}
                        title='Latest Incidents'
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
