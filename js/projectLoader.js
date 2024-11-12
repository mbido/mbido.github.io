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

function initializeTimeline() {
  const timelineContainer = document.querySelector('.timeline-dates');
  const educationCards = document.querySelectorAll('.education-card');
  const currentDate = new Date();

  // Informations des points
  const datesInfo = [
    { type: 'future', label: 'Juillet 2025' },
    { type: 'past', label: 'Juillet 2024' },
    { type: 'past', label: 'Juillet 2021' }
  ];

  // Supprime les points existants
  timelineContainer.innerHTML = '';

  educationCards.forEach((card, index) => {
    const cardRect = card.getBoundingClientRect();
    const containerRect = timelineContainer.getBoundingClientRect();
    const position = cardRect.top + cardRect.height / 2 - containerRect.top;

    // Déclarer dateInfo avant de l'utiliser
    const dateInfo = datesInfo[index] || { type: 'past', label: '' };

    const point = document.createElement('div');
    point.className = `timeline-point timeline-point-${dateInfo.type}`;

    point.style.top = `${position}px`;

    point.innerHTML = `
      <div class="timeline-point-container">
        <div class="timeline-dot timeline-dot-${dateInfo.type}"></div>
        <span class="timeline-date">${dateInfo.label}</span>
      </div>
    `;

    timelineContainer.appendChild(point);
  });

  // Calculer la distance par rapport à juillet 2024 et juillet 2026
  const startDate = new Date(2024, 6); // Juillet 2024
  const endDate = new Date(2026, 6);   // Juillet 2026
  const totalMonths = 24; // Nombre total de mois entre juillet 2024 et juillet 2026

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const targetYear = startDate.getFullYear();
  const targetMonth = startDate.getMonth();

  const monthDiff = (currentYear - targetYear) * 12 + (currentMonth - targetMonth);
  const proportion = monthDiff / totalMonths;

  let type, label;
  if (monthDiff === 0) {
    type = 'present';
    label = 'Juillet 2024';
  } else if (monthDiff > 0 && monthDiff <= totalMonths) {
    type = 'past';
    label = currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  } else {
    type = 'future';
    label = currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }

  // Définir une position fixe équidistante entre juillet 2024 et juillet 2025
  const containerHeight = timelineContainer.clientHeight;
  const positionDistance = 3 * containerHeight / 7; // Position fixe au milieu

  // Ajouter le point fixe
  const fixedPoint = document.createElement('div');
  fixedPoint.className = 'timeline-point timeline-point-present';
  fixedPoint.style.top = `${positionDistance}px`;

  // Définir la hauteur des pointillés
  timelineContainer.style.setProperty('--timeline-dotted-height', `${positionDistance}px`);

  fixedPoint.innerHTML = `
    <div class="timeline-point-container">
      <div class="timeline-dot timeline-dot-present"></div>
      <span class="timeline-date">${currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })} (aujourd'hui)</span>
    </div>
  `;
  timelineContainer.appendChild(fixedPoint);
}

function initializeTimelineInteractions() {
  const educationCards = document.querySelectorAll('.education-card');
  const timelinePoints = document.querySelectorAll('.timeline-point');

  educationCards.forEach((card, index) => {
    card.addEventListener('mouseenter', () => {
      if (timelinePoints[index]) {
        timelinePoints[index].querySelector('.timeline-dot').classList.add('hovered');
        timelinePoints[index].classList.add('hovered');
      }
    });

    card.addEventListener('mouseleave', () => {
      if (timelinePoints[index]) {
        timelinePoints[index].querySelector('.timeline-dot').classList.remove('hovered');
        timelinePoints[index].classList.remove('hovered');
      }
    });
  });
}

window.addEventListener('load', () => {
  loadProjects();
  initializeTimeline();
  initializeTimelineInteractions(); // Ajoutez cette ligne
});
