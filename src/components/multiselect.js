export function createMultiSelect(label, options, selectedValues, onChange, showInfo = false) {
  const container = document.createElement('div');
  container.className = 'control-group';

  const labelEl = document.createElement('label');
  labelEl.textContent = label;

  if (showInfo) {
    const infoIcon = document.createElement('span');
    infoIcon.className = 'info-icon';
    infoIcon.textContent = 'i';

    const tooltip = document.createElement('div');
    tooltip.className = 'info-tooltip';
    tooltip.innerHTML = `
      <p><strong>All measures (except representativeness) are depicted as differences relative to a reference demographic group. For race/ethnicity, the reference group is White applicants or borrowers. For gender, the reference group is male applicants or borrowers.</strong></p>
      <p><strong>Statistical parity:</strong> difference in denial rates</p>
      <p><strong>Predictive parity:</strong> difference in default rates</p>
      <p><strong>Conditional statistical parity:</strong> conditional difference in denial rates</p>
      <p><strong>Representativeness:</strong> amount of under-representation among approved borrowers</p>
      <p><strong>Equality of opportunity:</strong> difference in denial rates among creditworthy borrowers</p>
      <p><strong>Equality of goodwill:</strong> difference in denial rates among non-creditworthy borrowers</p>
      <p><strong>Marginal outcome test:</strong> differences in lending standards</p>
    `;
    infoIcon.appendChild(tooltip);
    labelEl.appendChild(infoIcon);
  }

  container.appendChild(labelEl);

  const multiselectContainer = document.createElement('div');
  multiselectContainer.className = 'multiselect-container';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'multiselect-input';
  input.placeholder = 'Type to search...';
  multiselectContainer.appendChild(input);

  const chipsContainer = document.createElement('div');
  chipsContainer.className = 'multiselect-chips';
  multiselectContainer.appendChild(chipsContainer);

  const dropdown = document.createElement('div');
  dropdown.className = 'multiselect-dropdown';
  multiselectContainer.appendChild(dropdown);

  let currentOptions = [...options];
  let selected = new Set(selectedValues);

  const renderChips = () => {
    chipsContainer.innerHTML = '';
    selected.forEach(value => {
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.innerHTML = `${value} <span class="chip-remove">&times;</span>`;
      chip.querySelector('.chip-remove').addEventListener('click', () => {
        selected.delete(value);
        renderChips();
        renderDropdown();
        onChange(Array.from(selected));
      });
      chipsContainer.appendChild(chip);
    });
  };

  const renderDropdown = (filter = '') => {
    dropdown.innerHTML = '';
    const filtered = currentOptions.filter(opt =>
      opt.toLowerCase().includes(filter.toLowerCase()) && !selected.has(opt)
    );

    if (filtered.length === 0) {
      dropdown.classList.remove('show');
      return;
    }

    filtered.forEach(opt => {
      const option = document.createElement('div');
      option.className = 'multiselect-option';
      option.textContent = opt;
      option.addEventListener('click', () => {
        selected.add(opt);
        input.value = '';
        renderChips();
        renderDropdown();
        onChange(Array.from(selected));
      });
      dropdown.appendChild(option);
    });

    dropdown.classList.add('show');
  };

  input.addEventListener('input', (e) => {
    renderDropdown(e.target.value);
  });

  input.addEventListener('focus', () => {
    renderDropdown(input.value);
  });

  input.addEventListener('blur', () => {
    setTimeout(() => dropdown.classList.remove('show'), 200);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && input.value === '' && selected.size > 0) {
      const lastItem = Array.from(selected).pop();
      selected.delete(lastItem);
      renderChips();
      renderDropdown();
      onChange(Array.from(selected));
    }
  });

  renderChips();
  container.appendChild(multiselectContainer);

  return container;
}
