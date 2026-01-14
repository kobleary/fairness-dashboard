export function createMultiSelect(label, options, selectedValues, onChange) {
  const container = document.createElement('div');
  container.className = 'control-group';

  const labelEl = document.createElement('label');
  labelEl.textContent = label;
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
