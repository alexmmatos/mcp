import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Typography,
} from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import api from '../api'
import HelpButton from '../components/HelpButton'

interface McpInfo {
  name: string
  version: string
  description?: string
  tools: { name: string; description?: string }[]
  resources: { uri: string; name: string; description?: string }[]
}

export default function McpServer() {
  const [info, setInfo] = useState<McpInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get<McpInfo>('/mcp-docs/json')
      .then((r) => setInfo(r.data))
      .catch(() => setError('Unable to load MCP server information.'))
      .finally(() => setLoading(false))
  }, [])

  const mcpUrl = `${window.location.protocol}//${window.location.hostname}:${window.location.port || 3000}/mcp`

  const copyUrl = () => navigator.clipboard.writeText(mcpUrl)

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box p={3} maxWidth={900}>
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <Typography variant="h5" fontWeight="bold">MCP Server</Typography>
        <HelpButton title="MCP Server">
          <Typography variant="body2" gutterBottom>
            This page shows the <strong>global MCP server</strong> — a single endpoint that aggregates tools from every project on this Arthur instance. One URL, all tools.
          </Typography>
          <Typography variant="body2" gutterBottom>
            <strong>When to use the global endpoint:</strong>
          </Typography>
          <Box component="ul" sx={{ mt: 0, mb: 1, pl: 2.5 }}>
            <Box component="li"><Typography variant="body2">You want one AI client to access every project at once.</Typography></Box>
            <Box component="li"><Typography variant="body2">You are testing or exploring what tools are available.</Typography></Box>
            <Box component="li"><Typography variant="body2">You have few projects and do not need per-project access control.</Typography></Box>
          </Box>
          <Typography variant="body2" gutterBottom>
            <strong>When to use per-project endpoints instead (recommended for production):</strong>
          </Typography>
          <Box component="ul" sx={{ mt: 0, mb: 1, pl: 2.5 }}>
            <Box component="li"><Typography variant="body2">Different teams or AI clients should only see specific projects.</Typography></Box>
            <Box component="li"><Typography variant="body2">You need independent authentication or rate limits per project.</Typography></Box>
            <Box component="li"><Typography variant="body2">You want to isolate projects for security or billing reasons.</Typography></Box>
          </Box>
          <Typography variant="body2">
            Per-project endpoints are found in each project's <strong>Configuration</strong> tab. If two projects define tools with the same name, only one appears on the global endpoint — per-project endpoints avoid name collisions.
          </Typography>
        </HelpButton>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Connection info */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <Typography variant="h6" fontWeight="bold">Connection</Typography>
          <HelpButton title="MCP Connection URL">
            <Typography variant="body2" gutterBottom>
              This is the URL of the global MCP server endpoint. Copy it and paste it into your AI client's MCP server configuration to connect.
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>Claude Desktop</strong> — add to <code>claude_desktop_config.json</code>:
            </Typography>
            <Box sx={{ bgcolor: '#f5f5f5', borderRadius: 1, px: 1.5, py: 1, mb: 1, fontFamily: 'monospace', fontSize: '0.78rem' }}>
              {`"mcpServers": { "arthur": { "url": "<this URL>" } }`}
            </Box>
            <Typography variant="body2" gutterBottom>
              <strong>Cursor</strong> — Settings → MCP → Add server → paste the URL.
            </Typography>
            <Typography variant="body2" gutterBottom>
              This endpoint uses <strong>MCP Streamable HTTP</strong> (stateless transport) — each tool call is an independent HTTP request; no persistent connection is required.
            </Typography>
            <Typography variant="body2">
              If any project has MCP Authentication enabled, the AI client must also send the header <code>auth: &lt;key&gt;</code> when calling tools from that project.
            </Typography>
          </HelpButton>
        </Box>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Use this URL to connect MCP clients (Claude Desktop, Cursor, etc.)
        </Typography>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            bgcolor: '#f5f5f5',
            borderRadius: 1,
            px: 2,
            py: 1,
            mt: 1,
          }}
        >
          <Typography fontFamily="monospace" sx={{ flexGrow: 1, wordBreak: 'break-all' }}>
            {mcpUrl}
          </Typography>
          <Button size="small" onClick={copyUrl} startIcon={<ContentCopyIcon />}>
            Copy
          </Button>
        </Box>
      </Paper>

      {info && (
        <>
          {/* Server info */}
          <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <Typography variant="h6" fontWeight="bold">Information</Typography>
              <HelpButton title="Server information">
                <Typography variant="body2" gutterBottom>
                  Metadata about this Arthur MCP Adapter instance. When an MCP client first connects, it performs an <strong>initialize handshake</strong> — the server sends back its name, version, and capabilities so the client can identify which server it is talking to.
                </Typography>
                <Typography variant="body2" gutterBottom>
                  This section is informational only. It is especially useful when you have multiple Arthur instances (production, staging, dev) and need to quickly confirm which environment you are connected to.
                </Typography>
                <Typography variant="body2">
                  The name and version shown here are configured in the server's environment settings. Contact your system administrator if they need to be changed.
                </Typography>
              </HelpButton>
            </Box>
            <Box display="flex" gap={2} flexWrap="wrap">
              <Box>
                <Typography variant="caption" color="text.secondary">Name</Typography>
                <Typography fontWeight="bold">{info.name}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Version</Typography>
                <Typography fontWeight="bold">{info.version}</Typography>
              </Box>
              {info.description && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Description</Typography>
                  <Typography>{info.description}</Typography>
                </Box>
              )}
            </Box>
          </Paper>

          {/* Tools */}
          <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="h6" fontWeight="bold">Registered tools</Typography>
                <HelpButton title="Registered tools">
                  <Typography variant="body2" gutterBottom>
                    All MCP tools available on the global endpoint, aggregated from every project on this server. The count chip shows how many tools are exposed in total.
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Each entry shows:</strong>
                  </Typography>
                  <Box component="ul" sx={{ mt: 0, mb: 1, pl: 2.5 }}>
                    <Box component="li"><Typography variant="body2"><strong>Tool name (monospace):</strong> the exact identifier the AI client uses to invoke the tool in a JSON-RPC call.</Typography></Box>
                    <Box component="li"><Typography variant="body2"><strong>Description:</strong> what the tool does. The AI reads this to decide when and how to call the tool — quality descriptions matter.</Typography></Box>
                  </Box>
                  <Typography variant="body2" gutterBottom>
                    <strong>Important limitations of the global endpoint:</strong>
                  </Typography>
                  <Box component="ul" sx={{ mt: 0, mb: 0, pl: 2.5 }}>
                    <Box component="li"><Typography variant="body2">If two projects define a tool with the same name, only one version is exposed (first-registered wins). Use per-project endpoints to avoid collisions.</Typography></Box>
                    <Box component="li"><Typography variant="body2">To edit, rename, or delete individual tools, go to the relevant project's <strong>Tools</strong> tab.</Typography></Box>
                  </Box>
                </HelpButton>
              </Box>
              <Chip label={info.tools.length} color="primary" size="small" />
            </Box>
            {info.tools.length === 0 ? (
              <Typography color="text.secondary">No registered tools.</Typography>
            ) : (
              info.tools.map((t, i) => (
                <Box key={t.name}>
                  {i > 0 && <Divider sx={{ my: 1.5 }} />}
                  <Typography fontWeight="bold" fontFamily="monospace">{t.name}</Typography>
                  {t.description && (
                    <Typography variant="body2" color="text.secondary">{t.description}</Typography>
                  )}
                </Box>
              ))
            )}
          </Paper>

          {/* Resources */}
          {info.resources.length > 0 && (
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight="bold">Resources</Typography>
                <Chip label={info.resources.length} color="secondary" size="small" />
              </Box>
              {info.resources.map((r, i) => (
                <Box key={r.uri}>
                  {i > 0 && <Divider sx={{ my: 1.5 }} />}
                  <Typography fontWeight="bold">{r.name}</Typography>
                  <Typography variant="body2" fontFamily="monospace" color="text.secondary">{r.uri}</Typography>
                  {r.description && (
                    <Typography variant="body2" color="text.secondary">{r.description}</Typography>
                  )}
                </Box>
              ))}
            </Paper>
          )}
        </>
      )}
    </Box>
  )
}
