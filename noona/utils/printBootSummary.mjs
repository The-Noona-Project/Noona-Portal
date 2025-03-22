// ✅ /noona/utils/printBootSummary.mjs

import chalk from 'chalk';
import { table } from 'table';

/**
 * Prints a themed boot summary in Vault-style format.
 * @param {Array<{ name: string, info: string, ready: boolean }>} results
 */
export function printBootSummary(results) {
    console.log('');
    console.log(chalk.cyan('[Noona-Portal] 🧩 Boot Summary\n'));

    const rows = [
        ['Component', 'Info', 'Status'],
        ...results.map(component => [
            component.name,
            component.info,
            component.ready ? chalk.green('🟢 Ready') : chalk.red('🔴 Failed')
        ])
    ];

    const config = {
        border: {
            topBody: `─`,
            topJoin: `┬`,
            topLeft: `┌`,
            topRight: `┐`,
            bottomBody: `─`,
            bottomJoin: `┴`,
            bottomLeft: `└`,
            bottomRight: `┘`,
            bodyLeft: `│`,
            bodyRight: `│`,
            bodyJoin: `│`,
            joinBody: `─`,
            joinLeft: `├`,
            joinRight: `┤`,
            joinJoin: `┼`
        },
        columns: {
            0: { width: 18 },
            1: { width: 42 },
            2: { width: 14 }
        }
    };

    console.log(table(rows, config));

    const successCount = results.filter(r => r.ready).length;
    const total = results.length;

    if (successCount === total) {
        console.log(chalk.green(`🧠  Noona-Portal is online. All systems go.`));
    } else {
        console.log(chalk.red(`⚠️  ${total - successCount} component(s) failed to start.`));
    }

    console.log('');
}
