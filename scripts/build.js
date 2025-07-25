#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { minify } = require("terser");

/** The source directory */
const SRC_DIR = path.resolve(__dirname, "..");

/** The destination directory */
const DIST_DIR = path.resolve(__dirname, "..", "dist");

/** Directories to copy recursively */
const DIRS_TO_COPY = ["images"];

/** JavaScript files to minify */
const JS_FILES = ["background.js", "addOutline.js", "removeOutline.js"];

/** Files that don't need processing (copy as-is) */
const STATIC_FILES = ["manifest.json", "LICENSE", "README.md"];

/**
 * Ensures that a directory exists.
 * @param {string} dir - The directory to ensure.
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
}

/**
 * Copies a file from the source directory to the destination directory.
 * @param {string} src - The source file path.
 * @param {string} dest - The destination file path.
 */
function copyFile(src, dest) {
  const destDir = path.dirname(dest);
  ensureDir(destDir);

  fs.copyFileSync(src, dest);
  console.log(
    `Copied: ${path.relative(SRC_DIR, src)} → ${path.relative(SRC_DIR, dest)}`
  );
}

/**
 * Minifies a JavaScript file and copies it to the destination directory.
 * @param {string} src - The source file path.
 * @param {string} dest - The destination file path.
 */
async function minifyAndCopyJS(src, dest) {
  const destDir = path.dirname(dest);
  ensureDir(destDir);

  try {
    const code = fs.readFileSync(src, "utf8");
    const result = await minify(code, {
      compress: {
        drop_console: false, // Keep console logs for debugging
        drop_debugger: true,
        pure_funcs: ["console.debug"],
      },
      mangle: {
        reserved: ["chrome"], // Don't mangle Chrome API names
      },
      format: {
        comments: false, // Remove comments
      },
    });

    if (result.error) {
      console.warn(`⚠️  Minification failed for ${src}, copying original`);
      copyFile(src, dest);
      return;
    }

    fs.writeFileSync(dest, result.code);
    const originalSize = Buffer.byteLength(code, "utf8");
    const minifiedSize = Buffer.byteLength(result.code, "utf8");
    const savings = (
      ((originalSize - minifiedSize) / originalSize) *
      100
    ).toFixed(1);

    console.log(
      `Minified: ${path.relative(SRC_DIR, src)} → ${path.relative(
        SRC_DIR,
        dest
      )} (${savings}% smaller)`
    );
  } catch (error) {
    console.warn(`⚠️  Error minifying ${src}:`, error.message);
    console.log(`Copying original file instead...`);
    copyFile(src, dest);
  }
}

/**
 * Copies a directory from the source directory to the destination directory.
 * @param {string} src - The source directory path.
 * @param {string} dest - The destination directory path.
 */
function copyDirectory(src, dest) {
  ensureDir(dest);

  const items = fs.readdirSync(src);

  for (const item of items) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);

    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      copyFile(srcPath, destPath);
    }
  }
}

/**
 * Updates the manifest version to match the package.json version.
 */
function updateManifestVersion() {
  const packageJsonPath = path.join(SRC_DIR, "package.json");
  const manifestPath = path.join(DIST_DIR, "manifest.json");

  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

    // Update manifest version to match package.json
    manifest.version = packageJson.version;

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`Updated manifest.json version to ${packageJson.version}`);
  }
}

/**
 * Cleans the dist directory.
 */
function cleanDist() {
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
    console.log("Cleaned dist directory");
  }
}

/**
 * Builds the Chrome extension.
 */
async function build() {
  console.log("🚀 Building Diver Chrome Extension...\n");

  // Clean previous build
  cleanDist();

  // Create dist directory
  ensureDir(DIST_DIR);

  // Copy static files
  console.log("📄 Copying static files...");
  for (const file of STATIC_FILES) {
    const src = path.join(SRC_DIR, file);
    const dest = path.join(DIST_DIR, file);

    if (fs.existsSync(src)) {
      copyFile(src, dest);
    } else {
      console.warn(`⚠️  File not found: ${file}`);
    }
  }

  // Minify JavaScript files
  console.log("\n⚡ Minifying JavaScript files...");
  for (const file of JS_FILES) {
    const src = path.join(SRC_DIR, file);
    const dest = path.join(DIST_DIR, file);

    if (fs.existsSync(src)) {
      await minifyAndCopyJS(src, dest);
    } else {
      console.warn(`⚠️  JavaScript file not found: ${file}`);
    }
  }

  // Copy directories
  console.log("\n📁 Copying directories...");
  for (const dir of DIRS_TO_COPY) {
    const src = path.join(SRC_DIR, dir);
    const dest = path.join(DIST_DIR, dir);

    if (fs.existsSync(src)) {
      copyDirectory(src, dest);
    } else {
      console.warn(`⚠️  Directory not found: ${dir}`);
    }
  }

  // Update manifest version
  console.log("\n📝 Updating manifest version...");
  updateManifestVersion();

  // Build summary
  const distFiles = fs.readdirSync(DIST_DIR, { recursive: true });
  const totalSize = calculateDirectorySize(DIST_DIR);
  console.log(
    `\n✅ Build complete! Generated ${distFiles.length} files in dist/`
  );
  console.log(`📊 Total build size: ${(totalSize / 1024).toFixed(1)} KB`);
  console.log(`📦 Minified and ready for Chrome Web Store upload: dist/`);
}

/**
 * Calculates the size of a directory.
 * @param {string} dir - The directory to calculate the size of.
 * @returns {number} The size of the directory in bytes.
 */
function calculateDirectorySize(dir) {
  let totalSize = 0;
  const files = fs.readdirSync(dir, { recursive: true });

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);

    if (stats.isFile()) {
      totalSize += stats.size;
    }
  }

  return totalSize;
}

/**
 * Runs the build process.
 */
if (require.main === module) {
  build().catch((error) => {
    console.error("❌ Build failed:", error.message);
    process.exit(1);
  });
}

module.exports = { build };
