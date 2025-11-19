export function extractTagsFromContent(content: string): string[] {
    const tags = new Set<string>();

    const lines = content.split(/\r?\n/);
    for (const line of lines) {
        const trimmedLine = line.trim();

        if (trimmedLine.startsWith("#") && !trimmedLine.startsWith("##") && !trimmedLine.startsWith("###")) {
            const match = trimmedLine.match(/^#\s*(.+)$/);
            if (match && match[1]) {
                const afterHash = match[1].trim();
                if (afterHash && !afterHash.startsWith("#") && !afterHash.startsWith("[")) {
                    const tagPart = afterHash.split(/\s+/)[0];
                    const cleanTag = tagPart.replace(/[\[\]#]/g, "").trim();
                    if (cleanTag && !cleanTag.match(/^\d+\./)) {
                        tags.add(cleanTag);
                    }
                }
            }
        }

        if (trimmedLine.startsWith("tags:") || trimmedLine.startsWith("- 标签") || trimmedLine.startsWith("标签:")) {
            const afterColon = trimmedLine.split(":")[1];
            if (afterColon) {
                const tagStrings = afterColon.split(/[,\|、]/);
                tagStrings.forEach(tag => {
                    const cleanTag = tag.trim().replace(/^#/, "").replace(/[\[\]]/g, "");
                    if (cleanTag && cleanTag.length > 0) {
                        tags.add(cleanTag);
                    }
                });
            }
        }

        if (trimmedLine.includes("[") && trimmedLine.includes("]")) {
            const match = trimmedLine.match(/\[([^\]]+)\]/g);
            if (match) {
                match.forEach(bracket => {
                    const inside = bracket.replace(/[\[\]]/g, "");
                    const tagParts = inside.split(/[,\|、]/);
                    tagParts.forEach(part => {
                        const cleanTag = part.trim().replace(/^#/, "");
                        if (cleanTag && !cleanTag.match(/^\d+\./)) {
                            tags.add(cleanTag);
                        }
                    });
                });
            }
        }
    }

    return Array.from(tags).filter(tag => tag.length > 0);
}
