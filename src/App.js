import React, { Component } from 'react';
import logo from './ext_logo.svg';
import StatusList from './components/StatusList';
import UpcomingList from './components/UpcomingList';
import './App.css';
import CurrentVersion from './components/CurrentVersion';


class App extends Component {
  render() {
    return (
        <div className="container">
            <div className="row">
                <div className="col-md-15 col-md-offset-15">
                    <h1 className="text-muted"><img className="logo" src={logo} alt='IBM Blockchain Logo'></img> IBM Blockchain Platform - Status Page</h1>
                    <hr />
                    <h2 className='text-muted'> <CurrentVersion></CurrentVersion> </h2>
                    <p className="lead">
                        Check this page for information on any current incidents effecting the latest version of the IBM Blockchain Platform extension for Visual Studio Code, as well as planned content for the next release.
                    </p>
                    <StatusList></StatusList>
                    <hr/>
                    <UpcomingList></UpcomingList>
                </div>
            </div>
        </div>
        )
    }
}

export default App;
