const fs = require('fs');
function getKeys(obj, prefix = '') {
    let keys = [];
    for (let key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
            keys = keys.concat(getKeys(obj[key], prefix + key + '.'));
        } else {
            keys.push(prefix + key);
        }
    }
    return keys;
}
const usedKeys = fs.readFileSync('used_keys.txt', 'utf-8').split(/\r?\n/).map(k => k.trim()).filter(k => k);
const en = JSON.parse(fs.readFileSync('src/i18n/locales/en/translation.json', 'utf-8'));
const vi = JSON.parse(fs.readFileSync('src/i18n/locales/vi/translation.json', 'utf-8'));
const enKeys = new Set(getKeys(en));
const viKeys = new Set(getKeys(vi));
const missingEn = usedKeys.filter(k => !enKeys.has(k));
const missingVi = usedKeys.filter(k => !viKeys.has(k));
console.log('Missing in EN:');
missingEn.forEach(k => console.log(k));
console.log('\nMissing in VI:');
missingVi.forEach(k => console.log(k));
