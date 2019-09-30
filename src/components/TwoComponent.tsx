import * as React from 'react';
import './TwoComponent.scss';
import { Button, Checkbox } from 'carbon-components-react';
import logo from '../logo.svg';

class TwoComponent extends React.Component {
  public render() {
    return (
      <div className='App'>
        <p className='hello'>hello world</p>
        <header className='App-header'>
          <img src={logo} className='App-logo' alt='logo' />
          <h1 className='App-title'>This is another component!</h1>
        </header>
        <p className='App-intro'>
          Show some other stuff here!
        </p>
        <Button>Hello world</Button>
        <Checkbox labelText='hello' id='a'></Checkbox>
      </div>
    );
  }
}

export default TwoComponent;
