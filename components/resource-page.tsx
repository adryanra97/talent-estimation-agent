import type { ReactNode } from "react";

export function ResourceHero({
  eyebrow, title, accent, description, chapter, actions, footnote,
}: {
  eyebrow: string;
  title: string;
  accent?: string;
  description: string;
  chapter: string;
  actions?: ReactNode;
  footnote?: ReactNode;
}) {
  return (
    <header className="tl-resource-hero">
      <div className="tl-resource-hero-top">
        <span className="tl-resource-eyebrow"><span className="tl-resource-hero-dot" aria-hidden /> {eyebrow}</span>
        <span className="tl-resource-chapter">{chapter}</span>
      </div>
      <div className="tl-resource-hero-main">
        <div className="tl-resource-hero-copy">
          <h1>{title}{accent ? <> <em>{accent}</em></> : null}</h1>
          <p>{description}</p>
          {footnote && <div className="tl-resource-hero-note">{footnote}</div>}
        </div>
        {actions && <div className="tl-resource-hero-actions">{actions}</div>}
      </div>
    </header>
  );
}

export function ResourceHeading({
  index, label, title, description, actions, id,
}: {
  index: string;
  label: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  id?: string;
}) {
  return (
    <div className="tl-resource-heading">
      <div>
        <p className="tl-resource-eyebrow">{index} / {label}</p>
        <h2 id={id}>{title}</h2>
        {description && <p className="tl-resource-heading-description">{description}</p>}
      </div>
      {actions && <div className="tl-resource-heading-actions">{actions}</div>}
    </div>
  );
}
