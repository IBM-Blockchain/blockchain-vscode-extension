import React from 'react';
import './HeadingCombo.scss';

interface IProps {
    comboStyle?: string;
    headingText: string;
    headingStyle?: string;
    subheadingText: string;
    subheadingStyle?: string;
}

function HeadingCombo(props: IProps): JSX.Element {
    let style: string = 'heading-combo-container';
    style += props.comboStyle ? ` ${props.comboStyle}` : '';

    return (
        <div className={style}>
            <h3 className={props.headingStyle}>{props.headingText}</h3>
            <p className={props.subheadingStyle}>{props.subheadingText}</p>
        </div>
    );
}

export default HeadingCombo;
