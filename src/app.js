import { initDB, getDistinctValues, getYearRange, query } from './duckdb.js';
import { createTabs } from './components/tabs.js';
import { renderPanel1 } from './panels/panel_measures.js';
import { renderPanel2 } from './panels/panel_demographics.js';
import { renderPanel3 } from './panels/panel_states.js';

// App state
const appState = {
  activeTab: 'panel1',
  yearRange: { minYear: 2015, maxYear: 2020 },
  panel1: {
    state: 'CA',
    demographic_category: 'race',
    demographic_group: 'Black',
    measures: []
  },
  panel2: {
    measure: '',
    state: 'CA',
    demographic_category: 'race'
  },
  panel3: {
    year: 2020,
    demographic_category: 'race',
    demographic_group: 'Black',
    measure: ''
  }
};

// Metadata cache
const metadata = {
  states: [],
  years: [],
  fairness_measures: [],
  demographic_categories: [],
  demographic_groups_by_category: {},
  minYear: 2015,
  maxYear: 2020
};

// Tab configuration
const tabs = [
  { id: 'panel1', label: 'Compare Fairness Measures' },
  { id: 'panel2', label: 'Compare Demographics' },
  { id: 'panel3', label: 'Compare States' }
];

// Initialize app
async function init() {
  const app = document.getElementById('app');
  app.innerHTML = '<div class="loading">Initializing database and loading data...</div>';

  try {
    // Initialize DuckDB
    await initDB();

    // Load metadata
    metadata.states = await getDistinctValues('state');
    metadata.years = (await getDistinctValues('year')).map(y => y.toString());
    metadata.fairness_measures = await getDistinctValues('fairness_measure');
    metadata.demographic_categories = await getDistinctValues('demographic_category');

    // Get year range
    const yearRange = await getYearRange();
    metadata.minYear = yearRange.min_year;
    metadata.maxYear = yearRange.max_year;

    // Get demographic groups by category
    for (const category of metadata.demographic_categories) {
      const result = await query(`
        SELECT DISTINCT demographic_group
        FROM fairness
        WHERE demographic_category = '${category}'
        ORDER BY demographic_group
      `);
      metadata.demographic_groups_by_category[category] = result.map(r => r.demographic_group);
    }

    // Initialize default state values
    appState.yearRange.minYear = metadata.minYear;
    appState.yearRange.maxYear = metadata.maxYear;
    appState.panel1.state = metadata.states[0] || 'CA';
    appState.panel1.demographic_category = metadata.demographic_categories[0] || 'race';
    appState.panel1.demographic_group = metadata.demographic_groups_by_category[appState.panel1.demographic_category]?.[0] || '';
    appState.panel1.measures = metadata.fairness_measures.slice(0, 2); // Default to first 2 measures

    appState.panel2.measure = metadata.fairness_measures[0] || '';
    appState.panel2.state = metadata.states[0] || 'CA';
    appState.panel2.demographic_category = metadata.demographic_categories[0] || 'race';

    appState.panel3.year = metadata.maxYear;
    appState.panel3.demographic_category = metadata.demographic_categories[0] || 'race';
    appState.panel3.demographic_group = metadata.demographic_groups_by_category[appState.panel3.demographic_category]?.[0] || '';
    appState.panel3.measure = metadata.fairness_measures[0] || '';

    // Rebuild UI
    app.innerHTML = `
      <header>
        <h1>Fairness Dashboard</h1>
        <div id="tabs"></div>
      </header>
      <main>
        <div id="controls"></div>
        <div id="visualization"></div>
        <div id="caption"></div>
      </main>
    `;

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
