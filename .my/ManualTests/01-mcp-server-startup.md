# Manual Test: MCP Server Startup

**Tests that the GSD MCP server starts reliably in all conditions.**

---

## MT-1: Server starts with env var set

1. Open terminal in `e:\repos\Private\get-shit-done2`
2. Run: `$env:GSD_WORKSPACE = $PWD.Path; node .gsd/tools/gsd-mcp-server.js`
3. **Expected:** Server prints version line to stderr: `GSD MCP Server v2.0.0 - workspace: <path>`
4. Server stays running (waiting for stdin). Press Ctrl+C to exit.
5. **Pass/Fail:** ___

## MT-2: Server starts without env var (fallback)

1. Run: `node .gsd/tools/gsd-mcp-server.js` (no GSD_WORKSPACE set)
2. **Expected (after fix):** Server starts with fallback: `GSD MCP Server v2.0.0 - workspace: <cwd> (fallback: cwd)`
3. Server stays running. Ctrl+C to exit.
4. **Pass/Fail:** ___

## MT-3: MCP handshake works

1. Run with env var set:
   ```powershell
   $env:GSD_WORKSPACE = $PWD.Path
   $msg = '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
   $bytes = [System.Text.Encoding]::UTF8.GetBytes($msg)
   $frame = "Content-Length: $($bytes.Length)`r`n`r`n$msg"
   echo $frame | node .gsd/tools/gsd-mcp-server.js 2>$null
   ```
2. **Expected:** Response contains `"serverInfo":{"name":"gsd-tools","version":"2.0.0"}`
3. **Pass/Fail:** ___

## MT-4: VS Code MCP integration

1. Open `e:\repos\Private\get-shit-done2` in VS Code
2. Open Copilot chat
3. Check the MCP server status (look for the gsd-tools server indicator)
4. **Expected:** Server shows as connected/running — no "unable to start" error
5. **Pass/Fail:** ___

## MT-5: tools/list returns all tools

1. Send a tools/list request after initialize:
   ```powershell
   $env:GSD_WORKSPACE = $PWD.Path
   $init = '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
   $list = '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
   $b1 = [System.Text.Encoding]::UTF8.GetBytes($init)
   $b2 = [System.Text.Encoding]::UTF8.GetBytes($list)
   $frame = "Content-Length: $($b1.Length)`r`n`r`n$init`r`nContent-Length: $($b2.Length)`r`n`r`n$list"
   echo $frame | node .gsd/tools/gsd-mcp-server.js 2>$null
   ```
2. **Expected:** Response includes `"tools":[...]` with 68 tools
3. Count tool names in the response
4. **Pass/Fail:** ___
