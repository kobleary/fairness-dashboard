import * as Plot from '@observablehq/plot';
import { query } from '../duckdb.js';
import { createDropdown } from '../components/controls.js';
import { createYearRangeSlider } from '../components/slider.js';
import { createMultiSelect } from '../components/multiselect.js';
import { STANDARD_CAPTION } from '../utils/constants.js';

export async function renderPanel1(controlsEl, vizEl, captionEl, state, metadata, updateState) {
  // Clear
  controlsEl.innerHTML = '';
  vizEl.innerHTML = '';
  captionEl.innerHTML = '';

  // Controls
  const stateControl = createDropdown(
    'State',
    metadata.states,
    state.panel1.state,
    (value) => {
      state.panel1.state = value;
      updateState();
    }
  );
  controlsEl.appendChild(stateControl);

  const categoryControl = createDropdown(
    'Demographic Category',
    metadata.demographic_categories,
    state.panel1.demographic_category,
    (value) => {
      state.panel1.demographic_category = value;
      // Reset group to first available
      const groups = metadata.demographic_groups_by_category[value] || [];
      state.panel1.demographic_group = groups[0] || '';
      updateState();
    }
  );
  controlsEl.appendChild(categoryControl);

  const currentGroups = metadata.demographic_groups_by_category[state.panel1.demographic_category] || [];
  const groupControl = createDropdown(
    'Demographic Group',
    currentGroups,
    state.panel1.demographic_group,
    (value) => {
      state.panel1.demographic_group = value;
      updateState();
    }
  );
  controlsEl.appendChild(groupControl);

  const measuresControl = createMultiSelect(
    'Fairness Measures',
    metadata.fairness_measures,
    state.panel1.measures,
    (values) => {
      state.panel1.measures = values;
      updateState();
    }
  );
  controlsEl.appendChild(measuresControl);

  const sliderControl = createYearRangeSlider(
    metadata.minYear,
    metadata.maxYear,
    state.yearRange.minYear,
    state.yearRange.maxYear,
    (min, max) => {
      state.yearRange.minYear = min;
      state.yearRange.maxYear = max;
      updateState();
    }
  );
  controlsEl.appendChild(sliderControl);

  // Query and visualize
  if (state.panel1.measures.length === 0) {
    vizEl.innerHTML = '<div class="loading">Please select at least one fairness measure</div>';
    return;
  }

  const measuresStr = state.panel1.measures.map(m => `'${m}'`).join(',');
  const sql = `
    SELECT year, fairness_measure, value, coalesced_n
    FROM fairness
    WHERE state = '${state.panel1.state}'
      AND demographic_category = '${state.panel1.demographic_category}'
      AND demographic_group = '${state.panel1.demographic_group}'
      AND fairness_measure IN (${measuresStr})
      AND year BETWEEN ${state.yearRange.minYear} AND ${state.yearRange.maxYear}
    ORDER BY fairness_measure, year
  `;

  const data = await query(sql);

  if (data.length === 0) {
    vizEl.innerHTML = '<div class="loading">No data for selection</div>';
    return;
  }

  const plot = Plot.plot({
    marks: [
      Plot.line(data, {
        x: 'year',
        y: 'value',
        stroke: 'fairness_measure',
        strokeWidth: 2
      }),
      Plot.dot(data, {
        x: 'year',
        y: 'value',
        fill: 'fairness_measure',
        title: d => `${d.year}\n${d.fairness_measure}\nValue: ${d.value.toFixed(2)}\nSample size: ${d.coalesced_n}`
      })
    ],
    color: { legend: true },
    marginLeft: 60,
    marginBottom: 40,
    grid: true,
    y: { label: 'Value' },
    x: { label: 'Year' }
  });

  vizEl.appendChild(plot);

  captionEl.innerHTML = `
    <strong>Fairness measures over time — ${state.panel1.state}, ${state.panel1.demographic_group}</strong><br>
    ${STANDARD_CAPTION}
  `;
}
