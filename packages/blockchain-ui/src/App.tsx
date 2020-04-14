import React, { Component } from 'react';
import './App.scss';
import { HashRouter as Router, Route, Redirect } from 'react-router-dom';
import HomePage from './components/pages/HomePage/HomePage';
import TutorialPage from './components/pages/TutorialPage/TutorialPage';

interface AppState {
    redirectPath: string;
    extensionVersion: string;
    tutorialData: Array<{seriesName: string, seriesTutorials: any[]}>;
}

class App extends Component<{}, AppState> {
    constructor(props: {}) {
        super(props);
        this.state = {
            redirectPath: '',
            extensionVersion: '',
            tutorialData: []
        };
    }

    componentDidMount(): void {
        window.addEventListener('message', (event: MessageEvent) => {
            const newState: any = {
                redirectPath: event.data.path
            };

            if (event.data.version) {
                newState.extensionVersion = event.data.version;
            }

            if (event.data.tutorialData) {
                newState.tutorialData = event.data.tutorialData;
            }

            this.setState(newState);
        });
    }

    render(): JSX.Element {
        if (this.state.redirectPath === '') {
            return <div></div>;
        } else {
            return (
                <Router>
                    <div>
                        <Route render={(): JSX.Element => <Redirect push to={this.state.redirectPath}/>}></Route>
                        <Route exact path='/home' render={(): JSX.Element =>
                            <HomePage extensionVersion={this.state.extensionVersion}/>}>
                        </Route>
                        <Route exact path='/tutorials' render={(): JSX.Element =>
                            <TutorialPage tutorialData={this.state.tutorialData}/>}>
                        </Route>
                    </div>
                </Router>
            );
        }
    }
}

export default App;
