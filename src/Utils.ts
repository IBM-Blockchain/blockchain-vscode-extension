import IVSCode from './interfaces/IVSCode';
declare const vscode: IVSCode;

const Utils: any = {

    changeRoute(newPath: string): void {
        dispatchEvent(new MessageEvent('message', {
            data: {
                path: newPath
            }
        }));
    },

    postToVSCode(message: any): void {
        vscode.postMessage({
            command: message.command,
            data: message.data
        });
    }

};

export default Utils;
