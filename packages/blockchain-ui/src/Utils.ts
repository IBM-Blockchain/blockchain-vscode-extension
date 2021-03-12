import IVSCode from './interfaces/IVSCode';
declare const vscode: IVSCode;

class Utils {

    static changeRoute(newPath: string): void {
        dispatchEvent(new MessageEvent('message', {
            data: {
                path: newPath
            }
        }));
    }

    static postToVSCode(message: { command: string, data?: any }): void {

        if (!(window as any)['Cypress']) {
            vscode.postMessage(message);
        } else {
            window.postMessage(message, '*');
        }
    }

    static isNameInvalid(name: string): boolean {
        const regex: RegExp = /^[a-zA-Z0-9-_]+$/;
        const validName: boolean = regex.test(name);
        if (name.length === 0 || !validName) {
            return true;
        } else {
            return false;
        }
    }

    static isVersionInvalid(version: string): boolean {
        if (version.length === 0) {
            return true;
        } else {
            return false;
        }
    }

    static readFileAsync(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader: FileReader = new FileReader();
            reader.onload = () => {
                resolve(reader.result as string);
             };

            reader.onerror = reject;
            reader.readAsText(blob, 'UTF-8');
        });
    }
}

export default Utils;
