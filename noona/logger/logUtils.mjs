/**
 * @fileoverview
 * Logger utilities for Noona services — handles section headers, colored outputs,
 * debug logs, banners, CLI dividers, and structured results using chalk + boxen.
 *
 * @module logUtils
 */

import chalk from 'chalk';
import boxen from 'boxen';

const timestamp = () => new Date().toISOString();

/** Prints a horizontal divider bar */
export function printDivider() {
    console.log(`${timestamp()} ${chalk.gray('─'.repeat(60))}`);
}

/** Prints a labeled section header */
export function printSection(title = '') {
    printDivider();
    if (title) {
        console.log(`${timestamp()} ${chalk.greenBright('✔')} ${chalk.bold(title)}`);
    }
}

/** Spacer with checkmark */
export function printSpacer() {
    console.log(`${timestamp()} ${chalk.greenBright('✔')}`);
}

/** Renders a full-width boxed title header using boxen */
export function printHeader(title) {
    const box = boxen(chalk.bold(title), {
        padding: 0,
        margin: 0,
        borderStyle: 'round',
        borderColor: 'cyan',
        align: 'center'
    });
    const lines = box.split('\n');
    lines.forEach(line => {
        console.log(`${timestamp()} ${line}`);
    });
}

/** Sub-header line for highlighting subsections */
export function printSubHeader(text) {
    console.log(`${timestamp()} ${chalk.bold('❇️')} ${chalk.cyan(text)}`);
}

/** Informational note line */
export function printNote(text) {
    console.log(`${timestamp()} ${chalk.bold('🔻')} ${chalk.gray('› ›')} ${chalk.italic(text)}`);
}

/** Action line indicator */
export function printAction(text) {
    console.log(`${timestamp()} ${chalk.blue('⚙')} ${text}`);
}

/** Success result log */
export function printResult(text) {
    console.log(`${timestamp()} ${chalk.green('✔')} ${chalk.bold(text)}`);
}

/** Error log */
export function printError(text) {
    console.log(`${timestamp()} ${chalk.red('❌')} ${text}`);
}

/** Warning log */
export function printWarning(text) {
    console.log(`${timestamp()} ${chalk.yellow('!')} ${text}`);
}

/** Step or phase log */
export function printStep(text) {
    console.log(`${timestamp()} ${chalk.yellow('⚙')} ${text}`);
}

/** Conditional debug output for development environment */
export function printDebug(text) {
    const env = process.env.NODE_ENV?.trim().toLowerCase() || '';
    if (env !== 'development') return;
    console.log(`${timestamp()} ${chalk.magenta('DEBUG:')} ${text} ${chalk.gray('[NODE_ENV: development]')}`);
}

/**
 * Visual progress bar printer (static).
 * @param {string} label - Label for the bar
 * @param {number} percent - Percentage complete
 * @param {string} [extraInfo] - Optional trailing text
 */
export function printProgressBar(label, percent, extraInfo = '') {
    const width = 20;
    const filledLength = Math.round((percent / 100) * width);
    const bar = chalk.green('░'.repeat(filledLength)) + chalk.gray('░'.repeat(width - filledLength));
    const percentText = `${percent}%`.padEnd(7);
    console.log(`${timestamp()} ${chalk.green('✔')} [${bar}]     ${percentText} ${extraInfo}`);
}

/**
 * ASCII boot banner for Vault/Warden.
 * @param {string} [label='Noona'] - Banner title (e.g., 'Noona-Vault')
 */
export function printBanner(label = 'Noona') {
    const banner = `
 _______                         
(_______)                        
 _     _  ___   ___  ____  _____ 
| |   | |/ _ \\ / _ \\|  _ \\(____ |
| |   | | |_| | |_| | | | / ___ |
|_|   |_|\\___/ \\___/|_| |_|\\_____|
`;
    banner.trim().split('\n').forEach(line => {
        console.log(`${timestamp()} ${chalk.cyanBright(line)}`);
    });
    printDivider();
    printResult(`🌙 ${label}-Warden Booting`);
    printDivider();
}

/** Final summary call for Docker image pulls */
export function printDownloadSummary() {
    printDivider();
    printResult('✔ ✔ All dependency images downloaded');
    printDivider();
}
