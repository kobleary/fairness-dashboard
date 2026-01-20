import * as Plot from '@observablehq/plot';
import { query } from '../duckdb.js';
import { createDropdown } from '../components/controls.js';
import { createMultiSelect } from '../components/multiselect.js';
import {
  getReferenceGroup,
  getDataSources,
  getDynamicDecimals,
  FAIRNESS_MESSAGES,
  FAIRNESS_DEFINITIONS,
  MEASURE_COLORS
} from '../utils/constants.js';

export async function renderPanel1(controlsEl, vizEl, captionEl, state, metadata, updateState) {
  // Clear
  controlsEl.innerHTML = '';
  vizEl.innerHTML = '';
  captionEl.innerHTML = '';

  // Filter out Representativeness from panel 1
  const panel1Measures = metadata.fairness_measures.filter(m => m !== 'Representativeness');

  // Controls
  const measuresControl = createMultiSelect(
    'Select Fairness Measure(s)',
    panel1Measures,
    state.panel1.measures,
    (values) => {
      state.panel1.measures = values;
      updateState();
    },
    true // Show info icon
  );
  controlsEl.appendChild(measuresControl);

  const stateControl = createDropdown(
    'Select a State',
    metadata.states,
    state.panel1.state,
    (value) => {
      state.panel1.state = value;
      updateState();
    },
    true // isStateDropdown
  );
  controlsEl.appendChild(stateControl);

  // Filter out White and Male from demographic group options
  const filteredDemographicGroups = metadata.all_demographic_groups.filter(g => g !== 'White' && g !== 'Male');
  const groupControl = createDropdown(
    'Select a Demographic',
    filteredDemographicGroups,
    state.panel1.demographic_group,
    (value) => {
      state.panel1.demographic_group = value;
      updateState();
    }
  );
  controlsEl.appendChild(groupControl);

  // Query and visualize
  if (state.panel1.measures.length === 0) {
    vizEl.innerHTML = '<div class="loading">Please select at least one fairness measure</div>';
    return;
  }

  const measuresStr = state.panel1.measures.map(m => `'${m}'`).join(',');
  const dbState = metadata.statesDisplayToDb[state.panel1.state] || state.panel1.state;
  const sql = `
    SELECT year, fairness_measure, value, coalesced_n
    FROM fairness
    WHERE state = '${dbState}'
      AND demographic_group = '${state.panel1.demographic_group}'
      AND fairness_measure IN (${measuresStr})
      AND value IS NOT NULL
    ORDER BY fairness_measure, year
  `;

  const data = await query(sql);

  if (data.length === 0) {
    vizEl.innerHTML = '<div class="loading">No data for selection</div>';
    return;
  }

  // Get selected measures in the order they appear in metadata
  const selectedMeasuresInOrder = metadata.fairness_measures.filter(m => state.panel1.measures.includes(m));

  // Determine reference group
  const referenceGroup = getReferenceGroup(state.panel1.demographic_group);

  // Determine dynamic decimal places
  const values = data.map(d => d.value);
  const decimals = getDynamicDecimals(values);

  // Augment data with tooltip messages
  const dataWithTooltips = data.map(d => ({
    ...d,
    tooltipTitle: `${d.fairness_measure}, ${d.year}`,
    tooltipMessage: FAIRNESS_MESSAGES[d.fairness_measure]
      ? FAIRNESS_MESSAGES[d.fairness_measure](state.panel1.state, state.panel1.demographic_group, d.value, referenceGroup).replace(/\d+\.\d+/, Math.abs(d.value).toFixed(decimals)) + ` (Sample size: ${d.coalesced_n.toLocaleString()})`
      : `(Sample size: ${d.coalesced_n.toLocaleString()})`
  }));

  const plot = Plot.plot({
    marks: [
      Plot.line(dataWithTooltips, { x: 'year', y: 'value', stroke: 'fairness_measure', strokeWidth: 2 }),
      Plot.dot(dataWithTooltips, {
        x: 'year',
        y: 'value',
        fill: 'fairness_measure',
        r: 5,
        tip: true,
        title: d => `${d.tooltipTitle}\n\n${d.tooltipMessage}`
      })
    ],
    color: {
      legend: true,
      domain: selectedMeasuresInOrder,
      range: selectedMeasuresInOrder.map(measure => {
        const originalIndex = metadata.fairness_measures.indexOf(measure);
        return MEASURE_COLORS[originalIndex % MEASURE_COLORS.length];
      }),
      style: { textAlign: 'center' }
    },
    title: `Comparing Fairness Measures for ${state.panel1.demographic_group} Applicants — ${state.panel1.state}`,
    subtitle: `Percentage point differences compared to ${referenceGroup} applicants`,
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

  // Build definitions HTML for selected measures
  const definitionsHtml = state.panel1.measures.map(measure => {
    const definition = FAIRNESS_DEFINITIONS[measure] || 'Definition not available.';
    return `<p style="margin-bottom: 12px;"><strong>${measure}:</strong> ${definition}</p>`;
  }).join('');

  // Get data source
  const dataSource = getDataSources(state.panel1.measures);

  captionEl.innerHTML = `
    <div style="margin-bottom: 15px;">
      <strong>About the selected fairness measures:</strong>
    </div>
    ${definitionsHtml}
    <div style="margin-top: 15px; padding-top: 12px; border-top: 1px solid #ddd; font-size: 0.85rem; color: #666;">
      Note: All measures are depicted as differences relative to ${referenceGroup} (reference group).
    </div>
    <div style="margin-top: 10px; font-size: 0.85rem; color: #666; font-style: italic;">
      ${dataSource}
    </div>
  `;
}
