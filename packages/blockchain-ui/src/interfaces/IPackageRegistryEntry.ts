interface IPackageRegistryEntry {
    name: string;
    path: string;
    version?: string;
    sizeKB: number;
}

export default IPackageRegistryEntry;
