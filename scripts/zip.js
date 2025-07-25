#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

/** The root directory */
const ROOT_DIR = path.resolve(__dirname, "..");

/** The destination directory */
const DIST_DIR = path.resolve(ROOT_DIR, "dist");

/**
 * Gets the version from the package.json file.
 * @returns {string} The version from the package.json file.
 */
function getVersionFromPackageJson() {
  const packageJsonPath = path.join(ROOT_DIR, "package.json");

  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    return packageJson.version;
  }

  return "1.0.0";
}

/**
 * Creates a ZIP file of the dist directory.
 * @returns {Promise<string>} A promise that resolves to the path of the ZIP file.
 */
function createZip() {
  return new Promise((resolve, reject) => {
    // Check if dist directory exists
    if (!fs.existsSync(DIST_DIR)) {
      console.error('❌ dist/ directory not found. Run "npm run build" first.');
      process.exit(1);
    }

    const version = getVersionFromPackageJson();
    const zipName = `diver-v${version}.zip`;
    const zipPath = path.join(ROOT_DIR, zipName);

    console.log(`📦 Creating ZIP package: ${zipName}`);

    // Create a file to stream archive data to
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", {
      zlib: { level: 9 }, // Maximum compression
    });

    // Listen for all archive data to be written
    output.on("close", () => {
      const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
      console.log(`✅ ZIP created successfully!`);
      console.log(
        `📊 Archive size: ${sizeInMB} MB (${archive.pointer()} bytes)`
      );
      console.log(`📍 Location: ${zipPath}`);
      console.log(`🚀 Ready for Chrome Web Store upload!`);
      resolve(zipPath);
    });

    // Handle warnings (like stat failures and other non-blocking errors)
    archive.on("warning", (err) => {
      if (err.code === "ENOENT") {
        console.warn("⚠️  Warning:", err.message);
      } else {
        reject(err);
      }
    });

    // Handle errors
    archive.on("error", (err) => {
      console.error("❌ Archive error:", err.message);
      reject(err);
    });

    // Pipe archive data to the file
    archive.pipe(output);

    // Add the entire dist directory to the archive
    archive.directory(DIST_DIR, false);

    // Finalize the archive
    archive.finalize();
  });
}

/**
 * Validates the ZIP file.
 * @returns {boolean} True if the ZIP file is valid, false otherwise.
 */
function validateZip() {
  const version = getVersionFromPackageJson();
  const zipPath = path.join(ROOT_DIR, `diver-v${version}.zip`);

  if (fs.existsSync(zipPath)) {
    const stats = fs.statSync(zipPath);
    const sizeInMB = (stats.size / 1024 / 1024).toFixed(2);

    console.log(`\n📋 ZIP Package Summary:`);
    console.log(`   File: diver-v${version}.zip`);
    console.log(`   Size: ${sizeInMB} MB`);
    console.log(`   Path: ${zipPath}`);

    // Check if size is reasonable for Chrome Web Store (max 128MB)
    if (stats.size > 128 * 1024 * 1024) {
      console.warn(
        `⚠️  Warning: ZIP size exceeds Chrome Web Store limit (128MB)`
      );
    } else {
      console.log(`✅ Size is within Chrome Web Store limits`);
    }

    return true;
  }

  return false;
}

async function main() {
  try {
    console.log("📦 Creating Chrome Web Store package...\n");

    await createZip();
    validateZip();

    console.log("\n🎉 Package ready for Chrome Web Store submission!");
    console.log("📚 Next steps:");
    console.log("   1. Go to https://chrome.google.com/webstore/devconsole");
    console.log("   2. Upload the generated ZIP file");
    console.log("   3. Fill in store listing details");
    console.log("   4. Submit for review");
  } catch (error) {
    console.error("❌ Failed to create ZIP:", error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { createZip, validateZip };
