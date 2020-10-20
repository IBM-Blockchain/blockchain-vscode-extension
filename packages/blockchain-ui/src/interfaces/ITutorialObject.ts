interface ITutorialObject {
    title: string;
    series: string;
    length: string;
    firstInSeries?: boolean;
    file: string;
    objectives: string[];
    badge?: boolean;
    markdown?: string;
}

export default ITutorialObject;
