interface ITutorialObject {
    title: string;
    series: string;
    length: string;
    firstInSeries?: boolean;
    file: string;
    objectives: string[];
}

export default ITutorialObject;
