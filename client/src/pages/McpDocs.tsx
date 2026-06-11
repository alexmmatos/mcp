import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import SearchIcon from '@mui/icons-material/Search'
import api from '../api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface JsonSchema {
  type?: string
  properties?: Record<string, JsonSchema>
  required?: string[]
  description?: string
  enum?: unknown[]
  default?: unknown
  items?: JsonSchema
}

interface ParameterMapping {
  toolParamName: string
  source: 'path' | 'query' | 'header' | 'body'
  originalName: string
  required: boolean
}

interface EndpointRef {
  method: string
  path: string
  baseUrl: string
  contentType?: string
  parameterMap: ParameterMapping[]
}

export interface GeneratedTool {
  name: string
  description?: string
  inputSchema: JsonSchema
  endpointRef: EndpointRef
  enabled?: boolean
}

export interface DocsProject {
  _id: string
  name: string
  baseUrl: string
  description?: string
  version?: string
  status: string
  tools: GeneratedTool[]
  mcpApiKey?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SOURCE_COLOR: Record<string, string> = {
  path: '#6750a4',
  query: '#0277bd',
  body: '#2e7d32',
  header: '#e65100',
}

// ─── MCP response parser ──────────────────────────────────────────────────────

function parseMcpResponse(data: unknown): any {
  if (typeof data === 'object' && data !== null) return data
  if (typeof data === 'string') {
    const match = data.match(/^data:\s*(.+)$/m)
    if (match) { try { return JSON.parse(match[1]) } catch { /* fall through */ } }
    try { return JSON.parse(data) } catch { /* fall through */ }
  }
  return {}
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: string }) {
  return (
    <Box component="span" sx={{
      display: 'inline-block', px: 0.8, py: 0.15, borderRadius: '3px',
      fontSize: '0.68rem', fontWeight: 700, color: '#fff',
      bgcolor: SOURCE_COLOR[source] ?? '#555', fontFamily: 'monospace', letterSpacing: '0.03em',
    }}>
      {source}
    </Box>
  )
}

function TypeBadge({ type }: { type?: string }) {
  return (
    <Box component="span" sx={{
      display: 'inline-block', px: 0.8, py: 0.15, borderRadius: '3px',
      fontSize: '0.68rem', border: '1px solid #bbb', color: '#555', fontFamily: 'monospace',
    }}>
      {type ?? 'string'}
    </Box>
  )
}

function FieldInput({ name, schema, value, required, onChange }: {
  name: string; schema: JsonSchema; value: string; required: boolean; onChange: (v: string) => void
}) {
  const label = `${name}${required ? ' *' : ''}`
  if (schema.enum && schema.enum.length > 0) {
    return (
      <FormControl size="small" fullWidth>
        <InputLabel>{label}</InputLabel>
        <Select value={value} label={label} onChange={(e) => onChange(String(e.target.value))}>
          {schema.enum.map((v) => <MenuItem key={String(v)} value={String(v)}>{String(v)}</MenuItem>)}
        </Select>
      </FormControl>
    )
  }
  if (schema.type === 'boolean') {
    return (
      <FormControlLabel
        control={<Switch checked={value === 'true'} onChange={(e) => onChange(String(e.target.checked))} size="small" />}
        label={<Typography variant="body2" color="text.secondary">{label}{schema.description && <Typography component="span" variant="caption" color="text.disabled" ml={0.5}>— {schema.description}</Typography>}</Typography>}
      />
    )
  }
  const isJson = schema.type === 'object' || schema.type === 'array'
  return (
    <TextField size="small" fullWidth label={label} value={value} onChange={(e) => onChange(e.target.value)}
      helperText={schema.description} type={schema.type === 'number' || schema.type === 'integer' ? 'number' : 'text'}
      multiline={isJson} minRows={isJson ? 3 : 1}
      placeholder={schema.type === 'object' ? '{"key": "value"}' : schema.type === 'array' ? '["item1"]' : undefined} />
  )
}

// ─── Tool card ────────────────────────────────────────────────────────────────

function ToolCard({ tool, projectId, mcpApiKey }: { tool: GeneratedTool; projectId: string; mcpApiKey?: string }) {
  const [tryMode, setTryMode] = useState(false)
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [executing, setExecuting] = useState(false)
  const [response, setResponse] = useState<string | null>(null)
  const [responseIsError, setResponseIsError] = useState(false)
  const [exampleCopied, setExampleCopied] = useState(false)

  const { path, parameterMap } = tool.endpointRef
  const properties = tool.inputSchema.properties ?? {}
  const requiredFields = tool.inputSchema.required ?? []
  const paramEntries = Object.entries(properties)
  const paramMapByName = new Map((parameterMap ?? []).map((p) => [p.toolParamName, p]))

  const mcpExample = JSON.stringify({
    jsonrpc: '2.0', method: 'tools/call', id: 1,
    params: { name: tool.name, arguments: Object.fromEntries(paramEntries.map(([k, v]) => [k, `<${v.type ?? 'string'}>`])) },
  }, null, 2)

  const handleCopyExample = () => {
    navigator.clipboard.writeText(mcpExample)
    setExampleCopied(true)
    setTimeout(() => setExampleCopied(false), 2000)
  }

  const handleExecute = async () => {
    setExecuting(true); setResponse(null); setResponseIsError(false)
    try {
      const args: Record<string, unknown> = {}
      for (const [key, val] of Object.entries(formValues)) {
        if (val === '') continue
        const schema = properties[key]
        if (schema?.type === 'number' || schema?.type === 'integer') args[key] = Number(val)
        else if (schema?.type === 'boolean') args[key] = val === 'true'
        else if (schema?.type === 'object' || schema?.type === 'array') {
          try { args[key] = JSON.parse(val) } catch { args[key] = val }
        } else args[key] = val
      }
      const payload = { jsonrpc: '2.0', method: 'tools/call', id: Date.now(), params: { name: tool.name, arguments: args } }
      const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }
      if (mcpApiKey) headers['auth'] = mcpApiKey
      const res = await api.post(`/mcp/project/${projectId}`, payload, { headers })
      const rpc = parseMcpResponse(res.data)
      if (rpc?.error) { setResponse(JSON.stringify(rpc.error, null, 2)); setResponseIsError(true); return }
      const content = rpc?.result?.content ?? rpc?.content
      if (rpc?.result?.isError ?? rpc?.isError) setResponseIsError(true)
      const text = content?.[0]?.text ?? JSON.stringify(rpc?.result ?? rpc, null, 2)
      try { setResponse(JSON.stringify(JSON.parse(text), null, 2)) } catch { setResponse(text) }
    } catch (err: any) {
      setResponse(err?.response?.data?.message ?? err?.message ?? 'Erro desconhecido')
      setResponseIsError(true)
    } finally { setExecuting(false) }
  }

  return (
    <Accordion variant="outlined" sx={{ mb: '6px', '&:before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{
        bgcolor: '#f8f9fa', borderRadius: '7px 7px 0 0',
        minHeight: '52px !important', '&.Mui-expanded': { borderRadius: '7px 7px 0 0' }, px: 2,
      }}>
        <Box display="flex" alignItems="center" gap={1.5} width="100%" minWidth={0}>
          <Typography fontWeight={700} fontSize="0.875rem" noWrap>{tool.name}</Typography>
          {tool.description && (
            <Typography variant="body2" color="text.secondary" noWrap sx={{ flexGrow: 1, display: { xs: 'none', sm: 'block' } }}>
              — {tool.description}
            </Typography>
          )}
        </Box>
      </AccordionSummary>

      <AccordionDetails sx={{ p: 2.5 }}>
        {tool.description && <Typography variant="body2" color="text.secondary" mb={2.5}>{tool.description}</Typography>}

        {/* Parameters table */}
        {paramEntries.length > 0 && (
          <>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>Parameters</Typography>
            <Box sx={{ overflowX: 'auto', mb: 2.5 }}>
              <Table size="small" sx={{
                minWidth: 500,
                '& th': { bgcolor: '#f8f9fa', fontWeight: 700, fontSize: '0.72rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' },
                '& td': { fontSize: '0.8rem', verticalAlign: 'middle' },
              }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell><TableCell>Source</TableCell>
                    <TableCell>Type</TableCell><TableCell>Required</TableCell><TableCell>Description</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paramEntries.map(([name, schema]) => {
                    const mapping = paramMapByName.get(name)
                    const isRequired = requiredFields.includes(name)
                    return (
                      <TableRow key={name} sx={{ '&:last-child td': { border: 0 } }}>
                        <TableCell><Typography fontFamily="monospace" fontSize="0.8rem" fontWeight={600}>{name}</Typography></TableCell>
                        <TableCell><SourceBadge source={mapping?.source ?? 'query'} /></TableCell>
                        <TableCell><TypeBadge type={schema.type} /></TableCell>
                        <TableCell>
                          {isRequired
                            ? <Typography color="error.main" fontSize="0.75rem" fontWeight={700}>required</Typography>
                            : <Typography color="text.disabled" fontSize="0.75rem">optional</Typography>}
                        </TableCell>
                        <TableCell><Typography color="text.secondary" fontSize="0.78rem">{schema.description ?? '—'}</Typography></TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Box>
          </>
        )}

        <Divider sx={{ mb: 2 }} />

        {/* Try it out */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={tryMode && paramEntries.length ? 2 : 0}>
          <Typography variant="subtitle2" fontWeight={700}>Try it out</Typography>
          <Button size="small" variant={tryMode ? 'outlined' : 'contained'} color={tryMode ? 'error' : 'primary'}
            onClick={() => { setTryMode((v) => !v); setResponse(null) }}
            sx={{ fontWeight: 600, fontSize: '0.72rem', minWidth: 80 }}>
            {tryMode ? 'Cancel' : 'Try'}
          </Button>
        </Box>

        {tryMode && (
          <Box>
            {paramEntries.length > 0
              ? <Box display="flex" flexDirection="column" gap={1.5} mb={2}>
                  {paramEntries.map(([name, schema]) => (
                    <FieldInput key={name} name={name} schema={schema} value={formValues[name] ?? ''}
                      required={requiredFields.includes(name)} onChange={(v) => setFormValues((prev) => ({ ...prev, [name]: v }))} />
                  ))}
                </Box>
              : <Typography variant="body2" color="text.secondary" mt={1} mb={2}>This tool has no parameters.</Typography>}
            <Button variant="contained" size="small"
              startIcon={executing ? <CircularProgress size={13} color="inherit" /> : <PlayArrowIcon fontSize="small" />}
              onClick={handleExecute} disabled={executing}
              sx={{ mb: response !== null ? 2 : 0, fontWeight: 600 }}>
              {executing ? 'Executing...' : 'Execute'}
            </Button>
            {response !== null && (
              <Box component="pre" sx={{
                bgcolor: responseIsError ? '#fff8f8' : '#1e1e1e', color: responseIsError ? '#c62828' : '#d4d4d4',
                border: '1px solid', borderColor: responseIsError ? '#ffcdd2' : 'transparent',
                p: 2, borderRadius: 1, fontSize: '0.78rem', overflowX: 'auto', overflowY: 'auto',
                maxHeight: 400, whiteSpace: 'pre-wrap', wordBreak: 'break-word', m: 0,
              }}>
                {response}
              </Box>
            )}
          </Box>
        )}

        {/* MCP JSON example */}
        {!tryMode && (
          <Box mt={0.5}>
            <Typography variant="caption" fontWeight={700} color="text.disabled" display="block" mb={0.75} sx={{ letterSpacing: '0.06em' }}>
              MCP CALL EXAMPLE (JSON-RPC)
            </Typography>
            <Box component="pre" sx={{ bgcolor: '#282c34', color: '#abb2bf', p: 2, borderRadius: 1, fontSize: '0.75rem', overflowX: 'auto', position: 'relative', m: 0 }}>
              <Tooltip title={exampleCopied ? 'Copied!' : 'Copy'}>
                <IconButton size="small" onClick={handleCopyExample}
                  sx={{ position: 'absolute', top: 8, right: 8, color: exampleCopied ? 'primary.light' : '#abb2bf', '&:hover': { color: '#fff' } }}>
                  <ContentCopyIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
              {mcpExample}
            </Box>
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  )
}

// ─── McpDocsContent (reusable as a tab or standalone page) ──────────────

export function McpDocsContent({ project, projectId }: { project: DocsProject; projectId: string }) {
  const [search, setSearch] = useState('')
  const [urlCopied, setUrlCopied] = useState(false)

  const mcpUrl = `${window.location.origin}/api/mcp/project/${projectId}`

  const enabledTools = (project.tools ?? []).filter((t) => t.enabled !== false)
  const filteredTools = enabledTools.filter((t) =>
    !search
    || t.name.toLowerCase().includes(search.toLowerCase())
    || (t.description ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Box>
      {/* Header */}
      <Paper variant="outlined" sx={{ mb: 3, overflow: 'hidden', borderColor: 'primary.light' }}>
        <Box sx={{ bgcolor: 'primary.main', px: 3, py: 2.5 }}>
          <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
            <Typography variant="h5" fontWeight={700} color="#fff" lineHeight={1.2}>{project.name}</Typography>
            {project.version && (
              <Box sx={{ px: 1, py: 0.2, bgcolor: 'rgba(255,255,255,0.25)', borderRadius: 1, fontSize: '0.75rem', color: '#fff', fontWeight: 700, alignSelf: 'flex-start', mt: 0.3 }}>
                {project.version}
              </Box>
            )}
          </Box>
          {project.description && <Typography color="rgba(255,255,255,0.8)" variant="body2" mt={0.5}>{project.description}</Typography>}
        </Box>

        <Box px={3} py={2}>
          <Box display="flex" alignItems="center" gap={1} mb={2} flexWrap="wrap">
            <Chip label={project.status === 'active' ? 'Active' : 'Error'} color={project.status === 'active' ? 'success' : 'error'} size="small" />
            <Chip label={`${enabledTools.length} tools`} size="small" color="primary" variant="outlined" />
          </Box>

          <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={0.75} sx={{ letterSpacing: '0.06em' }}>
            ENDPOINT MCP
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#f8f9fa', borderRadius: 1, px: 2, py: 1.25, border: '1px solid', borderColor: 'divider' }}>
            <Typography fontFamily="monospace" fontSize="0.85rem" flexGrow={1} sx={{ wordBreak: 'break-all', color: 'text.primary' }}>
              {mcpUrl}
            </Typography>
            <Tooltip title={urlCopied ? 'Copied!' : 'Copy URL'}>
              <IconButton size="small" onClick={() => { navigator.clipboard.writeText(mcpUrl); setUrlCopied(true); setTimeout(() => setUrlCopied(false), 2000) }} color={urlCopied ? 'primary' : 'default'}>
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          {project.mcpApiKey && (
            <Typography variant="caption" color="warning.main" mt={0.75} display="block" fontWeight={600}>
              This project requires authentication — send the header <code>auth: &lt;your-key&gt;</code>
            </Typography>
          )}
          {!project.mcpApiKey && (
            <Typography variant="caption" color="text.secondary" mt={0.75} display="block">
              Configure this URL in Claude Desktop, Cursor, or any compatible MCP client.
            </Typography>
          )}
        </Box>
      </Paper>

      {/* Search */}
      <Box display="flex" alignItems="center" gap={1.5} mb={2.5} flexWrap="wrap">
        <TextField size="small" placeholder="Search tool..." value={search} onChange={(e) => setSearch(e.target.value)} sx={{ width: 260 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" color="action" /></InputAdornment> }} />
        <Typography variant="body2" color="text.secondary" ml="auto">{filteredTools.length} / {enabledTools.length}</Typography>
      </Box>

      {/* Tools */}
      {filteredTools.length === 0
        ? <Alert severity="info">No tools found.</Alert>
        : filteredTools.map((tool) => <ToolCard key={tool.name} tool={tool} projectId={projectId} mcpApiKey={project.mcpApiKey} />)}
    </Box>
  )
}

// ─── Standalone page (mantida para compatibilidade de rota) ───────────────────

export default function McpDocs() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<DocsProject | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    api.get<DocsProject>(`/swagger/projects/${id}`)
      .then((r) => setProject(r.data))
      .catch(() => setError('Project not found.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" height="50vh"><CircularProgress /></Box>
  if (error || !project) return <Box p={3}><Alert severity="error">{error || 'Error loading project.'}</Alert></Box>

  return (
    <Box p={3}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(`/projects/${id}`)} sx={{ mb: 2 }}>
        Back to project
      </Button>
      <McpDocsContent project={project} projectId={id!} />
    </Box>
  )
}
