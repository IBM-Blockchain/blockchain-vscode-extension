import * as React from 'react';
import './OneComponent.scss';
import { Button, Checkbox, TextInput } from 'carbon-components-react';
import logo from '../logo.svg';
import { ExtensionCommands } from '../ExtensionCommands';

class OneComponent extends React.Component<any> {

    public someFcn() {
        return 'actual value';
    }

    public render() {
        return (
            <div className='App'>
            <header className='App-header'>
                <img src={logo} className='App-logo' alt='logo' />
                <h1 className='App-title'>This is Component #1</h1>
            </header>
            <p className='App-intro'>
            Component #1
            </p>
            <Button id='buttonOne'>Do Nothing</Button>
            <Button id='buttonTwo' href={'command:' + ExtensionCommands.ADD_GATEWAY}>Run Command</Button>
            <Checkbox labelText='checkboxOne Label' id='checkboxOne'></Checkbox>
            <TextInput labelText='textInputLabel' id='textInputOne'></TextInput>
            </div>

        );
    }
}

export default OneComponent;
