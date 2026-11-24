import { ABOUT_ARTICLES } from "../data/about";
import type { LanguageCode } from "../types";

interface AboutViewProps {
  language: LanguageCode;
}

export function AboutView({ language }: AboutViewProps) {
  const article = ABOUT_ARTICLES[language];

  return (
    <article className="about-article-shell" data-lang={language}>
      <div className="about-article-card">
        <div className="about-brand-row">
          <img className="about-logo" src="./logo.jpg" alt="Lea Books" />
          <span className="about-eyebrow">GATE STORY · LEA BOOKS</span>
        </div>

        <h1 className="about-title">{article.title}</h1>

        {article.openingParagraphs.map((para, idx) => (
          <p key={`open-${idx}`} className="about-paragraph">
            {para}
          </p>
        ))}

        {article.sections.map((section, sIdx) => (
          <section key={`sec-${sIdx}`} className="about-section">
            <h2 className="about-heading">{section.headingText}</h2>
            {section.paragraphs.map((para, pIdx) => (
              <p key={`p-${sIdx}-${pIdx}`} className="about-paragraph">
                {para}
              </p>
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}
