// Edit the summary and paragraphs here to update each project's explanation.
// Titles match the GIF filenames in public/project-gifs.
const arcadeProjects = [
  {
    id: 'water-renderer',
    title: 'Water Renderer',
    file: 'Water Renderer.gif',
    category: 'Graphics experiment',
    summary: 'Procedural waves brought to life with surface lighting.',
    paragraphs: [
      'Implemented procedural water movement with layered sine waves and calculated surface normals for lighting.',
      'Applied ambient, diffuse and Blinn–Phong lighting to render the moving surface.'
    ]
  },
  {
    id: 'starship-sling',
    title: 'Starship Sling',
    file: 'Starship Sling.gif',
    category: 'Arcade game',
    summary: 'A physics-driven space game built around slingshot puzzles.',
    paragraphs: [
      'Implemented slingshot gameplay and physics-based puzzles, with animations and object spawning to bring each encounter to life.',
      'Developed the game iteratively as part of a game jam.'
    ]
  },
  {
    id: 'reinforcement-learning-agent',
    title: 'Adaptive Enemy Framework',
    file: 'Reinforcement Learning Trained AI Agent.gif',
    category: 'Game AI research',
    summary: 'A Unity enemy AI pipeline combining learned and style-conditioned behaviour.',
    paragraphs: [
      'Researched reinforcement and imitation learning, then implemented a Unity-integrated AI pipeline with enemy state machines, controllers and attack execution. Integrated ML-Agents observations, actions, rewards and episode handling.',
      'Connected demonstration processing and aggressive/defensive style critics to learning, opponent modelling and runtime inference. Coordinated the three-person FYP team and shared progress with the supervisor.'
    ]
  },
  {
    id: 'cloth-simulator',
    title: 'Cloth Simulator',
    file: 'Cloth Simulator.gif',
    category: 'Physics experiment',
    summary: 'A custom mass-spring cloth model with constraints and wind.',
    paragraphs: [
      'Built a custom mass-spring cloth model using structural, shear and bending constraints.',
      'Applied force integration and wind to drive the simulation, with procedural mesh updates showing the cloth in motion.'
    ]
  },
  {
    id: 'terrain-generator',
    title: 'Terrain Generator',
    file: 'Terrain Generator.gif',
    category: 'World-building tool',
    summary: 'Interactive procedural terrain shaped by noise and fuzzy logic.',
    paragraphs: [
      'Built an interactive OpenGL terrain renderer using Perlin noise and related procedural-generation techniques.',
      'Applied fuzzy logic and domain warping to shape generated terrain.'
    ]
  },
  {
    id: 'tower-defense',
    title: 'Tower Defense',
    file: 'Tower.gif',
    detailPreview: 'gif',
    category: 'Tower defense game',
    summary: 'Build and upgrade defenses to hold back waves of enemies.',
    paragraphs: [
      'A tower defense game with procedurally generated maps, A* pathfinding for enemy navigation, and wave-based spawning and progression.',
      'Turrets target enemies and fire projectiles. Tower upgrades and in-game resource and economy systems support the defense strategy.'
    ]
  },
  {
    id: 'coffee-cataclysm',
    title: 'Coffee Cataclysm',
    file: 'Coffee.gif',
    detailPreview: 'gif',
    category: 'Multiplayer game',
    summary: 'A cooperative coffee-shop adventure with networked gameplay and a procedural forest.',
    paragraphs: [
      'Implemented multiplayer sessions for up to four players, synchronizing player and gameplay state. Built networked held-item interactions, coffee preparation, customer orders, and RPC-based gameplay actions.',
      'Contributed character classes, combat, enemies, weapons, and companion systems, along with chunk-based procedural forest generation and game-state transitions.'
    ]
  }
];
