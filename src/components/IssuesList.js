import React, { Component } from 'react';
import '../App.css'; 
import 'bootstrap/dist/css/bootstrap.min.css';
import 'font-awesome/css/font-awesome.min.css';


let githubProject = 'IBM-Blockchain/blockchain-vscode-extension';

//Github URLs
let issuesHtmlUrl = 'https://github.com/'+githubProject+'/issues?q=';
let newIssueUrl = 'https://github.com/'+githubProject+'/issues/new';

const markDownParser = function(str){
    var lines = str.split("\n");
    var output = [];
    for(var i=0;i<lines.length;i++){
        var line=lines[i];
        var titleRegex = /^(\#+)\s+(.*)/ig;
        var result = titleRegex.exec(line)
        if (result){
            var order = result[1].length;
            output.push(
            <h key={i}>
                {(order+2).toString()}
                {result[2]}
            </h>
            )
            continue;
        }
        output.push(
            <p key={i}>
                {line}
            </p>
        )
    }
    return output;
}

class IssuesList extends Component {
    getLabel(issue) {
        if (issue.milestone) {
            let labelJSX;

            let issueLabels = issue.labels;
            let bug = false;
            issueLabels.map((label) => {
                if (label.name === 'bug') {
                    bug = true;
                }
            });

            if (bug) {
                labelJSX = (
                <h3 className='label bg-bug'> {'bug'} 
                </h3>
                )
            } else {
                labelJSX = (
                <h3 className='label bg-feature'> {'feature'} 
                </h3>
                )
            }
            return labelJSX

        } else {
            return ''
        }
    }

    render(){
        let issueItems = (
            <p className='alert alert-info' key='info'>Please wait, loading status information</p>
        );
        if (this.props.error) {
            issueItems = (
                <p className='alert alert-danger' key='error'>{this.props.error}</p>
            );
        } else if (this.props.issues !== undefined) {
            issueItems = this.props.issues.map((issue) => {
                if (this.props.newestMilestone) {
                    let found = false;

                    if (issue.milestone) {
                        if (issue.milestone.title === this.props.newestMilestone.title)
                        found = true;
                    }

                    if (!found) {
                        return;
                    }
                }

                let creationDate = new Date(issue.created_at);
                let updateDate = new Date(issue.updated_at);
                let updateOrCloseDate = 'Updated: '+ updateDate.toLocaleDateString();
                let className = "panel-danger";
                if (issue.state === 'closed') {
                    className = 'panel-success';
                    updateOrCloseDate = 'Resolved: ' + updateDate.toLocaleDateString();
                }

                return (
                    <div className={"panel " + className}>
                        <div className="panel-heading">
                            <h3 className='panel-title'>
                                {(issue.state === 'closed' ? 'RESOLVED: ' : '') + issue.title + ' (#' + issue.number + ')'}
                            </h3>
                            {this.getLabel(issue)}
                        </div>
                        <div className='panel-body'>
                            <p>
                                <span>{'Reported: ' + creationDate.toLocaleDateString()}</span>
                                <span className='float-right'>{updateOrCloseDate}</span>
                            </p>
                            <hr className='hr'></hr>
                            {issue.state === 'open' ? markDownParser(issue.body): ''}
                            <p>
                                <a href={issue.html_url}>{'View on GitHub (' + issue.comments + ' comments so far)'}</a>
                            </p>
                        </div>
                    </div>
                );
            });
            if (issueItems.length === 0) {
                issueItems = (
                    <p className='alert alert-success'>
                        {'No incidents found!'}
                    </p>
                )
            }
        }

        let spinnerClass = 'fa fa-refresh';
        if (this.props.refreshing) {
            spinnerClass += ' fa-spin';
        }

        let milestoneUrl = 'https://github.com/'+githubProject+'/milestone/';
        milestoneUrl += this.props.milestoneNumber;
        const seeMilestoneLink = (this.props.newestMilestone !== undefined) ? (<a href={milestoneUrl}> {'See current milestone'} </a>) : (<a href={issuesHtmlUrl}> {'See all on GitHub'}</a>);

        return(
            <div>
                <h2>
                    {this.props.title}
                    <a className='float-right' href='#'>
                        <i className={spinnerClass} onClick={this.props.refreshIssues}></i>
                    </a>
                </h2>
                <p>
                    {seeMilestoneLink}
                    {' // '}
                    <a href={newIssueUrl}>{'Report an incident'}</a>
                </p>
                {issueItems}
            </div>
        )
    }
}

export default IssuesList;