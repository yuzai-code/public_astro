export interface AstroConfig {
    githubToken: string;
    githubOwner: string;
    githubRepo: string;
    astroContentPath: string;
    categoriesPath: string;
    momentsPath: string;
    yamlTemplate: string;
    customFields: CustomField[];
    s3Enabled: boolean;
    s3AccessKeyId: string;
    s3SecretAccessKey: string;
    s3Region: string;
    s3Bucket: string;
    s3Endpoint?: string;
    s3PublicBaseUrl?: string;
    s3RootPath?: string;
}

export interface CustomField {
    name: string;
    label?: string;
    type?: "string" | "number" | "boolean" | "array" | "text";
    placeholder?: string;
    defaultValue?: string;
    required?: boolean;
    value?: string;
}

export interface Category {
    name: string;
    title: string;
    description: string;
}

export interface PublishMetadata {
    title: string;
    description: string;
    publishDate: string;
    tags: string[];
    category: string;
    draft: boolean;
    customFields?: Record<string, unknown>;
}

export interface PublishStat {
    docId: string;
    title: string;
    category: string;
    tags: string[];
    description: string;
    draft: boolean;
    filePath: string;
    lastPublishedAt: string;
    publishCount: number;
    lastMetadata: PublishMetadata | null;
}

export interface MomentMetadata {
    slug: string;
    content: string;
    createdAt: string;
    images: string[];
    location?: string;
    weather?: string;
    link?: string;
    mood?: string;
    tags: string[];
}
