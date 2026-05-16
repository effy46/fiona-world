import { Link } from 'react-router-dom';
import { portfolioSections } from '../content/portfolio';
import { assetPath } from '../lib/paths';

export function StaticView() {
  return (
    <main id="main-content" className="static-view" aria-label="Static portfolio content">
      <section className="static-hero" aria-labelledby="static-hero-title">
        <p className="eyebrow">Fiona Feng / Analytics Engineer</p>
        <h1 id="static-hero-title">I turn data into clarity and impact</h1>
        <p>
          Analytics engineer building trusted data products, validation frameworks, and
          AI-augmented workflows.
        </p>
        <div className="hero-actions">
          <Link to="/projects">View My Work</Link>
          <a href={assetPath('/resume.pdf')} target="_blank" rel="noreferrer">
            Download Resume
          </a>
        </div>
      </section>
      {portfolioSections.slice(1).map((section) => (
        <section className="static-section" id={section.id} key={section.id}>
          <p className="eyebrow">{section.worldLabel}</p>
          <h2>{section.title}</h2>
          <p>{section.summary}</p>
          {section.projects && (
            <div className="project-list">
              {section.projects.map((project) => (
                <article key={project.title} className="project-item">
                  <h3>{project.title}</h3>
                  <p>{project.kicker}</p>
                  <p className="tools">{project.tools.join(', ')}</p>
                  <ul>
                    {project.todos.map((todo) => (
                      <li key={todo}>{todo}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          )}
          {section.todos && (
            <ul className="todo-list">
              {section.todos.map((todo) => (
                <li key={todo}>{todo}</li>
              ))}
            </ul>
          )}
          {section.caseStudy && (
            <article className="case-study">
              <h3>{section.caseStudy.title}</h3>
              <p>{section.caseStudy.subtitle}</p>
              <ol>
                {section.caseStudy.sections.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </article>
          )}
        </section>
      ))}
    </main>
  );
}
