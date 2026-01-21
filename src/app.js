import { initDB, getDistinctValues, getYearRange, query } from './duckdb.js';
import { createTabs } from './components/tabs.js';
import { renderPanel1 } from './panels/panel_measures.js';
import { renderPanel2 } from './panels/panel_demographics.js';
import { renderPanel3 } from './panels/panel_states.js';
import { STATE_NAMES } from './utils/constants.js';

// App state
const appState = {
  activeTab: 'panel1',
  yearRange: { minYear: 2015, maxYear: 2020 },
  panel1: {
    state: 'U.S.',
    demographic_group: 'Black',
    measures: []
  },
  panel2: {
    measure: '',
    state: 'U.S.',
    demographic_category: 'race'
  },
  panel3: {
    year: 2020,
    demographic_group: 'Black',
    measure: ''
  }
};

// Metadata cache
const metadata = {
  states: [],
  statesDisplayToDb: {},
  statesDbToDisplay: {},
  years: [],
  fairness_measures: [],
  demographic_categories: [],
  demographic_categories_map: {},
  demographic_groups_by_category: {},
  all_demographic_groups: [],
  minYear: 2015,
  maxYear: 2020
};

// Tab configuration
const tabs = [
  { id: 'panel1', label: 'Compare Fairness Measures' },
  { id: 'panel2', label: 'Compare Demographics' },
  { id: 'panel3', label: 'Compare States' }
];

// Theme management
function setupThemeToggle() {
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  const html = document.documentElement;

  // Get saved theme or default to system preference
  const savedTheme = localStorage.getItem('theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const currentTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');

  // Apply initial theme
  html.setAttribute('data-theme', currentTheme);
  themeIcon.textContent = currentTheme === 'dark' ? '☀️' : '🌙';

  // Toggle theme on click
  themeToggle.addEventListener('click', () => {
    const newTheme = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    themeIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    localStorage.setItem('theme', newTheme);
  });
}

// Initialize app
async function init() {
  const app = document.getElementById('app');
  app.innerHTML = '<div class="loading">Initializing database and loading data...</div>';

  try {
    // Initialize DuckDB
    await initDB();

    // Load metadata
    const rawStates = await getDistinctValues('state');
    // Create display names and mappings
    metadata.statesDbToDisplay = {};
    metadata.statesDisplayToDb = {};
    rawStates.forEach(state => {
      const displayName = STATE_NAMES[state] || state;
      metadata.statesDbToDisplay[state] = displayName;
      metadata.statesDisplayToDb[displayName] = state;
    });
    metadata.states = rawStates.map(state => metadata.statesDbToDisplay[state]);

    metadata.years = (await getDistinctValues('year')).map(y => y.toString());
    metadata.fairness_measures = await getDistinctValues('fairness_measure');

    // Get demographic categories - store both display and DB values
    const rawCategories = await getDistinctValues('demographic_category');
    metadata.demographic_categories = rawCategories.map(cat => {
      if (cat.toLowerCase() === 'race') return 'Race';
      if (cat.toLowerCase() === 'sex') return 'Sex';
      return cat;
    });
    metadata.demographic_categories_map = {};
    rawCategories.forEach(cat => {
      const displayName = cat.toLowerCase() === 'race' ? 'Race' :
                         cat.toLowerCase() === 'sex' ? 'Sex' : cat;
      metadata.demographic_categories_map[displayName] = cat;
    });

    // Get year range
    const yearRange = await getYearRange();
    metadata.minYear = yearRange.min_year;
    metadata.maxYear = yearRange.max_year;

    // Get all demographic groups (not filtered by category)
    const allGroupsResult = await query(`
      SELECT DISTINCT demographic_group
      FROM fairness
      WHERE demographic_group IS NOT NULL
      ORDER BY demographic_group
    `);
    metadata.all_demographic_groups = allGroupsResult.map(r => r.demographic_group);

    // Get demographic groups by category
    for (const rawCategory of rawCategories) {
      const displayCategory = rawCategory.toLowerCase() === 'race' ? 'Race' :
                               rawCategory.toLowerCase() === 'sex' ? 'Sex' : rawCategory;
      const result = await query(`
        SELECT DISTINCT demographic_group
        FROM fairness
        WHERE demographic_category = '${rawCategory}'
        ORDER BY demographic_group
      `);
      metadata.demographic_groups_by_category[displayCategory] = result.map(r => r.demographic_group);
    }

    // Initialize default state values
    appState.yearRange.minYear = metadata.minYear;
    appState.yearRange.maxYear = metadata.maxYear;

    // Default to U.S. if available
    appState.panel1.state = metadata.states.includes('U.S.') ? 'U.S.' : (metadata.states[0] || 'California');
    // Set default demographic group to first non-White, non-Male group
    const filteredGroups = metadata.all_demographic_groups.filter(g => g !== 'White' && g !== 'Male');
    appState.panel1.demographic_group = filteredGroups.includes('Black') ? 'Black' : (filteredGroups[0] || 'Black');

    // Set default measures to Statistical Parity and Predictive Parity, excluding Representativeness
    const defaultMeasures = ['Statistical Parity', 'Predictive Parity'];
    const panel1Measures = metadata.fairness_measures.filter(m => m !== 'Representativeness');
    appState.panel1.measures = defaultMeasures.filter(m => panel1Measures.includes(m));
    if (appState.panel1.measures.length === 0) {
      appState.panel1.measures = panel1Measures.slice(0, 2);
    }

    // Set default measure to Statistical Parity for panel2
    appState.panel2.measure = metadata.fairness_measures.includes('Statistical Parity')
      ? 'Statistical Parity'
      : (metadata.fairness_measures[0] || '');
    appState.panel2.state = metadata.states.includes('U.S.') ? 'U.S.' : (metadata.states[0] || 'California');
    appState.panel2.demographic_category = metadata.demographic_categories[0] || 'race';

    appState.panel3.year = metadata.maxYear;
    // Set default measure to Statistical Parity for panel3
    appState.panel3.measure = metadata.fairness_measures.includes('Statistical Parity')
      ? 'Statistical Parity'
      : (metadata.fairness_measures[0] || '');
    // Set default demographic group based on measure (using all groups, not filtered by category)
    const panel3FilteredGroups = appState.panel3.measure === 'Representativeness'
      ? metadata.all_demographic_groups
      : metadata.all_demographic_groups.filter(g => g !== 'White' && g !== 'Male');
    appState.panel3.demographic_group = panel3FilteredGroups.includes('Black')
      ? 'Black'
      : (panel3FilteredGroups[0] || '');

    // Rebuild UI
    app.innerHTML = `
      <header>
        <button id="theme-toggle" class="theme-toggle" aria-label="Toggle theme">
          <span id="theme-icon">🌙</span>
        </button>
        <h1>Mortgage Market Fairness</h1>
        <div class="description">
          Based on a <a href="https://www.philadelphiafed.org/-/media/FRBP/Assets/working-papers/2025/wp25-04.pdf" target="_blank" rel="noopener noreferrer">working paper</a> by Hadi Elzayn, Simon Freyaldenhoven, Ryan Kobler, and Minchul Shin.
          <br><br>
          How fair or unfair is the U.S. mortgage market? The answer to this question crucially depends on the definition of fairness. This visualization describes and explores six widely used definitions of fairness across time and allows users to compare by metric, by demographics, and by state.
        </div>
        <div id="tabs"></div>
      </header>
      <main>
        <div id="controls"></div>
        <div id="visualization"></div>
        <div id="caption"></div>
      </main>
    `;

    // Setup theme toggle
    setupThemeToggle();

    // Render tabs
    const tabsContainer = document.getElementById('tabs');
    const tabsElement = createTabs(tabs, appState.activeTab, (tabId) => {
      appState.activeTab = tabId;
      render();
    });
    tabsContainer.replaceWith(tabsElement);

    // Initial render
    render();
  } catch (error) {
    console.error('Initialization error:', error);
    app.innerHTML = `<div class="loading">Error: ${error.message}</div>`;
  }
}

// Render current panel
async function render() {
  const controlsEl = document.getElementById('controls');
  const vizEl = document.getElementById('visualization');
  const captionEl = document.getElementById('caption');

  // Show loading
  vizEl.innerHTML = '<div class="loading">Loading...</div>';

  // Update tabs
  const tabsEl = document.getElementById('tabs');
  const newTabs = createTabs(tabs, appState.activeTab, (tabId) => {
    appState.activeTab = tabId;
    render();
  });
  tabsEl.replaceWith(newTabs);

  // Render active panel
  try {
    if (appState.activeTab === 'panel1') {
      await renderPanel1(controlsEl, vizEl, captionEl, appState, metadata, render);
    } else if (appState.activeTab === 'panel2') {
      await renderPanel2(controlsEl, vizEl, captionEl, appState, metadata, render);
    } else if (appState.activeTab === 'panel3') {
      await renderPanel3(controlsEl, vizEl, captionEl, appState, metadata, render);
    }
  } catch (error) {
    console.error('Render error:', error);
    vizEl.innerHTML = `<div class="loading">Error: ${error.message}</div>`;
  }
}

// Start app
init();
