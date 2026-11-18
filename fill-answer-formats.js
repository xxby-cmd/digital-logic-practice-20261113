// These comparators preserve an answer's structure. They do not decide arbitrary
// C equivalence or replace the existing text/number grading rules.

const cWhitespace = /[ \t\n\r\v\f]/;
const identifierStart = /[A-Za-z_]/;
const identifierPart = /[A-Za-z0-9_]/;
const ppNumber = /^(?:[0-9]|\.[0-9])(?:(?:[eEpP][+-])|[A-Za-z0-9_.])*/;
const cPunctuators = [
  '%:%:', '>>=', '<<=', '...', '->', '++', '--', '<<', '>>', '<=',
  '>=', '==', '!=', '&&', '||', '*=', '/=', '%=', '+=', '-=', '&=',
  '^=', '|=', '##', '<:', ':>', '<%', '%>', '%:',
  '[', ']', '(', ')', '{', '}', '.', '&', '*', '+', '-', '~', '!',
  '/', '%', '<', '>', '^', '|', '?', ':', ';', '=', ',',
  '#',
];
const literalPrefixes = ['u8"', 'L"', 'u"', 'U"', '"', "L'", "u'", "U'", "'"];

function answerText(value) {
  if (typeof value === 'string') return value;
  if (typeof value === 'bigint') return String(value);
  if (typeof value === 'number' && Number.isSafeInteger(value)) return String(value);
  return null;
}

/**
 * Tokenize the spelling of a C fragment, without macro expansion or expression
 * evaluation. ASCII identifiers, preprocessing numbers, C punctuators and
 * quoted literals are supported. Unsupported or incomplete spellings return
 * null. Tokens keep their case and spelling, including literal contents.
 */
export function tokenizeCFragment(value) {
  let source = answerText(value);
  if (source === null || source.includes('\0')) return null;

  // Physical line endings are normalized first. Phase-2 line splicing must
  // precede phase-3 comment recognition: a continued // comment stays a comment,
  // and a splice may form a comment delimiter or a single identifier.
  source = source.replace(/\r\n?/g, '\n').replace(/\\\n/g, '');
  const tokens = [];
  let offset = 0;
  while (offset < source.length) {
    const ch = source[offset];
    if (cWhitespace.test(ch)) {
      offset += 1;
      continue;
    }
    if (source.startsWith('//', offset)) {
      const end = source.indexOf('\n', offset + 2);
      offset = end < 0 ? source.length : end;
      continue;
    }
    if (source.startsWith('/*', offset)) {
      const end = source.indexOf('*/', offset + 2);
      if (end < 0) return null;
      offset = end + 2;
      continue;
    }

    const literalPrefix = literalPrefixes.find(prefix => source.startsWith(prefix, offset));
    if (literalPrefix !== undefined) {
      const start = offset;
      const quote = literalPrefix[literalPrefix.length - 1];
      offset += literalPrefix.length;
      const contentStart = offset;
      let closed = false;
      while (offset < source.length) {
        if (source[offset] === '\n') return null;
        if (source[offset] === '\\') {
          if (offset + 1 >= source.length || source[offset + 1] === '\n') return null;
          offset += 2;
          continue;
        }
        if (source[offset] === quote) {
          if (quote === "'" && offset === contentStart) return null;
          offset += 1;
          closed = true;
          break;
        }
        offset += 1;
      }
      if (!closed) return null;
      tokens.push({kind: quote === '"' ? 'string' : 'character', text: source.slice(start, offset)});
      continue;
    }

    if (identifierStart.test(ch)) {
      const start = offset++;
      while (offset < source.length && identifierPart.test(source[offset])) offset += 1;
      tokens.push({kind: 'identifier', text: source.slice(start, offset)});
      continue;
    }
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(source[offset + 1] ?? ''))) {
      const number = source.slice(offset).match(ppNumber)[0];
      tokens.push({kind: 'number', text: number});
      offset += number.length;
      continue;
    }
    const punctuator = cPunctuators.find(item => source.startsWith(item, offset));
    if (punctuator === undefined) return null;
    tokens.push({kind: 'punctuator', text: punctuator});
    offset += punctuator.length;
  }
  return tokens.length === 0 ? null : tokens;
}

function numericSpelling(value) {
  const text = answerText(value);
  if (text === null) return null;
  // Map only numeric presentation characters. Broad NFKC would also turn
  // unrelated characters such as superscript digits into an extra integer.
  return text
    .replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/[＋]/g, '+')
    .replace(/[－−–]/g, '-')
    .replace(/[，]/g, ',')
    .replace(/[（]/g, '(')
    .replace(/[）]/g, ')')
    .replace(/[［]/g, '[')
    .replace(/[］]/g, ']')
    .replace(/[｛]/g, '{')
    .replace(/[｝]/g, '}');
}

/**
 * Parse a nonempty decimal integer list. Delimiters are either commas (with
 * optional surrounding whitespace) or whitespace, never a mixture of both.
 * Wrapper and separator family are returned so each expected alias controls
 * its own allowed presentation. Integer values stay exact as BigInts.
 */
export function parseIntegerSequence(value) {
  const spelling = numericSpelling(value);
  if (spelling === null) return null;
  let source = spelling.trim();
  if (!source) return null;
  let wrapper = 'none';
  const closing = {'(': ')', '[': ']', '{': '}'};
  if (Object.hasOwn(closing, source[0])) {
    const open = source[0];
    if (source[source.length - 1] !== closing[open]) return null;
    wrapper = open + closing[open];
    source = source.slice(1, -1).trim();
    if (!source) return null;
  }

  const elements = [];
  let separatorFamily = 'none';
  let offset = 0;
  while (offset < source.length) {
    const integer = source.slice(offset).match(/^[+-]?[0-9]+/);
    if (integer === null) return null;
    elements.push(BigInt(integer[0]));
    offset += integer[0].length;
    if (offset === source.length) break;

    const beforeWhitespace = offset;
    while (offset < source.length && /\s/.test(source[offset])) offset += 1;
    const hasWhitespace = offset !== beforeWhitespace;
    if (offset === source.length) break;
    if (source[offset] === ',') {
      if (separatorFamily === 'whitespace') return null;
      separatorFamily = 'comma';
      offset += 1;
      while (offset < source.length && /\s/.test(source[offset])) offset += 1;
      if (offset === source.length) return null;
    } else if (hasWhitespace) {
      if (separatorFamily === 'comma') return null;
      separatorFamily = 'whitespace';
    } else {
      return null;
    }
  }
  return {wrapper, separatorFamily, elements};
}

/**
 * Compare one actual fill answer with one explicitly allowed expected alias.
 * Unknown formats return null so the caller can retain its legacy fallback.
 */
export function formattedFillEqual(format, actual, expected) {
  if (format === 'literal-string') {
    return typeof actual === 'string' && typeof expected === 'string' && actual === expected;
  }
  if (format === 'c-tokens') {
    const left = tokenizeCFragment(actual);
    const right = tokenizeCFragment(expected);
    return left !== null && right !== null && left.length === right.length
      && left.every((token, index) => token.kind === right[index].kind && token.text === right[index].text);
  }
  if (format !== 'integer-sequence' && format !== 'integer-set') return null;
  const left = parseIntegerSequence(actual);
  const right = parseIntegerSequence(expected);
  if (left === null || right === null || left.wrapper !== right.wrapper
      || left.separatorFamily !== right.separatorFamily || left.elements.length !== right.elements.length) return false;
  if (format === 'integer-sequence') return left.elements.every((value, index) => value === right.elements[index]);
  const leftSet = new Set(left.elements);
  const rightSet = new Set(right.elements);
  return leftSet.size === left.elements.length && rightSet.size === right.elements.length
    && left.elements.every(value => rightSet.has(value));
}
