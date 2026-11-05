import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const outDir = path.resolve(process.cwd(), 'docs/screens/m2');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// 1. Adapter Architecture Diagram
const archDot = `digraph AdapterArchitecture {
  graph [rankdir=TB, bgcolor="#F8F9FA", fontname="DejaVu Sans", pad="0.4", nodesep="0.6", ranksep="0.6"];
  node [shape=box, fontname="DejaVu Sans", fontsize=10, style="filled,rounded", fillcolor="#FFFFFF", color="#495057", penwidth=1.2];
  edge [fontname="DejaVu Sans", fontsize=9, color="#495057", penwidth=1.2];

  client [label="Client Request\\n(HTTP Request with serp_session cookie)", fillcolor="#E9ECEF", shape=rect, style="filled,rounded", width=3.5];
  
  subgraph cluster_server {
    label="S-ERP Express Server (Node 20 / TypeScript)";
    fontsize=11;
    fontname="DejaVu Sans";
    color="#ADB5BD";
    style="rounded,dashed";
    bgcolor="#FFFFFF";

    middleware [label="Auth & RBAC Middleware\\n• authenticate (JWT decode & verify)\\n• requireRole (Administrator, Managers, Operator)\\n• Rate Limiter (Sliding Window 10/15m)", fillcolor="#E3F2FD"];
    router [label="Domain Route Controllers\\n(Org, Projects, Indicators, Governance)\\nNever import DB drivers directly", fillcolor="#E8F5E9"];
    adapter_interface [label="<<interface>> DbAdapter\\nquery<T>(sql, params): Promise<T[]>\\none<T>(sql, params): Promise<T | null>\\nmany<T>(sql, params): Promise<T[]>\\ninsert(sql, params): Promise<number>\\nexecute(sql, params): Promise<{affectedRows}>\\ntx<T>(fn): Promise<T>", fillcolor="#FFF3E0", fontname="DejaVu Sans Mono", fontsize=9];

    mysql_adapter [label="MySqlAdapter\\n• mysql2 Pool\\n• Parameterized Queries\\n• ACID Transactions (BEGIN/COMMIT)", fillcolor="#EDE7F6"];
    mongo_adapter [label="MongoAdapter\\n• AlaSQL Query Bridge\\n• BSON Collection Operations\\n• In-Memory / Standalone Session", fillcolor="#EDE7F6"];
  }

  subgraph cluster_dbs {
    label="Independent Database Engines (Docker Compose, 512MB RAM Limit)";
    fontsize=11;
    fontname="DejaVu Sans";
    color="#ADB5BD";
    style="rounded,dashed";
    bgcolor="#FFFFFF";

    mysql_db [label="MySQL 8.4 (SQL Engine)\\nPort 3307\\nInnoDB Tables & Relational FKs", fillcolor="#E1F5FE", shape=cylinder];
    mongo_db [label="MongoDB 6.0 (NoSQL Engine)\\nPort 27017\\nBSON Document Collections & Indexes", fillcolor="#E8F8F5", shape=cylinder];
  }

  client -> middleware [label="Engine selection in JWT"];
  middleware -> router [label="req.user { engine, role, userId }"];
  router -> adapter_interface [label="db = getAdapter(req.user.engine)"];
  
  adapter_interface -> mysql_adapter [label="engine == 'mysql'"];
  adapter_interface -> mongo_adapter [label="engine == 'mongodb'"];

  mysql_adapter -> mysql_db [label="TCP 3307 (mysql2 pool)"];
  mongo_adapter -> mongo_db [label="TCP 27017 (mongodb driver)"];
}
`;

// 2. Auth & RBAC Flow Diagram
const authDot = `digraph AuthFlow {
  graph [rankdir=TB, bgcolor="#F8F9FA", fontname="DejaVu Sans", pad="0.4", nodesep="0.5", ranksep="0.5"];
  node [shape=box, fontname="DejaVu Sans", fontsize=10, style="filled,rounded", fillcolor="#FFFFFF", color="#495057", penwidth=1.2];
  edge [fontname="DejaVu Sans", fontsize=9, color="#495057", penwidth=1.2];

  req [label="POST /api/auth/login\\n{ engine, username, password }", fillcolor="#E9ECEF", width=3.0];
  rate_check [label="Sliding Window Rate Limiter\\nAttempts in 15min window > 10?", shape=diamond, fillcolor="#FFF9C4"];
  rate_block [label="429 Too Many Requests\\nRetry-After: <seconds>", fillcolor="#FFCDD2"];
  
  db_lookup [label="Query app_user Table/Collection\\nSELECT password_hash, app_role, is_active FROM app_user\\nvia getAdapter(engine)", fillcolor="#E8F5E9"];
  user_exists [label="User exists & active?", shape=diamond, fillcolor="#FFF9C4"];
  err_401 [label="401 Unauthorized / 403 Deactivated", fillcolor="#FFCDD2"];

  pw_check [label="bcrypt.compare(password, password_hash)\\nCost factor: 12", shape=diamond, fillcolor="#FFF9C4"];
  sign_token [label="Generate HMAC-SHA256 Token\\nPayload: { userId, username, role, engine, empId }", fillcolor="#E1F5FE"];
  set_cookie [label="Set-Cookie: serp_session=<token>\\nHttpOnly, SameSite=Lax, Max-Age=24h\\nReturn JSON User Profile", fillcolor="#C8E6C9"];

  subgraph cluster_rbac {
    label="Subsequent Authenticated Requests";
    fontsize=11;
    fontname="DejaVu Sans";
    color="#ADB5BD";
    style="rounded,dashed";
    bgcolor="#FFFFFF";

    protected_req [label="GET /api/admin/* or /api/tactical/*\\nCookie: serp_session=..."];
    verify_token [label="authenticate middleware\\nVerify JWT signature & extract req.user"];
    role_check [label="requireRole(['Administrator'])", shape=diamond, fillcolor="#FFF9C4"];
    err_403 [label="403 Forbidden\\nInsufficient permissions", fillcolor="#FFCDD2"];
    exec_handler [label="Execute Handler with Adapter\\ngetAdapter(req.user.engine)", fillcolor="#C8E6C9"];
  }

  req -> rate_check;
  rate_check -> rate_block [label="Yes (>10)"];
  rate_check -> db_lookup [label="No (<=10)"];
  db_lookup -> user_exists;
  user_exists -> err_401 [label="No"];
  user_exists -> pw_check [label="Yes"];
  pw_check -> err_401 [label="Invalid hash"];
  pw_check -> sign_token [label="Match"];
  sign_token -> set_cookie;

  set_cookie -> protected_req [style="dashed", label="client stores cookie"];
  protected_req -> verify_token;
  verify_token -> role_check;
  role_check -> err_403 [label="Role not allowed"];
  role_check -> exec_handler [label="Role authorized"];
}
`;

fs.writeFileSync(path.join(outDir, 'adapter_architecture.dot'), archDot);
fs.writeFileSync(path.join(outDir, 'auth_rbac_flow.dot'), authDot);

execSync(`dot -Tpng ${path.join(outDir, 'adapter_architecture.dot')} -o ${path.join(outDir, 'adapter_architecture.png')}`);
execSync(`dot -Tpng ${path.join(outDir, 'auth_rbac_flow.dot')} -o ${path.join(outDir, 'auth_rbac_flow.png')}`);

console.log('Successfully generated M2 visual artifacts in docs/screens/m2/:');
console.log(' - adapter_architecture.png');
console.log(' - auth_rbac_flow.png');
