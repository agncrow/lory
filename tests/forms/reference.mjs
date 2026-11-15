// What Lory's forms (packages/lory/forms.co) and editors (editors.co) are
// held to, number for number, as the libraries they follow answer it:
//
//   vuetify 4.3.3        masks (useMask: mask, unmask, isValid, isComplete),
//                        the filter of an autocomplete (filterItems, and
//                        useFilter for the order of filtered-order="prefix",
//                        run outside a component on Vue's reactivity), a number
//                        input's text (formatNumber, extractNumber and
//                        processPlainInput, en-US) and a file's size
//                        (humanReadableFileSize)
//   semantic-ui-form 2.5.0 (with jquery 3.7.1, in jsdom 26.1.0)
//                        a form's rules, each field checked through the
//                        form's own `is valid` behaviour, its value trimmed
//                        and its bracketed value read as the form reads it
//   commonmark 0.31.2    the tree of a Markdown text, for the part of
//                        CommonMark Lory's preview draws
//   (the 7GUIs temperature converter of Vue's examples is two lines of
//   JavaScript: the other field is String(+text * (9 / 5) + 32), or
//   String((+text - 32) * (5 / 9)), as JavaScript computes and writes it)
//
// Run with a pinned install, from a scratch folder (never Lory's own):
//   npm install --prefix <scratch>/ref vuetify@4.3.3 vue@3.5.24 \
//       semantic-ui-form@2.5.0 jquery@3.7.1 jsdom@26.1.0 commonmark@0.31.2
//   LORY_REF=<scratch>/ref node tests/forms/reference.mjs
// It writes tests/forms/reference.json beside it.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const ref = process.env.LORY_REF;
if (!ref) throw new Error('LORY_REF: the folder the pinned libraries are installed in');
const lib = `${ref}/node_modules/vuetify/lib`;
const { useMask } = await import(`${lib}/composables/mask/mask.js`);
const { filterItems, useFilter } = await import(`${lib}/composables/filter.js`);
const { formatNumber } = await import(`${lib}/components/VNumberInput/format.js`);
const { processPlainInput } = await import(`${lib}/components/VNumberInput/typing.js`);
const { extractNumber, humanReadableFileSize } = await import(`${lib}/util/helpers.js`);
const require = createRequire(`${ref}/package.json`);

// ---- masks ----

const masks = [
    '(###) ###-####', '##/##/####', '####-##-##', '##:##', '#### #### #### ####',
    '###-##-####', 'AAA-###', 'aa-nn', 'NNNN NNNN', 'X#X', '\\#####', '+1 (###) ###',
];
const maskTexts = [
    '', '5551234567', '555-123-4567', '(555) 123-4567', '(555', '55512', 'abc5551234567',
    '12/31/1999', '12311999', '1999-12-31', '19991231', '0930', '9:30', '4111111111111111',
    '4111 1111 1111 1111', '123456789', 'abc123', 'ABC123', 'aB-1z', 'a1b2c3d4', '  12  34 ',
    '-5-', '#12345', '12345', '+1 (555) 123', 'x9y', '1a2b',
];
const maskCases = [];
for (const mask of masks) {
    const m = useMask({ mask });
    for (const text of maskTexts) {
        maskCases.push({
            mask, text,
            masked: m.mask(text),
            unmasked: m.unmask(text),
            valid: m.isValid(text),
            complete: m.isComplete(text),
        });
    }
}

// ---- an autocomplete's filter ----

const items = ['Apple', 'Pineapple', 'apple pie', 'Crab apple', 'Grape', 'Grapefruit', 'Banana',
    'Applesauce', 'Red-apple', 'APPLE', 'Pear', 'Papaya', 'Plum', 'Apricot', 'Snapple', 'apple'];
const queries = ['', 'apple', 'APP', 'ap', 'pe', 'a', 'grape', 'zz', 'le p', 'r', 'pple', 'Apple'];
const filterCases = [];
for (const query of queries) {
    const found = filterItems(items, query).map(r => r.index);
    const ranges = filterItems(items, query).map(r => r.matches.title ?? []);
    // the order an autocomplete lists them in with filtered-order="prefix"
    // (useFilter's: its watchEffect runs once, at once, outside a component;
    // the items are all different, so each is found by its words)
    const sorted = useFilter({ filterMode: 'intersection', filteredOrder: 'prefix' }, items, query);
    const ordered = sorted.filteredItems.value.map(item => items.indexOf(item));
    filterCases.push({ query, found, ordered, ranges });
}

// ---- a number input's text ----

const numberValues = [0, 1, -1, 1.5, 2.5, -2.5, 1.005, 0.125, 1.25, 12.345, 0.1, 0.30000000000000004, 1234567.891,
    99.995, -0.5, 0.000123, 1e-7, 123456789012, 7, 0.7, 2.675, 1.45, 8.345, 100];
const precisions = [null, 0, 1, 2, 3];
const formatCases = [];
for (const value of numberValues) {
    for (const precision of precisions) {
        formatCases.push({
            value, precision,
            text: formatNumber(value, {
                precision: precision ?? undefined, minFractionDigits: null, locale: 'en-US',
                useGrouping: false, decimalSeparator: '.', groupSeparator: ',',
            }),
        });
    }
}
const extractTexts = ['', '12', '-12', '1-2', '--3', '12.5', '1.2.3', '.5', '-.5', 'a1b2', '12.345',
    ' 4 2 ', '1e5', '+7', '0.000', '-', '.', '12.'];
const extractCases = [];
for (const text of extractTexts) {
    for (const precision of [null, 0, 2]) {
        extractCases.push({ text, precision, out: extractNumber(text, precision ?? undefined, '.') });
    }
}
// typing `data` with the caret at `start` (and the selection to `end`)
const typings = [
    ['5', '', 0, 0], ['5', '12', 2, 2], ['5', '12', 0, 0], ['-', '', 0, 0], ['-', '12', 2, 2],
    ['-', '12', 0, 0], ['.', '12', 2, 2], ['.', '1.2', 3, 3], ['5', '1.2', 3, 3], ['5', '1.25', 4, 4],
    ['a', '12', 2, 2], ['1a2', '', 0, 0], ['3.14159', '', 0, 0], ['9', '12', 0, 2], ['.', '', 0, 0],
    ['0', '-', 1, 1], ['7', '1.2', 1, 1],
];
const typingCases = [];
for (const [data, value, start, end] of typings) {
    for (const precision of [null, 0, 2]) {
        const got = processPlainInput(data, value, start, end, { decimalSeparator: '.', precision: precision ?? undefined, minusSign: '-' });
        let out;
        if (got === null) out = { how: 'as_typed' };
        else if (got === false) out = { how: 'refused' };
        else out = { how: 'changed', text: got.text, cursor: got.cursor };
        typingCases.push({ data, value, start, end, precision, ...out });
    }
}

// ---- a file's size ----

const sizes = [0, 1, 999, 1000, 1023, 1024, 1150, 1250, 1536, 1048576, 1500000, 2621440, 999999, 1073741824, 5e12];
const sizeCases = [];
for (const bytes of sizes) {
    for (const base of [1000, 1024]) {
        sizeCases.push({ bytes, base, text: humanReadableFileSize(bytes, base) });
    }
}

// ---- the temperature converter ----

const temperatures = ['0', '32', '100', '-40', '37', '36.6', '', ' 12 ', 'abc', '1e2', '0x10', '.5', '5.',
    '-0', '1/2', '98.6', '212', '-273.15', '1e21', '0.1', 'Infinity', '+3', '1_000'];
const temperatureCases = temperatures.map(text => ({
    text,
    fahrenheit: String(+text * (9 / 5) + 32),
    celsius: String((+text - 32) * (5 / 9)),
}));

// ---- a form's rules (Semantic UI) ----

const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
const $ = require('jquery');
$.fn.form = require('semantic-ui-form');

function passes(rule, value, other) {
    document.body.innerHTML = '<form class="ui form"><div class="field"><input name="f" type="text"></div><div class="field"><input name="other" type="text"></div></form>';
    $('[name="f"]').val(value);
    $('[name="other"]').val(other);
    const $form = $('.ui.form');
    $form.form({ fields: { f: { identifier: 'f', rules: [{ type: rule }] } } });
    return $form.form('is valid', 'f');
}
const ruleTries = [
    ['empty', ['', ' ', 'a', '  x  ']],
    ['email', ['a@b.co', 'a@b', 'A.B+c@Ex-ample.COM', 'a@-b.com', 'a@b-.com', 'a@b..c', '@b.co', 'a b@c.d', 'a@b.c.', ' a@b.co ', "o'neil@x.org", 'a@b_c.com', '']],
    ['url', ['http://x.co', 'https://www.ex.com/a?b', 'www.ex.com', 'ex.com', 'http://wwwx.com', 'http://www.x', 'see http://ab.cd now', 'ftp://x.co', 'http://x', 'HTTP://X.CO', 'http://w.co', 'http://ww.co', 'http://www.www.co', '']],
    ['integer', ['12', '-12', '1.0', '', ' 7 ', '+5', '007', 'a']],
    ['integer[1..10]', ['1', '10', '0', '11', '5', '-1', 'x', '']],
    ['integer[5]', ['5', '4', '6']],
    ['integer[..3]', ['3', '4', '-9']],
    ['integer[3..]', ['3', '2', '99']],
    ['integer[a..b]', ['3', 'x']],
    ['decimal', ['1.5', '1.', '.5', '12', '-1.5', '', 'a']],
    ['number', ['1.5', '-1', '.5', '', '1.', '-', '1e3', '-.5']],
    ['is[Yes]', ['yes', 'Yes', 'YES', 'no', '']],
    ['isExactly[Yes]', ['yes', 'Yes']],
    ['not[admin]', ['admin', 'Admin', 'root', '']],
    ['notExactly[admin]', ['admin', 'Admin']],
    ['contains[cat]', ['concatenate', 'CAT', 'dog', '']],
    ['containsExactly[cat]', ['concatenate', 'CAT']],
    ['doesntContain[cat]', ['concatenate', 'CAT', 'dog']],
    ['doesntContainExactly[cat]', ['concatenate', 'CAT', 'dog']],
    ['contains[a.b]', ['a.b', 'axb']],
    ['minLength[3]', ['ab', 'abc', '  ab  ', '']],
    ['length[3]', ['ab', 'abcd']],
    ['exactLength[4]', ['abcd', 'abc', 'abcde']],
    ['maxLength[4]', ['abcd', 'abcde', '']],
    ['regExp[/^[a-z]+$/]', ['abc', 'Abc', '']],
    ['regExp[/^[a-z]+$/i]', ['Abc', 'Ab1']],
    ['minCount[2]', ['a,b', 'a', '', 'a,b,c']],
    ['exactCount[2]', ['a,b', 'a', 'a,b,c']],
    ['exactCount[1]', ['a', '', 'a,b']],
    ['exactCount[0]', ['', 'a']],
    ['maxCount[2]', ['a,b', 'a,b,c', '']],
    ['maxCount[1]', ['a', 'a,b']],
    ['minCount[1]', ['', 'a']],
];
const ruleCases = [];
for (const [rule, values] of ruleTries) {
    for (const value of values) {
        ruleCases.push({ rule, value, other: '', passes: passes(rule, value, '') });
    }
}
for (const [value, other] of [['abc', 'abc'], ['abc', 'abd'], ['abc ', 'abc'], ['abc', 'abc '], ['', '']]) {
    ruleCases.push({ rule: 'match[other]', value, other, passes: passes('match[other]', value, other) });
    ruleCases.push({ rule: 'different[other]', value, other, passes: passes('different[other]', value, other) });
}

// ---- Markdown, as CommonMark reads it ----

const { Parser } = require('commonmark');
function tree(md) {
    const doc = new Parser().parse(md);
    function of(node) {
        const kids = [];
        for (let k = node.firstChild; k; k = k.next) kids.push(of(k));
        // (adjacent texts are one text: the tree's own split of a run of
        // words is no part of what it says)
        const merged = [];
        for (const k of kids) {
            const last = merged[merged.length - 1];
            if (last && last.startsWith('(text ') && k.startsWith('(text ')) {
                merged[merged.length - 1] = `(text ${JSON.stringify(JSON.parse(last.slice(6, -1)) + JSON.parse(k.slice(6, -1)))})`;
            } else {
                merged.push(k);
            }
        }
        const inner = merged.length ? ' ' + merged.join(' ') : '';
        switch (node.type) {
            case 'document': return `(document${inner})`;
            case 'paragraph': return `(paragraph${inner})`;
            case 'heading': return `(heading ${node.level}${inner})`;
            case 'text': return `(text ${JSON.stringify(node.literal)})`;
            case 'softbreak': return '(softbreak)';
            case 'linebreak': return '(linebreak)';
            case 'emph': return `(emph${inner})`;
            case 'strong': return `(strong${inner})`;
            case 'code': return `(code ${JSON.stringify(node.literal)})`;
            case 'code_block': return `(code_block ${JSON.stringify(node.info ?? '')} ${JSON.stringify(node.literal)})`;
            case 'block_quote': return `(block_quote${inner})`;
            case 'list': return `(list ${node.listType} ${node.listStart ?? 0} ${node.listTight ? 'tight' : 'loose'}${inner})`;
            case 'item': return `(item${inner})`;
            case 'link': return `(link ${JSON.stringify(node.destination)} ${JSON.stringify(node.title)}${inner})`;
            case 'thematic_break': return '(thematic_break)';
            default: return `(${node.type}${inner})`;
        }
    }
    return of(doc);
}
const markdown = [
    '# Title',
    '## Two\n### Three ###\n#### Four\n##### Five\n###### Six\n####### seven',
    '#no space\n#\n# Spaced   #  ',
    'Title\n=====\n\nSub\n---',
    'one line\nand another\n\nnew paragraph',
    'hard  \nbreak and\\\nbackslash',
    '*em* _em_ **strong** __strong__',
    '***both*** and **_mixed_**',
    'snake_case_words and *a*b and 2*3*4',
    '**not closed and *open',
    '*a **b** c*',
    '**a *b* c**',
    'a * b * c',
    '_a_b and a_b_ and _ab_',
    '`code` and `` co`de `` and ` x `',
    'unclosed `code here',
    '```\nfenced\n  kept\n```',
    '~~~ python\nprint(1)\n~~~\nafter',
    '```js\nlet a = 1;\n',
    '    indented\n    code\n\nparagraph',
    '- one\n- two\n- three',
    '* star\n+ plus',
    '1. first\n2. second\n3. third',
    '3) three\n4) four',
    '- a\n\n- b',
    '- a\n  - nested\n  - again\n- b',
    '1. a\n   continued\n2. b',
    '- item\nlazy line',
    '> quoted\n> lines',
    '> outer\n>> inner',
    '> - list in quote\n> - two',
    '> lazy\ncontinuation',
    '---\n***\n___\n- - -',
    'text\n***\ntext',
    '[link](http://x.co) and [titled](/a "Title")',
    '[not a link] and [also](not closed',
    '\\*escaped\\* and \\# and \\`',
    '**bold [link](u) bold**',
    '*em `code*` em*',
    '# Heading with *em* and `code`',
    '- **bold** item\n- `code` item',
    'para\n- list right after',
    '1. one\n\n   para in item\n2. two',
    '',
];
const markdownCases = markdown.map(text => ({ text, tree: tree(text) }));

const out = {
    vuetify: '4.3.3', semantic: '2.5.0', commonmark: '0.31.2',
    masks: maskCases, filters: { items, cases: filterCases }, formats: formatCases, extracts: extractCases,
    typings: typingCases, sizes: sizeCases, temperatures: temperatureCases, rules: ruleCases, markdown: markdownCases,
};
const here = dirname(fileURLToPath(import.meta.url));
writeFileSync(join(here, 'reference.json'), JSON.stringify(out, null, 1) + '\n');
console.log(`masks ${maskCases.length}, filters ${filterCases.length}, formats ${formatCases.length}, extracts ${extractCases.length}, typings ${typingCases.length}, sizes ${sizeCases.length}, temperatures ${temperatureCases.length}, rules ${ruleCases.length}, markdown ${markdownCases.length}`);
