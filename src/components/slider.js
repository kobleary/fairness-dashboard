export function createYearRangeSlider(minYear, maxYear, currentMin, currentMax, onChange) {
  const container = document.createElement('div');
  container.className = 'control-group';

  const label = document.createElement('label');
  label.textContent = 'Year Range';
  container.appendChild(label);

  const sliderContainer = document.createElement('div');
  sliderContainer.className = 'slider-container';

  const valuesDiv = document.createElement('div');
  valuesDiv.className = 'slider-values';
  valuesDiv.innerHTML = `<span id="year-min">${currentMin}</span><span id="year-max">${currentMax}</span>`;
  sliderContainer.appendChild(valuesDiv);

  const minSlider = document.createElement('input');
  minSlider.type = 'range';
  minSlider.min = minYear;
  minSlider.max = maxYear;
  minSlider.value = currentMin;
  minSlider.className = 'slider-min';

  const maxSlider = document.createElement('input');
  maxSlider.type = 'range';
  maxSlider.min = minYear;
  maxSlider.max = maxYear;
  maxSlider.value = currentMax;
  maxSlider.className = 'slider-max';

  let debounceTimer;
  const updateValues = () => {
    const min = parseInt(minSlider.value);
    const max = parseInt(maxSlider.value);

    if (min > max) {
      if (document.activeElement === minSlider) {
        minSlider.value = max;
      } else {
        maxSlider.value = min;
      }
    }

    document.getElementById('year-min').textContent = minSlider.value;
    document.getElementById('year-max').textContent = maxSlider.value;

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      onChange(parseInt(minSlider.value), parseInt(maxSlider.value));
    }, 100);
  };

  minSlider.addEventListener('input', updateValues);
  maxSlider.addEventListener('input', updateValues);

  sliderContainer.appendChild(minSlider);
  sliderContainer.appendChild(maxSlider);
  container.appendChild(sliderContainer);

  return container;
}
