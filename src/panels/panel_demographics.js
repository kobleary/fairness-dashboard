import * as Plot from '@observablehq/plot';
import { query } from '../duckdb.js';
import { createDropdown } from '../components/controls.js';
import {
  getReferenceGroup,
  getDataSources,
  getDynamicDecimals,
  FAIRNESS_MESSAGES,
  FAIRNESS_DEFINITIONS,
  DEMOGRAPHIC_GROUP_COLORS,
  MEASURE_COLORS
} from '../utils/constants.js';

export async function renderPanel2(controlsEl, vizEl, captionEl, state, metadata, updateState) {
  // Clear
  controlsEl.innerHTML = '';
  vizEl.innerHTML = '';
  captionEl.innerHTML = '';

  // Controls
  const measureControl = createDropdown(
    'Select a Fairness Measure',
    metadata.fairness_measures,
    state.panel2.measure,
    (value) => {
      state.panel2.measure = value;
      updateState();
    }
  );
  controlsEl.appendChild(measureControl);

  const stateControl = createDropdown(
    'Select a State',
    metadata.states,
    state.panel2.state,
    (value) => {
      state.panel2.state = value;
      updateState();
    },
    true // isStateDropdown
  );
  controlsEl.appendChild(stateControl);

  const categoryControl = createDropdown(
    'Select a Category',
    metadata.demographic_categories,
    state.panel2.demographic_category,
    (value) => {
      state.panel2.demographic_category = value;
      updateState();
    }
  );
  controlsEl.appendChild(categoryControl);

  // Query and visualize
  const dbCategory = metadata.demographic_categories_map[state.panel2.demographic_category] || state.panel2.demographic_category;
  const dbState = metadata.statesDisplayToDb[state.panel2.state] || state.panel2.state;
  const sql = `
    SELECT year, demographic_group, value, coalesced_n
    FROM fairness
    WHERE fairness_measure = '${state.panel2.measure}'
      AND state = '${dbState}'
      AND demographic_category = '${dbCategory}'
      AND value IS NOT NULL
    ORDER BY demographic_group, year
  `;

  const data = await query(sql);

  if (data.length === 0) {
    vizEl.innerHTML = '<div class="loading">No data for selection</div>';
    return;
  }

  // Get unique demographic groups in the data and assign consistent colors
  const demographicGroups = [...new Set(data.map(d => d.demographic_group))];
  const groupColors = demographicGroups.map(group =>
    DEMOGRAPHIC_GROUP_COLORS[group] || MEASURE_COLORS[demographicGroups.indexOf(group) % MEASURE_COLORS.length]
  );

  // Determine dynamic decimal places
  const values2 = data.map(d => d.value);
  const decimals2 = getDynamicDecimals(values2);

  // Augment data with tooltip messages for panel 2
  const dataWithTooltips2 = data.map(d => {
    const panel2ReferenceGroup = getReferenceGroup(d.demographic_group);
    return {
      ...d,
      tooltipTitle: `${d.demographic_group}, ${d.year}`,
      tooltipMessage: FAIRNESS_MESSAGES[state.panel2.measure]
        ? FAIRNESS_MESSAGES[state.panel2.measure](state.panel2.state, d.demographic_group, d.value, panel2ReferenceGroup).replace(/\d+\.\d+/, Math.abs(d.value).toFixed(decimals2)) + ` (Sample size: ${d.coalesced_n.toLocaleString()})`
        : `(Sample size: ${d.coalesced_n.toLocaleString()})`
    };
  });

  const plot = Plot.plot({
    marks: [
      Plot.line(dataWithTooltips2, { x: 'year', y: 'value', stroke: 'demographic_group', strokeWidth: 2 }),
      Plot.dot(dataWithTooltips2, {
        x: 'year',
        y: 'value',
        fill: 'demographic_group',
        r: 5,
        tip: true,
        title: d => `${d.tooltipTitle}\n\n${d.tooltipMessage}`
      })
    ],
    color: {
      legend: true,
      domain: demographicGroups,
      range: groupColors
    },
    title: `${state.panel2.measure} over time by ${state.panel2.demographic_category} — ${state.panel2.state}`,
    width: vizEl.clientWidth,
    height: 500,
    marginLeft: 80,
    marginRight: 60,
    marginTop: 50,
    marginBottom: 60,
    style: { fontSize: '14px', overflow: 'visible' },
    grid: true,
    y: { label: 'Fairness violation' },
    x: { label: null, tickFormat: 'd' }
  });

  vizEl.appendChild(plot);

  // Determine reference group for panel 2 based on demographic category
  const panel2ReferenceGroup = state.panel2.demographic_category.toLowerCase() === 'sex' ? 'Male' : 'White';

  // Get definition for selected measure
  const definition = FAIRNESS_DEFINITIONS[state.panel2.measure] || 'Definition not available.';

  // Get data source
  const dataSource2 = getDataSources([state.panel2.measure]);

  captionEl.innerHTML = `
    <div style="margin-bottom: 15px;">
      <strong>About the selected fairness measure:</strong>
    </div>
    <p style="margin-bottom: 12px;"><strong>${state.panel2.measure}:</strong> ${definition}</p>
    <div style="margin-top: 15px; padding-top: 12px; border-top: 1px solid #ddd; font-size: 0.85rem; color: #666;">
      Note: ${state.panel2.measure === 'Representativeness' ? 'Representativeness is shown as levels.' : `All values are differences relative to ${panel2ReferenceGroup} (reference group).`}
    </div>
    <div style="margin-top: 10px; font-size: 0.85rem; color: #666; font-style: italic;">
      ${dataSource2}
    </div>
  `;
}
