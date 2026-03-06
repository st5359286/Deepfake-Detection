/**
 * AI-Powered Code Scanner
 * Analyzes JavaScript files for bugs, errors, and provides fixes
 */

class CodeScanner {
  constructor() {
    this.issues = [];
    this.fixes = [];
    this.scannedFiles = [];
  }

  /**
   * Main analysis function
   */
  async analyzeCode(code, filename) {
    this.issues = [];
    this.fixes = [];
    this.scannedFiles = [filename];

    // Run all analyzers
    this.analyzeSyntax(code, filename);
    this.analyzeAsyncIssues(code, filename);
    this.analyzeUndefinedVariables(code, filename);
    this.analyzeCommonBugs(code, filename);
    this.analyzeSecurityIssues(code, filename);
    this.analyzeCodeSmells(code, filename);
    this.analyzeBestPractices(code, filename);

    return {
      filename,
      issues: this.issues,
      fixes: this.fixes,
      stats: {
        total: this.issues.length,
        critical: this.issues.filter((i) => i.severity === "critical").length,
        warning: this.issues.filter((i) => i.severity === "warning").length,
        info: this.issues.filter((i) => i.severity === "info").length,
      },
    };
  }

  /**
   * Analyze syntax issues
   */
  analyzeSyntax(code, filename) {
    const lines = code.split("\n");

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Check for unbalanced brackets
      const openBraces = (line.match(/{/g) || []).length;
      const closeBraces = (line.match(/}/g) || []).length;

      // Check for unfinished statements
      if (line.trim().endsWith("&&") || line.trim().endsWith("||")) {
        this.addIssue({
          type: "syntax",
          severity: "critical",
          line: lineNum,
          message: "Incomplete logical expression",
          code: line.trim(),
          fix: this.generateFix("incomplete_expression", line),
        });
      }

      // Check for missing semicolons (potential issues)
      const trimmed = line.trim();
      if (
        trimmed &&
        !trimmed.endsWith(";") &&
        !trimmed.endsWith("{") &&
        !trimmed.endsWith("}") &&
        !trimmed.endsWith(",") &&
        !trimmed.endsWith("(") &&
        !trimmed.endsWith(")") &&
        !trimmed.startsWith("//") &&
        !trimmed.startsWith("/*") &&
        !trimmed.startsWith("*") &&
        !trimmed.startsWith("*/")
      ) {
        // Only flag as warning, not critical
        if (
          index < lines.length - 1 &&
          lines[index + 1].trim().startsWith(".")
        ) {
          this.addIssue({
            type: "syntax",
            severity: "warning",
            line: lineNum,
            message:
              "Potential missing semicolon - method chaining detected on next line",
            code: line.trim(),
            fix: this.generateFix("missing_semicolon", line),
          });
        }
      }

      // Check for duplicate semicolons
      if (line.includes(";;")) {
        this.addIssue({
          type: "syntax",
          severity: "warning",
          line: lineNum,
          message: "Duplicate semicolons detected",
          code: line.trim(),
          fix: this.generateFix("duplicate_semicolon", line),
        });
      }
    });

    // Check overall bracket balance
    const allBraces = code.match(/[{}]/g) || [];
    let braceCount = 0;
    allBraces.forEach((b) => {
      if (b === "{") braceCount++;
      if (b === "}") braceCount--;
    });

    if (braceCount !== 0) {
      this.addIssue({
        type: "syntax",
        severity: "critical",
        line: 0,
        message: `Unbalanced braces: ${braceCount > 0 ? "missing" : "extra"} ${Math.abs(braceCount)} closing brace(s)`,
        code: "",
        fix: this.generateFix("unbalanced_braces", code),
      });
    }
  }

  /**
   * Analyze async/await issues
   */
  analyzeAsyncIssues(code, filename) {
    const lines = code.split("\n");
    const functionMatch = code.match(/async\s+(function|const|let|var)/g);
    const awaitMatch = code.match(/await\s+/g);

    // Check for async functions without await
    if (functionMatch && awaitMatch) {
      const asyncFunctions = this.findAsyncFunctions(code);
      asyncFunctions.forEach((fn) => {
        if (!fn.hasAwait && fn.body.includes("Promise")) {
          this.addIssue({
            type: "async",
            severity: "warning",
            line: fn.line,
            message: "Async function returns Promise but does not use await",
            code: fn.signature,
            fix: this.generateFix("missing_await", fn.signature),
          });
        }
      });
    }

    // Check for .then() without return
    const thenPattern = /\.then\s*\([^)]*\)\s*{/g;
    let match;
    const regex = /\.then\s*\([^)]*\)\s*\{/g;
    while ((match = regex.exec(code)) !== null) {
      const lineNum = code.substring(0, match.index).split("\n").length;
      const surrounding = this.getSurroundingLines(code, lineNum);

      if (!surrounding.includes("return") && !surrounding.includes("async")) {
        this.addIssue({
          type: "async",
          severity: "warning",
          line: lineNum,
          message: ".then() handler should return a value or be awaited",
          code: surrounding.trim().substring(0, 50),
          fix: this.generateFix("then_no_return", surrounding),
        });
      }
    }

    // Check for missing await before async operations
    const asyncOps = [
      "fetch(",
      "fs.readFile",
      "fs.writeFile",
      "db.query",
      "axios.",
      "http.request",
    ];
    lines.forEach((line, index) => {
      asyncOps.forEach((op) => {
        if (
          line.includes(op) &&
          !line.includes("await") &&
          !line.includes(".then")
        ) {
          this.addIssue({
            type: "async",
            severity: "warning",
            line: index + 1,
            message: `Async operation "${op}" may need await`,
            code: line.trim(),
            fix: this.generateFix("missing_await_async", line),
          });
        }
      });
    });

    // Check for try-catch without await in async
    const tryCatchPattern = /try\s*{[^}]*(?:await|fetch|query)[^}]*}catch/g;
    if (tryCatchPattern.test(code)) {
      // Good pattern - has try-catch
    } else if (
      code.includes("async") &&
      (code.includes("fetch") || code.includes("db."))
    ) {
      lines.forEach((line, index) => {
        if (
          (line.includes("await") || line.includes("fetch")) &&
          !line.includes("try")
        ) {
          this.addIssue({
            type: "async",
            severity: "info",
            line: index + 1,
            message: "Async operation should be wrapped in try-catch",
            code: line.trim(),
            fix: this.generateFix("missing_trycatch", line),
          });
        }
      });
    }
  }

  /**
   * Analyze undefined variables
   */
  analyzeUndefinedVariables(code, filename) {
    const lines = code.split("\n");

    // Common known globals and built-ins
    const knownGlobals = new Set([
      "console",
      "window",
      "document",
      "Math",
      "Date",
      "JSON",
      "Array",
      "Object",
      "String",
      "Number",
      "Boolean",
      "Promise",
      "Set",
      "Map",
      "require",
      "module",
      "exports",
      "process",
      "__dirname",
      "__filename",
      "Buffer",
      "setTimeout",
      "setInterval",
      "clearTimeout",
      "clearInterval",
      "navigator",
      "location",
      "history",
      "localStorage",
      "sessionStorage",
      "fetch",
      "alert",
      "confirm",
      "prompt",
      "parseInt",
      "parseFloat",
      "isNaN",
      "isFinite",
      "encodeURI",
      "decodeURI",
      "encodeURIComponent",
      "decodeURIComponent",
      "Error",
      "TypeError",
      "ReferenceError",
      "SyntaxError",
      "app",
      "db",
      "res",
      "req",
      "next",
      "err", // Express common params
    ]);

    // Find variable declarations
    const varDeclarations = new Set();
    const constDeclarations = new Set();
    let inBlockComment = false;

    lines.forEach((line, index) => {
      // Skip comments
      if (line.trim().startsWith("//")) return;
      if (line.includes("/*")) inBlockComment = true;
      if (line.includes("*/")) inBlockComment = false;
      if (inBlockComment) return;

      // const declarations
      const constMatch = line.match(/const\s+(\w+)/g);
      if (constMatch) {
        constMatch.forEach((m) => {
          const varName = m.replace("const", "").trim();
          constDeclarations.add(varName);
        });
      }

      // let/var declarations
      const letVarMatch = line.match(/(?:let|var)\s+(\w+)/g);
      if (letVarMatch) {
        letVarMatch.forEach((m) => {
          const varName = m.replace(/(?:let|var)/, "").trim();
          varDeclarations.add(varName);
        });
      }

      // Function parameters
      const funcMatch = line.match(/function\s+\w+\s*\(([^)]*)\)/);
      if (funcMatch) {
        const params = funcMatch[1]
          .split(",")
          .map((p) => p.trim())
          .filter((p) => p);
        params.forEach((p) => varDeclarations.add(p));
      }

      // Arrow functions
      const arrowMatch = line.match(
        /(?:const|let|var)\s+\w+\s*=\s*(?:async)?\s*\(([^)]*)\)\s*=>/,
      );
      if (arrowMatch) {
        const params = arrowMatch[1]
          .split(",")
          .map((p) => p.trim())
          .filter((p) => p);
        params.forEach((p) => varDeclarations.add(p));
      }
    });

    // Check for usage of undeclared variables
    lines.forEach((line, index) => {
      if (line.trim().startsWith("//")) return;

      // Skip import/require statements
      if (
        line.includes("require(") ||
        line.includes("import ") ||
        line.includes("from '")
      )
        return;

      // Find all identifiers
      const identifiers = line.match(/\b[a-zA-Z_]\w*\b/g) || [];

      identifiers.forEach((id) => {
        if (
          !knownGlobals.has(id) &&
          !varDeclarations.has(id) &&
          !constDeclarations.has(id)
        ) {
          // Check if it's a property access
          const isPropertyAccess = /\.\w+|\[\w+\]/.test(
            line.substring(
              line.indexOf(id) + id.length,
              line.indexOf(id) + id.length + 3,
            ),
          );

          if (!isPropertyAccess && id.length > 2) {
            // Avoid short common words
            // Check if it's being assigned or used as function
            const afterId = line.substring(line.indexOf(id) + id.length).trim();
            if (afterId.startsWith("=") || afterId.startsWith("(")) {
              // Might be an issue but check if it's a common pattern
              const commonWords = [
                "if",
                "else",
                "for",
                "while",
                "switch",
                "case",
                "return",
                "new",
                "this",
                "class",
                "function",
                "true",
                "false",
                "null",
                "undefined",
                "typeof",
                "instanceof",
                "void",
                "delete",
                "throw",
                "try",
                "catch",
                "finally",
                "with",
                "default",
                "export",
                "import",
                "extends",
                "super",
                "static",
                "get",
                "set",
                "async",
                "await",
                "yield",
                "let",
                "const",
                "var",
              ];
              if (!commonWords.includes(id)) {
                this.addIssue({
                  type: "undefined",
                  severity: "warning",
                  line: index + 1,
                  message: `Variable "${id}" may not be defined before use`,
                  code: line.trim(),
                  fix: this.generateFix("undefined_variable", line, id),
                });
              }
            }
          }
        }
      });
    });
  }

  /**
   * Analyze common bugs
   */
  analyzeCommonBugs(code, filename) {
    const lines = code.split("\n");

    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const trimmed = line.trim();

      // Assignment instead of comparison
      if (/if\s*\([^)]*=\s*[^=]/.test(trimmed)) {
        this.addIssue({
          type: "bug",
          severity: "critical",
          line: lineNum,
          message:
            "Assignment (=) used instead of comparison (== or ===) in condition",
          code: trimmed,
          fix: this.generateFix("assignment_comparison", line),
        });
      }

      // console.log left in production code
      if (trimmed.includes("console.log(") && !trimmed.startsWith("//")) {
        this.addIssue({
          type: "bug",
          severity: "info",
          line: lineNum,
          message:
            "console.log() statement found - consider removing for production",
          code: trimmed,
          fix: this.generateFix("console_log", line),
        });
      }

      // console.error in error handling
      if (trimmed.includes("console.error(")) {
        this.addIssue({
          type: "bug",
          severity: "info",
          line: lineNum,
          message:
            "console.error() should include context for better debugging",
          code: trimmed,
          fix: this.generateFix("console_error", line),
        });
      }

      // Empty catch block
      if (/catch\s*\([^)]*\)\s*{[\s]*}/.test(trimmed)) {
        this.addIssue({
          type: "bug",
          severity: "warning",
          line: lineNum,
          message: "Empty catch block - errors are being silently swallowed",
          code: trimmed,
          fix: this.generateFix("empty_catch", line),
        });
      }

      // Hardcoded credentials (basic detection)
      if (
        /(password|passwd|pwd|secret|token|api_key|apikey)\s*[:=]\s*['"][^'"]+['"]/i.test(
          trimmed,
        )
      ) {
        this.addIssue({
          type: "security",
          severity: "critical",
          line: lineNum,
          message: "Potential hardcoded credentials detected",
          code: trimmed,
          fix: this.generateFix("hardcoded_creds", line),
        });
      }

      // == instead of === (loose equality)
      if (
        /[^=!]=[^=]/.test(trimmed) &&
        !trimmed.startsWith("//") &&
        !trimmed.startsWith("*")
      ) {
        const looseEqMatch = trimmed.match(/([^=!])={1}([^=])/);
        if (looseEqMatch && !trimmed.includes("=>")) {
          this.addIssue({
            type: "bug",
            severity: "warning",
            line: lineNum,
            message: "Use strict equality (===) instead of loose equality (==)",
            code: trimmed,
            fix: this.generateFix("loose_equality", line),
          });
        }
      }

      // Missing return in function that should return
      if (trimmed.includes("function") && !trimmed.includes("=>")) {
        const funcName = trimmed.match(/function\s+(\w+)/);
        if (
          funcName &&
          funcName[1] &&
          !trimmed.includes("()") &&
          !trimmed.includes("async")
        ) {
          // Check if function body has return
          const funcStart = index;
          let braceCount = 0;
          let hasReturn = false;

          for (
            let i = funcStart;
            i < Math.min(funcStart + 50, lines.length);
            i++
          ) {
            if (lines[i].includes("{")) braceCount++;
            if (lines[i].includes("}")) braceCount--;
            if (lines[i].includes("return") && braceCount > 0) hasReturn = true;
            if (braceCount === 0 && i > funcStart) break;
          }
        }
      }

      // setTimeout/setInterval without clear
      if (trimmed.includes("setTimeout(") || trimmed.includes("setInterval(")) {
        const varMatch = trimmed.match(/(?:const|let|var)\s+(\w+)\s*=/);
        if (varMatch) {
          // Check if there's a corresponding clear somewhere
          const varName = varMatch[1];
          const hasClear =
            code.includes(`clearTimeout(${varName})`) ||
            code.includes(`clearInterval(${varName})`);

          if (
            !hasClear &&
            !code.includes("clearTimeout") &&
            !code.includes("clearInterval")
          ) {
            this.addIssue({
              type: "bug",
              severity: "info",
              line: lineNum,
              message: `Timer "${varName}" may need cleanup with clearTimeout/clearInterval`,
              code: trimmed,
              fix: this.generateFix("timer_cleanup", line),
            });
          }
        }
      }

      // eval() usage
      if (trimmed.includes("eval(")) {
        this.addIssue({
          type: "security",
          severity: "critical",
          line: lineNum,
          message: "Use of eval() is dangerous and can lead to code injection",
          code: trimmed,
          fix: this.generateFix("eval_usage", line),
        });
      }

      // innerHTML without sanitization
      if (
        /innerHTML\s*=/.test(trimmed) &&
        !trimmed.includes("sanitize") &&
        !trimmed.includes("escape")
      ) {
        this.addIssue({
          type: "security",
          severity: "warning",
          line: lineNum,
          message: "innerHTML assignment should sanitize input to prevent XSS",
          code: trimmed,
          fix: this.generateFix("innerHTML_xss", line),
        });
      }
    });
  }

  /**
   * Analyze security issues
   */
  analyzeSecurityIssues(code, filename) {
    const lines = code.split("\n");

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // SQL injection vulnerable patterns
      if (
        /\+.*['"`].*(?:query|sql|select|insert|update|delete)/i.test(trimmed) ||
        /`.*\$\{.*\}.*`/i.test(trimmed)
      ) {
        if (
          !trimmed.includes(" parameterized") &&
          !trimmed.includes("prepare")
        ) {
          this.addIssue({
            type: "security",
            severity: "critical",
            line: index + 1,
            message:
              "Potential SQL injection vulnerability - use parameterized queries",
            code: trimmed,
            fix: this.generateFix("sql_injection", line),
          });
        }
      }

      // Command injection
      if (/(?:exec|spawn|execSync|system)\s*\([^)]*\+/.test(trimmed)) {
        this.addIssue({
          type: "security",
          severity: "critical",
          line: index + 1,
          message:
            "Potential command injection - avoid concatenating user input to commands",
          code: trimmed,
          fix: this.generateFix("command_injection", line),
        });
      }

      // Weak crypto
      if (
        /crypto\.createHash\s*\(\s*['"]md5['"]/.test(trimmed) ||
        /crypto\.createHash\s*\(\s*['"]sha1['"]/.test(trimmed)
      ) {
        this.addIssue({
          type: "security",
          severity: "warning",
          line: index + 1,
          message: "Weak hashing algorithm - consider using sha256 or stronger",
          code: trimmed,
          fix: this.generateFix("weak_crypto", line),
        });
      }

      // CORS wildcard
      if (/cors\s*\(\s*\{[\s]*origin\s*:\s*['"]\*['"]/.test(trimmed)) {
        this.addIssue({
          type: "security",
          severity: "warning",
          line: index + 1,
          message:
            "CORS set to wildcard (*) - consider restricting to specific origins",
          code: trimmed,
          fix: this.generateFix("cors_wildcard", line),
        });
      }

      // Missing rate limiting
      if (
        trimmed.includes("/api/") &&
        !code.includes("rateLimit") &&
        !code.includes("rate-limit")
      ) {
        if (
          index === lines.length - 1 ||
          !lines.slice(index).some((l) => l.includes("rateLimit"))
        ) {
          this.addIssue({
            type: "security",
            severity: "info",
            line: index + 1,
            message: "API endpoint may need rate limiting",
            code: trimmed,
            fix: this.generateFix("rate_limiting", line),
          });
        }
      }
    });
  }

  /**
   * Analyze code smells
   */
  analyzeCodeSmells(code, filename) {
    const lines = code.split("\n");

    // Check function length
    let braceCount = 0;
    let funcStart = -1;
    let funcName = "";

    lines.forEach((line, index) => {
      if (line.includes("function ") || line.includes("=>")) {
        if (braceCount === 0) {
          funcStart = index;
          const match = line.match(/(?:function|const|let|var)\s+(\w+)/);
          funcName = match ? match[1] : "anonymous";
        }
      }

      if (funcStart >= 0) {
        braceCount += (line.match(/{/g) || []).length;
        braceCount -= (line.match(/}/g) || []).length;

        if (braceCount === 0 && funcStart >= 0) {
          const funcLength = index - funcStart + 1;
          if (funcLength > 100) {
            this.addIssue({
              type: "smell",
              severity: "info",
              line: funcStart + 1,
              message: `Function "${funcName}" is ${funcLength} lines long - consider breaking it down`,
              code: lines[funcStart].trim(),
              fix: this.generateFix("function_length", lines[funcStart]),
            });
          }
          funcStart = -1;
        }
      }
    });

    // Check for deep nesting
    let maxNesting = 0;
    let currentNesting = 0;
    lines.forEach((line, index) => {
      currentNesting += (line.match(/{/g) || []).length;
      maxNesting = Math.max(maxNesting, currentNesting);
      currentNesting -= (line.match(/}/g) || []).length;
    });

    if (maxNesting > 5) {
      this.addIssue({
        type: "smell",
        severity: "warning",
        line: 0,
        message: `Code has ${maxNesting} levels of nesting - consider refactoring`,
        code: "",
        fix: this.generateFix("deep_nesting", code),
      });
    }

    // Check for magic numbers
    lines.forEach((line, index) => {
      const magicNumberPattern =
        /(?:case|if|while|for|===|!==|==|!=|<|>|<=|>=)\s*(\d{2,})/g;
      let match;
      while ((match = magicNumberPattern.exec(line)) !== null) {
        const num = parseInt(match[1]);
        if (num > 1 && num !== 100 && num !== 1000) {
          // Exclude common numbers
          this.addIssue({
            type: "smell",
            severity: "info",
            line: index + 1,
            message: `Magic number "${num}" detected - consider using a named constant`,
            code: line.trim(),
            fix: this.generateFix("magic_number", line, match[1]),
          });
        }
      }
    });
  }

  /**
   * Analyze best practices
   */
  analyzeBestPractices(code, filename) {
    const lines = code.split("\n");

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // var instead of const/let
      if (/\bvar\s+\w+/.test(trimmed) && !trimmed.startsWith("//")) {
        this.addIssue({
          type: "best-practice",
          severity: "info",
          line: index + 1,
          message: 'Use "const" or "let" instead of "var" for better scoping',
          code: trimmed,
          fix: this.generateFix("var_const_let", line),
        });
      }

      // Deprecated methods
      if (/\.createElement\s*\(\s*['"]script['"]/.test(trimmed)) {
        this.addIssue({
          type: "security",
          severity: "critical",
          line: index + 1,
          message:
            "Dangerous: Creating script elements dynamically can lead to XSS",
          code: trimmed,
          fix: this.generateFix("create_script", line),
        });
      }

      // document.write
      if (trimmed.includes("document.write(")) {
        this.addIssue({
          type: "best-practice",
          severity: "warning",
          line: index + 1,
          message:
            "document.write() is deprecated and can cause issues - use DOM APIs instead",
          code: trimmed,
          fix: this.generateFix("document_write", line),
        });
      }

      // with statement
      if (/\bwith\s*\(/.test(trimmed)) {
        this.addIssue({
          type: "best-practice",
          severity: "warning",
          line: index + 1,
          message: '"with" statement is deprecated and has performance issues',
          code: trimmed,
          fix: this.generateFix("with_statement", line),
        });
      }

      // Prefer arrow functions for callbacks
      if (
        trimmed.includes("function") &&
        (trimmed.includes(".forEach") ||
          trimmed.includes(".map") ||
          trimmed.includes(".filter"))
      ) {
        this.addIssue({
          type: "best-practice",
          severity: "info",
          line: index + 1,
          message: "Consider using arrow functions for array method callbacks",
          code: trimmed,
          fix: this.generateFix("arrow_callback", line),
        });
      }

      // Missing error handling in promises
      if (
        trimmed.includes(".then(") &&
        !trimmed.includes(".catch(") &&
        !code.includes(".catch(")
      ) {
        this.addIssue({
          type: "best-practice",
          severity: "warning",
          line: index + 1,
          message: "Promise should have .catch() for error handling",
          code: trimmed,
          fix: this.generateFix("promise_catch", line),
        });
      }

      // Double negation
      if (/\!\!\w+/.test(trimmed)) {
        this.addIssue({
          type: "best-practice",
          severity: "info",
          line: index + 1,
          message:
            "Double negation (!!) is unnecessary - convert to Boolean() if needed",
          code: trimmed,
          fix: this.generateFix("double_negation", line),
        });
      }
    });
  }

  /**
   * Add issue to the list
   */
  addIssue(issue) {
    this.issues.push(issue);
    if (issue.fix) {
      this.fixes.push({
        originalLine: issue.line,
        issue: issue.message,
        fix: issue.fix,
      });
    }
  }

  /**
   * Generate AI-powered fix suggestion
   */
  generateFix(type, line, extra = "") {
    const fixes = {
      incomplete_expression: {
        description: "Complete the expression or remove incomplete code",
        code: line + " <expression>",
      },
      missing_semicolon: {
        description: "Add semicolon at end of statement",
        code: line.trim() + ";",
      },
      duplicate_semicolon: {
        description: "Remove duplicate semicolon",
        code: line.replace(/;;/g, ";"),
      },
      unbalanced_braces: {
        description: "Review and balance all braces in the code",
        code: "// Add or remove closing braces as needed",
      },
      missing_await: {
        description:
          "Use await for async operations or return Promise directly",
        code: line.replace(/return\s+/, "return await "),
      },
      missing_await_async: {
        description: "Add await keyword for async operations",
        code: "await " + line.trim(),
      },
      missing_trycatch: {
        description: "Wrap async code in try-catch block",
        code: `try {\n  ${line.trim()}\n} catch (err) {\n  console.error(err);\n}`,
      },
      undefined_variable: {
        description: `Define variable "${extra}" before use or check for typos`,
        code: `const ${extra} = /* value */;`,
      },
      assignment_comparison: {
        description: "Use === for strict equality comparison",
        code: line.replace(/([^=!])=([^=])/g, "$1===$2"),
      },
      console_log: {
        description: "Remove console.log or use a proper logging library",
        code: "// console.log(" + line.match(/\((.*)\)/)?.[1] || "" + ");",
      },
      console_error: {
        description: "Add context to console.error for better debugging",
        code: line.replace(
          /console\.error\((.*)\)/,
          'console.error("[Context]", $1)',
        ),
      },
      empty_catch: {
        description: "Add error handling in catch block or log the error",
        code: line.replace(
          /catch\s*\([^)]*\)\s*{}/,
          'catch (err) {\n  console.error("Error:", err);\n}',
        ),
      },
      hardcoded_creds: {
        description: "Use environment variables for sensitive data",
        code: line.replace(/:\s*['"][^'"]+['"]/, ": process.env."),
      },
      loose_equality: {
        description: "Use strict equality (===) for type-safe comparison",
        code: line.replace(/([^=!])={1}([^=])/g, "$1===$2"),
      },
      timer_cleanup: {
        description: "Store timer reference and clear when done",
        code: `const timer = ${line.trim()};\n// Later: clearTimeout(timer);`,
      },
      eval_usage: {
        description: "Avoid eval() - use safer alternatives",
        code: "// Use JSON.parse() or other safe parsing methods",
      },
      innerHTML_xss: {
        description: "Sanitize input before using innerHTML",
        code: line.replace(/innerHTML\s*=/, "textContent ="),
      },
      sql_injection: {
        description: "Use parameterized queries to prevent SQL injection",
        code: 'db.query("SELECT * FROM users WHERE id = ?", [userId])',
      },
      command_injection: {
        description: "Sanitize user input or use arrays for command arguments",
        code: "// Use execFile or spawn with array arguments",
      },
      weak_crypto: {
        description: "Use sha256 or stronger hashing algorithm",
        code: line.replace(/['"]md5['"]|['"]sha1['"]/, "'sha256'"),
      },
      cors_wildcard: {
        description: "Restrict CORS to specific origins",
        code: 'cors({ origin: ["https://yourdomain.com"] })',
      },
      rate_limiting: {
        description: "Add rate limiting middleware",
        code: "// app.use(rateLimit({ windowMs: 15*60*1000, max: 100 }))",
      },
      function_length: {
        description: "Break down into smaller, focused functions",
        code: "// Extract logic into separate functions",
      },
      deep_nesting: {
        description: "Reduce nesting with early returns or extract logic",
        code: "// Consider using guard clauses",
      },
      magic_number: {
        description: "Replace with named constant",
        code: line.replace(
          new RegExp(`\\b${extra}\\b`),
          "const " + extra.toUpperCase() + " = " + extra,
        ),
      },
      var_const_let: {
        description: "Replace var with const or let",
        code: line.replace(/\bvar\b/, "const"),
      },
      create_script: {
        description: "Avoid dynamically creating script elements",
        code: "// Use <script> tags in HTML or proper module loading",
      },
      document_write: {
        description: "Use DOM manipulation methods instead",
        code: line.replace(/document\.write\(/, "document.createElement("),
      },
      with_statement: {
        description: 'Avoid using "with" statement',
        code: line.replace(/\bwith\s*\(/, "// Consider using "),
      },
      arrow_callback: {
        description: "Convert to arrow function for cleaner syntax",
        code: line.replace(/function\s*\([^)]*\)/, "(param)"),
      },
      promise_catch: {
        description: "Add .catch() for error handling",
        code: line.replace(
          /\.then\(([^)]*)\)/,
          ".then($1).catch(err => console.error(err))",
        ),
      },
      double_negation: {
        description: "Use Boolean() or remove unnecessary conversion",
        code: line.replace(/!!/, "Boolean("),
      },
    };

    return (
      fixes[type] || { description: "Review and fix manually", code: line }
    );
  }

  /**
   * Find async functions in code
   */
  findAsyncFunctions(code) {
    const functions = [];
    const lines = code.split("\n");
    let currentFunction = null;

    lines.forEach((line, index) => {
      const asyncMatch = line.match(/(?:async\s+)?function\s+(\w+)?/);
      if (asyncMatch) {
        currentFunction = {
          name: asyncMatch[1] || "anonymous",
          line: index + 1,
          signature: line.trim(),
          hasAwait: line.includes("await"),
          body: "",
        };
      }

      if (currentFunction) {
        currentFunction.body += line + "\n";
        if (line.includes("await")) currentFunction.hasAwait = true;

        if (
          line.includes("}") &&
          currentFunction.body.split("{").length ===
            currentFunction.body.split("}").length
        ) {
          functions.push(currentFunction);
          currentFunction = null;
        }
      }
    });

    return functions;
  }

  /**
   * Get surrounding lines for context
   */
  getSurroundingLines(code, lineNum, range = 1) {
    const lines = code.split("\n");
    const start = Math.max(0, lineNum - range - 1);
    const end = Math.min(lines.length, lineNum + range);
    return lines.slice(start, end).join("\n");
  }
}

// Scanner instance
const codeScanner = new CodeScanner();

// DOM Elements
const scanStatus = document.getElementById("scan-status");
const resultPanel = document.getElementById("result-panel");
const resetBtn = document.getElementById("reset-scanner-btn");
const copyBtn = document.getElementById("copy-btn");
const qrInputFile = document.getElementById("qr-input-file");
const fileError = document.getElementById("file-error");

// Handle File Upload
qrInputFile.addEventListener("change", async (e) => {
  if (e.target.files.length === 0) return;

  const file = e.target.files[0];

  // Check if it's a JavaScript file
  if (!file.name.endsWith(".js")) {
    fileError.textContent =
      "Please upload a JavaScript (.js) file for analysis";
    fileError.classList.remove("hidden");
    return;
  }

  fileError.classList.add("hidden");
  scanStatus.textContent = "Analyzing code...";
  scanStatus.classList.remove("hidden");

  try {
    const code = await file.text();
    const result = await codeScanner.analyzeCode(code, file.name);
    displayResults(result);
  } catch (err) {
    console.error("Code analysis error", err);
    fileError.textContent = "Error analyzing code: " + err.message;
    fileError.classList.remove("hidden");
  }
});

// Display results in the new HTML structure
function displayResults(result) {
  const resultSummary = document.getElementById("result-summary");
  const issuesList = document.getElementById("issues-list");

  if (result.issues.length === 0) {
    resultSummary.innerHTML = `
            <div class="text-center py-8">
                <div class="text-green-500 text-5xl mb-4">✓</div>
                <h3 class="text-2xl font-bold text-green-500 mb-2">NO ISSUES FOUND</h3>
                <p class="text-gray-400">Your code looks clean!</p>
                <div class="mt-4 text-sm text-gray-500">
                    <p>File: ${result.filename}</p>
                </div>
            </div>
        `;
    issuesList.innerHTML = "";
  } else {
    // Summary
    resultSummary.innerHTML = `
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-xl font-bold text-white">Analysis Results</h3>
                <div class="text-sm">
                    <span class="text-gray-400">File: </span>
                    <span class="text-accent font-mono">${result.filename}</span>
                </div>
            </div>
            <div class="flex gap-4 text-sm mb-4">
                <span class="px-3 py-1 bg-red-500/20 text-red-500 rounded-full">Critical: ${result.stats.critical}</span>
                <span class="px-3 py-1 bg-yellow-500/20 text-yellow-500 rounded-full">Warnings: ${result.stats.warning}</span>
                <span class="px-3 py-1 bg-blue-500/20 text-blue-500 rounded-full">Info: ${result.stats.info}</span>
            </div>
        `;

    // Sort by severity
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    const sortedIssues = [...result.issues].sort(
      (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
    );

    let issuesHTML = "";
    sortedIssues.forEach((issue) => {
      const severityClasses = {
        critical: "issue-critical",
        warning: "issue-warning",
        info: "issue-info",
      };
      const severityColors = {
        critical: "text-red-500",
        warning: "text-yellow-500",
        info: "text-blue-500",
      };
      const typeLabels = {
        syntax: "Syntax",
        async: "Async",
        undefined: "Undefined Variable",
        bug: "Bug",
        security: "Security",
        smell: "Code Smell",
        "best-practice": "Best Practice",
      };

      issuesHTML += `
                <div class="${severityClasses[issue.severity]} p-4 rounded-lg">
                    <div class="flex justify-between items-start mb-2">
                        <div class="flex items-center gap-2">
                            <span class="${severityColors[issue.severity]} font-bold text-sm uppercase">[${issue.severity}]</span>
                            <span class="text-gray-500 text-xs">${typeLabels[issue.type] || issue.type}</span>
                        </div>
                        <span class="text-gray-500 text-xs">Line ${issue.line}</span>
                    </div>
                    <p class="text-gray-300 text-sm mb-2">${issue.message}</p>
                    <div class="bg-black/40 p-2 rounded text-xs font-mono text-gray-400 overflow-x-auto">
                        <pre class="whitespace-pre-wrap">${issue.code || "(see line " + issue.line + ")"}</pre>
                    </div>
                    ${
                      issue.fix
                        ? `
                        <div class="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded">
                            <p class="text-green-400 text-xs font-bold mb-1">🔧 SUGGESTED FIX:</p>
                            <p class="text-gray-300 text-xs mb-2">${issue.fix.description}</p>
                            <pre class="text-green-300 text-xs font-mono mt-1 bg-black/50 p-2 rounded">${issue.fix.code}</pre>
                        </div>
                    `
                        : ""
                    }
                </div>
            `;
    });

    issuesList.innerHTML = issuesHTML;
  }

  resultPanel.classList.remove("hidden");
  scanStatus.textContent = "ANALYSIS_COMPLETE";
  scanStatus.className = "text-sm text-green-500 font-bold";
}

// Reset button
resetBtn.addEventListener("click", () => {
  resultPanel.classList.add("hidden");
  qrInputFile.value = "";
  scanStatus.textContent = "Upload a JavaScript file to analyze";
  scanStatus.className = "text-sm text-gray-500";
});

// Copy button
copyBtn.addEventListener("click", () => {
  const textToCopy = resultPanel.innerText || resultPanel.textContent;
  navigator.clipboard.writeText(textToCopy).then(() => {
    const originalText = copyBtn.textContent;
    copyBtn.textContent = "COPIED!";
    setTimeout(() => {
      copyBtn.textContent = originalText;
    }, 2000);
  });
});

// Initialize on Load
document.addEventListener("DOMContentLoaded", () => {
  scanStatus.textContent = "Upload a JavaScript file to analyze";
  scanStatus.classList.remove("hidden");
});
