import React, { Component } from 'react';
import './App.scss';
import { HashRouter as Router, Route, Redirect } from 'react-router-dom';
import HomePage from './components/pages/HomePage/HomePage';
import TutorialPage from './components/pages/TutorialPage/TutorialPage';
import ITutorialObject from './interfaces/ITutorialObject';
import DeployPage from './components/pages/DeployPage/DeployPage';
import IPackageRegistryEntry from './interfaces/IPackageRegistryEntry';

interface AppState {
    redirectPath: string;
    extensionVersion: string;
    deployData: { channelName: string, environmentName: string, packageEntries: IPackageRegistryEntry[], workspaceNames: string[], selectedPackage: IPackageRegistryEntry | undefined, committedDefinitions: string[], environmentPeers: string[], discoveredPeers: string[], orgMap: any, orgApprovals: any };
    tutorialData: Array<{ name: string, tutorials: ITutorialObject[], tutorialFolder: string, tutorialDescription?: string }>;
}

class App extends Component<{}, AppState> {
    constructor(props: {}) {
        super(props);
        this.state = {
            redirectPath: '',
            extensionVersion: '',
            tutorialData: [],
            deployData: { channelName: '', environmentName: '', packageEntries: [], workspaceNames: [], selectedPackage: undefined, committedDefinitions: [], environmentPeers: [], discoveredPeers: [], orgMap: {}, orgApprovals: {} }
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

            if (event.data.deployData) {
                newState.deployData = event.data.deployData;
            }

            this.setState(newState);
        });
    }

    render(): JSX.Element {
        if (this.state.redirectPath === '') {
            return <div></div>;
        } else {
            let appClass: string = '';
            if (this.state.redirectPath === '/tutorials') {
                appClass = 'app-container__tutorial-page';
            }
            return (
                <Router>
                    <div id='app-container'>
                        <div className={appClass}>
                            <Route render={(): JSX.Element => <Redirect push to={this.state.redirectPath} />}></Route>
                            <Route exact path='/home' render={(): JSX.Element =>
                                <HomePage extensionVersion={this.state.extensionVersion} />}>
                            </Route>
                            <Route exact path='/tutorials' render={(): JSX.Element =>
                                <TutorialPage tutorialData={this.state.tutorialData} />}>
                            </Route>
                            <Route exact path='/deploy' render={(): JSX.Element =>
                                <DeployPage deployData={this.state.deployData} />}>
                            </Route>
                        </div>
                    </div>
                </Router>
            );
        }
    }
}

export default App;
