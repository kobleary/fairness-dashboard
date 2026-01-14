export function createTabs(tabs, activeTab, onTabChange) {
  const container = document.createElement('div');
  container.id = 'tabs';

  tabs.forEach(tab => {
    const button = document.createElement('button');
    button.className = 'tab' + (tab.id === activeTab ? ' active' : '');
    button.textContent = tab.label;
    button.addEventListener('click', () => onTabChange(tab.id));
    container.appendChild(button);
  });

  return container;
}
