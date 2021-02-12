# Trust graph test cases

While waiting for better automated tests of the worker that syncs the trust graph, this is a formally specified test routine that can be run manually with the help of the script in [link]()

## Requirements

* The graph
* Deployed subgraph with the correct name
* Ganache-cli
* Deployed circles contracts
* Redis

The easiest way to assemble these services is most likely the [docker-compose development project](), but it's also possible to run them other ways. Gas fees in CRC are not accounted for in the below send limits, so if transactions are running through the relayer, those must be taken into account

Examples use the start up parameters of the circles contracts deployed on xdai, which are:

```
{
  inflation: 7%
  inflation period: 1 year
  starting daily issuance: 8 crc
  token symbol: crc
  token name: Circles
  timeout period: 3 months
  signup bonus: 50 crc
}
```

The edges table in the postgres database should be empty before beginning, and the subgraph should be free of safes

### Step 1

Four accounts sign up:

```
account A signs up
account B signs up
account C signs up
```

There should be no edges in the database.

This is testing that edges to and from the same address are not created.

### Step 2

Transaction contents:

```
account A trusts account B
account C trusts account B
```

Database contents:

```
[{
  from: B
  to: A
  token: B
  capacity: 25000000000000000000
}, {
  from: B
  to: C
  token: B
  capacity: 25000000000000000000
}]
```


This is testing the most basic creation of trust events.


### Step 3

Transaction contents:

```
account B sends 12 B tokens to Accounts A
```

Database contents:

```
[{
  from: B
  to: A
  token: B
  capacity: 19000000000000000000
}, {
  from: B
  to: C
  token: B
  capacity: 25000000000000000000
}, {
  from: A
  to: B
  token: B
  capacity: 12000000000000000000
}, {
  from: A
  to: C
  token: B
  capacity: 12000000000000000000
}]
```

This is testing the most basic creation of transfer events.

### Step 4

Transaction contents:

```
account A sends 12 B tokens to Accounts C
```

Database contents:

```
[{
  from: B
  to: C
  token: B
  capacity: 19000000000000000000
}, {
  from: B
  to: A
  token: B
  capacity: 25000000000000000000
}, {
  from: C
  to: B
  token: B
  capacity: 12000000000000000000
}, {
  from: C
  to: A
  token: B
  capacity: 12000000000000000000
}]
```

This is testing a transfer event where a user is sending someone else's token.


### Step 5

Transaction contents:

```
account D signs up
account D trusts B
```

Database contents:

```
[{
  from: B
  to: C
  token: B
  capacity: 19000000000000000000
}, {
  from: B
  to: A
  token: B
  capacity: 25000000000000000000
}, {
  from: C
  to: B
  token: B
  capacity: 12000000000000000000
}, {
  from: C
  to: A
  token: B
  capacity: 12000000000000000000
}, {
  from: C
  to: D
  token: B
  capacity: 12000000000000000000
}, {
  from: B
  to: D
  token: B
  capacity: 25000000000000000000
}]
```

This is testing new trust events, involving tokens which are held by multiple users.


### Step 6

Transaction contents:

```
account C sends 12 B tokens to Accounts B
```

Database contents:

```
[{
  from: B
  to: A
  token: B
  capacity: 25000000000000000000
}, {
  from: B
  to: C
  token: B
  capacity: 25000000000000000000
}, {
  from: B
  to: D
  token: B
  capacity: 25000000000000000000
}]
```

This tests that edges are properly removed when they become 0.


### Step 6

Transaction contents:

```
account A receives ubi
```

Database contents:

```
[{
  from: B
  to: A
  token: B
  capacity: ~25000509259259259256
}, {
  from: B
  to: C
  token: B
  capacity: 25000000000000000000
}, {
  from: B
  to: D
  token: B
  capacity: 25000000000000000000
}]
```

This tests that tokens which change their balance of their own token update how much they will accept from those they trust, and also that edges to the zero address are not stored.


### Step 7

Transaction contents:

```
account B sends 30 tokens to the relayer address
```

Database contents:

```
[{
  from: B
  to: A
  token: B
  capacity: 20
}, {
  from: B
  to: C
  token: B
  capacity: 20
}, {
  from: B
  to: D
  token: B
  capacity: 20
}]
```

This tests that when existing token balances are lower than send limits, the edge stores the balance, and also that edges from the relayer address are not stored.