import { useEffect, useRef, useState, useCallback } from 'react'
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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AutorenewIcon from '@mui/icons-material/Autorenew'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import LockIcon from '@mui/icons-material/Lock'
import LockOpenIcon from '@mui/icons-material/LockOpen'
import BuildIcon from '@mui/icons-material/Build'
import HttpIcon from '@mui/icons-material/Http'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import AssessmentIcon from '@mui/icons-material/Assessment'
import SpeedIcon from '@mui/icons-material/Speed'
import VpnKeyIcon from '@mui/icons-material/VpnKey'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import TuneIcon from '@mui/icons-material/Tune'
import SearchIcon from '@mui/icons-material/Search'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import Swal from 'sweetalert2'
import api from '../api'
import HelpButton from '../components/HelpButton'
import { McpDocsContent } from './McpDocs'

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface JsonSchema {
  type?: string
  properties?: Record<string, JsonSchema>
  required?: string[]
  description?: string
  enum?: unknown[]
}

interface GeneratedTool {
  name: string
  description?: string
  inputSchema: JsonSchema
  endpointRef: EndpointRef
  enabled?: boolean
}

interface Project {
  _id: string
  name: string
  baseUrl: string
  description?: string
  version?: string
  status: string
  tools: GeneratedTool[]
  mcpApiKey?: string
  rateLimit?: { enabled: boolean; requestsPerMinute: number }
  auth?: AuthConfig
  createdAt: string
  updatedAt: string
}

type AuthType = 'none' | 'bearer' | 'api-key' | 'basic' | 'oauth2-client' | 'custom'

type AuthConfig =
  | { type: 'none' }
  | { type: 'bearer'; token: string }
  | { type: 'api-key'; name: string; value: string; in: 'header' | 'query' }
  | { type: 'basic'; username: string; password: string }
  | { type: 'oauth2-client'; tokenUrl: string; clientId: string; clientSecret: string; scope?: string }
  | { type: 'custom'; headers: { name: string; value: string }[] }

// ─── Constants ────────────────────────────────────────────────────────────────

const METHOD_COLOR: Record<string, string> = {
  GET: '#61affe',
  POST: '#49cc90',
  PUT: '#fca130',
  PATCH: '#50e3c2',
  DELETE: '#f93e3e',
}

const METHOD_BG: Record<string, string> = {
  GET: '#ebf3fb',
  POST: '#e7f6ec',
  PUT: '#fef3e2',
  PATCH: '#e6f8f4',
  DELETE: '#fde9e9',
}

const SOURCE_CHIP_COLOR: Record<
  string,
  'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error'
> = {
  path: 'secondary',
  query: 'primary',
  body: 'success',
  header: 'warning',
}

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
const SOURCES = ['path', 'query', 'body', 'header'] as const
const PARAM_TYPES = ['string', 'number', 'integer', 'boolean', 'object', 'array']

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

// ─── InlineEdit ───────────────────────────────────────────────────────────────

interface InlineEditProps {
  value: string
  onSave: (v: string) => Promise<void>
  multiline?: boolean
  placeholder?: string
  emptyLabel?: string
  fontSize?: string | number
  fontWeight?: number
  color?: string
  fontFamily?: string
  maxWidth?: number | string
}

function InlineEdit({
  value,
  onSave,
  multiline = false,
  placeholder,
  emptyLabel = 'Add…',
  fontSize,
  fontWeight,
  color,
  fontFamily,
  maxWidth,
}: InlineEditProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  useEffect(() => { if (!editing) setDraft(value) }, [value, editing])
  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  const commit = async () => {
    if (saving) return
    setSaving(true)
    try { await onSave(draft); setEditing(false) } finally { setSaving(false) }
  }

  const cancel = () => { setDraft(value); setEditing(false) }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { cancel(); return }
    if (!multiline && e.key === 'Enter') { e.preventDefault(); commit(); return }
    if (multiline && e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); commit(); return }
  }

  if (!editing) {
    return (
      <Box display="inline-flex" alignItems="flex-start" gap={0.5} sx={{ cursor: 'text', maxWidth }} onClick={() => setEditing(true)}>
        {value ? (
          <Typography sx={{ fontSize, fontWeight, color: color ?? 'text.primary', fontFamily, lineHeight: 1.5 }}>{value}</Typography>
        ) : (
          <Typography sx={{ fontSize: fontSize ?? '0.875rem', color: 'text.disabled', fontStyle: 'italic' }}>{emptyLabel}</Typography>
        )}
        <EditIcon sx={{ fontSize: 14, color: 'text.disabled', mt: '3px', flexShrink: 0, opacity: 0.6 }} />
      </Box>
    )
  }

  return (
    <Box sx={{ maxWidth, width: '100%' }}>
      <TextField
        inputRef={inputRef}
        size="small"
        fullWidth
        multiline={multiline}
        minRows={multiline ? 2 : undefined}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKey}
        placeholder={placeholder}
        disabled={saving}
      />
      <Box display="flex" gap={0.5} mt={0.5} justifyContent="flex-end">
        <Tooltip title={multiline ? 'Save (Ctrl+Enter)' : 'Save (Enter)'}>
          <span>
            <IconButton size="small" color="primary" onClick={commit} disabled={saving}>
              {saving ? <CircularProgress size={13} /> : <CheckIcon fontSize="small" />}
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Cancel (Esc)">
          <IconButton size="small" onClick={cancel} disabled={saving}><CloseIcon fontSize="small" /></IconButton>
        </Tooltip>
      </Box>
    </Box>
  )
}

// ─── BaseUrl panel ────────────────────────────────────────────────────────────

function BaseUrlPanel({ projectId, initialValue, onChange }: {
  projectId: string; initialValue: string; onChange: (url: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(initialValue)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { if (!editing) setValue(initialValue) }, [initialValue, editing])

  const handleSave = async () => {
    const trimmed = value.trim()
    if (!trimmed) { setError('The URL cannot be empty.'); return }
    try { new URL(trimmed) } catch { setError('Invalid URL. Include protocol (e.g. https://api.example.com)'); return }
    setSaving(true); setError('')
    try {
      await api.patch(`/swagger/projects/${projectId}/base-url`, { baseUrl: trimmed })
      onChange(trimmed); setEditing(false)
    } catch { setError('Failed to save. Please try again.') } finally { setSaving(false) }
  }

  const handleCancel = () => { setValue(initialValue); setEditing(false); setError('') }

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'flex-start', gap: 2 }}>
      <Box sx={{ color: 'primary.main', display: 'flex', alignItems: 'center', pt: 0.5 }}>
        <HttpIcon />
      </Box>

      <Box flex={1} minWidth={0}>
        <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
          <Typography variant="subtitle2" fontWeight={700}>API Base URL</Typography>
          <HelpButton title="API Base URL">
            <Typography variant="body2" gutterBottom>
              The root address of the external API this project connects to. Every tool call is prefixed with this URL — for example, base <code>https://api.example.com</code> + tool path <code>/users/42</code> makes a full request to <code>https://api.example.com/users/42</code>.
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>When to update this field:</strong>
            </Typography>
            <Box component="ul" sx={{ mt: 0, mb: 1, pl: 2.5 }}>
              <Box component="li"><Typography variant="body2">Switching environments: staging → production (just change the URL, keep all tools).</Typography></Box>
              <Box component="li"><Typography variant="body2">The API migrated to a new domain or subdomain.</Typography></Box>
              <Box component="li"><Typography variant="body2">You want to test the same tools against a different server version.</Typography></Box>
            </Box>
            <Typography variant="body2" gutterBottom>
              The URL must include the protocol (<code>https://</code> or <code>http://</code>) and must not end with a trailing slash. Path parameters and query strings should <em>not</em> be included here — they belong in individual tool definitions.
            </Typography>
            <Typography variant="body2">
              Changes take effect immediately for all subsequent tool calls. In-flight calls are not affected.
            </Typography>
          </HelpButton>
        </Box>

        {editing ? (
          <TextField
            size="small" fullWidth autoFocus
            label="ExternalAPI Base URL" value={value}
            onChange={(e) => { setValue(e.target.value); setError('') }}
            error={!!error} helperText={error || 'Base URL used for all HTTP calls in this project'}
            placeholder="https://api.example.com"
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel() }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title="Save"><span>
                    <IconButton size="small" color="primary" onClick={handleSave} disabled={saving}>
                      {saving ? <CircularProgress size={14} /> : <CheckIcon fontSize="small" />}
                    </IconButton>
                  </span></Tooltip>
                  <Tooltip title="Cancel">
                    <IconButton size="small" onClick={handleCancel} disabled={saving}><CloseIcon fontSize="small" /></IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
            }}
          />
        ) : (
          <Box display="flex" alignItems="center" gap={0.5}>
            <Typography
              fontFamily="monospace" fontSize="0.85rem" color="text.secondary"
              sx={{ wordBreak: 'break-all', flexGrow: 1 }}
            >
              {initialValue || <span style={{ fontStyle: 'italic', opacity: 0.5 }}>No base URL set</span>}
            </Typography>
            <Tooltip title="Edit Base URL">
              <IconButton size="small" onClick={() => setEditing(true)}><EditIcon sx={{ fontSize: 15 }} /></IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>
    </Paper>
  )
}

// ─── MCP Endpoint bar ─────────────────────────────────────────────────────────

function McpEndpointBar({ projectId, mcpApiKey }: { projectId: string; mcpApiKey?: string }) {
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/api/mcp/project/${projectId}`

  return (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
      <Box display="flex" alignItems="center" gap={1} mb={1.5}>
        <HttpIcon color="primary" fontSize="small" />
        <Typography variant="subtitle1" fontWeight={700} flexGrow={1}>MCP Endpoint</Typography>
        <HelpButton title="MCP Endpoint">
          <Typography variant="body2" gutterBottom>
            The URL that MCP clients (Claude Desktop, Cursor, or any compatible client) use to connect to <em>this specific project's</em> tools. Copy it and paste it into your client's MCP server configuration.
          </Typography>
          <Typography variant="body2" gutterBottom>
            <strong>Claude Desktop</strong> — edit <code>claude_desktop_config.json</code>:
          </Typography>
          <Box sx={{ bgcolor: '#f5f5f5', borderRadius: 1, px: 1.5, py: 1, mb: 1, fontFamily: 'monospace', fontSize: '0.78rem' }}>
            {`"mcpServers": {\n  "my-project": { "url": "<this URL>" }\n}`}
          </Box>
          <Typography variant="body2" gutterBottom>
            <strong>Cursor</strong> — Settings → MCP → Add server → paste this URL.
          </Typography>
          <Typography variant="body2" gutterBottom>
            This endpoint is <strong>project-scoped</strong>: the AI only sees the tools in this project, not tools from other projects. Use per-project endpoints to give different AI clients access to different parts of your infrastructure.
          </Typography>
          <Typography variant="body2">
            If <strong>MCP Authentication</strong> is enabled for this project, the client must include the header <code>auth: &lt;key&gt;</code> in every request. Without it the server returns HTTP 401.
          </Typography>
        </HelpButton>
      </Box>

      <Box display="flex" alignItems="center" gap={1}>
        <Box sx={{
          flexGrow: 1, fontFamily: 'monospace', fontSize: '0.82rem',
          bgcolor: '#f5f5f5', border: '1px solid #e0e0e0', borderRadius: 1,
          px: 1.5, py: 1, color: 'text.primary', wordBreak: 'break-all',
        }}>
          {url}
        </Box>
        <Tooltip title={copied ? 'Copied!' : 'Copy URL'}>
          <IconButton size="small" color={copied ? 'primary' : 'default'}
            onClick={() => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000) }}>
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Typography variant="caption" color="text.secondary" mt={0.75} display="block">
        {mcpApiKey
          ? <>Configure this URL in your MCP client and include the header <Box component="code" sx={{ bgcolor: '#f0f0f0', px: 0.8, py: 0.2, borderRadius: 0.5, fontSize: '0.78rem' }}>auth: &lt;key&gt;</Box></>
          : 'Configure this URL in Claude Desktop, Cursor, or any compatible MCP client.'}
      </Typography>
    </Paper>
  )
}

// ─── API Key panel ────────────────────────────────────────────────────────────

function ApiKeyPanel({ projectId, initialKey, onChange }: {
  projectId: string
  initialKey?: string
  onChange: (key: string | undefined) => void
}) {
  const [key, setKey] = useState(initialKey)
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleGenerate = async () => {
    if (key) {
      const result = await Swal.fire({
        title: 'Regenerate key?',
        text: 'The current key will be invalidated and any client using it will stop working.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Regenerate',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#f57c00',
      })
      if (!result.isConfirmed) return
    }
    setLoading(true)
    try {
      const res = await api.post<{ mcpApiKey: string }>(`/swagger/projects/${projectId}/api-key`)
      setKey(res.data.mcpApiKey)
      onChange(res.data.mcpApiKey)
      setVisible(true)
    } finally { setLoading(false) }
  }

  const handleRevoke = async () => {
    const result = await Swal.fire({
      title: 'Remove key?',
      text: 'The MCP server will be accessible without authentication.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Remove',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#d33',
    })
    if (!result.isConfirmed) return
    setLoading(true)
    try {
      await api.delete(`/swagger/projects/${projectId}/api-key`)
      setKey(undefined)
      onChange(undefined)
      setVisible(false)
    } finally { setLoading(false) }
  }

  const handleCopy = () => {
    if (!key) return
    navigator.clipboard.writeText(key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const maskedKey = key ? `${key.slice(0, 8)}${'•'.repeat(24)}${key.slice(-8)}` : ''

  return (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 3 }}>
      <Box display="flex" alignItems="center" gap={1} mb={key ? 2 : 0}>
        {key ? <LockIcon color="success" fontSize="small" /> : <LockOpenIcon color="disabled" fontSize="small" />}
        <Box display="flex" alignItems="center" gap={0.5} flexGrow={1}>
          <Typography variant="subtitle1" fontWeight={700}>MCP Authentication</Typography>
          <HelpButton title="MCP Authentication">
            <Typography variant="body2" gutterBottom>
              An API key that controls who can access this project's MCP endpoint. When a key is active, <strong>every</strong> client request must include the header <code>auth: &lt;key&gt;</code> — requests without it receive HTTP 401 and are rejected before reaching any tool.
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>Without a key</strong>, the endpoint is completely open: anyone who knows the URL can connect an AI client, read all tool descriptions, and trigger calls to your upstream API. This is acceptable for private networks or local testing, but risky on publicly reachable servers.
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>Key lifecycle:</strong>
            </Typography>
            <Box component="ul" sx={{ mt: 0, mb: 1, pl: 2.5 }}>
              <Box component="li"><Typography variant="body2"><strong>Generate:</strong> creates a cryptographically random key and activates protection immediately.</Typography></Box>
              <Box component="li"><Typography variant="body2"><strong>View (eye icon):</strong> reveals the full key. Copy it now — you cannot retrieve it again without regenerating.</Typography></Box>
              <Box component="li"><Typography variant="body2"><strong>Regenerate:</strong> immediately invalidates the old key and issues a new one. Any client using the old key will stop working until updated.</Typography></Box>
              <Box component="li"><Typography variant="body2"><strong>Remove:</strong> disables authentication entirely, making the endpoint public again.</Typography></Box>
            </Box>
            <Typography variant="body2">
              Treat the key like a password: never commit it to source code repositories or share it in plain-text configuration files. If it is compromised, regenerate it immediately.
            </Typography>
          </HelpButton>
        </Box>
        {!key && (
          <Button size="small" variant="contained" startIcon={<LockIcon fontSize="small" />}
            onClick={handleGenerate} disabled={loading}>
            {loading ? <CircularProgress size={14} color="inherit" /> : 'Generate key'}
          </Button>
        )}
        {key && (
          <Box display="flex" gap={1}>
            <Tooltip title="Regenerate key">
              <span>
                <IconButton size="small" onClick={handleGenerate} disabled={loading}>
                  {loading ? <CircularProgress size={16} /> : <AutorenewIcon fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Remove key (disable auth)">
              <IconButton size="small" color="error" onClick={handleRevoke} disabled={loading}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>

      {key ? (
        <>
          <Box display="flex" alignItems="center" gap={1} mb={1.5}>
            <Box sx={{
              flexGrow: 1, fontFamily: 'monospace', fontSize: '0.82rem',
              bgcolor: '#f5f5f5', border: '1px solid #e0e0e0', borderRadius: 1,
              px: 1.5, py: 1, letterSpacing: '0.04em', color: 'text.primary',
              overflow: 'hidden', whiteSpace: 'nowrap',
            }}>
              {visible ? key : maskedKey}
            </Box>
            <Tooltip title={visible ? 'Hide' : 'Show'}>
              <IconButton size="small" onClick={() => setVisible((v) => !v)}>
                {visible ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            <Tooltip title={copied ? 'Copied!' : 'Copy'}>
              <IconButton size="small" color={copied ? 'primary' : 'default'} onClick={handleCopy}>
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <Typography variant="caption" color="text.secondary" component="div">
            Use in the header: <Box component="code" sx={{ bgcolor: '#f0f0f0', px: 0.8, py: 0.2, borderRadius: 0.5, fontSize: '0.78rem' }}>auth: {visible ? key : '<your-key>'}</Box>
          </Typography>
        </>
      ) : (
        <Typography variant="body2" color="text.disabled" mt={1}>
          No authentication — any client can call the MCP server for this project.
        </Typography>
      )}
    </Paper>
  )
}

// ─── Tool dialog (create / edit endpoint) ────────────────────────────────────

interface ParamEntry {
  id: string
  toolParamName: string
  source: 'path' | 'query' | 'header' | 'body'
  originalName: string
  required: boolean
  type: string
  description: string
}

function emptyParam(): ParamEntry {
  return { id: Math.random().toString(36).slice(2), toolParamName: '', source: 'query', originalName: '', required: false, type: 'string', description: '' }
}

function toolToFormState(tool: GeneratedTool | undefined) {
  if (!tool) {
    return { name: '', description: '', method: 'GET', path: '/', contentType: 'application/json', params: [] as ParamEntry[] }
  }
  const { endpointRef, inputSchema } = tool
  return {
    name: tool.name,
    description: tool.description ?? '',
    method: endpointRef.method,
    path: endpointRef.path,
    contentType: endpointRef.contentType ?? 'application/json',
    params: (endpointRef.parameterMap ?? []).map((pm) => ({
      id: Math.random().toString(36).slice(2),
      toolParamName: pm.toolParamName,
      source: pm.source,
      originalName: pm.originalName,
      required: pm.required,
      type: inputSchema.properties?.[pm.toolParamName]?.type ?? 'string',
      description: inputSchema.properties?.[pm.toolParamName]?.description ?? '',
    })) as ParamEntry[],
  }
}

interface ToolDialogProps {
  open: boolean
  onClose: () => void
  onSaved: (tool: GeneratedTool, oldName?: string) => void
  projectId: string
  projectBaseUrl: string
  editTool?: GeneratedTool
}

// ─── Auto-save indicator (compartilhado) ─────────────────────────────────────

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

function SaveIndicator({ status, error }: { status: SaveStatus; error?: string }) {
  if (status === 'idle') return null
  if (status === 'saving') return (
    <Box display="flex" alignItems="center" gap={0.5}>
      <CircularProgress size={10} />
      <Typography variant="caption" color="text.secondary">Saving…</Typography>
    </Box>
  )
  if (status === 'saved') return (
    <Box display="flex" alignItems="center" gap={0.5}>
      <CheckIcon sx={{ fontSize: 14, color: 'success.main' }} />
      <Typography variant="caption" color="success.main">Saved</Typography>
    </Box>
  )
  return <Typography variant="caption" color="error.main">{error || 'Failed to save.'}</Typography>
}


// ─── Rate limit panel ─────────────────────────────────────────────────────────

interface RateLimitPanelProps {
  projectId: string
  initialRateLimit?: { enabled: boolean; requestsPerMinute: number }
  onChange: (rl: { enabled: boolean; requestsPerMinute: number }) => void
}

function RateLimitPanel({ projectId, initialRateLimit, onChange }: RateLimitPanelProps) {
  const [enabled, setEnabled] = useState(initialRateLimit?.enabled ?? false)
  const [rpm, setRpm] = useState(initialRateLimit?.requestsPerMinute ?? 60)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [saveError, setSaveError] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef<{ enabled: boolean; requestsPerMinute: number } | null>(null)

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  const scheduleSave = useCallback((payload: { enabled: boolean; requestsPerMinute: number }, delay = 700) => {
    pendingRef.current = payload
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      const p = pendingRef.current; if (!p) return
      if (p.requestsPerMinute < 1 || p.requestsPerMinute > 10000) {
        setSaveError('Value must be between 1 and 10,000.'); setSaveStatus('error'); return
      }
      setSaveStatus('saving')
      try {
        await api.patch(`/swagger/projects/${projectId}/rate-limit`, p)
        onChange(p)
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2500)
      } catch (err: any) {
        setSaveError(err?.response?.data?.message ?? 'Failed to save.')
        setSaveStatus('error')
      }
    }, delay)
  }, [projectId, onChange])

  const handleEnabledChange = (val: boolean) => {
    setEnabled(val)
    scheduleSave({ enabled: val, requestsPerMinute: rpm }, 0)
  }

  const handleRpmChange = (val: number) => {
    setRpm(val)
    scheduleSave({ enabled, requestsPerMinute: val }, 700)
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
      <Box sx={{ color: enabled ? 'warning.main' : 'text.disabled', display: 'flex', alignItems: 'center', pt: 0.5 }}>
        <SpeedIcon />
      </Box>

      <Box flex={1} minWidth={0}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
          <Box display="flex" alignItems="center" gap={0.5}>
            <Typography variant="subtitle2" fontWeight={700}>Rate Limiting</Typography>
            <HelpButton title="Rate Limiting">
              <Typography variant="body2" gutterBottom>
                Caps the number of MCP requests this project accepts per minute. When the limit is exceeded, the server responds with <strong>HTTP 429 (Too Many Requests)</strong> and a <code>Retry-After</code> header — the AI client should wait before retrying.
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Why set a rate limit?</strong>
              </Typography>
              <Box component="ul" sx={{ mt: 0, mb: 1, pl: 2.5 }}>
                <Box component="li"><Typography variant="body2"><strong>Protect the upstream API:</strong> many APIs have their own rate limits. Staying within them prevents your API credentials from being throttled or suspended.</Typography></Box>
                <Box component="li"><Typography variant="body2"><strong>Control costs:</strong> every call to a paid API costs money. A rate limit prevents AI agents from accidentally making thousands of calls in a loop.</Typography></Box>
                <Box component="li"><Typography variant="body2"><strong>Prevent runaway agents:</strong> AI agents in agentic workflows can sometimes get stuck in retry loops. A rate limit acts as a circuit breaker.</Typography></Box>
                <Box component="li"><Typography variant="body2"><strong>Fair usage:</strong> if multiple AI clients share this endpoint, a limit ensures no single client monopolises the quota.</Typography></Box>
              </Box>
              <Typography variant="body2" gutterBottom>
                <strong>How to set the right limit:</strong> check your upstream API's documented rate limit (e.g. 100 req/min) and set Arthur's limit slightly below it to leave headroom. Start conservative and increase if the AI frequently hits 429.
              </Typography>
              <Typography variant="body2">
                Toggle the switch to <strong>Inactive</strong> to disable rate limiting entirely. Changes save automatically.
              </Typography>
            </HelpButton>
          </Box>
          <SaveIndicator status={saveStatus} error={saveError} />
        </Box>

        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <FormControlLabel
            control={
              <Switch size="small" checked={enabled} onChange={(e) => handleEnabledChange(e.target.checked)} color="warning" />
            }
            label={<Typography variant="body2">{enabled ? 'Active' : 'Inactive'}</Typography>}
            sx={{ mr: 0 }}
          />
          <TextField
            size="small" type="number" label="Req / min"
            value={rpm} disabled={!enabled}
            onChange={(e) => handleRpmChange(Number(e.target.value))}
            inputProps={{ min: 1, max: 10000 }}
            sx={{ width: 130 }}
          />
        </Box>

        <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
          {enabled
            ? `Limits MCP server calls to ${rpm} req/min. Exceeding the limit returns HTTP 429.`
            : 'No request limit. Enable to restrict usage per minute.'}
        </Typography>
      </Box>
    </Paper>
  )
}

// ─── Auth config panel ────────────────────────────────────────────────────────

const AUTH_TYPE_LABELS: Record<AuthType, string> = {
  none: 'None (public API)',
  bearer: 'Bearer Token',
  'api-key': 'API Key',
  basic: 'Basic Auth (username/password)',
  'oauth2-client': 'OAuth2 Client Credentials',
  custom: 'Custom headers',
}

function AuthConfigPanel({ projectId, initialAuth, onChange }: {
  projectId: string
  initialAuth?: AuthConfig
  onChange: (auth: AuthConfig) => void
}) {
  const [authType, setAuthType] = useState<AuthType>((initialAuth?.type as AuthType) ?? 'none')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [saveError, setSaveError] = useState('')
  const [showSecrets, setShowSecrets] = useState(false)

  // bearer
  const [token, setToken] = useState((initialAuth as any)?.token ?? '')
  // api-key
  const [keyName, setKeyName] = useState((initialAuth as any)?.name ?? '')
  const [keyValue, setKeyValue] = useState((initialAuth as any)?.value ?? '')
  const [keyIn, setKeyIn] = useState<'header' | 'query'>((initialAuth as any)?.in ?? 'header')
  // basic
  const [basicUser, setBasicUser] = useState((initialAuth as any)?.username ?? '')
  const [basicPass, setBasicPass] = useState((initialAuth as any)?.password ?? '')
  // oauth2-client
  const [oauthTokenUrl, setOauthTokenUrl] = useState((initialAuth as any)?.tokenUrl ?? '')
  const [oauthClientId, setOauthClientId] = useState((initialAuth as any)?.clientId ?? '')
  const [oauthClientSecret, setOauthClientSecret] = useState((initialAuth as any)?.clientSecret ?? '')
  const [oauthScope, setOauthScope] = useState((initialAuth as any)?.scope ?? '')
  // custom headers
  const [customHeaders, setCustomHeaders] = useState<{ name: string; value: string }[]>(
    (initialAuth as any)?.headers ?? [{ name: '', value: '' }]
  )

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef<AuthConfig | null>(null)

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  const scheduleSave = useCallback((payload: AuthConfig, delay = 700) => {
    pendingRef.current = payload
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      const p = pendingRef.current; if (!p) return
      setSaveStatus('saving')
      try {
        await api.patch(`/swagger/projects/${projectId}/auth`, p)
        onChange(p)
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2500)
      } catch (err: any) {
        setSaveError(err?.response?.data?.message ?? 'Failed to save.')
        setSaveStatus('error')
      }
    }, delay)
  }, [projectId, onChange])

  const handleAuthTypeChange = (newType: AuthType) => {
    setAuthType(newType)
    let payload: AuthConfig
    switch (newType) {
      case 'bearer': payload = { type: 'bearer', token }; break
      case 'api-key': payload = { type: 'api-key', name: keyName, value: keyValue, in: keyIn }; break
      case 'basic': payload = { type: 'basic', username: basicUser, password: basicPass }; break
      case 'oauth2-client': payload = { type: 'oauth2-client', tokenUrl: oauthTokenUrl, clientId: oauthClientId, clientSecret: oauthClientSecret, scope: oauthScope || undefined }; break
      case 'custom': payload = { type: 'custom', headers: customHeaders.filter(h => h.name.trim()) }; break
      default: payload = { type: 'none' }
    }
    scheduleSave(payload, 0)
  }

  const secretInput = (value: string, onChg: (v: string) => void, label: string) => (
    <TextField
      size="small" fullWidth label={label}
      type={showSecrets ? 'text' : 'password'}
      value={value}
      onChange={(e) => onChg(e.target.value)}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton size="small" onClick={() => setShowSecrets(s => !s)} edge="end">
              {showSecrets ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
            </IconButton>
          </InputAdornment>
        )
      }}
    />
  )

  const addCustomHeader = () => setCustomHeaders(prev => [...prev, { name: '', value: '' }])
  const removeCustomHeader = (i: number) => {
    const next = customHeaders.filter((_, idx) => idx !== i)
    setCustomHeaders(next)
    scheduleSave({ type: 'custom', headers: next.filter(h => h.name.trim()) }, 0)
  }
  const updateCustomHeader = (i: number, field: 'name' | 'value', val: string) => {
    const next = customHeaders.map((h, idx) => idx === i ? { ...h, [field]: val } : h)
    setCustomHeaders(next)
    scheduleSave({ type: 'custom', headers: next.filter(h => h.name.trim()) }, 700)
  }

  return (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <VpnKeyIcon fontSize="small" sx={{ color: authType !== 'none' ? 'primary.main' : 'text.disabled' }} />
          <Typography variant="subtitle2" fontWeight={700}>API Authentication</Typography>
          {authType !== 'none' && (
            <Chip label={AUTH_TYPE_LABELS[authType]} size="small" color="primary" sx={{ fontSize: '0.7rem', height: 20 }} />
          )}
          <HelpButton title="API Authentication">
            <Typography variant="body2" gutterBottom>
              The credentials Arthur automatically attaches to every <strong>outgoing HTTP request</strong> when calling the upstream API on behalf of an AI tool call. The AI never sees or handles these credentials — Arthur injects them invisibly.
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>Choose the mode that matches your API's requirements:</strong>
            </Typography>
            <Box component="ul" sx={{ mt: 0, mb: 1, pl: 2.5 }}>
              {([
                ['None', 'Public API — no credentials are attached. Use for unauthenticated endpoints.'],
                ['Bearer Token', 'Adds the header Authorization: Bearer <token>. Most modern REST APIs and OAuth2 resource servers use this.'],
                ['API Key', 'Adds the key as a custom header (e.g. X-API-Key) or as a query parameter. Check your API\'s documentation for the exact field name.'],
                ['Basic Auth', 'Adds Authorization: Basic <base64(username:password)>. Used by some legacy APIs and services like Jira or Confluence.'],
                ['OAuth2 Client Credentials', 'Arthur fetches a Bearer token automatically using your client ID and secret, and renews it before it expires. Use for machine-to-machine integrations where no user is involved.'],
                ['Custom Headers', 'Add any arbitrary HTTP headers. Useful for APIs with non-standard authentication schemes or when you need to pass multiple headers (e.g. X-Tenant-Id + X-Auth-Token).'],
              ] as [string,string][]).map(([label, desc]) => (
                <Box component="li" key={label} sx={{ mb: 0.5 }}>
                  <Typography variant="body2"><strong>{label}:</strong> {desc}</Typography>
                </Box>
              ))}
            </Box>
            <Typography variant="body2" gutterBottom>
              <strong>Important security note:</strong> credentials are stored encrypted in the database. Use tokens and keys with the <em>minimum required scope</em> — if a credential is exposed, a limited-scope key reduces the blast radius.
            </Typography>
            <Typography variant="body2">
              These credentials are completely separate from the <strong>MCP Authentication key</strong> (which protects the MCP endpoint). One controls who can call Arthur; the other controls how Arthur calls your API.
            </Typography>
          </HelpButton>
        </Box>
        <SaveIndicator status={saveStatus} error={saveError} />
      </Box>

      {/* Type selector */}
      <FormControl size="small" fullWidth sx={{ mb: 2 }}>
        <InputLabel>Authentication type</InputLabel>
        <Select
          value={authType}
          label="Authentication type"
          onChange={(e) => handleAuthTypeChange(e.target.value as AuthType)}
        >
          {(Object.keys(AUTH_TYPE_LABELS) as AuthType[]).map((t) => (
            <MenuItem key={t} value={t}>{AUTH_TYPE_LABELS[t]}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Dynamic fields */}
      {authType === 'none' && (
        <Typography variant="body2" color="text.secondary" fontSize="0.82rem">
          The API is public and does not require authentication. No header will be added.
        </Typography>
      )}

      {authType === 'bearer' && (
        <Box display="flex" flexDirection="column" gap={1.5}>
          {secretInput(token, (v) => { setToken(v); scheduleSave({ type: 'bearer', token: v }) }, 'Bearer Token')}
          <Typography variant="caption" color="text.secondary">
            Sent as: <code>Authorization: Bearer {'<token>'}</code>
          </Typography>
        </Box>
      )}

      {authType === 'api-key' && (
        <Box display="flex" flexDirection="column" gap={1.5}>
          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={5}>
              <TextField size="small" fullWidth label="Parameter name" placeholder="X-Api-Key"
                value={keyName}
                onChange={(e) => { setKeyName(e.target.value); scheduleSave({ type: 'api-key', name: e.target.value, value: keyValue, in: keyIn }) }}
              />
            </Grid>
            <Grid item xs={12} sm={7}>
              {secretInput(keyValue, (v) => { setKeyValue(v); scheduleSave({ type: 'api-key', name: keyName, value: v, in: keyIn }) }, 'Value')}
            </Grid>
          </Grid>
          <FormControl size="small" fullWidth>
            <InputLabel>Send as</InputLabel>
            <Select value={keyIn} label="Send as"
              onChange={(e) => { const v = e.target.value as 'header' | 'query'; setKeyIn(v); scheduleSave({ type: 'api-key', name: keyName, value: keyValue, in: v }, 0) }}>
              <MenuItem value="header">Header HTTP</MenuItem>
              <MenuItem value="query">Query param (?{keyName || 'key'}=…)</MenuItem>
            </Select>
          </FormControl>
          <Typography variant="caption" color="text.secondary">
            {keyIn === 'header'
              ? `Sent as: ${keyName || '<name>'}: <value>`
              : `Added to URL: ?${keyName || '<name>'}=<value>`}
          </Typography>
        </Box>
      )}

      {authType === 'basic' && (
        <Box display="flex" flexDirection="column" gap={1.5}>
          <TextField size="small" fullWidth label="Username"
            value={basicUser}
            onChange={(e) => { setBasicUser(e.target.value); scheduleSave({ type: 'basic', username: e.target.value, password: basicPass }) }}
          />
          {secretInput(basicPass, (v) => { setBasicPass(v); scheduleSave({ type: 'basic', username: basicUser, password: v }) }, 'Password')}
          <Typography variant="caption" color="text.secondary">
            Sent as: <code>Authorization: Basic {'<base64(username:password)>'}</code>
          </Typography>
        </Box>
      )}

      {authType === 'oauth2-client' && (
        <Box display="flex" flexDirection="column" gap={1.5}>
          <TextField size="small" fullWidth label="Token URL (token endpoint)"
            placeholder="https://auth.example.com/oauth/token"
            value={oauthTokenUrl}
            onChange={(e) => { setOauthTokenUrl(e.target.value); scheduleSave({ type: 'oauth2-client', tokenUrl: e.target.value, clientId: oauthClientId, clientSecret: oauthClientSecret, scope: oauthScope || undefined }) }}
          />
          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={6}>
              <TextField size="small" fullWidth label="Client ID"
                value={oauthClientId}
                onChange={(e) => { setOauthClientId(e.target.value); scheduleSave({ type: 'oauth2-client', tokenUrl: oauthTokenUrl, clientId: e.target.value, clientSecret: oauthClientSecret, scope: oauthScope || undefined }) }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              {secretInput(oauthClientSecret, (v) => { setOauthClientSecret(v); scheduleSave({ type: 'oauth2-client', tokenUrl: oauthTokenUrl, clientId: oauthClientId, clientSecret: v, scope: oauthScope || undefined }) }, 'Client Secret')}
            </Grid>
          </Grid>
          <TextField size="small" fullWidth label="Scope (optional)" placeholder="read write"
            value={oauthScope}
            onChange={(e) => { setOauthScope(e.target.value); scheduleSave({ type: 'oauth2-client', tokenUrl: oauthTokenUrl, clientId: oauthClientId, clientSecret: oauthClientSecret, scope: e.target.value || undefined }) }}
          />
          <Typography variant="caption" color="text.secondary">
            Uses <strong>client_credentials</strong>. Token is fetched automatically and renewed when it expires.
          </Typography>
        </Box>
      )}

      {authType === 'custom' && (
        <Box display="flex" flexDirection="column" gap={1}>
          <Typography variant="caption" color="text.secondary" mb={0.5}>
            Add any HTTP header to the request (e.g. <code>X-Tenant-Id</code>, <code>X-Auth-Token</code>).
          </Typography>
          {customHeaders.map((h, i) => (
            <Box key={i} display="flex" gap={1} alignItems="center">
              <TextField size="small" label="Header" placeholder="X-Custom-Header" sx={{ flex: 1 }}
                value={h.name} onChange={(e) => updateCustomHeader(i, 'name', e.target.value)} />
              <TextField size="small" label="Value" sx={{ flex: 2 }}
                type={showSecrets ? 'text' : 'password'}
                value={h.value} onChange={(e) => updateCustomHeader(i, 'value', e.target.value)}
                InputProps={{
                  endAdornment: i === 0 ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowSecrets(s => !s)} edge="end">
                        {showSecrets ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ) : undefined
                }}
              />
              <IconButton size="small" color="error" onClick={() => removeCustomHeader(i)} disabled={customHeaders.length === 1}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
          <Button size="small" startIcon={<AddIcon />} onClick={addCustomHeader} sx={{ alignSelf: 'flex-start', mt: 0.5 }}>
            Add header
          </Button>
        </Box>
      )}

      {authType !== 'none' && (
        <Alert severity="warning" sx={{ mt: 2, py: 0.5, fontSize: '0.78rem' }}>
          Credentials are stored in the database. Use tokens with minimum required scope.
        </Alert>
      )}
    </Paper>
  )
}

function ToolDialog({ open, onClose, onSaved, projectId, projectBaseUrl, editTool }: ToolDialogProps) {
  const isEdit = !!editTool
  const [form, setForm] = useState(() => toolToFormState(editTool))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) { setForm(toolToFormState(editTool)); setError('') }
  }, [open, editTool])

  const setField = (field: string, value: any) => setForm((prev) => ({ ...prev, [field]: value }))
  const setParam = (id: string, field: keyof ParamEntry, value: any) =>
    setForm((prev) => ({ ...prev, params: prev.params.map((p) => p.id === id ? { ...p, [field]: value } : p) }))
  const addParam = () => setForm((prev) => ({ ...prev, params: [...prev.params, emptyParam()] }))
  const removeParam = (id: string) => setForm((prev) => ({ ...prev, params: prev.params.filter((p) => p.id !== id) }))

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required.'); return }
    if (!form.path.trim()) { setError('Path is required.'); return }
    setSaving(true); setError('')
    try {
      const parameterMap: ParameterMapping[] = form.params.map((p) => ({
        toolParamName: p.toolParamName,
        source: p.source,
        originalName: p.originalName || p.toolParamName,
        required: p.required,
      }))
      const properties: Record<string, any> = {}
      const required: string[] = []
      for (const p of form.params) {
        if (!p.toolParamName) continue
        properties[p.toolParamName] = { type: p.type, ...(p.description ? { description: p.description } : {}) }
        if (p.required) required.push(p.toolParamName)
      }
      const inputSchema = { type: 'object', properties, ...(required.length ? { required } : {}) }
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        method: form.method,
        path: form.path.trim(),
        baseUrl: projectBaseUrl,
        contentType: form.contentType.trim() || 'application/json',
        parameterMap,
        inputSchema,
      }
      let res: any
      if (isEdit) {
        res = await api.put(`/swagger/projects/${projectId}/tools/${encodeURIComponent(editTool!.name)}`, payload)
      } else {
        res = await api.post(`/swagger/projects/${projectId}/tools`, payload)
      }
      const project: Project = res.data
      const savedTool = project.tools.find((t) => t.name === payload.name) ?? (payload as any)
      onSaved(savedTool, isEdit ? editTool!.name : undefined)
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" fontWeight={700}>
          {isEdit ? `Edit endpoint — ${editTool?.name}` : 'New MCP tool'}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2}>
          {/* Name + method */}
          <Grid item xs={12} sm={8}>
            <TextField size="small" fullWidth required label="Tool name" value={form.name} onChange={(e) => setField('name', e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl size="small" fullWidth required>
              <InputLabel>Método HTTP</InputLabel>
              <Select value={form.method} label="Método HTTP" onChange={(e) => setField('method', e.target.value)}>
                {METHODS.map((m) => (
                  <MenuItem key={m} value={m}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: METHOD_COLOR[m] ?? '#888', flexShrink: 0 }} />
                      <Typography fontWeight={600} fontSize="0.85rem">{m}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Description */}
          <Grid item xs={12}>
            <TextField size="small" fullWidth multiline minRows={2} label="Description" value={form.description} onChange={(e) => setField('description', e.target.value)} />
          </Grid>

          {/* Path */}
          <Grid item xs={12} sm={6}>
            <TextField size="small" fullWidth required label="Path" value={form.path} onChange={(e) => setField('path', e.target.value)} placeholder="/users/{id}" helperText={`Combined with project Base URL: ${projectBaseUrl}`} InputProps={{ sx: { fontFamily: 'monospace' } }} />
          </Grid>

          {/* Content-Type */}
          <Grid item xs={12} sm={6}>
            <TextField size="small" fullWidth label="Content-Type" value={form.contentType} onChange={(e) => setField('contentType', e.target.value)} placeholder="application/json" />
          </Grid>

          {/* Parameters */}
          <Grid item xs={12}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
              <Typography variant="subtitle2" fontWeight={700}>Parameters</Typography>
              <Button size="small" startIcon={<AddIcon fontSize="small" />} onClick={addParam}>Add</Button>
            </Box>

            {form.params.length === 0 ? (
              <Typography variant="body2" color="text.secondary" fontStyle="italic">
                No parameters. Click "Add" to create one.
              </Typography>
            ) : (
              <Box display="flex" flexDirection="column" gap={1.5}>
                {form.params.map((p, i) => (
                  <Paper key={p.id} variant="outlined" sx={{ p: 1.5, position: 'relative' }}>
                    <Typography variant="caption" color="text.disabled" sx={{ position: 'absolute', top: 8, left: 12 }}>
                      #{i + 1}
                    </Typography>
                    <Grid container spacing={1.5} alignItems="flex-start" mt={0.5}>
                      <Grid item xs={12} sm={3}>
                        <TextField size="small" fullWidth label="MCP name" value={p.toolParamName}
                          onChange={(e) => setParam(p.id, 'toolParamName', e.target.value)}
                          InputProps={{ sx: { fontFamily: 'monospace' } }}
                          helperText="How the LLM will pass it" />
                      </Grid>
                      <Grid item xs={12} sm={2}>
                        <FormControl size="small" fullWidth>
                          <InputLabel>Location</InputLabel>
                          <Select value={p.source} label="Location" onChange={(e) => setParam(p.id, 'source', e.target.value as any)}>
                            {SOURCES.map((s) => (
                              <MenuItem key={s} value={s}>
                                <Chip label={s} size="small" color={SOURCE_CHIP_COLOR[s] ?? 'default'} sx={{ fontSize: '0.7rem', height: 20, fontWeight: 700 }} />
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <TextField size="small" fullWidth label="API name" value={p.originalName}
                          onChange={(e) => setParam(p.id, 'originalName', e.target.value)}
                          placeholder={p.toolParamName || 'same as MCP'}
                          InputProps={{ sx: { fontFamily: 'monospace' } }}
                          helperText="Real endpoint name" />
                      </Grid>
                      <Grid item xs={12} sm={2}>
                        <FormControl size="small" fullWidth>
                          <InputLabel>Type</InputLabel>
                          <Select value={p.type} label="Type" onChange={(e) => setParam(p.id, 'type', e.target.value)}>
                            {PARAM_TYPES.map((t) => <MenuItem key={t} value={t}><Typography fontFamily="monospace" fontSize="0.82rem">{t}</Typography></MenuItem>)}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={6} sm={1} display="flex" alignItems="center" pt="6px !important">
                        <FormControlLabel
                          control={<Switch size="small" checked={p.required} onChange={(e) => setParam(p.id, 'required', e.target.checked)} />}
                          label={<Typography variant="caption" color="text.secondary">Req.</Typography>}
                          sx={{ m: 0 }}
                        />
                      </Grid>
                      <Grid item xs={6} sm={1} display="flex" justifyContent="flex-end" alignItems="center" pt="6px !important">
                        <Tooltip title="Remove">
                          <IconButton size="small" color="error" onClick={() => removeParam(p.id)}><DeleteIcon fontSize="small" /></IconButton>
                        </Tooltip>
                      </Grid>
                      <Grid item xs={12}>
                        <TextField size="small" fullWidth label="Parameter description" value={p.description} onChange={(e) => setParam(p.id, 'description', e.target.value)} />
                      </Grid>
                    </Grid>
                  </Paper>
                ))}
              </Box>
            )}
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}>
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create tool'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Curl snippet ─────────────────────────────────────────────────────────────

function buildCurl(tool: GeneratedTool): string {
  const { method, path, baseUrl, parameterMap } = tool.endpointRef
  const properties = tool.inputSchema.properties ?? {}
  let url = `${baseUrl}${path}`
  ;(parameterMap ?? []).filter((p) => p.source === 'path').forEach((p) => {
    url = url.replace(`{${p.originalName}}`, `<${p.toolParamName}>`)
  })
  const queryParams = (parameterMap ?? []).filter((p) => p.source === 'query')
  if (queryParams.length) url += '?' + queryParams.map((p) => `${p.originalName}=<${p.toolParamName}>`).join('&')
  const lines: string[] = [`curl -X ${method} "${url}"`]
  if (method !== 'GET') { lines[0] += ' \\'; lines.push(`  -H 'Content-Type: application/json'`) }
  ;(parameterMap ?? []).filter((p) => p.source === 'header').forEach((p) => {
    lines[lines.length - 1] += ' \\'; lines.push(`  -H '${p.originalName}: <${p.toolParamName}>'`)
  })
  const bodyParams = (parameterMap ?? []).filter((p) => p.source === 'body')
  if (bodyParams.length) {
    const bodyObj: Record<string, string> = {}
    bodyParams.forEach((p) => { bodyObj[p.toolParamName] = `<${properties[p.toolParamName]?.type ?? 'string'}>` })
    lines[lines.length - 1] += ' \\'; lines.push(`  -d '${JSON.stringify(bodyObj)}'`)
  }
  return lines.join('\n')
}

function buildMcpCurl(tool: GeneratedTool, projectId: string, mcpApiKey?: string): string {
  const url = `${window.location.origin}/api/mcp/project/${projectId}`
  const properties = tool.inputSchema.properties ?? {}
  const args = Object.fromEntries(
    Object.entries(properties).map(([k, v]) => [k, `<${v.type ?? 'string'}>`])
  )
  const body = JSON.stringify(
    { jsonrpc: '2.0', method: 'tools/call', id: 1, params: { name: tool.name, arguments: args } },
    null, 2
  )
  const lines = [
    `curl -X POST "${url}" \\`,
    `  -H 'Content-Type: application/json' \\`,
    `  -H 'Accept: application/json, text/event-stream'`,
  ]
  if (mcpApiKey) { lines[lines.length - 1] += ' \\'; lines.push(`  -H 'auth: ${mcpApiKey}'`) }
  lines[lines.length - 1] += ` \\`
  lines.push(`  -d '${body}'`)
  return lines.join('\n')
}

// ─── FieldInput ───────────────────────────────────────────────────────────────

function FieldInput({ name, schema, value, required, onChange }: {
  name: string; schema: JsonSchema; value: string; required: boolean; onChange: (v: string) => void
}) {
  const label = `${name}${required ? ' *' : ''}`
  if (schema.enum?.length) {
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
        label={<Typography variant="body2">{label}</Typography>}
      />
    )
  }
  const isJson = schema.type === 'object' || schema.type === 'array'
  return (
    <TextField size="small" fullWidth label={label} value={value} onChange={(e) => onChange(e.target.value)}
      helperText={schema.description} type={schema.type === 'number' || schema.type === 'integer' ? 'number' : 'text'}
      multiline={isJson} minRows={isJson ? 3 : 1}
      placeholder={schema.type === 'object' ? '{"key":"value"}' : schema.type === 'array' ? '["item1"]' : undefined} />
  )
}

// ─── Tool accordion ───────────────────────────────────────────────────────────

function ToolAccordion({ tool: initialTool, projectId, mcpApiKey, onToolChanged, onEditEndpoint, onToolDeleted }: {
  tool: GeneratedTool
  projectId: string
  mcpApiKey?: string
  onToolChanged: (oldName: string, newTool: GeneratedTool) => void
  onEditEndpoint: (tool: GeneratedTool) => void
  onToolDeleted: (toolName: string) => void
}) {
  const [tool, setTool] = useState(initialTool)
  const [curlCopied, setCurlCopied] = useState(false)
  const [mcpCurlCopied, setMcpCurlCopied] = useState(false)
  const [tryMode, setTryMode] = useState(false)
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [executing, setExecuting] = useState(false)
  const [response, setResponse] = useState<string | null>(null)
  const [responseIsError, setResponseIsError] = useState(false)

  // Sync when parent updates the tool (e.g. after dialog save)
  useEffect(() => { setTool(initialTool) }, [initialTool])

  const { method, path, parameterMap } = tool.endpointRef
  const properties = tool.inputSchema.properties ?? {}
  const requiredFields = tool.inputSchema.required ?? []
  const allParams = parameterMap ?? []
  const paramEntries = Object.entries(properties)
  const curl = buildCurl(tool)
  const mcpCurl = buildMcpCurl(tool, projectId, mcpApiKey)

  const saveToolMeta = async (field: 'name' | 'description', newValue: string) => {
    const oldName = tool.name
    await api.patch(`/swagger/projects/${projectId}/tools/${encodeURIComponent(oldName)}`, { [field]: newValue })
    const updated = { ...tool, [field]: newValue }
    setTool(updated)
    onToolChanged(oldName, updated)
  }

  const isDisabled = tool.enabled === false

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const newEnabled = isDisabled
    const oldName = tool.name
    await api.patch(`/swagger/projects/${projectId}/tools/${encodeURIComponent(oldName)}`, { enabled: newEnabled })
    const updated = { ...tool, enabled: newEnabled }
    setTool(updated)
    onToolChanged(oldName, updated)
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const result = await Swal.fire({
      title: 'Delete tool?',
      text: `"${tool.name}" will be permanently removed from this project.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#d33',
    })
    if (!result.isConfirmed) return
    await api.delete(`/swagger/projects/${projectId}/tools/${encodeURIComponent(tool.name)}`)
    onToolDeleted(tool.name)
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
      setResponse(err?.response?.data?.message ?? err?.message ?? 'Unknown error')
      setResponseIsError(true)
    } finally { setExecuting(false) }
  }

  return (
    <Accordion variant="outlined" sx={{
      mb: '6px', '&:before': { display: 'none' },
      borderColor: isDisabled ? 'divider' : `${METHOD_COLOR[method] ?? '#ddd'}33`,
      '&.Mui-expanded': { borderColor: isDisabled ? '#ccc' : `${METHOD_COLOR[method] ?? '#ddd'}88` },
      opacity: isDisabled ? 0.6 : 1,
      transition: 'opacity 0.2s',
    }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{
        bgcolor: isDisabled ? '#f5f5f5' : METHOD_BG[method] ?? '#fafafa',
        borderRadius: '7px 7px 0 0',
        minHeight: '52px !important', px: 2,
        filter: isDisabled ? 'grayscale(0.5)' : 'none',
      }}>
        <Box display="flex" alignItems="center" gap={1.5} minWidth={0} width="100%">
          {/* Method badge */}
          <Box sx={{
            px: 1.2, py: 0.4, borderRadius: '4px',
            bgcolor: METHOD_COLOR[method] ?? '#888', color: '#fff',
            fontWeight: 700, fontSize: '0.72rem', fontFamily: 'monospace',
            minWidth: 58, textAlign: 'center', flexShrink: 0,
          }}>
            {method}
          </Box>

          {/* Tool name — editable */}
          <Box onClick={(e) => e.stopPropagation()} sx={{ flexShrink: 0 }}>
            <InlineEdit value={tool.name} onSave={(v) => saveToolMeta('name', v)}
              placeholder="Tool name" fontSize="0.875rem" fontWeight={700} />
          </Box>

          {/* Disabled chip */}
          {isDisabled && (
            <Chip label="Disabled" size="small"
              sx={{ fontSize: '0.65rem', height: 18, bgcolor: '#9e9e9e', color: '#fff', flexShrink: 0 }} />
          )}

          {/* Path — read only */}
          <Typography fontFamily="monospace" fontSize="0.78rem" color="text.secondary" noWrap flexGrow={1}>{path}</Typography>

          {/* Toggle enable/disable */}
          <Tooltip title={isDisabled ? 'Enable tool' : 'Disable tool'}>
            <IconButton size="small" onClick={handleToggle}
              sx={{ flexShrink: 0, color: isDisabled ? 'text.disabled' : 'text.secondary',
                '&:hover': { color: isDisabled ? 'success.main' : 'warning.main' } }}>
              {isDisabled ? <VisibilityIcon sx={{ fontSize: 18 }} /> : <VisibilityOffIcon sx={{ fontSize: 18 }} />}
            </IconButton>
          </Tooltip>

          {/* Edit endpoint button */}
          <Tooltip title="Edit endpoint">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEditEndpoint(tool) }}
              sx={{ flexShrink: 0, color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
              <TuneIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>

          {/* Delete tool */}
          <Tooltip title="Delete tool permanently">
            <IconButton size="small" color="error" onClick={handleDelete} sx={{ flexShrink: 0 }}>
              <DeleteIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </AccordionSummary>

      <AccordionDetails sx={{ p: 2.5 }}>
        {/* Description — editable */}
        <Box mb={2}>
          <InlineEdit value={tool.description ?? ''} onSave={(v) => saveToolMeta('description', v)}
            multiline placeholder="Describe what this tool does…"
            emptyLabel="Add description…" fontSize="0.875rem" color="text.secondary" />
        </Box>

        {/* Parameters table */}
        {allParams.length > 0 && (
          <>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>Parameters</Typography>
            <Box sx={{ overflowX: 'auto', mb: 2 }}>
              <Table size="small" sx={{
                minWidth: 480,
                '& th': { bgcolor: '#f8f9fa', fontWeight: 700, fontSize: '0.72rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' },
                '& td': { fontSize: '0.8rem' },
              }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>In</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Required</TableCell>
                    <TableCell>Description</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {allParams.map((p) => {
                    const schema = properties[p.toolParamName] ?? {}
                    const isReq = p.required || requiredFields.includes(p.toolParamName)
                    return (
                      <TableRow key={p.toolParamName} sx={{ '&:last-child td': { border: 0 } }}>
                        <TableCell><Typography fontFamily="monospace" fontSize="0.8rem" fontWeight={600}>{p.toolParamName}</Typography></TableCell>
                        <TableCell>
                          <Chip label={p.source} size="small" color={SOURCE_CHIP_COLOR[p.source] ?? 'default'}
                            sx={{ fontFamily: 'monospace', fontSize: '0.68rem', fontWeight: 700, height: 20 }} />
                        </TableCell>
                        <TableCell><Typography fontFamily="monospace" fontSize="0.75rem" color="text.secondary">{schema.type ?? 'string'}</Typography></TableCell>
                        <TableCell>
                          {isReq
                            ? <Typography color="error.main" fontSize="0.72rem" fontWeight={700}>yes</Typography>
                            : <Typography color="text.disabled" fontSize="0.72rem">no</Typography>}
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
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={tryMode ? 2 : 0}>
          <Typography variant="subtitle2" fontWeight={700}>Try</Typography>
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
                    <FieldInput key={name} name={name} schema={schema}
                      value={formValues[name] ?? ''} required={requiredFields.includes(name)}
                      onChange={(v) => setFormValues((prev) => ({ ...prev, [name]: v }))} />
                  ))}
                </Box>
              : <Typography variant="body2" color="text.secondary" mt={1} mb={2}>No parameters.</Typography>}

            <Button variant="contained" size="small"
              startIcon={executing ? <CircularProgress size={13} color="inherit" /> : <PlayArrowIcon fontSize="small" />}
              onClick={handleExecute} disabled={executing}
              sx={{ mb: response !== null ? 2 : 0, fontWeight: 600 }}>
              {executing ? 'Executing…' : 'Execute'}
            </Button>

            {response !== null && (
              <Box component="pre" sx={{
                bgcolor: responseIsError ? '#fff8f8' : '#1e1e1e',
                color: responseIsError ? '#c62828' : '#d4d4d4',
                border: '1px solid', borderColor: responseIsError ? '#ffcdd2' : 'transparent',
                p: 2, borderRadius: 1, fontSize: '0.78rem',
                overflowX: 'auto', overflowY: 'auto', maxHeight: 400,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word', m: 0,
              }}>
                {response}
              </Box>
            )}
          </Box>
        )}

        {/* Exemplos */}
        {!tryMode && (
          <Box mt={2} display="flex" flexDirection="column" gap={2}>
            {/* Direct curl */}
            <Box>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>Exemplo curl (API direta)</Typography>
              <Box component="pre" sx={{
                bgcolor: '#1e1e1e', color: '#d4d4d4', p: 2, borderRadius: 1,
                fontSize: '0.78rem', overflowX: 'auto', position: 'relative', m: 0,
              }}>
                <Tooltip title={curlCopied ? 'Copied!' : 'Copy'}>
                  <IconButton size="small"
                    onClick={() => { navigator.clipboard.writeText(curl); setCurlCopied(true); setTimeout(() => setCurlCopied(false), 2000) }}
                    sx={{ position: 'absolute', top: 8, right: 8, color: curlCopied ? 'primary.light' : '#abb2bf', '&:hover': { color: '#fff' } }}>
                    <ContentCopyIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </Tooltip>
                {curl}
              </Box>
            </Box>

            {/* MCP via POST */}
            <Box>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>Exemplo MCP (POST /mcp/project)</Typography>
              <Box component="pre" sx={{
                bgcolor: '#282c34', color: '#abb2bf', p: 2, borderRadius: 1,
                fontSize: '0.78rem', overflowX: 'auto', position: 'relative', m: 0,
              }}>
                <Tooltip title={mcpCurlCopied ? 'Copied!' : 'Copy'}>
                  <IconButton size="small"
                    onClick={() => { navigator.clipboard.writeText(mcpCurl); setMcpCurlCopied(true); setTimeout(() => setMcpCurlCopied(false), 2000) }}
                    sx={{ position: 'absolute', top: 8, right: 8, color: mcpCurlCopied ? 'primary.light' : '#abb2bf', '&:hover': { color: '#fff' } }}>
                    <ContentCopyIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </Tooltip>
                {mcpCurl}
              </Box>
            </Box>
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderColor: color ? `${color}44` : 'divider' }}>
      <Typography variant="h4" fontWeight={700} color={color ?? 'text.primary'}>{value}</Typography>
      <Typography variant="body2" color="text.secondary" mt={0.5}>{label}</Typography>
    </Paper>
  )
}

// ─── Execution logs tab ───────────────────────────────────────────────────────

interface ExecLog {
  _id: string
  toolName: string
  source: 'mcp' | 'direct'
  statusCode: number
  responseTimeMs: number
  isError: boolean
  errorMessage?: string
  createdAt: string
}

function ProjectLogs({ projectId }: { projectId: string }) {
  const [logs, setLogs] = useState<ExecLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [skip, setSkip] = useState(0)
  const LIMIT = 50

  const load = (s = 0) => {
    setLoading(true)
    api.get<{ logs: ExecLog[]; total: number }>(`/projects/${projectId}/logs?limit=${LIMIT}&skip=${s}`)
      .then((r) => { setLogs(r.data.logs); setTotal(r.data.total); setSkip(s) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [projectId])

  if (loading) return <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="subtitle1" fontWeight={700}>Call history — {total} records</Typography>
        <Button size="small" onClick={() => load(0)}>Refresh</Button>
      </Box>

      <Paper variant="outlined" sx={{ overflow: 'hidden', mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#f8f9fa' }}>
              {['Date/Time', 'Tool', 'Source', 'Status', 'Time (ms)', 'Error'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.72rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography color="text.secondary" fontSize="0.85rem" py={2} textAlign="center">
                    No calls recorded yet.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {logs.map((log) => (
              <TableRow key={log._id} hover sx={{ '&:last-child td': { border: 0 }, bgcolor: log.isError ? '#fff5f5' : undefined }}>
                <TableCell>
                  <Typography fontSize="0.78rem" color="text.secondary" whiteSpace="nowrap">
                    {new Date(log.createdAt).toLocaleString('en-US')}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography fontSize="0.875rem" fontWeight={500} fontFamily="monospace">{log.toolName}</Typography>
                </TableCell>
                <TableCell>
                  <Chip label={log.source === 'mcp' ? 'MCP' : 'Direct'} size="small"
                    color={log.source === 'mcp' ? 'primary' : 'default'} sx={{ fontSize: '0.7rem', height: 20 }} />
                </TableCell>
                <TableCell>
                  <Chip label={log.statusCode} size="small"
                    color={log.statusCode < 400 ? 'success' : 'error'} sx={{ fontSize: '0.7rem', height: 20 }} />
                </TableCell>
                <TableCell>
                  <Typography fontSize="0.82rem" color={log.responseTimeMs > 3000 ? 'warning.main' : 'text.secondary'}>
                    {log.responseTimeMs}ms
                  </Typography>
                </TableCell>
                <TableCell>
                  {log.errorMessage ? (
                    <Tooltip title={log.errorMessage}>
                      <Typography fontSize="0.78rem" color="error.main" noWrap sx={{ maxWidth: 200 }}>
                        {log.errorMessage}
                      </Typography>
                    </Tooltip>
                  ) : <Typography color="text.disabled" fontSize="0.78rem">—</Typography>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Button size="small" disabled={skip === 0} onClick={() => load(Math.max(0, skip - LIMIT))}>← Previous</Button>
        <Typography variant="caption" color="text.secondary">{skip + 1}–{Math.min(skip + LIMIT, total)} of {total}</Typography>
        <Button size="small" disabled={skip + LIMIT >= total} onClick={() => load(skip + LIMIT)}>Next →</Button>
      </Box>
    </Box>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [baseUrl, setBaseUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTool, setEditingTool] = useState<GeneratedTool | undefined>()
  const [tab, setTab] = useState(0)
  const [toolSearch, setToolSearch] = useState('')
  const [toolMethodFilter, setToolMethodFilter] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    api.get<Project>(`/swagger/projects/${id}`)
      .then((r) => { setProject(r.data); setBaseUrl(r.data.baseUrl) })
      .catch(() => setError('Project not found.'))
      .finally(() => setLoading(false))
  }, [id])

  const saveProjectInfo = async (field: 'name' | 'description', value: string) => {
    await api.patch(`/swagger/projects/${id}/info`, { [field]: value })
    setProject((prev) => prev ? { ...prev, [field]: value } : prev)
  }

  const handleOpenCreate = () => { setEditingTool(undefined); setDialogOpen(true) }
  const handleOpenEdit = (tool: GeneratedTool) => { setEditingTool(tool); setDialogOpen(true) }

  const handleToolSaved = (savedTool: GeneratedTool, oldName?: string) => {
    setProject((prev) => {
      if (!prev) return prev
      if (oldName) {
        return { ...prev, tools: prev.tools.map((t) => t.name === oldName ? savedTool : t) }
      }
      return { ...prev, tools: [...prev.tools, savedTool] }
    })
  }

  const handleToolChanged = (oldName: string, newTool: GeneratedTool) => {
    setProject((prev) => {
      if (!prev) return prev
      return { ...prev, tools: prev.tools.map((t) => t.name === oldName ? newTool : t) }
    })
  }

  const handleDeleteTool = (toolName: string) => {
    setProject((prev) => {
      if (!prev) return prev
      return { ...prev, tools: prev.tools.filter((t) => t.name !== toolName) }
    })
  }

  if (loading) {
    return <Box display="flex" justifyContent="center" alignItems="center" height="50vh"><CircularProgress /></Box>
  }
  if (error || !project) {
    return <Box p={3}><Alert severity="error">{error || 'Error loading project.'}</Alert></Box>
  }

  const methodCounts = (project.tools ?? []).reduce<Record<string, number>>((acc, t) => {
    const m = t.endpointRef?.method ?? 'UNKNOWN'
    acc[m] = (acc[m] ?? 0) + 1
    return acc
  }, {})

  return (
    <Box p={3}>
      {/* Nav */}
      <Box mb={3}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')}>Projects</Button>
      </Box>

      {/* Header */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
          <Box minWidth={0} flexGrow={1}>
            <InlineEdit value={project.name} onSave={(v) => saveProjectInfo('name', v)}
              placeholder="Project name" fontSize="1.5rem" fontWeight={700} />
            <Box mt={0.75}>
              <InlineEdit value={project.description ?? ''} onSave={(v) => saveProjectInfo('description', v)}
                multiline placeholder="Project description…" emptyLabel="Add description…"
                fontSize="0.875rem" color="text.secondary" />
            </Box>
          </Box>
          <Box display="flex" gap={1} flexWrap="wrap" alignItems="flex-start">
            <Chip label={project.status === 'active' ? 'Active' : 'Error'} color={project.status === 'active' ? 'success' : 'error'} />
            {project.version && <Chip label={`v${project.version}`} variant="outlined" />}
          </Box>
        </Box>
      </Paper>

      {/* Base URL */}
      <BaseUrlPanel projectId={id!} initialValue={baseUrl} onChange={setBaseUrl} />

      {/* MCP endpoint */}
      <McpEndpointBar projectId={id!} mcpApiKey={project.mcpApiKey} />

      {/* API Key */}
      <ApiKeyPanel
        projectId={id!}
        initialKey={project.mcpApiKey}
        onChange={(key) => setProject((prev) => prev ? { ...prev, mcpApiKey: key } : prev)}
      />

      {/* Rate Limit */}
      <RateLimitPanel
        projectId={id!}
        initialRateLimit={project.rateLimit}
        onChange={(rl) => setProject((prev) => prev ? { ...prev, rateLimit: rl } : prev)}
      />

      {/* Auth config */}
      <AuthConfigPanel
        projectId={id!}
        initialAuth={project.auth}
        onChange={(auth) => setProject((prev) => prev ? { ...prev, auth } : prev)}
      />

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tab icon={<BuildIcon fontSize="small" />} iconPosition="start" label="Tools" />
        <Tab icon={<MenuBookIcon fontSize="small" />} iconPosition="start" label="MCP Docs" />
        <Tab icon={<AssessmentIcon fontSize="small" />} iconPosition="start" label="Logs" />
      </Tabs>

      {/* Tab 0 — Tools */}
      {tab === 0 && (() => {
        const availableMethods = Object.keys(methodCounts)
        const visibleTools = (project.tools ?? []).filter((t) => {
          const matchSearch = !toolSearch
            || t.name.toLowerCase().includes(toolSearch.toLowerCase())
            || (t.description ?? '').toLowerCase().includes(toolSearch.toLowerCase())
          const matchMethod = !toolMethodFilter || t.endpointRef?.method === toolMethodFilter
          return matchSearch && matchMethod
        })
        return (
          <>
            {/* Stats */}
            <Grid container spacing={2} mb={3}>
              <Grid item xs={6} sm={3}>
                <StatCard label="Tools" value={project.tools.length} color="#5D87FF" />
              </Grid>
              {Object.entries(methodCounts).map(([method, count]) => (
                <Grid item xs={6} sm={3} key={method}>
                  <StatCard label={method} value={count} color={METHOD_COLOR[method]} />
                </Grid>
              ))}
            </Grid>

            {/* Tools header + filter */}
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5} flexWrap="wrap" gap={1}>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="h6" fontWeight={700}>MCP Tools</Typography>
                <HelpButton title="MCP Tools">
                  <Typography variant="body2" gutterBottom>
                    Each tool maps one API endpoint to a named, callable MCP function. When an AI client (Claude Desktop, Cursor, etc.) invokes a tool, Arthur translates the call into an HTTP request to the upstream API and returns the response.
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>How the AI uses tools:</strong> when the AI connects to the MCP endpoint, it receives a list of all tools with their names, descriptions, and parameter schemas. Based on what the user asks, the AI decides which tool to call and which parameters to pass. It never sees the underlying HTTP method, URL, or authentication — that is all handled by Arthur.
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Creating tools:</strong>
                  </Typography>
                  <Box component="ul" sx={{ mt: 0, mb: 1, pl: 2.5 }}>
                    <Box component="li"><Typography variant="body2"><strong>Automatically:</strong> upload an OpenAPI/Swagger spec from the Upload page and all endpoints become tools instantly.</Typography></Box>
                    <Box component="li"><Typography variant="body2"><strong>Manually:</strong> click <strong>New tool</strong> and fill in the HTTP method, path, parameters, and description.</Typography></Box>
                  </Box>
                  <Typography variant="body2" gutterBottom>
                    <strong>Tips for better AI performance:</strong> write clear, specific tool descriptions. Instead of "Get user", write "Fetch a user account by its numeric ID — returns name, email, role, and account status." The AI reads these descriptions to decide when to call each tool.
                  </Typography>
                  <Typography variant="body2">
                    Use the search box to filter by name or description. The method chips (GET, POST…) filter by HTTP verb — useful when you have many tools and want to focus on read-only or write operations.
                  </Typography>
                </HelpButton>
              </Box>
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate} size="small">New tool</Button>
            </Box>

            <Box display="flex" alignItems="center" gap={1} mb={2} flexWrap="wrap">
              <TextField
                size="small" placeholder="Search tools..." value={toolSearch}
                onChange={(e) => setToolSearch(e.target.value)} sx={{ width: 220 }}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" color="action" /></InputAdornment> }}
              />
              {availableMethods.length > 1 && (
                <Box display="flex" gap={0.5} flexWrap="wrap" alignItems="center">
                  <Chip label="All" size="small" clickable onClick={() => setToolMethodFilter(null)}
                    color={toolMethodFilter === null ? 'primary' : 'default'}
                    variant={toolMethodFilter === null ? 'filled' : 'outlined'} />
                  {availableMethods.map((m) => (
                    <Chip key={m} label={m} size="small" clickable
                      onClick={() => setToolMethodFilter(toolMethodFilter === m ? null : m)}
                      sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.7rem',
                        bgcolor: toolMethodFilter === m ? METHOD_COLOR[m] : 'transparent',
                        color: toolMethodFilter === m ? '#fff' : METHOD_COLOR[m],
                        borderColor: METHOD_COLOR[m] }}
                      variant="outlined" />
                  ))}
                </Box>
              )}
              {(toolSearch || toolMethodFilter) && (
                <Typography variant="body2" color="text.secondary" ml="auto">
                  {visibleTools.length} / {project.tools.length}
                </Typography>
              )}
            </Box>

            {project.tools.length === 0
              ? <Alert severity="warning">No tools yet. Click "New tool" to create one.</Alert>
              : visibleTools.length === 0
                ? <Alert severity="info">No tools match the filter.</Alert>
                : visibleTools.map((tool) => (
                    <ToolAccordion
                      key={tool.name}
                      tool={tool}
                      projectId={id!}
                      mcpApiKey={project.mcpApiKey}
                      onToolChanged={handleToolChanged}
                      onEditEndpoint={handleOpenEdit}
                      onToolDeleted={handleDeleteTool}
                    />
                  ))}
          </>
        )
      })()}

      {/* Tab 1 — Documentation */}
      {tab === 1 && (
        <>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Typography variant="h6" fontWeight={700}>MCP Documentation</Typography>
            <HelpButton title="MCP Documentation">
              <Typography variant="body2" gutterBottom>
                An auto-generated reference for every tool in this project, formatted the way MCP clients see it. This is what Claude Desktop, Cursor, or any other AI tool receives when it first connects and asks "what can you do?"
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>What it shows per tool:</strong>
              </Typography>
              <Box component="ul" sx={{ mt: 0, mb: 1, pl: 2.5 }}>
                <Box component="li"><Typography variant="body2"><strong>Tool name:</strong> the identifier the AI uses in its JSON-RPC call.</Typography></Box>
                <Box component="li"><Typography variant="body2"><strong>Description:</strong> what the tool does (taken from the tool definition). The AI reads this to decide when to call the tool.</Typography></Box>
                <Box component="li"><Typography variant="body2"><strong>Parameters:</strong> each input the tool accepts — name, type, whether it's required, and a description of what it should contain.</Typography></Box>
              </Box>
              <Typography variant="body2" gutterBottom>
                <strong>Why this matters:</strong> MCP clients never see the underlying HTTP method or URL — only this documentation. If a tool is being called incorrectly or not at all, check this tab to see exactly what the AI is reading and whether the descriptions and parameter names make it obvious how to use the tool.
              </Typography>
              <Typography variant="body2">
                Use the search box at the top to filter tools by name or description. Expand any card to see the full parameter schema.
              </Typography>
            </HelpButton>
          </Box>
          <McpDocsContent project={project} projectId={id!} />
        </>
      )}

      {/* Tab 2 — Logs */}
      {tab === 2 && (
        <>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Typography variant="h6" fontWeight={700}>Execution Logs</Typography>
            <HelpButton title="Execution Logs">
              <Typography variant="body2" gutterBottom>
                A real-time record of every tool call made through this project's MCP endpoint. Each row represents one complete request-response cycle between an AI client and the upstream API.
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>What each log entry contains:</strong>
              </Typography>
              <Box component="ul" sx={{ mt: 0, mb: 1, pl: 2.5 }}>
                <Box component="li"><Typography variant="body2"><strong>Tool name:</strong> which tool the AI client invoked.</Typography></Box>
                <Box component="li"><Typography variant="body2"><strong>Source:</strong> whether the call came from an MCP client or was triggered directly.</Typography></Box>
                <Box component="li"><Typography variant="body2"><strong>Status code:</strong> the HTTP status returned by the upstream API (200 = success, 4xx = client error, 5xx = server error).</Typography></Box>
                <Box component="li"><Typography variant="body2"><strong>Response time:</strong> how long the upstream API took to respond, in milliseconds.</Typography></Box>
                <Box component="li"><Typography variant="body2"><strong>Error flag:</strong> whether the call was classified as an error.</Typography></Box>
                <Box component="li"><Typography variant="body2"><strong>Timestamp:</strong> when the call occurred.</Typography></Box>
              </Box>
              <Typography variant="body2" gutterBottom>
                <strong>How to use this tab:</strong>
              </Typography>
              <Box component="ul" sx={{ mt: 0, mb: 1, pl: 2.5 }}>
                <Box component="li"><Typography variant="body2"><strong>Debug failures:</strong> find error rows and check the status code and error message to understand why a call failed.</Typography></Box>
                <Box component="li"><Typography variant="body2"><strong>Monitor latency:</strong> if response times are growing, the upstream API may be under load or the request parameters may be causing expensive queries.</Typography></Box>
                <Box component="li"><Typography variant="body2"><strong>Understand usage:</strong> see which tools your AI clients call most often and at what times.</Typography></Box>
              </Box>
              <Typography variant="body2">
                Logs are stored in memory and kept for <strong>7 days</strong>. They are cleared when the server restarts. For permanent audit trails, use the Audit Logs page.
              </Typography>
            </HelpButton>
          </Box>
          <ProjectLogs projectId={id!} />
        </>
      )}

      <ToolDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={handleToolSaved}
        projectId={id!}
        projectBaseUrl={baseUrl}
        editTool={editingTool}
      />
    </Box>
  )
}
