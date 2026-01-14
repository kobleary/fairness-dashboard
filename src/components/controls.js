export function createDropdown(label, options, value, onChange) {
  const container = document.createElement('div');
  container.className = 'control-group';

  const labelEl = document.createElement('label');
  labelEl.textContent = label;
  container.appendChild(labelEl);

  const select = document.createElement('select');
  options.forEach(opt => {
    const option = document.createElement('option');
    option.value = opt;
    option.textContent = opt;
    if (opt === value) {
      option.selected = true;
    }
    select.appendChild(option);
  });

  select.addEventListener('change', (e) => onChange(e.target.value));
  container.appendChild(select);

  return container;
}
