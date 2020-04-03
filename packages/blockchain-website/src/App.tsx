import React, { Component } from 'react';
import './App.scss';
import StatusList from './components/StatusList/StatusList';
import UpcomingList from './components/UpcomingList/UpcomingList';
import CurrentVersion from './components/CurrentVersion/CurrentVersion';
import HighLevelStatus from './components/HighLevelStatus/HighLevelStatus';

class App extends Component {
    render(): JSX.Element {
        return (
            <div className='header-bar'>
                <p>
                    <span className='ibm'>IBM</span>
                    <span className='page-title'>Blockchain Platform Extension for VS Code</span>
                </p>

                <div className='app-container'>
                    <div className='heading-container'>
                        <p className='status'>Status</p>
                        <p className='title'>IBM Blockchain Platform Extension for VS Code</p>
                        <CurrentVersion/>
                        <HighLevelStatus/>
                        <p className='description'>Check this page for information on any current incidents effecting the latest version of the IBM Blockchain Platform extension for Visual Studio Code, as well as planned content for the next release.</p>
                    </div>
                    <div className='issues-container'>
                        <StatusList></StatusList>
                    </div>

                    <div className='issues-container upcoming-issues-container'>
                        <UpcomingList></UpcomingList>
                    </div>
                </div>
            </div>
        );
    }
}

export default App;
