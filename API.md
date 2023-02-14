## API

### Find transitive transfer steps

Returns steps to transfer transitively through trust graph from one node to another.

**Request:**

`POST /api/transfers`

**Parameters:**

```
{
  from: <string>,
  to: <string>,
  value: <string>,
  hops: <string>,
}
```

- `from`: Sender address
- `to`: Receiver address
- `value`: Amount of Freckles to send between sender and receiver (the fractional monetary unit of Circles is named Freckles. One Circle = 1,000,000,000,000,000,000 Freckles (10<sup>18</sup>))
- `hops` (optional): pathfinder2 parameter used to limit the area around the sender that is explored; the maximal "chain length"

**Response:**

```
{
  status: 'ok',
  data: {
    from: <string>,
    to: <string>,
    maxFlowValue: <number>,
    transferSteps: <array>,
    transferValue: <number>,
    statistics: <object>
  }
}
```

**Errors:**

- `400` Parameters missing or malformed
- `422` Invalid transfer

### Update transitive transfer steps

Updates the steps of a transitive transfer.

**Request:**

`POST /api/transfers/update`

**Parameters:**

```
{
  from: <string>,
  to: <string>,
  value: <string>,
  hops: <string>,
}
```

- `from`: Sender address
- `to`: Receiver address
- `value`: Amount of Freckles intended to be sent between sender and receiver (the fractional monetary unit of Circles is named Freckles. One Circle = 1,000,000,000,000,000,000 Freckles (10<sup>18</sup>))
- `hops` (optional): pathfinder2 parameter used to limit the area around the sender that is explored; the maximal "chain length"

**Response:**

```
{
  status: 'ok',
  data: {
    updated: <boolean>
  }
}
```

- `updated`: Whether all the steps have been successfully updated

**Errors:**

- `400` Parameters missing or malformed

### Store transfer meta data

Stores meta data like payment note connected to a made transfer. This data is only readable for sender or receiver of that transaction.

**Request:**

`PUT /api/transfers`

**Parameters:**

```
{
  address: <string>,
  signature: <string>,
  data: {
    from: <string>,
    to: <string>,
    transactionHash: <string>,
    paymentNote: <string>
  }
}
```

- `address`: Public address of user wallet
- `signature`: Signed data payload of this request via the users keypair. The data contains: `from + to + transactionHash`
- `data/from`: Public address of the sender
- `data/to`: Public address of the receiver
- `data/transactionHash`: Transaction hash of the actual ethereum transfer
- `data/paymentNote` (optional): Personal payment note from the sender

**Errors:**

- `400` Parameters missing or malformed
- `403` Verification failed
- `409` Entry already exists

### Read transfer meta data

Returns stored transfer meta data including the payment note. This data is only readable for sender or receiver of that transaction.

**Request:**

`POST /api/transfers/<transactionHash>`

**Parameters:**

```
{
  address: <string>,
  signature: <string>
}
```

- `address`: Public address of user wallet
- `signature`: Signed data payload of this request via the users keypair. The data contains: `transactionHash`

**Errors:**

- `400` Parameters missing or malformed
- `403` Verification failed or not allowed to read data
- `404` Transaction hash not found

### Get user entry by username

Get the users entry including its `safeAddress`.

**Request:**

`GET /api/users/<username>`

**Response:**

```
{
  status: 'ok',
  data: {
    id: <int>,
    safeAddress: <string>,
    username: <string>,
    avatarUrl: <string>
  }
}
```

**Errors:**

- `404` Not found

### Search users database by usernames

Find a user in the database.

**Request:**

`GET /api/users?query=<string>`

**Response:**

```
{
  status: 'ok',
  data: [
    {
      id: <int>,
      safeAddress: <string>,
      username: <string>,
      avatarUrl: <string>
    },
    {
      [...]
    },
    [...]
  ]
}
```

**Errors:**

When no user was found an empty response will be returned.

### Get multiple user entries by username / address

Resolve multiple usernames (via `username[]`) and/or Safe addresses (via `address[]`) in a batch.

**Request:**

`GET /api/users?address[]=<string>&username[]=<string>&...`

**Response:**

```
{
  status: 'ok',
  data: [
    {
      id: <int>,
      safeAddress: <string>,
      username: <string>,
      avatarUrl: <string>
    },
    {
      [...]
    },
    [...]
  ]
}
```

**Errors:**

Not found entries silently fail and simply do not get returned in the response.

### Check user fields (dry run)

**Request:**

`POST /api/users`

Do a dry-run to check if `email` and `username` fields are valid before creating a user account. This is helpful for giving early user feedback in onboarding flows.

**Parameters:**

```
{
  email: <string>,
  username: <string>
}
```

- `email`: E-Mail-Address of the to-be-created user
- `username`: Username of the to-be-created user

**Errors:**

- `400` Parameters missing or malformed
- `409` Entry already exists

### Create new user entry

**Request:**

`PUT /api/users`

Create a new entry in the database, connecting a `username` with a `safeAddress`.

**Parameters:**

```
{
  address: <string>,
  signature: <string>,
  nonce: <int> (optional),
  data: {
    safeAddress: <string>,
    email: <string>,
    username: <string>,
    avatarUrl: <string>
  }
}
```

- `address`: Public address of user wallet
- `signature`: Signed data payload of this request via the users keypair. The data contains: `address + nonce + safeAddress + username` with `nonce` being `0` when not given
- `nonce`: Optional nonce which is required to [predict the Safe address](https://gnosis-safe.readthedocs.io/en/latest/contracts/deployment.html#trustless-deployment-with-create2)
- `data/safeAddress`: Public address of the owned Safe of the user
- `data/username`: Username which should be connected to the `safeAddress`
- `data/email`: Private email address of the user (not unique)
- `data/avatarUrl` (optional): URL of avatar image

**Verification steps:**

1. Check if the `signature` can be verified successfully.
2. Check if `nonce` is given, if not, assume the Safe is already deployed.
3. When Safe is deployed: Check if `address` is owner of the given Safe. When safe is not deployed yet: Check if `nonce` and `address` generate the same `safeAddress`.

**Errors:**

- `400` Parameters missing or malformed
- `403` Verification failed
- `409` Entry already exists

### Update user entry

**Request:**

`POST /api/users/<safeAddress>`

Update (or create) an entry in the database, connecting a `username` with a `safeAddress`.

**Parameters:**

```
{
  address: <string>,
  signature: <string>,
  data: {
    safeAddress: <string>,
    username: <string>,
    email: <string>,
    avatarUrl: <string>
  }
}
```

- `address`: Public address of user wallet
- `signature`: Signed data payload of this request via the users keypair. The data contains: `address + safeAddress + username`.
- `data/safeAddress`: Public address of the owned Safe of the user
- `data/username`: Username which should be connected to the `safeAddress`
- `data/email` (optional): Private email address of the user (not unique, not null)
- `data/avatarUrl` (optional): URL of avatar image

**Verification steps:**

1. Check if the `signature` can be verified successfully.
2. Check if the `username` is taken by another user.
3. Check if `address` is owner of the given Safe.

**Errors:**

- `400` Parameters missing or malformed
- `403` Verification failed
- `409` Entry already exists

### Get user email

**Request:**

`GET /api/users/<safeAddress>/email`

Get the email from the entry of the `safeAddress` in the database.

**Parameters:**

```
{
  address: <string>,
  signature: <string>,
}
```

- `address`: Public address of user wallet
- `signature`: Signed data payload of this request via the users keypair. The data contains: `address + safeAddress`.

**Verification steps:**

1. Check if the `signature` can be verified successfully.
2. Check if `address` is owner of the given Safe.

**Errors:**

- `400` Parameters missing or malformed
- `403` Verification failed
- `404` User entry not found

### Search news database by date

Find news in the database.

**Request:**

`GET /api/news?isActive=<boolean>&afterDate=<Date>&limit=<int>&offset=<int>`

**Response:**

```
{
  status: 'ok',
  data: [
    {
      iconId: <int>,
      message: {
        en: <string>,
      },
      date: <date>,
    },
    {
      [...]
    },
    [...]
  ]
}
```

**Errors:**

When no news were found an empty response will be returned.