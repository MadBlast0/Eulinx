---
title: MCPNodes Specification - Part 03
status: draft
version: 1.0
tags:
  - workflow-engine
  - mcp-nodes
  - architecture
related:
  - "[[MCPNodes-Part01]]"
  - "[[MCPNodes-Part02]]"
  - "[[MCPNodes-Part04]]"
  - "[[NodeArchitecture-Part01]]"
  - "[[EdgeTypes-Part01]]"
---

# MCPNodes Specification (Part 03)

Tool listing, schema import, and the mapping of a JSON Schema onto Eulinx node ports.

# 01 The Tool Listing

`tools/list` returns an array. Each entry is an `MCPToolDescriptor`.

```ts
type MCPToolDescriptor = {
  name: string;
  description?: string;
  inputSchema: JsonSchemaObject;
  outputSchema?: JsonSchemaObject;
  annotations?: {
    title?: string;
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
};
```

The `annotations` block is **server-supplied and therefore untrusted**. `readOnlyHint: true` MUST NOT relax any permission check. `idempotentHint: true` MUST NOT set `invocation.idempotent`. These are hints for the UI to display to a human, and nothing else. A server that wants to be retried can simply claim to be idempotent; the whole point is that we do not take its word.

Listing validation, before any mapping:

```text
1. The response MUST be an array. Otherwise malformed_response.
2. Each entry MUST have a non-empty string "name". Otherwise malformed_response.
3. Names MUST be unique within the response. A duplicate is duplicate_tool_name.
4. Each name MUST match ^[a-zA-Z0-9_.-]{1,128}$. Otherwise invalid_tool_name.
   A tool name reaches log lines, event payloads, and the UI. It is not free text.
5. Each entry MUST have an "inputSchema" object with "type": "object".
   A non-object root is unsupported_schema_root. MCP arguments are always a named map.
6. The array length MUST be <= 512. Otherwise tool_list_too_large.
```

# 02 The Imported Contract

Import turns a descriptor into a frozen contract. The contract, not the live descriptor, is what a node binds to.

```ts
type MCPToolContract = {
  serverId: string;
  toolName: string;
  description?: string;
  schemaHash: string;
  rawSchema: JsonSchemaObject;
  inputPorts: MCPInputPort[];
  importedAt: string;
  importerVersion: string;
};
```

`schemaHash` is computed as:

```text
1. Take inputSchema as parsed JSON.
2. Serialize it canonically:
     - object keys sorted lexically by UTF-8 code point
     - no insignificant whitespace
     - numbers in shortest round-trip form
     - strings in minimal JSON escaping
3. UTF-8 encode the canonical text.
4. schemaHash = "sha256:" + lowercase hex of SHA-256 of those bytes.
```

Canonicalization is mandatory. Without it, a server that re-serializes its own schema with different key order produces a different hash and every node reports false schema drift on every run.

# 03 The Mapping Algorithm

This algorithm converts `inputSchema` into `MCPInputPort[]`. It is a **pure function**. Same schema in, same ports out, always. It runs at import time and never at invocation time.

Inputs: `inputSchema` (a `JsonSchemaObject` with `type: "object"`).
Output: `MCPInputPort[]`, or an `MCPSchemaError`.

```text
 1. Initialize ports = [], depth = 0, visited = empty set.
 2. Assert inputSchema.type == "object". Else error unsupported_schema_root.
 3. If inputSchema.properties is absent or empty:
      If inputSchema.additionalProperties is not false, emit ONE port:
        name "arguments", portType "json", required false, jsonPointer "/".
      Else emit zero ports (the tool takes no arguments).
      Return ports.
 4. Read required = inputSchema.required ?? [].
    Every entry in required MUST name a key present in properties.
    Otherwise error required_names_unknown_property.
 5. For each key K in properties, iterated in LEXICAL ORDER of K:
      (Lexical order, not insertion order. Port order must be stable across
       re-imports and across JSON parsers. This is why.)
 6.   Let S = properties[K].
 7.   Resolve S per section 04 (refs, combinators, nullable). This yields
        a ResolvedSchema R, or an error which aborts the whole import.
 8.   Let T = mapType(R) per section 05. On error, abort the whole import.
 9.   Emit port:
        portId       = stableId(toolName, K)
        name         = K
        portType     = T.portType
        required     = required.includes(K)
        jsonPointer  = "/" + escapePointerToken(K)
        defaultValue = R.default  (only if present AND type-consistent with T)
        constraints  = T.constraints
        description  = R.description, truncated to 512 chars
10. If inputSchema.additionalProperties is an object or true, emit ONE extra port:
        name "additionalArguments", portType "json", required false,
        jsonPointer "/", description "Extra arguments merged at the root."
11. If ports.length > 64, error too_many_ports.
12. Return ports.
```

Helper definitions, so nothing is left to judgement:

```text
stableId(toolName, key)
  = "p_" + first 16 hex chars of SHA-256("mcp:" + toolName + ":" + key)
  Deterministic so that re-import preserves edge connections in the graph.

escapePointerToken(k)  per RFC 6901
  = k with "~" replaced by "~0", then "/" replaced by "~1".

Aborting the import means: the tool is NOT importable. It is recorded in
DiscoveryReport.unmappableTools and it MUST NOT be offered as a node in the UI.
It fails at import time, where a human sees it, not at 3am inside a workflow.
```

# 04 Resolution: refs, combinators, nullable

Run before type mapping, on every subschema.

```text
1. If S has "$ref":
     1a. If the ref is not a local "#/..." pointer -> error external_ref_unsupported.
         Eulinx does not fetch remote schemas from an untrusted server.
     1b. If the ref target is not present in the root schema's "$defs" or
         "definitions" -> error dangling_ref.
     1c. If the ref target is already in visited -> error recursive_schema.
         Recursive schemas cannot become a flat port list. This is a hard stop.
     1d. Add to visited, replace S with the target, restart step 1.
2. If S has "allOf":
     2a. Every member MUST be an object schema. Else error unsupported_combinator.
     2b. Merge members shallowly, left to right, into one schema.
     2c. If two members give conflicting "type" -> error conflicting_allof_types.
     2d. Continue with the merged schema.
3. If S has "anyOf" or "oneOf":
     3a. If the member list is exactly two and one member is {"type":"null"},
         take the other member and set nullable = true. Continue.
     3b. If every member is {"type":"string"} with "const" or "enum",
         flatten to a single enum. Continue.
     3c. If every member has the same "type", take that type and drop the
         member-specific constraints. Continue.
     3d. Otherwise -> error unsupported_union.
         A genuine union has no single Eulinx port type. Do not map it to "json"
         silently; that discards validation on data going to untrusted code.
4. If S has "not" -> error unsupported_not.
5. If S has "if"/"then"/"else" -> error unsupported_conditional_schema.
6. If S.type is an array of strings:
     6a. If it is exactly ["X","null"] or ["null","X"], take X, nullable = true.
     6b. Otherwise -> error unsupported_type_array.
7. If S.type is absent:
     7a. If S has "enum" -> treat as type "string" if all enum values are strings,
         else error untyped_enum.
     7b. If S has "properties" -> treat as type "object".
     7c. If S has "items" -> treat as type "array".
     7d. If S is {} or {"description": "..."} only -> error untyped_schema.
         An untyped schema is an unbounded hole into an untrusted process.
8. Return ResolvedSchema { type, nullable, default, description, constraints }.
```

Rule 3d and rule 7d are the two that implementers want to soften. Do not. Every softening here is a port that accepts arbitrary data and forwards it to third-party code with the user's credentials attached.

# 05 Type Mapping: every case named

`mapType(R)` maps a resolved schema to a `EulinxPortType` plus constraints. Every JSON Schema type is listed. There is no default branch.

```text
CASE R.type == "string"
  R has "enum" and every value is a string
    -> portType "enum", constraints.enumValues = the enum values
  R has "format" == "uri" or "uri-reference"
    -> portType "string", constraints.pattern = Eulinx's URI pattern
  R has "format" == "date-time" | "date" | "time" | "email" | "uuid" | "hostname" | "ipv4" | "ipv6"
    -> portType "string", constraints.pattern = Eulinx's pattern for that format
  R has "format" == "byte" or "binary"
    -> portType "artifactRef"
       (Binary data MUST NOT travel as an inline string on a port. It travels as
        an Artifact reference and is base64-encoded only at marshalling time.)
  R has "format" that Eulinx does not recognize
    -> portType "string", format IGNORED, constraints from minLength/maxLength/pattern only.
       An unknown format is not an error. It is a hint we do not understand.
  otherwise
    -> portType "string", constraints from minLength, maxLength, pattern

CASE R.type == "integer"
  R has "enum"
    -> portType "enum", constraints.enumValues = values rendered as decimal strings
  otherwise
    -> portType "integer", constraints from minimum, maximum,
       exclusiveMinimum, exclusiveMaximum, multipleOf

CASE R.type == "number"
  -> portType "number", constraints from minimum, maximum,
     exclusiveMinimum, exclusiveMaximum, multipleOf

CASE R.type == "boolean"
  -> portType "boolean", no constraints

CASE R.type == "null"
  -> error null_only_property
     A property that can only ever be null is not a port. It is a schema bug.

CASE R.type == "array"
  R.items absent
    -> error untyped_array_items
  R.items is an array (tuple form)
    -> error tuple_schema_unsupported
       A tuple has per-index types. A Eulinx list port has one item type.
  R.items resolves (recursively, via section 04) to a scalar:
    string | integer | number | boolean
    -> portType "list", constraints.itemPortType = that scalar,
       constraints from minItems, maxItems
  R.items resolves to "object" or "array"
    -> portType "json"
       (A list of objects is real and common. It maps to a json port carrying
        the whole array. Eulinx does not have nested list-of-record ports.)
  R.items resolves to an error
    -> propagate the error

CASE R.type == "object"
  R.properties present
    -> portType "json"
       The nested object travels as one json port. The mapping algorithm does NOT
       recurse into nested objects to flatten them into dotted ports. Flattening
       loses the distinction between an absent key and a null key, and MCP servers
       treat those differently.
  R.properties absent, R.additionalProperties is an object or true or absent
    -> portType "json"
  R.properties absent, R.additionalProperties is false
    -> error empty_object_schema
       An object that permits no keys is unconstructible.

CASE R.type is anything else (an unknown type string)
  -> error unknown_json_schema_type
```

Nullable handling, applied after the case above:

```text
If R.nullable is true, the port's required flag is unaffected, and null becomes
an accepted value for that port at marshalling time. Nullable does NOT change portType.
There is no "string or null" port type. There is a string port that accepts null.
```

The `any` port type appears in `EulinxPortType` in Part 01 and is deliberately unreachable from this algorithm. It exists for internal Eulinx node types. **No branch above produces `any`.** If your implementation ever emits an `any` port from an MCP schema, it has a bug.

# 06 Schema Errors

Every error this algorithm can produce, and what happens.

```ts
type MCPSchemaError = {
  kind: MCPSchemaErrorKind;
  serverId: string;
  toolName: string;
  jsonPointer: string;
  message: string;
  at: string;
};

type MCPSchemaErrorKind =
  | "unsupported_schema_root"
  | "required_names_unknown_property"
  | "external_ref_unsupported"
  | "dangling_ref"
  | "recursive_schema"
  | "unsupported_combinator"
  | "conflicting_allof_types"
  | "unsupported_union"
  | "unsupported_not"
  | "unsupported_conditional_schema"
  | "unsupported_type_array"
  | "untyped_enum"
  | "untyped_schema"
  | "null_only_property"
  | "untyped_array_items"
  | "tuple_schema_unsupported"
  | "empty_object_schema"
  | "unknown_json_schema_type"
  | "too_many_ports"
  | "duplicate_tool_name"
  | "invalid_tool_name"
  | "tool_list_too_large";
```

Handling, uniformly, for every one of them:

```text
1. Abort the import of THIS tool only. Other tools from the same server still import.
2. Append to DiscoveryReport.unmappableTools.
3. Emit mcp.tool.unmappable on the EventBus with kind, serverId, toolName, jsonPointer.
4. Do NOT create an MCPToolContract row.
5. The tool MUST NOT appear in the node palette.
6. A node already bound to that (serverId, toolName) fails at verifying with
   schema_not_importable, referencing the recorded MCPSchemaError.
```

There is no partial import. A tool with nine mappable properties and one `unsupported_union` is not imported with nine ports. It is not imported. Partial import produces a node that silently omits a required argument.

# 07 Schema Drift

Drift is the case where the live schema differs from the frozen one.

```text
1. Before every invocation, at state verifying, send tools/list (or read a
   pool-cached listing no older than 30 seconds).
2. Locate toolName. If absent -> tool_not_found. Fail the node.
3. Recompute schemaHash from the live inputSchema per section 02.
4. If it equals config.schemaHash -> proceed to gating. This is the normal path.
5. If it differs, consult config.onSchemaDrift:
     "fail"
       -> Fail the node with schema_drift. Nothing is invoked. DEFAULT and RECOMMENDED.
     "reimport_and_fail"
       -> Run the section 03 algorithm on the live schema, store the new contract,
          emit mcp.tool.schema_changed with both hashes, then fail the node with
          schema_drift. The next run of the workflow, after a human re-binds the
          node's edges, will succeed. Nothing is invoked on this run.
     "reimport_and_run"
       -> Re-import, then verify that EVERY port the node currently has an inbound
          edge on still exists in the new port set with the SAME portType.
          If yes, invoke. If no, fail with schema_drift_incompatible.
          This mode MUST NOT be the default and the UI MUST warn when it is set.
```

Why `reimport_and_run` is dangerous, stated plainly so nobody enables it casually: the server changed the contract, and this mode says run anyway. If the server changed `dryRun: boolean` from defaulting true to defaulting false, the node's ports are unchanged, the compatibility check passes, and the invocation now does the real thing instead of the rehearsal.

# 08 Marshalling Ports Back to Arguments

Inverse of the mapping. Runs at `invoking`.

```text
 1. Start with args = {}.
 2. For each MCPInputPort P in config.ports.inputs, lexical order by P.name:
 3.   Read the value V bound to P (from an inbound edge, or P.defaultValue).
 4.   If V is absent and P.required is true -> fail missing_required_input.
 5.   If V is absent and P.required is false -> skip. Do NOT write null.
        Absent and null are different to an MCP server. Preserve the difference.
 6.   Validate V against P.portType and P.constraints. On failure ->
        fail input_constraint_violation with portId and the violated constraint.
 7.   Convert:
        string    -> JSON string
        number    -> JSON number
        integer   -> JSON number, MUST be integral or fail non_integral_integer
        boolean   -> JSON boolean
        enum      -> JSON string, or JSON number if the frozen schema type was integer
        list      -> JSON array of converted items
        json      -> the parsed JSON value as-is
        artifactRef -> read the Artifact bytes via ArtifactManager,
                       base64-encode, emit as a JSON string.
                       The Artifact MUST be in the node's workspace or fail
                       artifact_out_of_scope.
 8.   Write the converted value at P.jsonPointer into args.
        Port name "additionalArguments" with pointer "/" merges its object at the
        root. A key collision with a named port -> fail argument_key_collision.
 9. Validate args against the frozen rawSchema with a real JSON Schema validator.
      This is a defence-in-depth check. If it fails, the mapping algorithm has a
      bug -> fail marshalling_invariant_violated and log loudly. Do not send.
10. Return args.
```

Step 9 is not redundant. It is the assertion that the port model and the schema never drifted apart in code. It costs microseconds and it catches an entire class of implementation error before it reaches a third party.

# Related Documents

- [[MCPNodes-Part01]]
- [[MCPNodes-Part02]]
- [[MCPNodes-Part04]]
- [[MCPNodes-Part05]]
- [[MCPNodes-Diagrams]]
- [[NodeArchitecture-Part01]]
- [[NodeTypes-Part01]]
- [[EdgeTypes-Part01]]
- [[ArtifactManager-Part01]]
- [[ToolRegistry-Part01]]
