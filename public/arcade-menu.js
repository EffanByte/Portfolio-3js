const items = [...document.querySelectorAll('.menu-item')];
const descriptions = [
  "Things I've built, one little quest at a time.",
  'A journal of my adventures so far.',
  'Meet the person behind the pixels.',
  "Got an idea? Let's make something together."
];
let selectedIndex = 0;
let selectedProjectIndex = 0;
let activeView = 'menu';
const projectCards = [];
const views = {
  menu: document.getElementById('menu-view'),
  projects: document.getElementById('projects-view'),
  detail: document.getElementById('project-detail-view')
};

function setView(name) {
  activeView = name;
  Object.entries(views).forEach(([viewName, element]) => {
    element.hidden = viewName !== name;
  });
  document.body.dataset.view = name;
  document.getElementById('select-help').hidden = name === 'detail';
  document.getElementById('back-help').hidden = name === 'menu';
}

const projectGifUrl = project => `/project-gifs/${encodeURIComponent(project.file)}`;

function buildProjectCards() {
  if (projectCards.length) return;
  arcadeProjects.forEach((project, index) => {
    const float = document.createElement('div');
    float.className = 'card-float';
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'project-card';
    card.dataset.project = project.id;
    const preview = document.createElement('span');
    preview.className = 'project-preview';
    const gif = document.createElement('img');
    gif.src = projectGifUrl(project);
    gif.alt = '';
    gif.decoding = 'async';
    preview.appendChild(gif);
    const category = document.createElement('span');
    category.className = 'project-card-category';
    category.textContent = project.category;
    const title = document.createElement('span');
    title.className = 'project-card-title';
    title.textContent = project.title;
    card.append(preview, category, title);
    card.addEventListener('click', () => openProject(index));
    card.addEventListener('focus', () => chooseProject(index));
    card.addEventListener('keydown', event => {
      const columns = window.matchMedia('(max-width: 480px)').matches ? 1 : 3;
      const destinations = {
        ArrowLeft: index - 1,
        ArrowRight: index + 1,
        ArrowUp: index - columns,
        ArrowDown: index + columns,
        Home: 0,
        End: arcadeProjects.length - 1
      };
      if (Object.hasOwn(destinations, event.key)) {
        event.preventDefault();
        chooseProject(destinations[event.key], true);
      }
    });
    float.appendChild(card);
    document.getElementById('project-grid').appendChild(float);
    projectCards.push(card);
  });
}

function chooseProject(index, moveFocus = false) {
  selectedProjectIndex = (index + arcadeProjects.length) % arcadeProjects.length;
  projectCards.forEach((card, cardIndex) => {
    const selected = cardIndex === selectedProjectIndex;
    card.classList.toggle('is-selected', selected);
    card.tabIndex = selected ? 0 : -1;
  });
  if (moveFocus) {
    const card = projectCards[selectedProjectIndex];
    card.focus({ preventScroll: true });
    card.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (selectedProjectIndex === 0) document.getElementById('project-grid').scrollTop = 0;
  }
}

function showProjects() {
  buildProjectCards();
  setView('projects');
  chooseProject(selectedProjectIndex, true);
  document.getElementById('view-announcement').textContent = 'Projects. Choose a project to read its story.';
}

function showMenu() {
  setView('menu');
  choose(selectedIndex, true);
  document.getElementById('view-announcement').textContent = 'Main menu.';
}

function openProject(index, moveFocus = true) {
  chooseProject(index);
  const project = arcadeProjects[selectedProjectIndex];
  const gif = document.getElementById('project-gif');
  gif.src = projectGifUrl(project);
  gif.alt = `${project.title} project demonstration`;
  document.getElementById('project-title').textContent = project.title;
  document.getElementById('project-category').textContent = project.category;
  document.getElementById('project-summary').textContent = project.summary;
  document.getElementById('project-position').textContent = `${String(selectedProjectIndex + 1).padStart(2, '0')} / ${String(arcadeProjects.length).padStart(2, '0')}`;
  const paragraphs = project.paragraphs.map(text => {
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    return paragraph;
  });
  document.getElementById('project-story').replaceChildren(...paragraphs);
  setView('detail');
  document.querySelector('.project-detail-scroll').scrollTop = 0;
  if (moveFocus) document.getElementById('project-title').focus({ preventScroll: true });
  document.getElementById('view-announcement').textContent = `${project.title}. Project details.`;
}

// Small particles reuse the licensed Pixelarticons sparkle.
items.forEach(item => {
  const burst = document.createElement('span');
  burst.className = 'card-burst';
  burst.setAttribute('aria-hidden', 'true');
  for (const [x, y, dx, dy] of [[20, 38, -20, -20], [78, 30, 18, -28], [13, 62, -22, 5], [87, 66, 20, -8]]) {
    const sparkle = document.createElement('span');
    sparkle.className = 'icon card-particle';
    sparkle.style.cssText = `--icon: url('/arcade-assets/sparkle.svg'); left: ${x}%; top: ${y}%; --dx: ${dx}px; --dy: ${dy}px`;
    burst.appendChild(sparkle);
  }
  item.appendChild(burst);
});

function choose(index, moveFocus = false) {
  selectedIndex = (index + items.length) % items.length;
  items.forEach((item, itemIndex) => {
    const selected = itemIndex === selectedIndex;
    item.setAttribute('aria-pressed', String(selected));
    item.tabIndex = selected ? 0 : -1;
    item.classList.remove('is-confirmed');
  });
  const item = items[selectedIndex];
  const label = item.querySelector('.menu-label').textContent;
  document.getElementById('section-description').textContent = descriptions[selectedIndex];
  document.getElementById('selected-name').textContent = label;
  document.getElementById('dialogue-sprite').src = item.querySelector('.item-sprite').src;
  document.getElementById('position').textContent = `${String(selectedIndex + 1).padStart(2, '0')} / 04`;
  document.getElementById('selection-announcement').textContent = `${label} selected.`;
  if (moveFocus) item.focus({ preventScroll: true });
}

function activate(index) {
  choose(index);
  const item = items[selectedIndex];
  void item.offsetWidth;
  item.classList.add('is-confirmed');
  window.dispatchEvent(new CustomEvent('arcademenu:select', {
    detail: { section: item.dataset.section }
  }));
  if (item.dataset.section === 'projects') showProjects();
}

items.forEach((item, index) => {
  item.addEventListener('click', () => activate(index));
  item.addEventListener('animationend', event => {
    if (event.target === item) item.classList.remove('is-confirmed');
  });
  item.addEventListener('keydown', event => {
    const columns = window.matchMedia('(max-width: 480px)').matches ? 2 : 4;
    const destinations = {
      ArrowLeft: selectedIndex - 1,
      ArrowRight: selectedIndex + 1,
      ArrowUp: selectedIndex - columns,
      ArrowDown: selectedIndex + columns,
      Home: 0,
      End: items.length - 1
    };
    if (Object.hasOwn(destinations, event.key)) {
      event.preventDefault();
      choose(destinations[event.key], true);
    }
  });
});
document.getElementById('previous').addEventListener('click', () => choose(selectedIndex - 1));
document.getElementById('next').addEventListener('click', () => choose(selectedIndex + 1));

document.getElementById('back-to-menu').addEventListener('click', showMenu);
document.getElementById('back-to-projects').addEventListener('click', showProjects);
document.getElementById('previous-project').addEventListener('click', () => openProject(selectedProjectIndex - 1, false));
document.getElementById('next-project').addEventListener('click', () => openProject(selectedProjectIndex + 1, false));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && activeView !== 'menu') {
    event.preventDefault();
    activeView === 'detail' ? showProjects() : showMenu();
  } else if (activeView === 'detail' && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
    event.preventDefault();
    openProject(selectedProjectIndex + (event.key === 'ArrowLeft' ? -1 : 1), false);
  }
});
