const fs = require('fs');
const path = require('path');

// Lire translations.json
const translationsPath = path.join(__dirname, 'translations.json');
const translations = JSON.parse(fs.readFileSync(translationsPath, 'utf8'));

// Fonction pour récupérer toutes les clés d'un objet de manière récursive
function getAllKeys(obj, prefix = '') {
  const keys = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys.push(...getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

// Obtenir toutes les clés pour chaque langue
const enKeys = new Set(getAllKeys(translations.en));
const frKeys = new Set(getAllKeys(translations.fr));
const esKeys = new Set(getAllKeys(translations.es));

// Fonction pour trouver tous les appels à t() dans le code
function findTKeysInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const regex = /\bt\(['\"`]([^'"\`]+)['\"`]\)/g;
  const matches = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}

// Fonction récursive pour parcourir tous les fichiers
function walkDir(dir, extensions = ['.tsx', '.ts', '.js', '.jsx']) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (item !== 'node_modules' && item !== '.git' && item !== 'ios/Pods' && item !== 'android') {
        files.push(...walkDir(fullPath, extensions));
      }
    } else if (extensions.some(ext => item.endsWith(ext))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Trouver tous les fichiers source
const sourceFiles = walkDir(__dirname);

// Extraire toutes les clés utilisées dans le code
const usedKeys = new Set();
for (const file of sourceFiles) {
  const keys = findTKeysInFile(file);
  keys.forEach(key => usedKeys.add(key));
}

console.log(`\n📊 Résumé de la vérification des traductions:\n`);
console.log(`✅ Nombre total de clés uniques utilisées dans le code: ${usedKeys.size}`);
console.log(`✅ Nombre total de clés dans translations.json (EN): ${enKeys.size}`);
console.log(`✅ Nombre total de clés dans translations.json (FR): ${frKeys.size}`);
console.log(`✅ Nombre total de clés dans translations.json (ES): ${esKeys.size}\n`);

// Vérifier les clés manquantes
const missingKeys = {
  en: [],
  fr: [],
  es: []
};

for (const key of usedKeys) {
  if (!enKeys.has(key)) {
    missingKeys.en.push(key);
  }
  if (!frKeys.has(key)) {
    missingKeys.fr.push(key);
  }
  if (!esKeys.has(key)) {
    missingKeys.es.push(key);
  }
}

// Afficher les résultats
let hasErrors = false;

if (missingKeys.en.length > 0) {
  hasErrors = true;
  console.log(`❌ Clés MANQUANTES dans EN (${missingKeys.en.length}):`);
  missingKeys.en.forEach(key => console.log(`   - ${key}`));
  console.log('');
}

if (missingKeys.fr.length > 0) {
  hasErrors = true;
  console.log(`❌ Clés MANQUANTES dans FR (${missingKeys.fr.length}):`);
  missingKeys.fr.forEach(key => console.log(`   - ${key}`));
  console.log('');
}

if (missingKeys.es.length > 0) {
  hasErrors = true;
  console.log(`❌ Clés MANQUANTES dans ES (${missingKeys.es.length}):`);
  missingKeys.es.forEach(key => console.log(`   - ${key}`));
  console.log('');
}

if (!hasErrors) {
  console.log('✅ Toutes les traductions sont valides!\n');
}

// Afficher quelques exemples de clés utilisées
console.log(`\n📝 Exemples de clés utilisées dans le code (10 premières):`);
Array.from(usedKeys).slice(0, 10).forEach(key => console.log(`   - ${key}`));
