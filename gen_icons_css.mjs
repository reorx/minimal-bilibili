// https://docs.iconify.design/usage/css/utils/

import { locate } from '@iconify/json';
import { getIconsCSS } from '@iconify/utils';
import { readFile, writeFile } from 'node:fs/promises';


/**
 * List of icons. Key is icon set prefix, value is array of icons
 *
 * @type {Record<string, string[]>}
 */
const icons = {
	'tabler': ['coin-yuan', 'thumb-up', 'star', 'clock', 'calendar-time', 'user', 'user-circle'],
};

// Parse each icon set
let code = '';
for (const prefix in icons) {
	// Find location of .json file
	const filename = locate(prefix);

	// Load file and parse it
	/** @type {import("@iconify/types").IconifyJSON} */
	const iconSet = JSON.parse(await readFile(filename, 'utf8'));

	// Get CSS
	const css = getIconsCSS(iconSet, icons[prefix]);

	// Add it to code
	code += css;
}

// Save CSS file
await writeFile('src/icons.css', code, 'utf8');
console.log(`Saved CSS (${code.length} bytes)`);
