// noona/logger/logUtils.mjs

import chalk from 'chalk';
import boxen from 'boxen';

const timestamp = () => new Date().toISOString();

export function printDivider() {
    console.log(`${timestamp()} ${chalk.gray('─'.repeat(60))}`);
}

export function printSection(title = '') {
    printDivider();
    if (title) {
        console.log(`${timestamp()} ${chalk.greenBright('✔')} ${chalk.bold(title)}`);
    }
}

export function printSpacer() {
    console.log(`${timestamp()} ${chalk.greenBright('✔')}`);
}

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

export function printSubHeader(text) {
    console.log(`${timestamp()} ${chalk.bold('❇️')} ${chalk.cyan(text)}`);
}

export function printNote(text) {
    console.log(`${timestamp()} ${chalk.bold('🔻')} ${chalk.gray('› ›')} ${chalk.italic(text)}`);
}

export function printAction(text) {
    console.log(`${timestamp()} ${chalk.blue('⚙')} ${text}`);
}

export function printResult(text) {
    console.log(`${timestamp()} ${chalk.green('✔')} ${chalk.bold(text)}`);
}

export function printError(text) {
    console.log(`${timestamp()} ${chalk.red('❌')} ${text}`);
}

export function printWarning(text) {
    console.log(`${timestamp()} ${chalk.yellow('!')} ${text}`);
}

export function printStep(text) {
    console.log(`${timestamp()} ${chalk.yellow('⚙')} ${text}`);
}

// Updated debug function: only print if NODE_ENV is "development"
export function printDebug(text) {
    const env = process.env.NODE_ENV ? process.env.NODE_ENV.trim().toLowerCase() : '';
    if (env !== 'development') {
        return;
    }
    console.log(`${timestamp()} ${chalk.magenta('DEBUG:')} ${text} ${chalk.gray('[NODE_ENV: development]')}`);
}

export function printProgressBar(label, percent, extraInfo = '') {
    const width = 20;
    const filledLength = Math.round((percent / 100) * width);
    const bar = chalk.green('░'.repeat(filledLength)) + chalk.gray('░'.repeat(width - filledLength));
    const percentText = `${percent}%`.padEnd(7);
    console.log(`${timestamp()} ${chalk.green('✔')} [${bar}]     ${percentText} ${extraInfo}`);
}

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

export function printDownloadSummary() {
    printDivider();
    printResult('✔ ✔ All dependency images downloaded');
    printDivider();
}
