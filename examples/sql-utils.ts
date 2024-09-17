import { sql, SqlUtils } from '../src';

const year = 2010;
const query = sql`
  select sum(hits) as hits
  from baseballStats 
  where yearID > ${year}`;
const parameters = {
  timeoutMs: 10000,
};

console.log('== Sql Utils ==');
console.log(SqlUtils.stringifyQuery(query, parameters));
