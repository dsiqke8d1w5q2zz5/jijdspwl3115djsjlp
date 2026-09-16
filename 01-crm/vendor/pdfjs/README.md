PDF.js 6.3.289 (Mozilla), legacy browser build.

Source: https://registry.npmjs.org/pdfjs-dist/-/pdfjs-dist-6.3.289.tgz
Upstream: https://github.com/mozilla/pdf.js

Includes the display module, worker, CMaps, standard fonts and WASM resources. LICENSE and resource license files are retained. The importer loads these resources locally; it does not send PDF contents to a service.

`file/` contains generated classic-script wrappers and bundled binary resources for pages opened directly via `file://`. Regenerate with `node 01-crm/tools/build-pdf-file-support.cjs`. These preserve the upstream implementation and licenses; only exports/module URL references are adapted and the module scope is wrapped. This mode uses PDF.js's main-thread worker fallback because file origins cannot import ES modules or fetch worker assets.
