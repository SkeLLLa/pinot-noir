# pinot-noir

[![NPM Version](https://img.shields.io/npm/v/pinot-noir.svg)](https://www.npmjs.com/package/pinot-noir)
[![Downloads Count](https://img.shields.io/npm/dm/pinot-noir.svg)](https://www.npmjs.com/package/pinot-noir)
[![Vunerabilities Count](https://snyk.io/test/npm/pinot-noir/badge.svg)](https://www.npmjs.com/package/pinot-noir)
[![Release](https://github.com/SkeLLLa/pinot-noir/actions/workflows/release.yml/badge.svg)](https://github.com/SkeLLLa/pinot-noir/actions/workflows/release.yml)
[![License](https://img.shields.io/npm/l/pinot-noir.svg)](https://gitlab.com/m03geek/pinot-noir/blob/master/LICENSE)
[![Codecov](https://img.shields.io/codecov/c/gh/SkeLLLa/pinot-noir.svg)](https://codecov.io/gh/SkeLLLa/pinot-noir)

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
    - [Pools and queues](#pools-and-queues)
      - [Queue size](#queue-size)
      - [Queue tolerance](#queue-tolerance)
    - [Utilities](#utilities)
      - [SqlUtils](#sqlutils)
        - [stringifyQuery](#stringifyquery)
  - [Demo](#demo)
  - [See also](#see-also)

## Features

- Fast http queries using "Undici"
- Simple interface for bringing and using other http client libraries
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

While using query options like `timeoutMs` they are passed to http request timeouts as well, so they shouldn't run longer than you expect the query should run.

### Pools and queues

#### Queue size

By default pinot transport requests are made via HTTP connection pool with maximum concurrency.
If requests rate exceeds max concurrency value, the requests are queued.
By default the queue is not limited, but it's strongly recommended to set it to prevent high memory consumption.

```typescript
import { PinotBrokerJSONTransport } from 'pinot-noir';

const pinotTransport = new PinotBrokerJSONTransport({
  ...
  maxQueueSize: 1024,
});
```

#### Queue tolerance

Since pinot can contain different data some of requests may not tolerate queuing.
For addressing that issue in query you may specify queue tolerance.
It's a value that represents percent of max queue size that this request could tolerate.

For example if `maxQueueSize` is `1000` and `queueTolerance` is `0.1`, then the query will be performed only if current queue is less than `1000 * 0.1 = 100`.
Otherwise `QUEUE_TOLERANCE_LIMIT` error will be thrown.
For real-time data you can specify `queueTolerance` as `0`, then the requests will be discarded if there's a queue.

```typescript
import { PinotBrokerJSONTransport, PinotBrokerClient, PinotError, EPinotErrorType, EBrokerTransportErrorCode} from 'pinot-noir';
        type: EPinotErrorType.TRANSPORT,
        code: EBrokerTransportErrorCode.QUEUE_TOLERANCE_LIMIT,

const pinotTransport = new PinotBrokerJSONTransport({
  ...
  maxQueueSize: 1000,
});

const pinotClient = new PinotBrokerClient({ transport: pinotTransport });

const year = 2010;
const query = sql`
  select sum(hits) as hits, sum(homeRuns) as homeRuns, sum(numberOfGames) as gamesCount
  from baseballStats
  where yearID > ${year}`;
try {
  const result = await pinotClient.select<IResult>(query, { timeoutMs: 1000, queueTolerance: 0.1 });
  // Do something with result
} catch (err) {
  if (err instanceof PinotError) {
    if (err.type === EPinotErrorType.TRANSPORT && err.code === EBrokerTransportErrorCode.QUEUE_TOLERANCE_LIMIT) {
      // Request skipped due to queue size
    }
  }
  throw err
}
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
