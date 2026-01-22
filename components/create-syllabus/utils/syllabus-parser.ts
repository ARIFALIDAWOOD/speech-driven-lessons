/**
 * Utilities for parsing syllabus markdown
 */

export interface SyllabusItem {
  id: string;
  content: string;
  subsyllabus?: SubSyllabusItem[];
  isExpanded?: boolean;
}

export interface SubSyllabusItem {
  id: string;
  content: string;
}

export function parseMarkdownSyllabus(markdown: string): SyllabusItem[] {
  // Simple parser for markdown syllabus
  const lines = markdown.split("\n").filter((line) => line.trim());
  const items: SyllabusItem[] = [];
  let currentItem: SyllabusItem | null = null;
  let itemIndex = 0;
  let subIndex = 0;

  for (const line of lines) {
    if (line.startsWith("## ")) {
      // Main topic
      if (currentItem) {
        items.push(currentItem);
      }
      itemIndex++;
      subIndex = 0;
      currentItem = {
        id: `item${itemIndex}`,
        content: line.replace("## ", "").trim(),
        subsyllabus: [],
        isExpanded: false,
      };
    } else if (line.startsWith("- ") && currentItem) {
      // Subtopic
      subIndex++;
      currentItem.subsyllabus?.push({
        id: `sub${itemIndex}.${subIndex}`,
        content: line.replace("- ", "").trim(),
      });
    }
  }

  if (currentItem) {
    items.push(currentItem);
  }

  return items.length > 0 ? items : createFallbackSyllabus();
}

export function createFallbackSyllabus(): SyllabusItem[] {
  return [
    {
      id: "item1",
      content: "Introduction",
      subsyllabus: [
        { id: "sub1.1", content: "Overview" },
        { id: "sub1.2", content: "Learning objectives" },
      ],
      isExpanded: false,
    },
    {
      id: "item2",
      content: "Main Content",
      subsyllabus: [
        { id: "sub2.1", content: "Core concepts" },
        { id: "sub2.2", content: "Key principles" },
      ],
      isExpanded: false,
    },
    {
      id: "item3",
      content: "Summary",
      subsyllabus: [
        { id: "sub3.1", content: "Key takeaways" },
        { id: "sub3.2", content: "Next steps" },
      ],
      isExpanded: false,
    },
  ];
}
