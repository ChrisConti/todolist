import React, { useState } from 'react';
import { docArticles } from '../docs';
import type { DocArticle, DocBlock } from '../docs/types';
import './Docs.css';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

const Block: React.FC<{ block: DocBlock }> = ({ block }) => {
  switch (block.type) {
    case 'h2':
      return <h3 className="doc-block-h2">{block.text}</h3>;
    case 'p':
      return <p className="doc-block-p">{block.text}</p>;
    case 'list':
      return (
        <ul className="doc-block-list">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    case 'code':
      return <pre className="doc-block-code"><code>{block.text}</code></pre>;
    case 'callout':
      return <div className={`doc-block-callout doc-block-callout-${block.tone}`}>{block.text}</div>;
    default:
      return null;
  }
};

const ArticleView: React.FC<{ article: DocArticle }> = ({ article }) => (
  <article className="doc-article">
    <div className="doc-article-header">
      <h2>{article.title}</h2>
      <div className="doc-article-meta">
        <span>{formatDate(article.date)}</span>
        <div className="doc-tags">
          {article.tags.map((tag) => (
            <span key={tag} className="doc-tag">{tag}</span>
          ))}
        </div>
      </div>
      <p className="doc-article-summary">{article.summary}</p>
    </div>
    <div className="doc-article-body">
      {article.blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </div>
  </article>
);

export const Docs: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string>(docArticles[0]?.id ?? '');
  const selected = docArticles.find((a) => a.id === selectedId) ?? docArticles[0];

  return (
    <div className="docs">
      <h2 className="docs-title">📚 Documentation</h2>
      <p className="docs-intro">Un article par feature, maintenu à mesure qu'on construit.</p>

      <div className="docs-layout">
        <nav className="docs-sidebar">
          {docArticles.map((article) => (
            <button
              key={article.id}
              className={`docs-sidebar-item ${article.id === selectedId ? 'active' : ''}`}
              onClick={() => setSelectedId(article.id)}
            >
              <span className="docs-sidebar-item-title">{article.title}</span>
              <span className="docs-sidebar-item-date">{formatDate(article.date)}</span>
            </button>
          ))}
        </nav>

        <div className="docs-content">
          {selected ? <ArticleView article={selected} /> : <p>Aucun article pour le moment.</p>}
        </div>
      </div>
    </div>
  );
};
