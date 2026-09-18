import { readFileSync, writeFileSync } from "node:fs";

const version = process.argv[2];
if (!version) {
  console.error("Uso: node set-version.mjs <versao>");
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
