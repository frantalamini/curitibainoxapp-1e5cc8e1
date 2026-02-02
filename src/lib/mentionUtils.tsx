import React from "react";

/**
 * Parse mentions from content (format: @[userId:userName])
 * and render them as styled spans
 */
export const renderContentWithMentions = (content: string): React.ReactNode => {
  // Regex to find @mentions in format @[id:name]
  const mentionRegex = /@\[([^\]]+)\]/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    // Add text before mention
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    
    // Parse mention [id:name]
    const [, mentionData] = match;
    const [, ...nameParts] = mentionData.split(':');
    const name = nameParts.join(':') || mentionData;
    
    parts.push(
      <span key={match.index} className="text-primary font-medium">
        @{name}
      </span>
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }
  
  return parts.length > 0 ? parts : content;
};

/**
 * Strip mention formatting and return plain text
 * Converts @[uuid:Name] to @Name
 */
export const stripMentionFormatting = (content: string): string => {
  return content.replace(/@\[([^\]]+)\]/g, (_, mentionData) => {
    const [, ...nameParts] = mentionData.split(':');
    const name = nameParts.join(':') || mentionData;
    return `@${name}`;
  });
};
