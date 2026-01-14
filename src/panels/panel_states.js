import * as Plot from '@observablehq/plot';
import { query } from '../duckdb.js';
import { createDropdown } from '../components/controls.js';
import { STANDARD_CAPTION } from '../utils/constants.js';

export async function renderPanel3(controlsEl, vizEl, captionEl, state, metadata, updateState) {
  // Clear
  controlsEl.innerHTML = '';
  vizEl.innerHTML = '';
  captionEl.innerHTML = '';

  // Controls
  const measureControl = createDropdown(
    'Fairness Measure',
    metadata.fairness_measures,
    state.panel3.measure,
    (value) => {
      state.panel3.measure = value;
      updateState();
    }
  );
  controlsEl.appendChild(measureControl);

  const yearControl = createDropdown(
    'Year',
    metadata.years,
    state.panel3.year,
    (value) => {
      state.panel3.year = parseInt(value);
      updateState();
    }
  );
  controlsEl.appendChild(yearControl);

  const categoryControl = createDropdown(
    'Demographic Category',
    metadata.demographic_categories,
    state.panel3.demographic_category,
    (value) => {
      state.panel3.demographic_category = value;
      // Reset group to first available
      const groups = metadata.demographic_groups_by_category[value] || [];
      state.panel3.demographic_group = groups[0] || '';
      updateState();
    }
  );
  controlsEl.appendChild(categoryControl);

  const currentGroups = metadata.demographic_groups_by_category[state.panel3.demographic_category] || [];
  const groupControl = createDropdown(
    'Demographic Group',
    currentGroups,
    state.panel3.demographic_group,
    (value) => {
      state.panel3.demographic_group = value;
      updateState();
    }
  );
  controlsEl.appendChild(groupControl);

  // Query and visualize
  const sql = `
    SELECT state, value, coalesced_n
    FROM fairness
    WHERE fairness_measure = '${state.panel3.measure}'
      AND year = ${state.panel3.year}
      AND demographic_category = '${state.panel3.demographic_category}'
      AND demographic_group = '${state.panel3.demographic_group}'
    ORDER BY state
  `;

  const data = await query(sql);

  if (data.length === 0) {
    vizEl.innerHTML = '<div class="loading">No data for selection</div>';
    return;
  }

  // Simple bar chart for now (map would require TopoJSON setup)
  const plot = Plot.plot({
    marks: [
      Plot.barY(data, {
        x: 'state',
        y: 'value',
        fill: 'value',
        title: d => `${d.state}\nValue: ${d.value.toFixed(2)}\nSample size: ${d.coalesced_n}`,
        sort: { x: 'y', reverse: true }
      }),
      Plot.ruleY([0])
    ],
    color: { scheme: 'RdBu', domain: [-1, 1] },
    marginLeft: 60,
    marginBottom: 60,
    grid: true,
    y: { label: 'Value' },
    x: { label: 'State', tickRotate: -45 }
  });

  vizEl.appendChild(plot);

  captionEl.innerHTML = `
    <strong>${state.panel3.measure} by state (${state.panel3.year}) — ${state.panel3.demographic_group}</strong><br>
    ${STANDARD_CAPTION}<br>
    <em>Note: Map visualization will be added in future iteration. Showing bar chart for now.</em>
  `;
}
