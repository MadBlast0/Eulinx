const fs = require("fs");
const path = require("path");

const FILES_TO_UPDATE = [
  "src/ui/layout/resize-handle.tsx",
  "src/ui/layout/title-bar.tsx",
  "src/ui/layout/workspace-layout.tsx",
  "src/ui/layout/workspace-tabs.tsx",
  "src/ui/node-graph/custom-edge.tsx",
  "src/ui/node-graph/custom-node.tsx",
  "src/ui/node-graph/graph-minimap.tsx",
  "src/ui/node-graph/workflow-designer.tsx",
  "src/ui/sidebar/file-tree.tsx",
  "src/ui/sidebar/section.tsx",
  "src/ui/sidebar/session-list.tsx",
  "src/ui/sidebar/sidebar-search.tsx",
  "src/ui/sidebar/worker-list.tsx",
  "src/ui/sidebar/workflow-list.tsx",
  "src/ui/sidebar/workspace-switcher.tsx",
  "src/ui/terminal-cards/terminal-cards.tsx",
  "src/ui/terminal-cards/worker-card.tsx",
  "src/ui/terminal/terminal-search.tsx",
  "src/ui/terminal/terminal-toolbar.tsx",
  "src/ui/terminal/terminal-view.tsx",
];

const TOKEN_MAP = {
  "--Eulinx-color-text-primary": "--Eulinx-color-text",
  "--Eulinx-color-elevated": "--Eulinx-color-surface",
  "--Eulinx-color-elevated-2": "--Eulinx-color-surface-alt",
  "--Eulinx-duration-fast": "--Eulinx-duration-hover",
  "--Eulinx-duration-base": "--Eulinx-duration-card",
  "--Eulinx-duration-slow": "--Eulinx-duration-navigation",
  "--Eulinx-duration-slower": "--Eulinx-duration-dialog",
  "--Eulinx-duration-slowest": "--Eulinx-duration-page",
  "--Eulinx-color-danger": "--Eulinx-color-error",
};

function migrateFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(fullPath, "utf8");
  let changed = false;

  for (const [oldName, newName] of Object.entries(TOKEN_MAP)) {
    const regex = new RegExp(oldName.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"), "g");
    const matches = content.match(regex);
    if (matches) {
      content = content.replace(regex, newName);
      changed = true;
      console.log(`  ${filePath}: ${matches.length}x ${oldName} -> ${newName}`);
    }
  }

  if (changed) {
    fs.writeFileSync(fullPath, content, "utf8");
    console.log(`Updated ${filePath}`);
  } else {
    console.log(`- No changes: ${filePath}`);
  }
  return changed;
}

console.log("Starting token migration...\n");
let totalChanged = 0;
for (const file of FILES_TO_UPDATE) {
  if (migrateFile(file)) totalChanged++;
}
console.log(`\nDone. ${totalChanged} files changed.`);