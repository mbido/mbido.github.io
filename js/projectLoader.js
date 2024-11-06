async function loadProjects() {
  try {
    const response = await fetch('/data/projects.json');
    const data = await response.json();
    const projectsContainer = document.querySelector('#projects-container');

    projectsContainer.innerHTML = data.projects.map(project => `
      <div class="project-card">
        <div class="card-image-container">
          <img 
            src="${project.image || '/images/projects/placeholder.png'}" 
            alt="${project.title}"
            class="card-image"
            onerror="this.src='/images/projects/placeholder.png'"
            loading="lazy"
          >
        </div>
        
        <div class="card-content">
          <div class="card-header">
            <h3 class="card-title">${project.title}</h3>
            <span class="status-badge ${project.status.type}">
              ${project.status.label}
            </span>
          </div>
          
          <p class="card-description">${project.description}</p>
          
          <div class="tech-stack">
            ${project.technologies.map(tech => `
              <span class="tech-badge">
                ${tech}
              </span>
            `).join('')}
          </div>
          
          <div class="card-actions">
            ${project.github ? `
              <a href="${project.github}" class="action-link" target="_blank" rel="noopener">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                <span>GitHub</span>
              </a>
            ` : ''}
            <a href="${project.link}" class="action-link" target="_blank" rel="noopener">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
              </svg>
              <span>Voir le projet</span>
            </a>
          </div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Erreur lors du chargement des projets:', error);
  }
}

document.addEventListener('DOMContentLoaded', loadProjects);
