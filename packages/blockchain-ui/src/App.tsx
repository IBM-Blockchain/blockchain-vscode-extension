import React, { Component } from 'react';
import './App.scss';
import { HashRouter as Router, Route, Redirect } from 'react-router-dom';
import HomePage from './components/pages/HomePage/HomePage';
import TutorialPage from './components/pages/TutorialPage/TutorialPage';

interface AppState {
    redirectPath: string;
    extensionVersion: string;
}

class App extends Component<{}, AppState> {
    constructor(props: {}) {
        super(props);
        this.state = {
            redirectPath: '',
            extensionVersion: '',
        };
    }

    componentDidMount(): void {
        window.addEventListener('message', (event: MessageEvent) => {
            this.setState({
                redirectPath: event.data.path,
                extensionVersion: event.data.version
            });
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
                            <TutorialPage/>}>
                        </Route>
                    </div>
                </Router>
            );
        }
    }
}

export default App;
