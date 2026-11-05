import mysql from 'mysql2/promise';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import dotenv from 'dotenv';

dotenv.config();

async function generateErDiagram(): Promise<void> {
  const mysqlConn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT) || 3307,
    user: process.env.MYSQL_USER || 'serp',
    password: process.env.MYSQL_PASSWORD || 'serp_password',
    database: process.env.MYSQL_DATABASE || 'serp',
  });

  try {
    // 1. Get tables
    const [tables]: any = await mysqlConn.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_type = 'BASE TABLE' ORDER BY table_name",
      [process.env.MYSQL_DATABASE || 'serp']
    );

    // 2. Get columns
    const [columns]: any = await mysqlConn.query(
      `SELECT table_name, column_name, column_type, is_nullable, column_key 
       FROM information_schema.columns 
       WHERE table_schema = ? 
       ORDER BY table_name, ordinal_position`,
      [process.env.MYSQL_DATABASE || 'serp']
    );

    // 3. Get foreign keys
    const [fks]: any = await mysqlConn.query(
      `SELECT table_name, column_name, referenced_table_name, referenced_column_name 
       FROM information_schema.key_column_usage 
       WHERE table_schema = ? AND referenced_table_name IS NOT NULL`,
      [process.env.MYSQL_DATABASE || 'serp']
    );

    const colsByTable: Record<string, any[]> = {};
    for (const c of columns) {
      const t = (c.TABLE_NAME || c.table_name).toLowerCase();
      if (!colsByTable[t]) colsByTable[t] = [];
      colsByTable[t].push(c);
    }

    let dot = `digraph G {
  graph [rankdir=LR, bgcolor="#F3F0E8", fontname="IBM Plex Sans", pad="0.5", nodesep="0.5", ranksep="0.8"];
  node [shape=none, fontname="IBM Plex Sans", fontsize=10];
  edge [fontname="IBM Plex Sans", fontsize=9, color="#5B635E", fontcolor="#1E2421", arrowsize=0.8];

`;

    for (const r of tables) {
      const tbl = (r.TABLE_NAME || r.table_name).toLowerCase();
      const tblCols = colsByTable[tbl] || [];

      const isBridge = tbl.includes('_') && ['organization_dimension', 'process_indicator', 'decision_risk', 'phase_report', 'employee_project', 'process_resource'].includes(tbl);
      const headerBg = isBridge ? '#3F5B73' : '#1E2421';

      dot += `  "${tbl}" [label=<\n`;
      dot += `    <table border="1" cellborder="0" cellspacing="0" bgcolor="#FBFAF6" color="#D4CFC2" style="rounded">\n`;
      dot += `      <tr><td bgcolor="${headerBg}" align="center" colspan="3"><font color="#FBFAF6"><b>${tbl.toUpperCase()}</b></font></td></tr>\n`;

      for (const col of tblCols) {
        const colName = col.COLUMN_NAME || col.column_name;
        const colType = (col.COLUMN_TYPE || col.column_type || '').toUpperCase();
        const isPk = (col.COLUMN_KEY || col.column_key) === 'PRI';
        const isFk = fks.some((f: any) => f.table_name === tbl && f.column_name === colName);

        let keyBadge = '';
        if (isPk && isFk) keyBadge = '<font color="#A9461F"><b>PK, FK</b></font>';
        else if (isPk) keyBadge = '<font color="#A9461F"><b>PK</b></font>';
        else if (isFk) keyBadge = '<font color="#4B5D3A"><i>FK</i></font>';

        dot += `      <tr>\n`;
        dot += `        <td align="left" port="${colName}"><font color="#1E2421">${colName}</font></td>\n`;
        dot += `        <td align="left"><font color="#5B635E">${colType}</font></td>\n`;
        dot += `        <td align="right">${keyBadge}</td>\n`;
        dot += `      </tr>\n`;
      }

      dot += `    </table>\n`;
      dot += `  >];\n\n`;
    }

    // Edges
    for (const fk of fks) {
      const srcTbl = (fk.TABLE_NAME || fk.table_name).toLowerCase();
      const srcCol = fk.COLUMN_NAME || fk.column_name;
      const refTbl = (fk.REFERENCED_TABLE_NAME || fk.referenced_table_name).toLowerCase();
      const refCol = fk.REFERENCED_COLUMN_NAME || fk.referenced_column_name;

      dot += `  "${srcTbl}":"${srcCol}" -> "${refTbl}":"${refCol}";\n`;
    }

    dot += `}\n`;

    const outDir = path.resolve(process.cwd(), 'docs/screens/m1');
    fs.mkdirSync(outDir, { recursive: true });
    const dotPath = path.join(outDir, 'schema.dot');
    const pngPath = path.join(outDir, 'er_diagram.png');

    fs.writeFileSync(dotPath, dot, 'utf8');
    console.log(`Generated DOT file at: ${dotPath}`);

    execSync(`dot -Tpng -Gdpi=150 "${dotPath}" -o "${pngPath}"`);
    console.log(`Generated ER diagram PNG at: ${pngPath}`);
  } finally {
    await mysqlConn.end();
  }
}

generateErDiagram().catch((err) => {
  console.error('Failed to generate ER diagram:', err);
  process.exit(1);
});

