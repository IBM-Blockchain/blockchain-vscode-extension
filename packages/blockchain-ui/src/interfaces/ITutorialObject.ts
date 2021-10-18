interface ITutorialObject {
    title: string;
    series: string;
    length: string;
    firstInSeries?: boolean;
    file: string;
    objectives: string[];
    markdown?: string;
}

export default ITutorialObject;
