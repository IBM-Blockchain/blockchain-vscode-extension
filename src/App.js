import React, { Component } from 'react';
import logo from './icon_light.svg';
import StatusList from './components/StatusList';
import UpcomingList from './components/UpcomingList';
import './App.css';

class App extends Component {
  render() {
    return (
        <div className="container">
            <div className="row">
                <div className="col-md-15 col-md-offset-2">
                    <h1 className="text-muted"><img className="logo" src={logo} alt='IBM Blockchain Logo'></img> IBM Blockchain Platform - Status Page</h1>
                    <hr />
                    <p className="lead">
                        Below you can find the latest incidents as well as the information for our next release.
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
