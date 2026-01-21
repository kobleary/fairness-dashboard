import * as d3 from 'd3';
import { query } from '../duckdb.js';
import { createDropdown } from '../components/controls.js';
import {
  getReferenceGroup,
  getDataSources,
  getDynamicDecimals,
  FAIRNESS_MESSAGES,
  FAIRNESS_DEFINITIONS,
  STATE_NAMES
} from '../utils/constants.js';

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
    state.panel3.year.toString(),
    (value) => {
      state.panel3.year = parseInt(value);
      updateState();
    }
  );
  controlsEl.appendChild(yearControl);

  // Show all demographic groups (not filtered by category)
  // Filter out White and Male for all measures except Representativeness
  const filteredGroups = state.panel3.measure === 'Representativeness'
    ? metadata.all_demographic_groups
    : metadata.all_demographic_groups.filter(g => g !== 'White' && g !== 'Male');
  const groupControl = createDropdown(
    'Demographic Group',
    filteredGroups,
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
      AND demographic_group = '${state.panel3.demographic_group}'
      AND value IS NOT NULL
    ORDER BY state
  `;

  const data = await query(sql);

  if (data.length === 0) {
    vizEl.innerHTML = '<div class="loading">No data for selection</div>';
    return;
  }

  // Determine reference group for panel 3
  const panel3ReferenceGroup = getReferenceGroup(state.panel3.demographic_group);

  // Fetch the hex tile GeoJSON
  const hexGeoJSON = await fetch('https://raw.githubusercontent.com/holtzy/The-Python-Graph-Gallery/master/static/data/us_states_hexgrid.geojson.json')
    .then(response => response.json());

  // Create a map of state values
  const stateValueMap = {};
  data.forEach(d => {
    stateValueMap[d.state] = {
      value: d.value,
      coalesced_n: d.coalesced_n
    };
  });

  // Calculate dynamic color scale based on data
  const values3 = data.map(d => d.value).filter(v => v != null);
  const minValue = Math.min(...values3);
  const maxValue = Math.max(...values3);
  const decimals3 = getDynamicDecimals(values3);

  const midpoint = 0;
  let colorScale;

  if (minValue < midpoint && maxValue > midpoint) {
    // Data crosses zero: use symmetric scale with blue-grey-pink
    const x = Math.max(Math.abs(minValue), Math.abs(maxValue));
    colorScale = d3.scaleLinear()
      .domain([-x, 0, x])
      .range(['#008EFF', '#EBF0F4', '#961046']);
  } else if (minValue >= midpoint) {
    // All values >= 0: use grey to pink scale
    const upperBound = maxValue === 0 ? 1 : maxValue;
    colorScale = d3.scaleLinear()
      .domain([0, upperBound])
      .range(['#EBF0F4', '#961046']);
  } else {
    // All values <= 0: use blue to grey scale
    const lowerBound = minValue === 0 ? -1 : minValue;
    colorScale = d3.scaleLinear()
      .domain([lowerBound, 0])
      .range(['#008EFF', '#EBF0F4']);
  }

  // Create SVG with D3
  const containerWidth = vizEl.clientWidth || 1400;
  const width = containerWidth;
  const height = 600;

  const svg = d3.create('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', [0, 0, width, height]);

  // Create a projection for the hex map
  const projection = d3.geoMercator()
    .fitSize([width - 200, height - 100], hexGeoJSON);

  const path = d3.geoPath().projection(projection);

  // Create tooltip div
  const tooltip = d3.select(vizEl)
    .append('div')
    .attr('class', 'map-tooltip');

  // Draw hexagons
  const hexagons = svg.append('g')
    .selectAll('path')
    .data(hexGeoJSON.features)
    .join('path')
    .attr('d', path)
    .attr('fill', d => {
      const stateAbbr = d.properties.iso3166_2;
      const stateData = stateValueMap[stateAbbr];
      return stateData ? colorScale(stateData.value) : '#333';
    })
    .attr('stroke', '#ffffff')
    .attr('stroke-width', 2)
    .style('cursor', 'pointer')
    .on('mouseover', function(event, d) {
      const stateAbbr = d.properties.iso3166_2;
      const stateName = STATE_NAMES[stateAbbr] || d.properties.google_name || stateAbbr;
      const stateData = stateValueMap[stateAbbr];

      let tooltipText = `<strong>${stateName}</strong>`;
      if (stateData) {
        const tooltipMessage = FAIRNESS_MESSAGES[state.panel3.measure]
          ? FAIRNESS_MESSAGES[state.panel3.measure](stateName, state.panel3.demographic_group, stateData.value, panel3ReferenceGroup)
          : '';
        // Replace the value in the message with dynamically rounded version (use absolute value)
        const roundedMessage = tooltipMessage.replace(/(\d+\.\d+)/, Math.abs(stateData.value).toFixed(decimals3));
        tooltipText += `<br><br>${roundedMessage}<br>(Sample size: ${stateData.coalesced_n.toLocaleString()})`;
      } else {
        tooltipText += `<br>No data available`;
      }

      tooltip
        .style('display', 'block')
        .style('left', (event.clientX + 15) + 'px')
        .style('top', (event.clientY + 15) + 'px')
        .html(tooltipText);

      d3.select(this)
        .attr('stroke', '#000000')
        .attr('stroke-width', 3);
    })
    .on('mousemove', function(event) {
      tooltip
        .style('left', (event.clientX + 15) + 'px')
        .style('top', (event.clientY + 15) + 'px');
    })
    .on('mouseout', function() {
      tooltip.style('display', 'none');
      d3.select(this)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 2);
    });

  // Get theme-aware text color for title and legend
  const textColor = getComputedStyle(document.documentElement).getPropertyValue('--color-text').trim();

  // Add state labels - always use dark text for readability on colored hexagons
  svg.append('g')
    .attr('class', 'state-labels')
    .selectAll('text')
    .data(hexGeoJSON.features)
    .join('text')
    .attr('transform', d => {
      const centroid = path.centroid(d);
      return `translate(${centroid[0]}, ${centroid[1]})`;
    })
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')
    .attr('font-size', '12px')
    .attr('font-weight', 'bold')
    .attr('fill', d => {
      const stateAbbr = d.properties.iso3166_2;
      const stateData = stateValueMap[stateAbbr];
      // Always use dark text on colored hexagons for contrast
      if (stateData) {
        return '#000000';
      }
      // For states without data (dark gray), use white text
      return '#ffffff';
    })
    .attr('pointer-events', 'none')
    .text(d => d.properties.iso3166_2);

  // Add color legend
  const legendWidth = 20;
  const legendHeight = 200;
  const legendX = width - 120;
  const legendY = 50;

  // For the legend axis, use only min and max (first and last elements of domain)
  const colorDomain = colorScale.domain();
  const legendScale = d3.scaleLinear()
    .domain([colorDomain[0], colorDomain[colorDomain.length - 1]])
    .range([legendHeight, 0]);

  const legendAxis = d3.axisRight(legendScale)
    .ticks(5)
    .tickFormat(d3.format('.2f'));

  const defs = svg.append('defs');
  const linearGradient = defs.append('linearGradient')
    .attr('id', 'legend-gradient')
    .attr('x1', '0%')
    .attr('y1', '100%')
    .attr('x2', '0%')
    .attr('y2', '0%');

  const numStops = 10;
  const domain = colorScale.domain();
  for (let i = 0; i <= numStops; i++) {
    const t = i / numStops;
    // Interpolate from min (bottom of gradient, offset 0%) to max (top of gradient, offset 100%)
    const value = domain[0] + t * (domain[domain.length - 1] - domain[0]);
    linearGradient.append('stop')
      .attr('offset', `${t * 100}%`)
      .attr('stop-color', colorScale(value));
  }

  svg.append('rect')
    .attr('x', legendX)
    .attr('y', legendY)
    .attr('width', legendWidth)
    .attr('height', legendHeight)
    .style('fill', 'url(#legend-gradient)');

  const borderColor = getComputedStyle(document.documentElement).getPropertyValue('--color-border').trim();

  svg.append('g')
    .attr('transform', `translate(${legendX + legendWidth}, ${legendY})`)
    .call(legendAxis)
    .call(g => g.selectAll('text').attr('fill', textColor))
    .call(g => g.selectAll('line').attr('stroke', borderColor))
    .call(g => g.select('.domain').attr('stroke', borderColor));

  svg.append('text')
    .attr('x', legendX + legendWidth / 2)
    .attr('y', legendY - 10)
    .attr('text-anchor', 'middle')
    .attr('font-size', '12px')
    .attr('fill', textColor)
    .text('Fairness violation');

  // Add title
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', 30)
    .attr('text-anchor', 'middle')
    .attr('font-size', '16px')
    .attr('font-weight', 'bold')
    .attr('fill', textColor)
    .text(`${state.panel3.measure} by state — ${state.panel3.demographic_group}, ${state.panel3.year}`);

  vizEl.appendChild(svg.node());

  // Get definition for selected measure
  const definition3 = FAIRNESS_DEFINITIONS[state.panel3.measure] || 'Definition not available.';

  // Get data source
  const dataSource3 = getDataSources([state.panel3.measure]);

  captionEl.innerHTML = `
    <div class="caption-section">
      <strong>About the selected fairness measure:</strong>
    </div>
    <p class="caption-definition"><strong>${state.panel3.measure}:</strong> ${definition3}</p>
    <div class="caption-note">
      Note: ${state.panel3.measure === 'Representativeness' ? 'Representativeness is shown as levels.' : `All values are differences relative to ${panel3ReferenceGroup} (reference group).`}
    </div>
    <div class="caption-source">
      ${dataSource3}
    </div>
  `;
}
