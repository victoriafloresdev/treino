// Ícones Phosphor (sprite em icons/sprite.svg, gerado por tools/icones.py).
// Decorativos por padrão; para ícone sozinho num botão, dê aria-label ao botão.
export const icon = (name, cls = '') => `<svg class="ic ${cls}" aria-hidden="true" focusable="false"><use href="icons/sprite.svg#i-${name}"></use></svg>`;
