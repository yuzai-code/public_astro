import type { AstroConfig, Category } from "../types";

interface GitHubFileData {
    sha: string;
    content: string;
}

const GITHUB_API_ACCEPT = "application/vnd.github.v3+json";
const DEFAULT_BRANCH = "main";

function buildRepoBaseUrl(config: AstroConfig): string {
    return `https://api.github.com/repos/${config.githubOwner}/${config.githubRepo}`;
}

function buildContentUrl(config: AstroConfig, path: string): string {
    return `${buildRepoBaseUrl(config)}/contents/${path}`;
}

async function request<T>(input: RequestInfo, init: RequestInit): Promise<T> {
    const response = await fetch(input, init);
    if (!response.ok) {
        let message = response.statusText;
        try {
            const errorData = await response.json();
            if (errorData?.message) {
                message = errorData.message;
            }
        } catch {
            // ignore JSON parse errors
        }
        throw new Error(`GitHub API error: ${message}`);
    }
    return (await response.json()) as T;
}

export async function getFileFromGitHub(config: AstroConfig, path: string): Promise<GitHubFileData | null> {
    const url = buildContentUrl(config, path);
    const init: RequestInit = {
        headers: {
            Authorization: `token ${config.githubToken}`,
            Accept: GITHUB_API_ACCEPT
        }
    };

    try {
        const response = await fetch(url, init);
        if (response.status === 404) {
            return null;
        }
        if (!response.ok) {
            let message = response.statusText;
            try {
                const errorData = await response.json();
                if (errorData?.message) {
                    message = errorData.message;
                }
            } catch {
                // ignore
            }
            throw new Error(`GitHub API error: ${message}`);
        }
        const data = (await response.json()) as GitHubFileData;
        return data;
    } catch (error) {
        if (error instanceof Error && error.message.includes("404")) {
            return null;
        }
        throw error;
    }
}

export async function uploadToGitHub(
    config: AstroConfig,
    path: string,
    content: string,
    message: string,
    sha?: string,
    branch: string = DEFAULT_BRANCH
): Promise<void> {
    const url = buildContentUrl(config, path);
    const body: Record<string, unknown> = {
        message,
        content: btoa(unescape(encodeURIComponent(content))),
        branch
    };
    if (sha) {
        body.sha = sha;
    }

    await request(url, {
        method: "PUT",
        headers: {
            Authorization: `token ${config.githubToken}`,
            Accept: GITHUB_API_ACCEPT,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });
}

export async function deleteFileFromGitHub(
    config: AstroConfig,
    path: string,
    message: string,
    sha: string,
    branch: string = DEFAULT_BRANCH
): Promise<void> {
    const url = buildContentUrl(config, path);
    await request(url, {
        method: "DELETE",
        headers: {
            Authorization: `token ${config.githubToken}`,
            Accept: GITHUB_API_ACCEPT,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            message,
            sha,
            branch
        })
    });
}

export async function testGitHubConnection(
    config: AstroConfig
): Promise<{ repoFullName: string; contentStatus: "exists" | "missing" | "error"; contentError?: string }> {
    const repoUrl = buildRepoBaseUrl(config);

    const repoData = await request<{ full_name: string }>(repoUrl, {
        method: "GET",
        headers: {
            Authorization: `token ${config.githubToken}`,
            Accept: GITHUB_API_ACCEPT,
            "User-Agent": "SiYuan-Astro-Publisher"
        }
    });

    const contentUrl = buildContentUrl(config, config.astroContentPath);
    try {
        const response = await fetch(contentUrl, {
            method: "GET",
            headers: {
                Authorization: `token ${config.githubToken}`,
                Accept: GITHUB_API_ACCEPT,
                "User-Agent": "SiYuan-Astro-Publisher"
            }
        });

        if (response.ok) {
            return { repoFullName: repoData.full_name, contentStatus: "exists" };
        }

        if (response.status === 404) {
            return { repoFullName: repoData.full_name, contentStatus: "missing" };
        }

        const errorPayload = await response.json();
        return {
            repoFullName: repoData.full_name,
            contentStatus: "error",
            contentError: errorPayload?.message || response.statusText
        };
    } catch (error) {
        if (error instanceof Error) {
            return { repoFullName: repoData.full_name, contentStatus: "error", contentError: error.message };
        }
        return { repoFullName: repoData.full_name, contentStatus: "error" };
    }
}

function decodeBase64Content(data: GitHubFileData): string {
    try {
        const binaryString = atob(data.content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i += 1) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return new TextDecoder("utf-8").decode(bytes);
    } catch (error) {
        console.warn("TextDecoder failed, falling back to escape/decodeURIComponent.", error);
        return decodeURIComponent(escape(atob(data.content)));
    }
}

async function fetchDirectoryEntries(config: AstroConfig, path: string): Promise<Array<{ name: string; type: string }>> {
    const url = buildContentUrl(config, path);
    return request(url, {
        headers: {
            Authorization: `token ${config.githubToken}`,
            Accept: GITHUB_API_ACCEPT,
            "User-Agent": "SiYuan-Astro-Publisher"
        }
    });
}

export async function loadCategories(config: AstroConfig): Promise<Category[]> {
    try {
        const files = await fetchDirectoryEntries(config, config.categoriesPath);
        const categories: Category[] = [];

        for (const file of files) {
            if (file.type === "file" && file.name.endsWith(".md")) {
                const name = file.name.replace(/\.md$/, "");
                try {
                    const category = await getCategoryData(config, name);
                    if (category) {
                        categories.push(category);
                    }
                } catch (error) {
                    console.warn(`Failed to load category ${file.name}`, error);
                }
            }
        }

        return categories;
    } catch (error) {
        if (error instanceof Error && error.message.includes("404")) {
            return [];
        }
        console.error("Failed to load categories:", error);
        return [];
    }
}

export async function getCategoryData(config: AstroConfig, categoryName: string): Promise<Category | null> {
    const path = `${config.categoriesPath}/${categoryName}.md`;
    const fileData = await getFileFromGitHub(config, path);
    if (!fileData) {
        return null;
    }

    const content = decodeBase64Content(fileData);
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
        return null;
    }

    const frontmatter = frontmatterMatch[1];
    const titleMatch = frontmatter.match(/title:\s*['"]([^'"]*?)['"]|title:\s*([^'"\n\r]*?)(?:\n|\r|$)/m);
    const descriptionMatch = frontmatter.match(
        /description:\s*['"]([^'"]*?)['"]|description:\s*([^'"\n\r]*?)(?:\n|\r|$)/m
    );

    return {
        name: categoryName,
        title: titleMatch ? (titleMatch[1] || titleMatch[2] || categoryName).trim() : categoryName,
        description: descriptionMatch ? (descriptionMatch[1] || descriptionMatch[2] || "").trim() : ""
    };
}

export async function saveCategory(config: AstroConfig, category: Category): Promise<void> {
    const content = `---
title: '${category.title}'
description: '${category.description}'
---
`;

    const filePath = `${config.categoriesPath}/${category.name}.md`;
    const existing = await getFileFromGitHub(config, filePath);
    const message = `${existing ? "Update" : "Add"} category: ${category.name}`;
    await uploadToGitHub(config, filePath, content, message, existing?.sha);
}

export async function deleteCategory(config: AstroConfig, categoryName: string): Promise<void> {
    const filePath = `${config.categoriesPath}/${categoryName}.md`;
    const fileData = await getFileFromGitHub(config, filePath);
    if (!fileData) {
        throw new Error("Category file not found");
    }
    await deleteFileFromGitHub(config, filePath, `Delete category: ${categoryName}`, fileData.sha);
}

export async function deletePublishedFile(config: AstroConfig, filePath: string): Promise<void> {
    const normalizedPath = filePath.startsWith(config.astroContentPath)
        ? filePath
        : `${config.astroContentPath.replace(/\/+$/, "")}/${filePath.replace(/^\/+/, "")}`;

    const fileData = await getFileFromGitHub(config, normalizedPath);
    if (!fileData) {
        throw new Error("Published file not found");
    }

    await deleteFileFromGitHub(config, normalizedPath, `Delete post: ${normalizedPath}`, fileData.sha);
}
