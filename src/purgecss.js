const { PurgeCSS } = require("purgecss");
const fs = require("fs");
const path = require("path");

const distPath = path.join(__dirname, "../../dist/daviweb/browser");

async function purgeCss() {
    const cssFiles = fs
        .readdirSync(distPath)
        .filter((file) => file.endsWith(".css"))
        .map((file) => path.join(distPath, file));

    for (const cssFile of cssFiles) {
        const purgeCSSResult = await new PurgeCSS().purge({
            content: [`${distPath}/**/*.html`, `${distPath}/**/*.js`],
            css: [cssFile],
            safelist: {
                standard: [/^bi-/], // Protege iconos de Bootstrap
                deep: [/modal/, /dropdown/, /fade/, /show/], // Clases dinámicas
            },
        });

        if (purgeCSSResult.length > 0) {
            fs.writeFileSync(cssFile, purgeCSSResult[0].css);
            console.log(`✅ Purged: ${path.basename(cssFile)}`);
        }
    }
}

purgeCss().catch((err) => {
    console.error("❌ Error:", err);
    process.exit(1);
});
