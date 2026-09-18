import { readFileSync, writeFileSync } from "node:fs";

const version = process.argv[2];
const SEMVER_RE = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/;

if (!version || !SEMVER_RE.test(version)) {
  console.error(`Versão inválida: "${version}". Esperado um semver tipo 1.2.3 ou 1.2.3-beta.1.`);
  process.exit(1);
}

function updateJson(path, mutate) {
  const json = JSON.parse(readFileSync(path, "utf8"));
  mutate(json);
  writeFileSync(path, JSON.stringify(json, null, 2) + "\n");
  console.log(`${path} -> ${json.version}`);
}

updateJson("package.json", (json) => {
  json.version = version;
});

updateJson("src-tauri/tauri.conf.json", (json) => {
  json.version = version;
});

const cargoPath = "src-tauri/Cargo.toml";
const cargo = readFileSync(cargoPath, "utf8");
const updatedCargo = cargo.replace(/^version = ".*"$/m, `version = "${version}"`);
writeFileSync(cargoPath, updatedCargo);
console.log(`${cargoPath} -> ${version}`);
