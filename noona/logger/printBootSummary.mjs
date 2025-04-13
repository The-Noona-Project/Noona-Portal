// ✅ /noona/logger/printBootSummary.mjs

import chalk from 'chalk';
import { table } from 'table';

/**
 * @typedef {Object} BootComponentStatus
 * @property {string} name - Name of the component.
 * @property {string} info - Informational message about the component.
 * @property {'ready' | 'fail' | 'warn' | 'unknown'} status - Component status enum.
 */

/**
 * Prints a themed boot summary styled for Noona services.
 *
 * Accepts an array of components with status states. Supported status values:
 * - 'ready'   → 🟢 Ready
 * - 'fail'    → 🔴 Failed
 * - 'warn'    → 🟡 PublicKey Mode
 * - 'unknown' → 🟣 Unknown
 *
 * @param {BootComponentStatus[]} results - Array of boot status components.
 */
export function printBootSummary(results) {
    console.log('');
    console.log(chalk.cyan('[Noona-Portal] 🧩 Boot Summary\n'));

    const rows = [
        ['Component', 'Info', 'Status'],
        ...results.map(({ name, info, status }) => {
            let icon;
            switch (status) {
                case 'ready':
                    icon = chalk.green('🟢 Ready');
                    break;
                case 'fail':
                    icon = chalk.red('🔴 Failed');
                    break;
                case 'warn':
                    icon = chalk.yellow('🟡 PublicKey Mode');
                    break;
                case 'unknown':
                default:
                    icon = chalk.magenta('🟣 Unknown');
                    break;
            }

            return [name, info, icon];
        })
    ];

    const config = {
        border: {
            topBody: '─',
            topJoin: '┬',
            topLeft: '┌',
            topRight: '┐',
            bottomBody: '─',
            bottomJoin: '┴',
            bottomLeft: '└',
            bottomRight: '┘',
            bodyLeft: '│',
            bodyRight: '│',
            bodyJoin: '│',
            joinBody: '─',
            joinLeft: '├',
            joinRight: '┤',
            joinJoin: '┼'
        },
        columns: {
            0: { width: 26 },
            1: { width: 66 },
            2: { width: 20 }
        }
    };

    console.log(table(rows, config));

    const failures = results.filter(r => r.status === 'fail');
    const warnings = results.filter(r => r.status === 'warn');
    const unknowns = results.filter(r => r.status === 'unknown');

    if (failures.length === 0 && warnings.length === 0 && unknowns.length === 0) {
        console.log(chalk.green(`🧠  Noona-Portal is online. All systems go.`));
    } else {
        const failMsg = failures.length ? `• ${failures.length} failed` : '';
        const warnMsg = warnings.length ? `• ${warnings.length} in publicKey mode` : '';
        const unkMsg = unknowns.length ? `• ${unknowns.length} unknown` : '';
        console.log(chalk.yellow(`⚠️  Boot completed with issues:\n   ${[failMsg, warnMsg, unkMsg].filter(Boolean).join('\n   ')}`));
    }

    console.log('');
}
