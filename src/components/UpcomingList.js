import React, { Component } from 'react'
import $ from 'jquery'
import IssuesList from './IssuesList'

var githubProject = 'IBM-Blockchain/blockchain-vscode-extension';

//Github URLs
var issuesNextApiUrl = 'https://api.github.com/repos/'+githubProject+'/issues?labels=next&state=closed&per_page=100'
var allMilestones = 'https://api.github.com/repos/'+githubProject+'/milestones'

class UpcomingList extends Component {

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

    getMilestones() {
        
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
            url : allMilestones,
            success : function(data){
                let newestMilestone;

                newestMilestone = data.reduce(function(a, b) {
                    return (a.due_on > b.due_on) ? a : b;
                })

                this.setState({
                    newestMilestone: newestMilestone
                });

            }.bind(this),
            error : function(){
                //we add a timeout to give some UI feedback on the loading even if it is instantaneous
                setTimeout(function(){this.setState({refreshing : false})}.bind(this),200)
                this.setState({error : 'Cannot load from Github, sorry.'})}.bind(this)
        })

        $.get({
            url : issuesNextApiUrl,
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
        let latestDueDate = '';
        let milestoneNumber = '';
        if (this.state.newestMilestone) {
            const dt = new Date(this.state.newestMilestone.due_on);

            // Set expected release date to milestone due_date minus days (thursday before)
            dt.setDate(dt.getDate()-4);

            latestDueDate = dt.toLocaleDateString();
            milestoneNumber = this.state.newestMilestone.number;
        }
        if (this.state.issues || this.state) {
            return (
                <div>
                    <IssuesList 
                        key='issues' issues={this.state.issues}
                        refreshing={this.state.refreshing}
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