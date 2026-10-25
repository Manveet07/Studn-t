/* ============================================================
   animatedCheckbox.js — Custom Animated Checkbox Component (Polished)
   The "satisfying tick" interaction:
   1. Box scales up slightly on check (spring bounce)
   2. Border draws in via stroke-dashoffset animation
   3. Background fills with --state-good at low opacity

   Uses --ease-spring for the pop feel.

   Dependencies: NONE (imports tokens via CSS)
   ============================================================ */

/**
 * Initialize all <label class="pd-checkbox"> elements on the page.
 */
export function initAnimatedCheckboxes() {
  const checkboxes = document.querySelectorAll('.pd-checkbox');

  checkboxes.forEach((label) => {
    const input = label.querySelector('.pd-checkbox__input');
    if (!input) return;

    // Remove old listener by cloning (safe re-init)
    const newInput = input.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);

    newInput.addEventListener('change', () => {
      if (newInput.checked) {
        label.classList.add('pd-checkbox--checked');
        // Add pop, then settle
        const box = label.querySelector('.pd-checkbox__box');
        if (box) {
          box.style.transform = 'scale(1.2)';
          setTimeout(() => { box.style.transform = ''; }, 200);
        }
      } else {
        label.classList.remove('pd-checkbox--checked');
      }
    });
  });
}

/**
 * Create a single animated checkbox element programmatically.
 * @param {string} value
 * @param {string} label
 * @param {string} [name]
 * @returns {HTMLElement}
 */
export function createCheckbox(value, label, name) {
  const el = document.createElement('label');
  el.className = 'pd-checkbox';
  el.setAttribute('data-value', value);

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.className = 'pd-checkbox__input';
  input.value = value;
  if (name) input.name = name;

  const box = document.createElement('span');
  box.className = 'pd-checkbox__box';
  box.innerHTML = `
    <svg class="pd-checkbox__check" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path class="pd-checkbox__check-path" d="M3 8.5 L6.5 12 L13 4"/>
    </svg>
  `;

  const labelText = document.createElement('span');
  labelText.className = 'pd-checkbox__label';
  labelText.textContent = label;

  el.appendChild(input);
  el.appendChild(box);
  el.appendChild(labelText);

  // Wire up checked class with pop animation
  input.addEventListener('change', () => {
    if (input.checked) {
      el.classList.add('pd-checkbox--checked');
      box.style.transform = 'scale(1.2)';
      setTimeout(() => { box.style.transform = ''; }, 200);
    } else {
      el.classList.remove('pd-checkbox--checked');
    }
  });

  return el;
}

/**
 * Get all checked values from a group of checkboxes.
 * @param {HTMLElement} container
 * @returns {string[]}
 */
export function getCheckedValues(container) {
  const inputs = container.querySelectorAll('.pd-checkbox__input:checked');
  return Array.from(inputs).map((input) => input.value);
}
