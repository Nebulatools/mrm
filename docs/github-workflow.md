# github-workflow.md – Versión 100% Accionable

0) Prerrequisitos
CLI: git, gh (GitHub CLI), jq, shell bash (o Git Bash en Windows)

Node + pnpm (o el package manager del repo)

Auth GitHub: gh auth login --web (verifica con gh auth status)

Permisos de push/PR en el repo

Editor con TypeScript

Todos los comandos se ejecutan desde la raíz del repo.

1) Flujo 5 Pasos (Inline-Friendly)
1. SPEC → /spec <slug> (o /spec con brain dump)
Crea docs/epics/<slug>/SPEC.md. Confirma (Y/N).

2. PLAN → /plan <slug>
Crea docs/epics/<slug>/PLAN.md (arquitectura, contratos, pasos, rollback, Role Matrix/Handoffs). Confirma (Y/N).

3. TASKS → /tasks <slug>
Escribe ## Tasks en el PLAN con exactamente 3 grupos y 4–10 ítems totales (checkbox llano). Los grupos deben ser encabezados:

Markdown

## [frontend]
- [ ] ...

## [backend]
- [ ] ...

## [qa]
- [ ] ...
Intenta crear EPIC + Issues por rol (requiere gh/token). Si falla, usa el fallback del paso 4.

4. ISSUES / FALLBACK (si el paso anterior no los materializó)
Crea EPIC + issues por rol (usa labels feature y role:*):

Bash

# 1) Labels (ignora errores si ya existen)
gh label create "feature" --color "5319E7"          2>/dev/null || true
gh label create "role:frontend" --color "0E8A16"    2>/dev/null || true
gh label create "role:backend"  --color "FBCA04"    2>/dev/null || true
gh label create "role:qa"       --color "5319E7"    2>/dev/null || true

# 2) EPIC
gh issue create -t "EPIC: <slug>" -b "Parent feature: **<slug>**"

# 3) Issues por rol
gh issue create -t "<slug>: frontend chunk" -l "feature,role:frontend" -b $'## [frontend]\n- [ ] …'
gh issue create -t "<slug>: backend chunk"  -l "feature,role:backend"  -b $'## [backend]\n- [ ] …'
gh issue create -t "<slug>: qa chunk"       -l "feature,role:qa"       -b $'## [qa]\n- [ ] …'
BUILD / REVIEW / CLEANUP (Ciclo de Desarrollo)
Rama por rol (manual) — base por defecto: dev (ajusta si usas main):
Bash

git fetch origin
git switch -c fe/issue-<N>-<slug> origin/dev   # FE
git switch -c be/issue-<N>-<slug> origin/dev   # BE
git switch -c qa/issue-<N>-<slug> origin/dev   # QA
/issue (sin args): actualiza context/WORK-IN-PROGRESS.md.

Contract Preflight (OBLIGATORIO en FE/BE; pega outputs al PR):
Bash

# Rutas reales del backend:
git ls-files 'app/api/**/route.ts' \
| sed -E 's#^app/api#\/api#; s#\/route\.ts$##' | sort -u

# Llamadas del cliente /api/ (evitar endpoints fantasma):
git grep -n 'fetch\(\s*["'\'']\/api\/' -- 'app/**' 'components/**' 'hooks/**' ':!node_modules'
Regla: si SPEC/PLAN 
= código, gana el código. No inventes endpoints.

Tests first → implementación mínima (usa feature flags si es riesgoso).

PR (draft ok) con Verification Guide y bullets de contrato (ver §3).

/review_pr: revisión humana + resolver hilos de @coderabbitai (ver §4).

Merge → /cleanup: changelog (3 líneas), reset WIP, purga tests efímeros, limpia ramas.

2) Golden Rules (Gobernanza)
Issue-oriented: ningún commit significativo sin Issue.

Pequeño & seguro: diffs mínimos, flags, rollback.

Test-first: sin tests, no hay nuevo comportamiento.

Code-first: código > docs cuando difieran (anótalo en el PR).

No endpoints fantasma: fetch() solo a rutas con app/api/**/route.ts.

UI en componentes: pages solo orquestan.

Idempotente: comandos/handlers seguros de re-ejecutar.

Sin secretos en logs o cliente.

Cleanup: borra artefactos de test efímeros.

3) PR: contenido mínimo
Contract Preflight outputs (dos comandos de arriba).

Lista de fetch("/api/...") y el app/api/**/route.ts correspondiente.

Verification Guide (pasos, URLs, flag si aplica, slow-network).

Nota si seguiste código sobre docs.

BE: ruta(s), request/response/headers + curl.

FE: confirma lógica en components/workflow/*/hooks (no en pages).

4) CodeRabbit en /review_pr (resolver hilos del bot)
Detecta hilos sin resolver del bot:
Bash

PR=<numero>
gh api graphql -f query='
  query($owner:String!, $repo:String!, $pr:Int!) {
    repository(owner:$owner, name:$repo) {
      pullRequest(number:$pr) {
        reviewThreads(first:100) {
          nodes { id isResolved comments(first:1){nodes{author{login} body}} }
        }
      }
    }
  }' -F owner=':owner' -F repo=':repo' -F pr="$PR" \
| jq -r '.data.repository.pullRequest.reviewThreads.nodes[]
  | select((.isResolved|not) and (.comments.nodes[0].author.login=="coderabbitai"))
  | [.id, (.comments.nodes[0].body|gsub("\n";" "))] | @tsv'
Responder y marcar como resuelto (si aplica):
Bash

THREAD_ID="<id>"
# Responder en el hilo
gh api graphql -f query='
  mutation($thread:ID!, $body:String!) {
    addPullRequestReviewComment(input:{pullRequestReviewThreadId:$thread, body:$body}) {
      comment { url }
    }
  }' -F thread="$THREAD_ID" -F body="Fix applied; added tests. Please re-check."
# Resolver hilo
gh api graphql -f query='
  mutation($thread:ID!) {
    resolveReviewThread(input:{threadId:$thread}) { thread { isResolved } }
  }'' -F thread="$THREAD_ID"
Cerrar la revisión:
Bash

# Aprobar
gh pr review <PR> --approve -b "All CodeRabbit threads resolved. Tests green. LGTM."
# O pedir cambios
gh pr review <PR> --request-changes -b "Pending items: …"
5) Tooling & Permissions
Puedes usar: git, gh (incl. gh api), bash/sed/grep/awk/jq/curl, node, pnpm, y runners de test existentes.

Si gh falla: gh auth status → gh auth login --web → fallback gh api para abrir PRs/comentar.

6) Política de Tests (Permanentes vs Efímeros)
Permanentes: valor continuo → se quedan (CI).

Efímeros: nómbralos para que /cleanup los borre:

Carpetas: tests/_scratch/**, tests/_gen/**, e2e/_scratch/**

Sufijos: *.gen.test.ts, *.bt.test.ts

7) /cleanup (Post-merge, seguro)
Bash

# 1) Changelog (3 líneas) en context/CHANGELOG-YYYY-MM.md.

# 2) Reset context/WORK-IN-PROGRESS.md
cat > context/WORK-IN-PROGRESS.md <<'EOF'
# Work In Progress
(empty after merge)
EOF

# 3) Purga solo efímeros
rm -rf tests/_scratch tests/_gen e2e/_scratch || true
find tests -type f \( -name "*.gen.test.ts" -o -name "*.bt.test.ts" \) -delete 2>/dev/null || true
find e2e   -type f \( -name "*.gen.test.ts" -o -name "*.bt.test.ts" \) -delete 2>/dev/null || true

# 4) Commit & ramas
git add -A
git commit -m "chore: post-PR cleanup (changelog, WIP reset, purge ephemeral tests)" || true
git fetch --all --prune
CURRENT="$(git branch --show-current)"
[[ "$CURRENT" =~ ^(fe|be|qa)/issue- ]] && git branch -d "$CURRENT" || true
[ -n "$CURRENT" ] && git push origin --delete "$CURRENT" 2>/dev/null || true
git remote prune origin
8) Convenciones y Tips
Rama base: usa dev por defecto (ajusta si trabajas con main).

Naming estricto: fe|be|qa/issue-<N>-<slug> (minúsculas, guiones).

Flags: activa solo en entornos controlados (NEXT_PUBLIC_FEATURE_FLAGS si aplica).

No “request changes” a tu propio PR: deja comentario + label needs-change.

Windows: usa Git Bash para los comandos.
