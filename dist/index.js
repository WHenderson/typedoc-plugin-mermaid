'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var html = require('html-escaper');
var typedoc = require('typedoc');

function _interopNamespace(e) {
  if (e && e.__esModule) return e;
  var n = Object.create(null);
  if (e) {
    Object.keys(e).forEach(function (k) {
      if (k !== 'default') {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function () { return e[k]; }
        });
      }
    });
  }
  n["default"] = e;
  return Object.freeze(n);
}

var html__namespace = /*#__PURE__*/_interopNamespace(html);

const style = String.raw `
<style>
:root.mermaid-enabled .mermaid-block > pre {
  display: none;
}
:root:not(.mermaid-enabled) .mermaid-block > .mermaid {
  display: none !important;
}

.mermaid-block > .mermaid[data-inserted].dark {
  display: var(--mermaid-dark-display);
}
.mermaid-block > .mermaid[data-inserted].light {
  display: var(--mermaid-light-display);
}

:root {
  --mermaid-dark-display: none;
  --mermaid-light-display: block;
}
@media (prefers-color-scheme: light) {
  :root {
    --mermaid-dark-display: none;
    --mermaid-light-display: block;
  }
}
@media (prefers-color-scheme: dark) {
  :root {
    --mermaid-dark-display: block;
    --mermaid-light-display: none;
  }
}
body.light, :root[data-theme="light"] {
  --mermaid-dark-display: none;
  --mermaid-light-display: block;
}
body.dark, :root[data-theme="dark"] {
  --mermaid-dark-display: block;
  --mermaid-light-display: none;
}
</style>
`;
/**
 * 1. Load mermaid.js library.
 * 2. Initialize mermaid.
 * 3. Add special attribute after SVG has been inserted.
 */
const script = String.raw `
<script src="https://unpkg.com/mermaid/dist/mermaid.min.js"></script>
<script>
(function() {
  if (typeof mermaid === "undefined") {
    return;
  }

  document.documentElement.classList.add("mermaid-enabled");

  mermaid.initialize({startOnLoad:true});

  requestAnimationFrame(function check() {
    let some = false;
    document.querySelectorAll("div.mermaid:not([data-inserted])").forEach(div => {
      some = true;
      if (div.querySelector("svg")) {
        div.dataset.inserted = true;
      }
    });

    if (some) {
      requestAnimationFrame(check);
    }
  });
})();
</script>
`;
const mermaidBlockStart = '<div class="mermaid-block">';
const mermaidBlockEnd = '</div>';
class MermaidPlugin {
    addToApplication(app) {
        app.converter.on(typedoc.Converter.EVENT_RESOLVE_BEGIN, (context) => {
            this.onConverterResolveBegin(context);
        });
        app.renderer.on({
            [typedoc.PageEvent.END]: (event) => {
                this.onEndPage(event);
            },
        });
        // high priority markdown parser to catch blocks before the built-in parser
        app.renderer.on(typedoc.MarkdownEvent.PARSE, (event) => {
            this.onParseMarkdown(event);
        }, this, 1000);
    }
    onConverterResolveBegin(context) {
        for (const reflection of context.project.getReflectionsByKind(typedoc.ReflectionKind.All)) {
            const { comment } = reflection;
            if (comment) {
                comment.text = this.handleMermaidCodeBlocks(comment.text);
                for (const tag of comment.tags) {
                    if (tag.tagName === 'mermaid') {
                        tag.text = this.handleMermaidTag(tag.text);
                    }
                    else {
                        tag.text = this.handleMermaidCodeBlocks(tag.text);
                    }
                }
            }
        }
    }
    /**
     * Convert the text of `@mermaid` tags.
     *
     * This first line will be the title. It will be wrapped in an h4.
     * All other lines are mermaid code and will be converted into a mermaid block.
     */
    handleMermaidTag(text) {
        var _a, _b;
        const title = (_b = (_a = /^.*/.exec(text)) === null || _a === void 0 ? void 0 : _a[0]) !== null && _b !== void 0 ? _b : '';
        const code = text.slice(title.length);
        return `#### ${title}\n\n${this.toMermaidBlock(code)}`;
    }
    /**
     * Replaces mermaid code blocks in Markdown text with mermaid blocks.
     */
    handleMermaidCodeBlocks(text) {
        return text.replace(/^```mermaid[ \t\r]*\n([\s\S]*?)^```[ \t]*$/gm, (m, code) => {
            return this.toMermaidBlock(code);
        });
    }
    /**
     * Creates a mermaid block for the given mermaid code.
     */
    toMermaidBlock(mermaidCode) {
        const htmlCode = html__namespace.escape(mermaidCode.trim());
        const dark = `<div class="mermaid dark">%%{init:{"theme":"dark"}}%%\n${htmlCode}</div>`;
        const light = `<div class="mermaid light">%%{init:{"theme":"default"}}%%\n${htmlCode}</div>`;
        const pre = `<pre><code class="language-mermaid">${htmlCode}</code></pre>`;
        return mermaidBlockStart + dark + light + pre + mermaidBlockEnd;
    }
    onEndPage(event) {
        if (event.contents !== undefined) {
            event.contents = this.insertMermaidScript(event.contents);
        }
    }
    onParseMarkdown(event) {
        event.parsedText = this.handleMermaidCodeBlocks(event.parsedText);
    }
    insertMermaidScript(html) {
        if (!html.includes(mermaidBlockStart)) {
            // this page doesn't need to load mermaid
            return html;
        }
        // find the closing </body> tag and insert our mermaid scripts
        const headEndIndex = html.indexOf('</head>');
        html = html.slice(0, headEndIndex) + style + html.slice(headEndIndex);
        // find the closing </body> tag and insert our mermaid scripts
        const bodyEndIndex = html.lastIndexOf('</body>');
        return html.slice(0, bodyEndIndex) + script + html.slice(bodyEndIndex);
    }
}

function load(app) {
    new MermaidPlugin().addToApplication(app);
}

exports.load = load;
