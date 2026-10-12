# =============================================================================
# SKILL TAXONOMY UTILITIES FOR ROADMAP GENERATION
# =============================================================================
# Covers: stop_words, synonyms, framework→language mapping,
#         mutually exclusive skill clusters
# =============================================================================

# ─────────────────────────────────────────────────────────────────────────────
# 1. STOP WORDS
#    Tokens to strip BEFORE skill extraction from vacancy text / CV text.
#    Organised into thematic sub-groups for easy maintenance.
# ─────────────────────────────────────────────────────────────────────────────

STOP_WORDS: set[str] = {
    # --- generic connectors / prepositions ---
    "and", "or", "of", "in", "to", "with", "for", "on", "at", "by",
    "from", "as", "an", "a", "the", "is", "are", "was", "were",
    "be", "been", "being", "have", "has", "had", "do", "does", "did",
    "will", "would", "should", "could", "may", "might", "shall",
    "not", "no", "but", "if", "than", "that", "this", "these", "those",
    "its", "it", "we", "you", "our", "your", "their", "them", "they",
    "he", "she", "his", "her",

    # --- job-description boilerplate ---
    "experience", "knowledge", "understanding", "proficiency", "familiarity",
    "ability", "skill", "skills", "competency", "competencies",
    "background", "expertise", "proven", "demonstrated", "solid",
    "strong", "good", "excellent", "great", "deep", "hands-on",
    "working", "practical", "professional", "advanced", "basic",
    "intermediate", "junior", "senior", "lead", "principal",
    "required", "preferred", "desired", "optional", "bonus", "plus",
    "must", "nice", "advantageous", "beneficial",
    "minimum", "least", "years", "year", "months", "month",
    "relevant", "related", "equivalent",

    # --- corporate / HR language ---
    "team", "teams", "member", "collaboration", "collaborative",
    "communication", "written", "verbal", "oral", "fluent",
    "degree", "bachelor", "master", "phd", "diploma", "certified",
    "certification", "certificate",
    "responsibilities", "duties", "tasks", "role", "position",
    "opportunity", "environment", "company", "organization",
    "startup", "enterprise", "client", "customer", "stakeholder",
    "delivery", "deliverable", "deadline", "agile", "scrum", "kanban",
    "methodology", "best", "practices", "standards", "guidelines",

    # --- vague adjectives that add no signal ---
    "new", "modern", "latest", "current", "cutting-edge", "state-of-the-art",
    "innovative", "scalable", "robust", "reliable", "efficient",
    "high", "low", "large", "small", "big", "fast", "real", "time",
    "real-time", "distributed", "complex", "simple",

    # --- numeric / punctuation artefacts ---
    "1", "2", "3", "4", "5", "6", "7", "8", "9", "0",
    "+", "#", ".",

    # Oficce software (often mentioned in non-dev roles or as "nice to have" rather than core skills)
    "word", "powerpoint", "outlook", "spreadsheet", "sheets", "visio", "ms access", "msaccess",
    # OS and environments (often mentioned in passing or as "nice to have" rather than core skills)
    "windows", "macos", "linux", "unix", "ubuntu", "debian", "arch", "centos", "fedora", "suse", "redhat", "kali", "wsl",
    # Messengers and comms tools (often mentioned in passing or as "nice to have" rather than core skills)
    "zoom", "webex", "google chat", "wire", "ringcentral", "unify",
    # Terminals and shells (often mentioned in passing or as "nice to have" rather than core skills)
    "flow", "terminal", "homebrew"
}


# ─────────────────────────────────────────────────────────────────────────────
# 2. SYNONYMS  →  canonical skill name
#    Key   = raw token (lower-cased) found in vacancy / CV text
#    Value = canonical name used everywhere else in the system
# ─────────────────────────────────────────────────────────────────────────────

SYNONYMS: dict[str, str] = {

    # ── Programming languages ─────────────────────────────────────────────
    "py":               "python",
    "python3":          "python",
    "golang":           "go",
    "js":               "javascript",
    "es6":              "javascript",
    "es2015":           "javascript",
    "ecmascript":       "javascript",
    "ts":               "typescript",
    "c-sharp":          "c#",
    "csharp":           "c#",
    "dotnet":           "c#",
    ".net":             "c#",
    "cplusplus":        "c++",
    "cpp":              "c++",
    "rb":               "ruby",
    "kt":               "kotlin",
    "vb":               "visual basic",
    "vbnet":            "vb.net",
    "visualbasic":      "visual basic",
    "tsql":             "t-sql",
    "plsql":            "sql",
    "pl/sql":           "sql",
    "mysql":            "sql",          # treated as lang context; also in DBs
    "postgres":         "postgresql",
    "postgresql":       "postgresql",
    "nosql":            "no-sql",
    "mongo":            "mongodb",

    # ── Web frameworks ────────────────────────────────────────────────────
    "reactjs":          "react.js",
    "react":            "react.js",
    "nextjs":           "next.js",
    "next":             "next.js",
    "vuejs":            "vue.js",
    "vue":              "vue.js",
    "nuxtjs":           "nuxt.js",
    "nuxt":             "nuxt.js",
    "angularjs":        "angular.js",
    "angular":          "angular",
    "emberjs":          "ember.js",
    "ember":            "ember.js",
    "expressjs":        "express",
    "nodejsexpress":    "express",
    "nodejs":           "node.js",
    "node":             "node.js",
    "django rest":      "django",
    "drf":              "django",
    "flask api":        "flask",
    "fastapi":          "fastapi",
    "fast-api":         "fastapi",
    "rubyonrails":      "ruby on rails",
    "rails":            "ruby on rails",
    "ror":              "ruby on rails",
    "aspnet":           "asp.net",
    "aspnetcore":       "asp.net core",
    "asp.netcore":      "asp.net core",
    "blazorwasm":       "blazor",


    # ── ML / Data libraries ───────────────────────────────────────────────
    "sklearn":          "scikit-learn",
    "scikit":           "scikit-learn",
    "sk-learn":         "scikit-learn",
    "tf":               "tensorflow",
    "tf2":              "tensorflow",
    "torch":            "pytorch",
    "hf":               "hugging face",
    "huggingface":      "hugging face",
    "transformers":     "hugging face",
    "np":               "numpy",
    "pd":               "pandas",
    "plt":              "matplotlib",
    "mpl":              "matplotlib",
    "sns":              "seaborn",
    "cv2":              "opencv",
    "cv":               "opencv",
    "pyspark":          "spark",
    "apache spark":     "spark",
    "apache kafka":     "kafka",
    "apache airflow":   "airflow",

    # ── Cloud / platforms ─────────────────────────────────────────────────
    "amazon web services": "aws",
    "amazon aws":       "aws",
    "google cloud":     "gcp",
    "google cloud platform": "gcp",
    "microsoft azure":  "azure",
    "azure cloud":      "azure",
    "big query":        "bigquery",
    "google bigquery":  "bigquery",
    "aws redshift":     "redshift",
    "amazon redshift":  "redshift",
    "aurora rds":       "aurora",
    "aws aurora":       "aurora",
    "ibm watson":       "watson",

    # ── Databases ─────────────────────────────────────────────────────────
    "ms sql":           "sql server",
    "mssql":            "sql server",
    "sqlserver":        "sql server",
    "microsoft sql server": "sql server",
    "sql lite":         "sqlite",
    "elastic":          "elasticsearch",
    "es":               "elasticsearch",
    "cassandra db":     "cassandra",
    "couch db":         "couchdb",
    "dynamo":           "dynamodb",
    "amazon dynamodb":  "dynamodb",
    "firestore":        "firebase",     # firestore listed separately but same eco
    "neo4j":            "neo4j",
    "mariadb":          "mariadb",
    "redis cache":      "redis",

    # ── DevOps / tooling ──────────────────────────────────────────────────
    "k8s":              "kubernetes",
    "k8":               "kubernetes",
    "kube":             "kubernetes",
    "docker compose":   "docker",
    "docker-compose":   "docker",
    "containers":       "docker",
    "containerization": "docker",
    "tf":               "terraform",    # ambiguous – context-resolved upstream
    "iac":              "terraform",
    "ci/cd":            "jenkins",      # generic CI/CD → Jenkins as anchor
    "cicd":             "jenkins",
    "gh actions":       "github",
    "github actions":   "github",
    "bitbucket pipelines": "bitbucket",
    "gitlab ci":        "gitlab",
    "version control":  "git",
    "vcs":              "git",

    # ── BI / Analyst tools ────────────────────────────────────────────────
    "power bi":         "powerbi",
    "powerbi desktop":  "powerbi",
    "ms excel":         "excel",
    "microsoft excel":  "excel",
    "google sheets":    "sheets",
    "ms access":        "msaccess",
    "microsoft access": "msaccess",
    "ms powerpoint":    "powerpoint",
    "microsoft powerpoint": "powerpoint",
    "qlikview":         "qlik",
    "qlik sense":       "qlik",
    "microsoft ssrs":   "ssrs",
    "sql server reporting": "ssrs",
    "microsoft ssis":   "ssis",
    "sql server integration": "ssis",

    # ── OS / environments ─────────────────────────────────────────────────
    "ubuntu linux":     "ubuntu",
    "red hat":          "redhat",
    "rhel":             "redhat",
    "centos linux":     "centos",
    "mac os":           "macos",
    "mac os x":         "macos",
    "osx":              "macos",
    "windows server":   "windows",
    "win":              "windows",
    "wsl2":             "wsl",
    "windows subsystem": "wsl",

    # ── Async / PM tools ──────────────────────────────────────────────────
    "atlassian jira":   "jira",
    "atlassian confluence": "confluence",
    "monday":           "monday.com",
    "click up":         "clickup",
    "ms planner":       "planner",
    "microsoft planner": "planner",
    "ms lists":         "microsoft lists",

    # ── Sync / comms ──────────────────────────────────────────────────────
    "ms teams":         "microsoft teams",
    "google meet":      "google chat",   # closest canonical
    "cisco webex":      "webex",
    "zoom meetings":    "zoom",
}


# ─────────────────────────────────────────────────────────────────────────────
# 3. FRAMEWORK → LANGUAGE MAPPING
#    When a framework is detected, the mapped language is automatically
#    inferred (if not already present in the candidate's skill set).
#    This lets the roadmap engine add implicit prerequisites.
# ─────────────────────────────────────────────────────────────────────────────

FRAMEWORK_LANGUAGE_MAP: dict[str, str] = {

    # ── JavaScript / TypeScript ecosystem ────────────────────────────────
    "react.js":         "javascript",
    "next.js":          "javascript",
    "vue.js":           "javascript",
    "nuxt.js":          "javascript",
    "angular":          "typescript",    # Angular is TS-first
    "angular.js":       "javascript",
    "ember.js":         "javascript",
    "svelte":           "javascript",
    "gatsby":           "javascript",
    "express":          "javascript",
    "node.js":          "javascript",
    "deno":             "typescript",
    "fastify":          "javascript",

    # ── Python ecosystem ──────────────────────────────────────────────────
    "django":           "python",
    "flask":            "python",
    "fastapi":          "python",
    "scikit-learn":     "python",
    "tensorflow":       "python",
    "pytorch":          "python",
    "keras":            "python",
    "pandas":           "python",
    "numpy":            "python",
    "matplotlib":       "python",
    "seaborn":          "python",
    "plotly":           "python",
    "airflow":          "python",
    "pyspark":          "python",
    "nltk":             "python",
    "opencv":           "python",
    "hugging face":     "python",
    "selenium":         "python",
    "jupyter":          "python",

    # ── Ruby ecosystem ────────────────────────────────────────────────────
    "ruby on rails":    "ruby",
    "sinatra":          "ruby",

    # ── PHP ecosystem ─────────────────────────────────────────────────────
    "laravel":          "php",
    "symfony":          "php",
    "drupal":           "php",

    # ── Java ecosystem ────────────────────────────────────────────────────
    "spring":           "java",
    "play framework":   "java",         # also Scala        # also Python/Scala

    # ── Kotlin / Android ─────────────────────────────────────────────────
    "android":          "kotlin",

    # ── Swift / iOS ───────────────────────────────────────────────────────
    "ios":              "swift",

    # ── C# / .NET ecosystem ───────────────────────────────────────────────
    "asp.net":          "c#",
    "asp.net core":     "c#",
    "blazor":           "c#",
    "unity":            "c#",

    # ── Scala ecosystem ───────────────────────────────────────────────────
    "akka":             "scala",

    # ── Go ecosystem ──────────────────────────────────────────────────────
    "gin":              "go",
    "fiber":            "go",

    # ── Rust ecosystem ────────────────────────────────────────────────────
    "actix":            "rust",
    "tokio":            "rust",

    # ── Dart ─────────────────────────────────────────────────────────────
    "flutter":          "dart",

    # ── R ecosystem ───────────────────────────────────────────────────────
    "ggplot2":          "r",
    "dplyr":            "r",
    "tidyr":            "r",
    "tidyverse":        "r",
    "rshiny":           "r",
    "mlr":              "r",

    # ── Elixir ───────────────────────────────────────────────────────────
    "phoenix":          "elixir",

    # ── Clojure ──────────────────────────────────────────────────────────
    "luminus":          "clojure",

    # ── MATLAB ───────────────────────────────────────────────────────────
    "simulink":         "matlab",

    # ── SQL-adjacent ─────────────────────────────────────────────────────
    "dax":              "sql",           # DAX is SQL-family for Power BI

    # ── Mobile cross-platform ────────────────────────────────────────────
    "ionic":            "typescript",
    "capacitor":        "typescript",
    "cordova":          "javascript",
    "xamarin":          "c#",
    "react native":     "javascript",

    # ── DevOps scripting ─────────────────────────────────────────────────
    "ansible":          "yaml",
    "terraform":        "hcl",
    "puppet":           "ruby",
    "chef":             "ruby",
    "jenkins":          "groovy",
}


# ─────────────────────────────────────────────────────────────────────────────
# 4. MUTUALLY EXCLUSIVE SKILL CLUSTERS
#    Each sub-list is a "choose-one" group.
#    In the roadmap, recommending one makes the others lower-priority
#    (we don't suggest learning all three CSS frameworks simultaneously, etc.)
#
#    Structure:
#      {
#        "group_id":   short identifier for the cluster,
#        "label":      human-readable name,
#        "skills":     list of canonical skill names,
#        "note":       why they're mutually exclusive
#      }
# ─────────────────────────────────────────────────────────────────────────────

MUTUALLY_EXCLUSIVE_CLUSTERS: list[dict] = [

    # ── Front-end frameworks ─────────────────────────────────────────────
    {
        "group_id": "fe_framework",
        "label":    "Front-end UI Framework",
        "skills":   ["react.js", "vue.js", "angular", "svelte", "ember.js"],
        "note":     "Pick one primary SPA framework per project/career track",
    },
    {
        "group_id": "react_meta",
        "label":    "React Meta-framework",
        "skills":   ["next.js", "gatsby"],
        "note":     "Both build on React; a project uses one, not both",
    },
    {
        "group_id": "vue_meta",
        "label":    "Vue Meta-framework",
        "skills":   ["nuxt.js"],            # single entry; kept for graph logic
        "note":     "Nuxt is the de-facto Vue meta-framework",
    },

    # ── Back-end framework per language ──────────────────────────────────
    {
        "group_id": "python_web",
        "label":    "Python Web Framework",
        "skills":   ["django", "flask", "fastapi"],
        "note":     "Competing Python web frameworks; teams commit to one",
    },
    {
        "group_id": "js_backend",
        "label":    "JS/TS Server Framework",
        "skills":   ["express", "fastify", "node.js"],
        "note":     "express/fastify both run on Node; pick one API layer",
    },
    {
        "group_id": "dotnet_web",
        "label":    ".NET Web Framework",
        "skills":   ["asp.net", "asp.net core", "blazor"],
        "note":     "asp.net core supersedes asp.net; blazor is separate paradigm",
    },
    {
        "group_id": "php_web",
        "label":    "PHP Web Framework",
        "skills":   ["laravel", "symfony", "drupal"],
        "note":     "Competing PHP frameworks",
    },
    {
        "group_id": "ruby_web",
        "label":    "Ruby Web Framework",
        "skills":   ["ruby on rails"],
        "note":     "Rails dominates; sinatra is micro-only",
    },

    # ── Cloud provider ───────────────────────────────────────────────────
    {
        "group_id": "cloud_provider",
        "label":    "Primary Cloud Provider",
        "skills":   ["aws", "azure", "gcp", "ibm cloud", "digitalocean", "linode", "ovh"],
        "note":     "Deep specialisation typically means one primary provider",
    },
    {
        "group_id": "cloud_dw",
        "label":    "Cloud Data Warehouse",
        "skills":   ["bigquery", "redshift", "snowflake", "databricks"],
        "note":     "Organisations run one primary analytical store",
    },

    # ── ML frameworks ────────────────────────────────────────────────────
    {
        "group_id": "dl_framework",
        "label":    "Deep Learning Framework",
        "skills":   ["tensorflow", "pytorch", "mxnet", "theano", "chainer","jax","keras"],
        "note":     "TF and PyTorch have converged; teams pick one",
    },
    {
        "group_id": "ml_library",
        "label":    "Classical ML Library",
        "skills":   ["scikit-learn", "mlpack", "shogun", "mlr"],
        "note":     "scikit-learn is dominant in Python; mlr in R",
    },

    # ── BI / visualisation ───────────────────────────────────────────────
    {
        "group_id": "bi_tool",
        "label":    "BI / Reporting Tool",
        "skills":   ["powerbi", "tableau", "looker", "qlik", "microstrategy",
                     "cognos", "ssrs"],
        "note":     "Enterprises standardise on one BI platform",
    },
    {
        "group_id": "viz_library",
        "label":    "Python Visualisation Library",
        "skills":   ["matplotlib", "seaborn", "plotly"],
        "note":     "matplotlib is base; seaborn/plotly are specialised wrappers",
    },

    # ── Databases (relational vs NoSQL) ──────────────────────────────────
    {
        "group_id": "rdbms",
        "label":    "Relational Database",
        "skills":   ["postgresql", "mysql", "mariadb", "sql server",
                     "sqlite", "oracle", "db2", "aurora","sql"],
        "note":     "Projects use one primary RDBMS",
    },
    {
        "group_id": "document_db",
        "label":    "Document Database",
        "skills":   ["mongodb", "couchdb", "couchbase", "firebase", "firestore"],
        "note":     "Competing document-store solutions",
    },
    {
        "group_id": "wide_column",
        "label":    "Wide-Column / Time-Series Store",
        "skills":   ["cassandra", "dynamodb", "elasticsearch"],
        "note":     "Different scaling models; typically one per use-case",
    },

    # ── IaC tools ────────────────────────────────────────────────────────
    {
        "group_id": "iac",
        "label":    "Infrastructure-as-Code",
        "skills":   ["terraform", "pulumi", "ansible", "chef", "puppet"],
        "note":     "Teams standardise IaC toolchain; Terraform vs Pulumi is key split",
    },

    # ── CI/CD ────────────────────────────────────────────────────────────
    {
        "group_id": "cicd",
        "label":    "CI/CD Platform",
        "skills":   ["jenkins", "github", "gitlab", "bitbucket", "codecommit"],
        "note":     "CI platform is usually tied to the VCS choice",
    },

    # ── Version control platforms ────────────────────────────────────────
    {
        "group_id": "vcs_platform",
        "label":    "VCS Hosting Platform",
        "skills":   ["github", "gitlab", "bitbucket"],
        "note":     "Organisations typically use one Git platform",
    },

    # ── Mobile cross-platform ────────────────────────────────────────────
    {
        "group_id": "cross_platform_mobile",
        "label":    "Cross-Platform Mobile Framework",
        "skills":   ["flutter", "react native", "ionic", "xamarin", "cordova"],
        "note":     "Teams pick one cross-platform stack",
    },

    # ── Async / project management ───────────────────────────────────────
    {
        "group_id": "pm_tool",
        "label":    "Project Management Tool",
        "skills":   ["jira", "asana", "trello", "clickup", "notion",
                     "monday.com", "wrike", "smartsheet", "airtable"],
        "note":     "Teams use one primary PM tool",
    },
    {
        "group_id": "wiki_tool",
        "label":    "Wiki / Knowledge Base",
        "skills":   ["confluence", "notion"],
        "note":     "Competing knowledge management tools",
    },

    # ── Real-time comms ──────────────────────────────────────────────────
    {
        "group_id": "team_chat",
        "label":    "Team Chat Platform",
        "skills":   ["slack", "microsoft teams", "google chat",
                     "mattermost", "rocketchat"],
        "note":     "Organisations standardise on one messaging platform",
    },

    # ── ETL / pipeline orchestration ─────────────────────────────────────
    {
        "group_id": "etl_tool",
        "label":    "ETL / Pipeline Orchestration",
        "skills":   ["ssis", "spark","hadoop"],
        "note":     "Different latency tiers (batch vs stream); Airflow vs Kafka",
    },

    # ── Statistical / scientific computing ──────────────────────────────
    {
        "group_id": "stat_language",
        "label":    "Statistical Computing Language",
        "skills":   ["r", "matlab", "sas", "spss"],
        "note":     "Analysts pick one primary statistical environment",
    },

    # ── Game engines ─────────────────────────────────────────────────────
    {
        "group_id": "game_engine",
        "label":    "Game Engine",
        "skills":   ["unity", "unreal"],
        "note":     "Unity (C#) vs Unreal (C++) — project-level commitment",
    },

    # ── Search / analytics engines ───────────────────────────────────────
    {
        "group_id": "search_engine",
        "label":    "Search / Log Analytics Engine",
        "skills":   ["elasticsearch", "splunk"],
        "note":     "Both do log analysis; Splunk is enterprise-proprietary",
    },
]


# ─────────────────────────────────────────────────────────────────────────────
# 5. HELPER UTILITIES
# ─────────────────────────────────────────────────────────────────────────────

def normalize_skill(raw: str) -> str:
    """Lowercase + synonym-resolve a raw skill token."""
    token = raw.strip().lower()
    return SYNONYMS.get(token, token)


def infer_languages(skills: list[str]) -> set[str]:
    """
    Given a list of canonical skills, return the set of programming languages
    that can be inferred from detected frameworks / libraries.
    Only adds a language if it is NOT already in `skills`.
    """
    skill_set = {normalize_skill(s) for s in skills}
    inferred: set[str] = set()
    for skill in skill_set:
        lang = FRAMEWORK_LANGUAGE_MAP.get(skill)
        if lang and lang not in skill_set:
            inferred.add(lang)
    return inferred


def get_exclusive_group(skill: str) -> dict | None:
    """Return the mutual-exclusion cluster a skill belongs to, or None."""
    canonical = normalize_skill(skill)
    for cluster in MUTUALLY_EXCLUSIVE_CLUSTERS:
        if canonical in cluster["skills"]:
            return cluster
    return None


def get_cluster_alternatives(skill: str) -> list[str]:
    """Return the other skills in the same mutual-exclusion cluster."""
    cluster = get_exclusive_group(skill)
    if not cluster:
        return []
    canonical = normalize_skill(skill)
    return [s for s in cluster["skills"] if s != canonical]
