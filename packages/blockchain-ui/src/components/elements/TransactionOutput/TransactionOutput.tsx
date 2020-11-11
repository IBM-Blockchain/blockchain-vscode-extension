import React, { FunctionComponent } from 'react';
import { Launch32 } from '@carbon/icons-react';
import { ExtensionCommands } from '../../../ExtensionCommands';
import CommandLink from '../CommandLink/CommandLink';
import './TransactionOutput.scss';
import block from '../../../resources/block.svg';

interface IProps {
    output: string;
}

const TransactionOutput: FunctionComponent<IProps> = ({ output }) => {
    return (
        <div className='output-panel' id='output-panel'>
            <p className='output-title'>Transaction output</p>
            <div className='output-panel-inner'>
                {output
                    ?  output.split('\n').map((line) => <p className='output-body'>{line}</p>)
                    : (
                        <div className='output-placeholder-container'>
                            <div className='output-placeholder'>
                                <img src={block} alt='block icon' />
                                <h4>No transaction output, yet!</h4>
                                <p>Submit or evaluate a transaction to view it's output here.</p>
                                <CommandLink
                                    linkContents={<>Learn more <Launch32/></>}
                                    commandName={ExtensionCommands.OPEN_TUTORIAL_PAGE}
                                    commandData={['Basic tutorials', 'A4: Invoking a smart contract from VS Code']}
                                />
                            </div>
                        </div>
                    )
                }
            </div>
        </div>
    );
};

export default TransactionOutput;
