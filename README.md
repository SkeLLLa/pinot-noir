# pinot-noir

Unofficial node.js [Apache Pnot](https://pinot.apache.org/) client. Uses [undici](https://undici.nodejs.org) to make http requests to pinot brokers.

## ToC

- [pinot-noir](#pinot-noir)
  - [ToC](#toc)
  - [Features](#features)
  - [Installation](#installation)
  - [Usage](#usage)
    - [Transport](#transport)
    - [Broker client](#broker-client)
    - [Constructing and performing queries](#constructing-and-performing-queries)
    - [Utilities](#utilities)
      - [SqlUtils](#sqlutils)
        - [stringifyQuery](#stringifyquery)
  - [Demo](#demo)
  - [See also](#see-also)

## Features

- Fast http queries using "Undici"
- Built-in `sql` template tag and safe escaping of values
- Support of `raw` and `join` for complex queries
- Typescript support
- Support of Apache Pinot multi-stage engine
- Compatible with prettier sql formatter and VScode sql syntax highlighters

## Installation

NPM:

```bash
npm install pinot-noir
```

PNPM:

```bash
pnpm add pinot-noir
```

## Usage

### Transport

First of all you need to create transport. So far there's only one transport built-in in this lib, but you can use own implementation of [`IPinotBrokerTransport` interface](./docs/api/pinot-noir.ipinotbrokertransport.md).

By default we use HTTP JSON transport which is based on undici http client. It requires the URL of your brocker and an API token.

```typescript
import { PinotBrokerJSONTransport } from 'pinot-noir';

const pinotTransport = new PinotBrokerJSONTransport({
  brokerUrl: 'https://broker.pinot.my-cluster.example.startree.cloud', // replace with your broker url
  token: '<your-token>', // for docker-based demo pinot leave blank
});
```

Other options are described in [API docs](./docs/api/pinot-noir.pinotbrokerjsontransport.md).

### Broker client

Broker client is a wrapper class that uses provided transport to make queries to pinot, handle the responses and so on.
For tests you can easily supply your broker client with mock transport.

```typescript
import { PinotBrokerClient } from 'pinot-noir';

// ... init transport ...

const pinotClient = new PinotBrokerClient({ transport: pinotTransport });
```

### Constructing and performing queries

To make sql queries this library supplies `sql` template tag which is modified version of [sql-template-tag](https://github.com/blakeembrey/sql-template-tag) library to match Apache Pinot syntax.

```typescript
import { sql } from 'pinot-noir';

// ... setup transport and client ...

interface IResult {
  hist: number;
}

const year = 2010;
const query = sql`
  select sum(hits) as hits
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
```

### Utilities

#### SqlUtils

[Docs](./docs/api/pinot-noir.sqlutils.md)

##### stringifyQuery

Method is used to compile your query into single string. Can be useful in logs and allows you see resulting sql with all variables replaced.

```typescript
import { sql, SqlUtils } from 'pinot-noir';

const year = 2010;
const query = sql`
  select sum(hits) as hits
  from baseballStats 
  where yearID > ${year}`;
const parameters = {
  timeoutMs: 10000,
};

SqlUtils.stringifyQuery(query, parameters);

// output
// SET timeoutMs = 10000;
//   select sum(hits) as hits
//   from baseballStats
//   where yearID > 2010
```

## Demo

Follow the [Pinot quick start guide](https://docs.pinot.apache.org/basics/getting-started/running-pinot-in-docker#set-up-a-cluster) and setup cluster locally with demo baseball dataset.

Quick copy-paste:

```bash
docker run \
  -p 2123:2123 \
  -p 9000:9000 \
  -p 8000:8000 \
  -p 7050:7050 \
  -p 6000:6000 \
  apachepinot/pinot:latest QuickStart \
  -type batch
```

Verify pinot is running and explore the dataset via the following [guide](https://docs.pinot.apache.org/basics/concepts/components/exploring-pinot).

Connect client to your broker:

```typescript
import { PinotBrokerClient, PinotBrokerJSONTransport, sql } from 'pinot-noir';

const pinotTransport = new PinotBrokerJSONTransport({
  brokerUrl: 'http://127.0.0.1:8000', // replace with your broker url if needed
  token: '', // localhost doesn't require any auth
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
```

See results

```txt
== Query ==

    select sum(hits) as hits, sum(homeRuns) as homeRuns, sum(numberOfGames) as gamesCount
    from baseballStats
    where yearID > 2010

== Results ==
┌─────────┬────────┬──────────┬────────────┐
│ (index) │ hits   │ homeRuns │ gamesCount │
├─────────┼────────┼──────────┼────────────┤
│ 0       │ 126422 │ 14147    │ 198156     │
└─────────┴────────┴──────────┴────────────┘
== Stats ==
{
  traceInfo: {},
  segments: { matched: 1, processed: 1, queried: 1 },
  server: { queries: undefined, responded: 1 },
  docs: { scanned: 3935, returned: 1, total: 97889 },
  totalTimeMs: 6,
  minConsumingFreshnessTimeMs: 0,
  numConsumingSegmentsQueried: 0,
  numEntriesScannedPostFilter: 11805,
  numGroupsLimitReached: false
}
```

## See also

- [pinot-client-node](https://github.com/kffl/pinot-client-node#readme) - another good Apache Pinot client and inspiration for this library, which in adddition has Pinot controller client.
