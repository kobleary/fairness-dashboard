export function createDropdown(label, options, value, onChange, isStateDropdown = false) {
  const container = document.createElement('div');
  container.className = 'control-group';

  const labelEl = document.createElement('label');
  labelEl.textContent = label;
  container.appendChild(labelEl);

  const select = document.createElement('select');

  // Sort options with U.S. at top for state dropdowns
  let sortedOptions = [...options];
  if (isStateDropdown) {
    sortedOptions = sortedOptions.sort((a, b) => {
      if (a === 'U.S.') return -1;
      if (b === 'U.S.') return 1;
      return a.localeCompare(b);
    });
  }

  sortedOptions.forEach(opt => {
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
