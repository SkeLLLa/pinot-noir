import { PinotBrokerClient, PinotBrokerJSONTransport, sql } from '../src';

const pinotTransport = new PinotBrokerJSONTransport({
  brokerUrl: 'http://127.0.0.1:8000', // replace with your broker url if needed
  token: '',
  connections: 32,
});

const pinotClient = new PinotBrokerClient({ transport: pinotTransport });

interface IResult {
  hist: number;
  homeRuns: number;
  gamesCount: number;
}

(async () => {
  const year = 2010;
  const query = sql`
    select sum(hits) as hits, sum(homeRuns) as homeRuns, sum(numberOfGames) as gamesCount
    from baseballStats 
    where yearID > ${year}`;
  const result = await pinotClient.select<IResult>(query, { timeoutMs: 1000 });

  console.log('== Query ==');
  console.log(result.sql);
  console.log('');
  console.log('== Results ==');
  console.table(result.rows);
  console.log('== Stats ==');
  console.log(result.stats);
})();
