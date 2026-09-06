/**
 * eslint-plugin-dahab-rtl
 *
 * RTL is the layout model, not a feature (see CLAUDE.md). This plugin makes the
 * physical-direction escape hatches unavailable at lint time, in three places
 * they actually show up:
 *
 *   1. style object keys      { marginLeft: 8 }        -> marginStart
 *   2. NativeWind class names "ml-2 pr-4 text-left"    -> ms-2 pe-4 text-start
 *   3. textAlign literals     textAlign: 'left'        -> 'auto'
 */

/** Physical style keys -> the logical property that replaces them. */
const PHYSICAL_STYLE_KEYS = {
  marginLeft: 'marginStart',
  marginRight: 'marginEnd',
  paddingLeft: 'paddingStart',
  paddingRight: 'paddingEnd',
  borderLeftWidth: 'borderStartWidth',
  borderRightWidth: 'borderEndWidth',
  borderLeftColor: 'borderStartColor',
  borderRightColor: 'borderEndColor',
  borderTopLeftRadius: 'borderTopStartRadius',
  borderTopRightRadius: 'borderTopEndRadius',
  borderBottomLeftRadius: 'borderBottomStartRadius',
  borderBottomRightRadius: 'borderBottomEndRadius',
  left: 'start',
  right: 'end',
};

/** CSS (web / admin) physical properties -> logical equivalents. */
const PHYSICAL_CSS_PROPERTIES = {
  'margin-left': 'margin-inline-start',
  'margin-right': 'margin-inline-end',
  'padding-left': 'padding-inline-start',
  'padding-right': 'padding-inline-end',
  'border-left': 'border-inline-start',
  'border-right': 'border-inline-end',
};

/**
 * Tailwind / NativeWind physical utilities -> logical utilities.
 * Matched as whole tokens so `ml-2` trips but `html-2` or `small-2` do not.
 */
const PHYSICAL_CLASS_PREFIXES = [
  ['ml', 'ms'],
  ['mr', 'me'],
  ['pl', 'ps'],
  ['pr', 'pe'],
  ['border-l', 'border-s'],
  ['border-r', 'border-e'],
  ['rounded-l', 'rounded-s'],
  ['rounded-r', 'rounded-e'],
  ['left', 'start'],
  ['right', 'end'],
];

const PHYSICAL_CLASS_EXACT = {
  'text-left': 'text-start',
  'text-right': 'text-end',
};

const CLASS_ATTRIBUTES = new Set(['className', 'class', 'tw', 'containerClassName']);

/** Build one regex that finds any physical utility token inside a class string. */
const classTokenPattern = new RegExp(
  '(?:^|\s)((?:[a-z-]+:)*)(' +
    PHYSICAL_CLASS_PREFIXES.map(([bad]) => bad).join('|') +
    ')(-[^\s]+)(?=\s|$)',
  'g',
);

function checkClassString(context, node, raw) {
  for (const [bad, good] of Object.entries(PHYSICAL_CLASS_EXACT)) {
    if (new RegExp(`(?:^|\s)(?:[a-z-]+:)*${bad}(?=\s|$)`).test(raw)) {
      context.report({ node, messageId: 'physicalClass', data: { bad, good } });
    }
  }

  classTokenPattern.lastIndex = 0;
  let match;
  while ((match = classTokenPattern.exec(raw)) !== null) {
    const prefix = match[2];
    const suffix = match[3];
    const replacement = PHYSICAL_CLASS_PREFIXES.find(([bad]) => bad === prefix);
    if (!replacement) continue;
    context.report({
      node,
      messageId: 'physicalClass',
      data: { bad: `${prefix}${suffix}`, good: `${replacement[1]}${suffix}` },
    });
  }
}

/** Read the static text of a string literal or a template literal with no holes. */
function staticText(node) {
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node.type === 'TemplateLiteral') {
    return node.quasis.map((q) => q.value.cooked ?? '').join(' ');
  }
  return null;
}

const noPhysicalProperties = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Ban physical direction properties, utilities and textAlign values; require logical equivalents.',
    },
    schema: [],
    messages: {
      physicalStyleKey:
        '`{{bad}}` is a physical property and breaks RTL. Use `{{good}}` instead (CLAUDE.md: RTL is the layout model).',
      physicalCssProperty:
        '`{{bad}}` is a physical CSS property and breaks RTL. Use `{{good}}` instead.',
      physicalClass:
        '`{{bad}}` is a physical utility and breaks RTL. Use `{{good}}` instead.',
      physicalTextAlign:
        "textAlign must be 'auto' (or 'center'/'justify'), never '{{bad}}' — '{{bad}}' pins text to a physical edge and does not mirror.",
    },
  },

  create(context) {
    function keyName(property) {
      if (property.type !== 'Property') return null;
      const key = property.key;
      if (!property.computed && key.type === 'Identifier') return key.name;
      if (key.type === 'Literal' && typeof key.value === 'string') return key.value;
      return null;
    }

    return {
      Property(node) {
        const name = keyName(node);
        if (name === null) return;

        const logical = PHYSICAL_STYLE_KEYS[name];
        if (logical !== undefined) {
          context.report({
            node: node.key,
            messageId: 'physicalStyleKey',
            data: { bad: name, good: logical },
          });
          return;
        }

        const cssLogical = PHYSICAL_CSS_PROPERTIES[name];
        if (cssLogical !== undefined) {
          context.report({
            node: node.key,
            messageId: 'physicalCssProperty',
            data: { bad: name, good: cssLogical },
          });
          return;
        }

        if (name === 'textAlign') {
          const value = node.value;
          if (
            value.type === 'Literal' &&
            (value.value === 'left' || value.value === 'right')
          ) {
            context.report({
              node: value,
              messageId: 'physicalTextAlign',
              data: { bad: value.value },
            });
          }
        }
      },

      JSXAttribute(node) {
        if (node.name.type !== 'JSXIdentifier') return;
        if (!CLASS_ATTRIBUTES.has(node.name.name)) return;
        const value = node.value;
        if (value === null) return;

        if (value.type === 'Literal') {
          const text = staticText(value);
          if (text !== null) checkClassString(context, value, text);
          return;
        }
        if (value.type === 'JSXExpressionContainer') {
          const expression = value.expression;
          const text = staticText(expression);
          if (text !== null) checkClassString(context, expression, text);
        }
      },
    };
  },
};

export default {
  meta: { name: 'eslint-plugin-dahab-rtl', version: '0.1.0' },
  rules: { 'no-physical-properties': noPhysicalProperties },
};
