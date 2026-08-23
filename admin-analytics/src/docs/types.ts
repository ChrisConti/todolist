export type DocBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'code'; text: string }
  | { type: 'callout'; tone: 'info' | 'warning'; text: string };

export interface DocArticle {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  summary: string;
  tags: string[];
  blocks: DocBlock[];
}
