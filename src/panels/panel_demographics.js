import * as Plot from '@observablehq/plot';
import { query } from '../duckdb.js';
import { createDropdown } from '../components/controls.js';
import { createYearRangeSlider } from '../components/slider.js';
import { STANDARD_CAPTION } from '../utils/constants.js';

export async function renderPanel2(controlsEl, vizEl, captionEl, state, metadata, updateState) {
  // Clear
  controlsEl.innerHTML = '';
  vizEl.innerHTML = '';
  captionEl.innerHTML = '';

  // Controls
  const measureControl = createDropdown(
    'Fairness Measure',
    metadata.fairness_measures,
    state.panel2.measure,
    (value) => {
      state.panel2.measure = value;
      updateState();
    }
  );
  controlsEl.appendChild(measureControl);

  const stateControl = createDropdown(
    'State',
    metadata.states,
    state.panel2.state,
    (value) => {
      state.panel2.state = value;
      updateState();
    }
  );
  controlsEl.appendChild(stateControl);

  const categoryControl = createDropdown(
    'Demographic Category',
    metadata.demographic_categories,
    state.panel2.demographic_category,
    (value) => {
      state.panel2.demographic_category = value;
      updateState();
    }
  );
  controlsEl.appendChild(categoryControl);

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
  const sql = `
    SELECT year, demographic_group, value, coalesced_n
    FROM fairness
    WHERE fairness_measure = '${state.panel2.measure}'
      AND state = '${state.panel2.state}'
      AND demographic_category = '${state.panel2.demographic_category}'
      AND year BETWEEN ${state.yearRange.minYear} AND ${state.yearRange.maxYear}
    ORDER BY demographic_group, year
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
        stroke: 'demographic_group',
        strokeWidth: 2
      }),
      Plot.dot(data, {
        x: 'year',
        y: 'value',
        fill: 'demographic_group',
        title: d => `${d.year}\n${d.demographic_group}\nValue: ${d.value.toFixed(2)}\nSample size: ${d.coalesced_n}`
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
    <strong>${state.panel2.measure} over time by ${state.panel2.demographic_category} — ${state.panel2.state}</strong><br>
    ${STANDARD_CAPTION}
  `;
}
