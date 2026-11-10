/**
 * Swap brand orange for another accent — fully revertible.
 *
 * Usage:
 *   node scripts/theme-color.js apply          # apply teal theme
 *   node scripts/theme-color.js apply blue     # cobalt blue
 *   node scripts/theme-color.js apply emerald
 *   node scripts/theme-color.js revert         # restore orange
 *   node scripts/theme-color.js status
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..", "site");
const BACKUP_DIR = path.join(__dirname, ".theme-backup");
const STATE = path.join(__dirname, ".theme-state.json");
const CSS_REL =
  "assets/cdn_prod_website-files_com/6aaad679fdb9d914f7f52049/css/two-26-1dc3272b155235f70ebef7d3d0fb78a1.webflow.shared.f22dd83b1.css";

const THEMES = {
  teal: {
    label: "Deep Teal",
    primary: "#0D9488",
    secondary: "#EEF6F5",
    white: "#F7FBFA",
    accent: "#D5EDEA",
    gradientTop: "#D8EFEC",
  },
  blue: {
    label: "Cobalt Blue",
    primary: "#2563EB",
    secondary: "#EEF2FF",
    white: "#F8FAFF",
    accent: "#DBE4FF",
    gradientTop: "#E0E7FF",
  },
  emerald: {
    label: "Forest Emerald",
    primary: "#059669",
    secondary: "#ECFDF5",
    white: "#F7FDFB",
    accent: "#D1FAE5",
    gradientTop: "#D1FAE5",
  },
};

const ORIGINAL = {
  primary: "#ff5400",
  secondary: "#f8eee8",
  white: "#fdf8f5",
  accent: "#f9e2e1",
  gradientTop: "#fae3e2",
};

const TEXT_EXTS = new Set([".html", ".htm", ".css", ".js", ".svg"]);

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === ".theme-backup") continue;
      walk(p, files);
    } else if (TEXT_EXTS.has(path.extname(ent.name).toLowerCase())) {
      files.push(p);
    }
  }
  return files;
}

function hashFile(p) {
  return crypto.createHash("md5").update(fs.readFileSync(p)).digest("hex");
}

function ensureBackup() {
  if (fs.existsSync(path.join(BACKUP_DIR, "_complete.json"))) return false;
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const files = walk(ROOT).filter((f) => {
    const t = fs.readFileSync(f, "utf8");
    return (
      /#ff5400/i.test(t) ||
      /--brand-primary:\s*#ff5400/i.test(t) ||
      /--brand-secondary:\s*#f8eee8/i.test(t) ||
      /#fae3e2/i.test(t) ||
      /#f9e2e1/i.test(t) ||
      /#fdf8f5/i.test(t)
    );
  });
  const index = [];
  for (const f of files) {
    const rel = path.relative(ROOT, f);
    const dest = path.join(BACKUP_DIR, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(f, dest);
    index.push({ rel, md5: hashFile(f) });
  }
  fs.writeFileSync(
    path.join(BACKUP_DIR, "_complete.json"),
    JSON.stringify({ createdAt: new Date().toISOString(), files: index }, null, 2)
  );
  console.log("Backup created:", files.length, "files → scripts/.theme-backup/");
  return true;
}

function replaceColors(text, from, to) {
  let out = text;
  // CSS variables
  out = out.replace(
    new RegExp(`(--brand-primary:\\s*)${escapeRe(from.primary)}`, "gi"),
    `$1${to.primary}`
  );
  out = out.replace(
    new RegExp(`(--brand-secondary:\\s*)${escapeRe(from.secondary)}`, "gi"),
    `$1${to.secondary}`
  );
  out = out.replace(
    new RegExp(`(--brand-white:\\s*)${escapeRe(from.white)}`, "gi"),
    `$1${to.white}`
  );
  out = out.replace(
    new RegExp(`(--brand-accent:\\s*)${escapeRe(from.accent)}`, "gi"),
    `$1${to.accent}`
  );

  // Hardcoded primary (+ alpha variants like #ff540000 / #ff54001a)
  out = replaceHexFamily(out, from.primary, to.primary);
  out = replaceHexFamily(out, from.gradientTop, to.gradientTop);
  out = replaceHexFamily(out, from.secondary, to.secondary);
  out = replaceHexFamily(out, from.accent, to.accent);
  out = replaceHexFamily(out, from.white, to.white);

  return out;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceHexFamily(text, fromHex, toHex) {
  const from = fromHex.replace("#", "").toLowerCase();
  const to = toHex.replace("#", "").toLowerCase();
  if (from.length !== 6 || to.length !== 6) return text;
  // match #rrggbb optionally followed by 1-2 alpha hex digits
  const re = new RegExp(`#${from}([0-9a-f]{0,2})\\b`, "gi");
  return text.replace(re, (_, alpha) => `#${to}${alpha}`);
}

function applyTheme(name) {
  const theme = THEMES[name];
  if (!theme) {
    console.error("Unknown theme. Choose:", Object.keys(THEMES).join(", "));
    process.exit(1);
  }
  ensureBackup();

  const state = fs.existsSync(STATE)
    ? JSON.parse(fs.readFileSync(STATE, "utf8"))
    : { theme: "orange" };

  // Always transform from ORIGINAL orange palette (restore first if needed)
  if (state.theme && state.theme !== "orange") {
    revert(false);
  }

  const files = walk(ROOT);
  let changed = 0;
  for (const f of files) {
    const before = fs.readFileSync(f, "utf8");
    if (!/#ff5400|#f8eee8|#fdf8f5|#f9e2e1|#fae3e2/i.test(before)) continue;
    const after = replaceColors(before, ORIGINAL, theme);
    if (after !== before) {
      fs.writeFileSync(f, after);
      changed++;
    }
  }

  fs.writeFileSync(
    STATE,
    JSON.stringify(
      {
        theme: name,
        label: theme.label,
        primary: theme.primary,
        appliedAt: new Date().toISOString(),
      },
      null,
      2
    )
  );
  console.log(`Applied ${theme.label} (${theme.primary}) — ${changed} files`);
  console.log("Revert anytime: node scripts/theme-color.js revert");
}

function revert(log = true) {
  const complete = path.join(BACKUP_DIR, "_complete.json");
  if (!fs.existsSync(complete)) {
    if (log) console.log("No backup found — nothing to revert (still orange?).");
    return;
  }
  const meta = JSON.parse(fs.readFileSync(complete, "utf8"));
  let n = 0;
  for (const { rel } of meta.files) {
    const src = path.join(BACKUP_DIR, rel);
    const dest = path.join(ROOT, rel);
    if (!fs.existsSync(src)) continue;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    n++;
  }
  fs.writeFileSync(
    STATE,
    JSON.stringify(
      { theme: "orange", label: "Original Orange", primary: ORIGINAL.primary, appliedAt: new Date().toISOString() },
      null,
      2
    )
  );
  if (log) console.log(`Reverted to original orange — restored ${n} files`);
}

function status() {
  if (!fs.existsSync(STATE)) {
    console.log("theme: orange (default, no theme applied yet)");
    return;
  }
  console.log(JSON.stringify(JSON.parse(fs.readFileSync(STATE, "utf8")), null, 2));
  console.log("themes:", Object.keys(THEMES).join(", "));
  console.log("commands: apply [teal|blue|emerald] | revert | status");
}

const cmd = process.argv[2] || "status";
const arg = process.argv[3] || "teal";

if (cmd === "apply") applyTheme(arg);
else if (cmd === "revert") revert(true);
else status();
