import { motion } from 'framer-motion';
import type { PortfolioSection } from '../content/portfolio';

type Props = {
  section: PortfolioSection;
};

export function SectionPanel({ section }: Props) {
  const Icon = section.icon;

  return (
    <motion.aside
      className="section-panel"
      key={section.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
      aria-labelledby="panel-title"
    >
      <div className="panel-title-row">
        <span className="panel-icon" style={{ backgroundColor: section.accent }}>
          <Icon size={22} />
        </span>
        <div>
          <p className="eyebrow">Selected</p>
          <h2 id="panel-title">{section.worldLabel}</h2>
        </div>
      </div>
      <p>{section.summary}</p>
      {section.projects && (
        <div className="project-list compact">
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
    </motion.aside>
  );
}
