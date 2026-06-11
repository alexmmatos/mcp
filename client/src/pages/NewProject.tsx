import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Step,
  StepLabel,
  Stepper,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import AddIcon from '@mui/icons-material/Add'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import CloseIcon from '@mui/icons-material/Close'
import DeleteIcon from '@mui/icons-material/Delete'
import LockIcon from '@mui/icons-material/Lock'
import SpeedIcon from '@mui/icons-material/Speed'
import VpnKeyIcon from '@mui/icons-material/VpnKey'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import SearchIcon from '@mui/icons-material/Search'
import BuildIcon from '@mui/icons-material/Build'
import api from '../api'

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = ['Project details', 'Import API spec', 'Preview tools', 'API Authentication', 'MCP Protection']

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const

const METHOD_COLOR: Record<string, string> = {
  GET: '#61affe', POST: '#49cc90', PUT: '#fca130', PATCH: '#50e3c2', DELETE: '#f93e3e',
}

type AuthType = 'none' | 'bearer' | 'api-key' | 'basic' | 'oauth2-client' | 'custom'

const AUTH_TYPE_LABELS: Record<AuthType, string> = {
  none: 'None (public API)',
  bearer: 'Bearer Token',
  'api-key': 'API Key',
  basic: 'Basic Auth (username/password)',
  'oauth2-client': 'OAuth2 Client Credentials',
  custom: 'Custom headers',
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface LocalTool {
  id: string
  name: string
  description?: string
  method: string
  path: string
  enabled: boolean
  fromSpec: boolean  // came from spec upload vs manually added
}

interface SpecMeta {
  name: string
  version?: string
  description?: string
  resolvedBaseUrl: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidUrl(u: string) {
  try { new URL(u); return true } catch { return false }
}

function uid() { return Math.random().toString(36).slice(2) }

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewProject() {
  const navigate = useNavigate()
  const [activeStep, setActiveStep] = useState(0)

  // Step 0
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  // Step 1
  const [file, setFile] = useState<File | null>(null)
  const [fetchedForFile, setFetchedForFile] = useState<File | null>(null)
  const [baseUrl, setBaseUrl] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Step 2 — Preview / tool editor
  const [specMeta, setSpecMeta] = useState<SpecMeta | null>(null)
  const [localTools, setLocalTools] = useState<LocalTool[]>([])
  const [deletedSpecTools, setDeletedSpecTools] = useState<string[]>([])
  const [previewing, setPreviewing] = useState(false)
  const [toolSearch, setToolSearch] = useState('')
  // Add tool dialog
  const [addOpen, setAddOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newMethod, setNewMethod] = useState<string>('GET')
  const [newPath, setNewPath] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [addError, setAddError] = useState('')

  // Step 3 — API Authentication
  const [authType, setAuthType] = useState<AuthType>('none')
  const [showSecrets, setShowSecrets] = useState(false)
  const [token, setToken] = useState('')
  const [keyName, setKeyName] = useState('')
  const [keyValue, setKeyValue] = useState('')
  const [keyIn, setKeyIn] = useState<'header' | 'query'>('header')
  const [basicUser, setBasicUser] = useState('')
  const [basicPass, setBasicPass] = useState('')
  const [oauthTokenUrl, setOauthTokenUrl] = useState('')
  const [oauthClientId, setOauthClientId] = useState('')
  const [oauthClientSecret, setOauthClientSecret] = useState('')
  const [oauthScope, setOauthScope] = useState('')
  const [customHeaders, setCustomHeaders] = useState<{ name: string; value: string }[]>([{ name: '', value: '' }])

  // Step 4 — MCP Protection
  const [mcpAuthEnabled, setMcpAuthEnabled] = useState(false)
  const [rateLimitEnabled, setRateLimitEnabled] = useState(false)
  const [rateLimitRpm, setRateLimitRpm] = useState(60)

  // Submit
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  // ── Validation ──────────────────────────────────────────────────────────────

  const step0Valid = name.trim().length > 0
  const step1Valid = file
    ? (baseUrl.trim() === '' || isValidUrl(baseUrl.trim()))
    : (baseUrl.trim().length > 0 && isValidUrl(baseUrl.trim()))

  const canNext = () => {
    if (activeStep === 0) return step0Valid
    if (activeStep === 1) return step1Valid
    return true
  }

  const isLastStep = activeStep === STEPS.length - 1

  // ── File handling ────────────────────────────────────────────────────────────

  const clearSpecState = () => {
    setSpecMeta(null)
    setLocalTools([])
    setDeletedSpecTools([])
    setFetchedForFile(null)
  }

  const acceptFile = (f: File) => {
    const n = f.name.toLowerCase()
    if (!n.endsWith('.yaml') && !n.endsWith('.yml') && !n.endsWith('.json')) {
      setError('Unsupported format. Use .yaml, .yml or .json')
      return
    }
    if (f !== fetchedForFile) clearSpecState()
    setFile(f)
    setError('')
  }

  // ── Tool operations ──────────────────────────────────────────────────────────

  const handleAddTool = () => {
    const trimName = newName.trim()
    const trimPath = newPath.trim()
    if (!trimName) { setAddError('Name is required.'); return }
    if (!trimPath) { setAddError('Path is required.'); return }
    if (localTools.some(t => t.name === trimName)) { setAddError(`A tool named "${trimName}" already exists.`); return }
    setLocalTools(prev => [...prev, {
      id: uid(), name: trimName, description: newDesc.trim() || undefined,
      method: newMethod, path: trimPath, enabled: true, fromSpec: false,
    }])
    setNewName(''); setNewMethod('GET'); setNewPath(''); setNewDesc(''); setAddError('')
    setAddOpen(false)
  }

  const handleDeleteTool = (tool: LocalTool) => {
    if (tool.fromSpec) setDeletedSpecTools(prev => [...prev, tool.name])
    setLocalTools(prev => prev.filter(t => t.id !== tool.id))
  }

  const handleToggleTool = (id: string) => {
    setLocalTools(prev => prev.map(t => t.id === id ? { ...t, enabled: !t.enabled } : t))
  }

  // ── Navigation ───────────────────────────────────────────────────────────────

  const handleNext = async () => {
    if (activeStep === 1) {
      if (file && file !== fetchedForFile) {
        // Fetch preview for new/changed file
        setPreviewing(true)
        setError('')
        try {
          const form = new FormData()
          form.append('file', file)
          const params = baseUrl.trim() ? { baseUrl: baseUrl.trim() } : {}
          const { data } = await api.post<SpecMeta & { totalTools: number; tools: Array<{ name: string; description?: string; method: string; path: string }> }>(
            '/swagger/preview', form, { params, headers: { 'Content-Type': 'multipart/form-data' } },
          )
          setSpecMeta({ name: data.name, version: data.version, description: data.description, resolvedBaseUrl: data.resolvedBaseUrl })
          setLocalTools(data.tools.map(t => ({ id: uid(), name: t.name, description: t.description, method: t.method, path: t.path, enabled: true, fromSpec: true })))
          setDeletedSpecTools([])
          setFetchedForFile(file)
        } catch (err: any) {
          const msg = err?.response?.data?.message ?? 'Error parsing spec.'
          setError(Array.isArray(msg) ? msg.join(', ') : msg)
          return
        } finally {
          setPreviewing(false)
        }
      } else if (!file && fetchedForFile !== null) {
        // File removed → clear spec tools, keep manual ones
        setLocalTools(prev => prev.filter(t => !t.fromSpec))
        setSpecMeta(null)
        setDeletedSpecTools([])
        setFetchedForFile(null)
      }
    }
    setActiveStep(s => s + 1)
  }

  // ── Create project ───────────────────────────────────────────────────────────

  const buildAuth = () => {
    switch (authType) {
      case 'bearer': return { type: 'bearer', token }
      case 'api-key': return { type: 'api-key', name: keyName, value: keyValue, in: keyIn }
      case 'basic': return { type: 'basic', username: basicUser, password: basicPass }
      case 'oauth2-client': return { type: 'oauth2-client', tokenUrl: oauthTokenUrl, clientId: oauthClientId, clientSecret: oauthClientSecret, scope: oauthScope || undefined }
      case 'custom': return { type: 'custom', headers: customHeaders.filter(h => h.name.trim()) }
      default: return { type: 'none' }
    }
  }

  const handleCreate = async () => {
    setError('')
    setCreating(true)
    try {
      // 1. Create project
      let projectId: string
      let projectBaseUrl: string

      if (file) {
        const form = new FormData()
        form.append('file', file)
        const params = baseUrl.trim() ? { baseUrl: baseUrl.trim() } : {}
        const { data } = await api.post<{ _id: string; baseUrl: string }>('/swagger/upload', form, {
          params,
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        projectId = data._id
        projectBaseUrl = data.baseUrl
      } else {
        const { data } = await api.post<{ _id: string; baseUrl: string }>('/swagger/projects', {
          name: name.trim(),
          baseUrl: baseUrl.trim(),
          description: description.trim() || undefined,
        })
        projectId = data._id
        projectBaseUrl = data.baseUrl
      }

      // 2. Reconcile tools from the preview step
      const toolBaseUrl = specMeta?.resolvedBaseUrl || projectBaseUrl || baseUrl.trim()

      if (file) {
        // Delete tools the user removed
        for (const toolName of deletedSpecTools) {
          await api.delete(`/swagger/projects/${projectId}/tools/${encodeURIComponent(toolName)}`)
        }
        // Disable tools the user toggled off
        for (const tool of localTools.filter(t => t.fromSpec && !t.enabled)) {
          await api.patch(`/swagger/projects/${projectId}/tools/${encodeURIComponent(tool.name)}`, { enabled: false })
        }
      }

      // Add all manually created tools (from spec or empty project)
      for (const tool of localTools.filter(t => !t.fromSpec)) {
        await api.post(`/swagger/projects/${projectId}/tools`, {
          name: tool.name,
          description: tool.description,
          method: tool.method,
          path: tool.path,
          baseUrl: toolBaseUrl,
          contentType: 'application/json',
          parameterMap: [],
          inputSchema: { type: 'object', properties: {} },
        })
        if (!tool.enabled) {
          await api.patch(`/swagger/projects/${projectId}/tools/${encodeURIComponent(tool.name)}`, { enabled: false })
        }
      }

      // 3. Apply auth
      if (authType !== 'none') {
        await api.patch(`/swagger/projects/${projectId}/auth`, buildAuth())
      }

      // 4. MCP key
      if (mcpAuthEnabled) {
        await api.post(`/swagger/projects/${projectId}/api-key`)
      }

      // 5. Rate limit
      if (rateLimitEnabled) {
        await api.patch(`/swagger/projects/${projectId}/rate-limit`, { enabled: true, requestsPerMinute: rateLimitRpm })
      }

      navigate(`/projects/${projectId}`)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Error creating project.'
      setError(Array.isArray(msg) ? msg.join(', ') : msg)
      setCreating(false)
    }
  }

  // ── Filtered preview list ─────────────────────────────────────────────────────

  const filteredTools = localTools.filter(t =>
    !toolSearch
    || t.name.toLowerCase().includes(toolSearch.toLowerCase())
    || t.path.toLowerCase().includes(toolSearch.toLowerCase())
    || (t.description ?? '').toLowerCase().includes(toolSearch.toLowerCase())
  )

  // ── Secret input helper ───────────────────────────────────────────────────────

  const secretInput = (value: string, onChange: (v: string) => void, label: string) => (
    <TextField size="small" fullWidth label={label}
      type={showSecrets ? 'text' : 'password'} value={value}
      onChange={(e) => onChange(e.target.value)}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton size="small" onClick={() => setShowSecrets(s => !s)} edge="end">
              {showSecrets ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  )

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <Box p={3} maxWidth={700} mx="auto">
      {/* Header */}
      <Box display="flex" alignItems="center" gap={1.5} mb={4}>
        <Button size="small" startIcon={<ArrowBackIcon fontSize="small" />} onClick={() => navigate('/')} sx={{ mr: 0.5 }}>
          Projects
        </Button>
        <Typography variant="h5" fontWeight={700}>New project</Typography>
      </Box>

      {/* Stepper */}
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {STEPS.map((label, i) => (
          <Step key={label} completed={activeStep > i}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      {/* ── Step 0: Project details ─────────────────────────────────────── */}
      {activeStep === 0 && (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} mb={0.5}>Project details</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Give your project a name so you can identify it later. Everything else can be configured after creation.
          </Typography>
          <Box display="flex" flexDirection="column" gap={2.5}>
            <TextField label="Project name" required fullWidth autoFocus
              placeholder="e.g. Stripe Payments, Internal CRM"
              value={name}
              onChange={(e) => { setName(e.target.value); setError('') }}
              onKeyDown={(e) => e.key === 'Enter' && step0Valid && handleNext()}
              helperText="A short name that identifies this API integration"
            />
            <TextField label="Description" fullWidth multiline minRows={3}
              placeholder="What does this project do? What API does it connect to?"
              value={description} onChange={(e) => setDescription(e.target.value)}
              helperText="Optional — helps team members understand the purpose of this project"
            />
          </Box>
        </Paper>
      )}

      {/* ── Step 1: Import API spec ─────────────────────────────────────── */}
      {activeStep === 1 && (
        <Box display="flex" flexDirection="column" gap={2.5}>
          <Paper variant="outlined"
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) acceptFile(f) }}
            onClick={() => !file && fileInputRef.current?.click()}
            sx={{
              p: 5, textAlign: 'center', cursor: file ? 'default' : 'pointer',
              border: '2px dashed',
              borderColor: dragging ? 'primary.main' : file ? 'success.main' : 'divider',
              bgcolor: dragging ? 'primary.light' : file ? '#f0fdf4' : 'background.paper',
              transition: 'all 0.18s',
              '&:hover': file ? {} : { bgcolor: 'action.hover', borderColor: 'primary.light' },
            }}
          >
            <input ref={fileInputRef} type="file" accept=".yaml,.yml,.json" hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) acceptFile(f); e.target.value = '' }} />
            {file ? (
              <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                <InsertDriveFileIcon sx={{ fontSize: 40, color: 'success.main' }} />
                <Typography fontWeight={700} color="success.main">{file.name}</Typography>
                <Typography variant="body2" color="text.secondary">MCP tools will be generated automatically from this spec</Typography>
                <Button size="small" startIcon={<CloseIcon fontSize="small" />}
                  onClick={(e) => { e.stopPropagation(); setFile(null); clearSpecState(); setError('') }} sx={{ mt: 0.5 }}>
                  Remove file
                </Button>
              </Box>
            ) : (
              <Box display="flex" flexDirection="column" alignItems="center" gap={0.5}>
                <CloudUploadIcon sx={{ fontSize: 44, color: 'text.secondary', mb: 0.5 }} />
                <Typography fontWeight={500}>Drag your OpenAPI / Swagger spec here</Typography>
                <Typography variant="body2" color="text.secondary">or click to browse · .yaml · .yml · .json</Typography>
                <Typography variant="caption" color="text.disabled" mt={1} display="block">
                  Optional — skip this step to start with an empty project and add tools manually
                </Typography>
              </Box>
            )}
          </Paper>

          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="subtitle2" fontWeight={700} mb={0.5}>
              {file ? 'Base URL override' : 'API Base URL'}
              {!file && <Typography component="span" color="error.main"> *</Typography>}
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={1.5}>
              {file
                ? 'Leave blank to use the server URL declared inside the spec. Fill this in to point to a different environment.'
                : 'The root address of the external API. All tool endpoints will be appended to this URL.'}
            </Typography>
            <TextField fullWidth required={!file} placeholder="https://api.example.com"
              value={baseUrl}
              onChange={(e) => { setBaseUrl(e.target.value); setError('') }}
              error={baseUrl.trim().length > 0 && !isValidUrl(baseUrl.trim())}
              helperText={baseUrl.trim().length > 0 && !isValidUrl(baseUrl.trim())
                ? 'Invalid URL — include the protocol (e.g. https://api.example.com)' : ''}
            />
          </Paper>

          {file && (
            <Alert severity="info" sx={{ fontSize: '0.82rem' }}>
              When importing a spec, the <strong>project name</strong> will be taken from the spec's <code>info.title</code> field
              instead of the name you entered. You can rename it from the project detail page.
            </Alert>
          )}
        </Box>
      )}

      {/* ── Step 2: Preview tools ───────────────────────────────────────── */}
      {activeStep === 2 && (
        <Box display="flex" flexDirection="column" gap={2}>
          {/* Spec header (only when spec was imported) */}
          {specMeta && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
                <BuildIcon color="primary" fontSize="small" />
                <Box flexGrow={1}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="subtitle2" fontWeight={700}>{specMeta.name}</Typography>
                    {specMeta.version && <Chip label={`v${specMeta.version}`} size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }} />}
                  </Box>
                  {specMeta.description && <Typography variant="caption" color="text.secondary">{specMeta.description}</Typography>}
                </Box>
              </Box>
            </Paper>
          )}

          {/* Toolbar: search + count + add */}
          <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
            <TextField size="small" placeholder="Search tools…" value={toolSearch}
              onChange={(e) => setToolSearch(e.target.value)} sx={{ flexGrow: 1, minWidth: 200 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" color="action" /></InputAdornment> }}
            />
            {toolSearch && (
              <Typography variant="body2" color="text.secondary" whiteSpace="nowrap">
                {filteredTools.length} / {localTools.length}
              </Typography>
            )}
            {!toolSearch && localTools.length > 0 && (
              <Chip
                label={`${localTools.filter(t => t.enabled).length} enabled · ${localTools.filter(t => !t.enabled).length} disabled`}
                size="small" color="default" variant="outlined"
              />
            )}
            <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>
              Add tool
            </Button>
          </Box>

          {/* Tool list */}
          {localTools.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
              <BuildIcon sx={{ fontSize: 44, color: 'text.disabled', mb: 1.5 }} />
              <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                {file ? 'No tools were found in the spec.' : 'No tools yet'}
              </Typography>
              <Typography variant="body2" color="text.disabled" mb={2}>
                Click <strong>Add tool</strong> to create MCP tools manually.
                You can add parameters and configure endpoints from the project detail page after creation.
              </Typography>
              <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>Add first tool</Button>
            </Paper>
          ) : (
            <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
              {filteredTools.length === 0 ? (
                <Box py={4} textAlign="center">
                  <Typography color="text.secondary" fontSize="0.875rem">No tools match the search.</Typography>
                </Box>
              ) : filteredTools.map((tool, i) => (
                <Box key={tool.id} display="flex" alignItems="center" gap={1.5} px={2} py={1.25}
                  sx={{
                    borderBottom: i < filteredTools.length - 1 ? '1px solid' : 'none',
                    borderColor: 'divider',
                    opacity: tool.enabled ? 1 : 0.5,
                    filter: tool.enabled ? 'none' : 'grayscale(0.5)',
                    transition: 'opacity 0.15s, filter 0.15s',
                    bgcolor: tool.fromSpec ? 'transparent' : 'action.hover',
                  }}>
                  {/* Enable/disable switch */}
                  <Tooltip title={tool.enabled ? 'Disable tool' : 'Enable tool'}>
                    <Switch size="small" checked={tool.enabled} onChange={() => handleToggleTool(tool.id)}
                      color="primary" sx={{ flexShrink: 0 }} />
                  </Tooltip>

                  {/* Method badge */}
                  <Box sx={{
                    px: 1, py: 0.3, borderRadius: '4px',
                    bgcolor: METHOD_COLOR[tool.method] ?? '#888', color: '#fff',
                    fontWeight: 700, fontSize: '0.68rem', fontFamily: 'monospace',
                    minWidth: 54, textAlign: 'center', flexShrink: 0,
                  }}>
                    {tool.method}
                  </Box>

                  {/* Name + path + desc */}
                  <Box minWidth={0} flexGrow={1}>
                    <Box display="flex" alignItems="center" gap={0.75}>
                      <Typography fontWeight={600} fontSize="0.875rem" noWrap>{tool.name}</Typography>
                      {!tool.fromSpec && (
                        <Chip label="custom" size="small" color="primary"
                          sx={{ fontSize: '0.62rem', height: 16, flexShrink: 0 }} />
                      )}
                      {!tool.enabled && (
                        <Chip label="disabled" size="small"
                          sx={{ fontSize: '0.62rem', height: 16, bgcolor: '#9e9e9e', color: '#fff', flexShrink: 0 }} />
                      )}
                    </Box>
                    <Typography variant="caption" color="text.secondary" fontFamily="monospace" display="block" noWrap>{tool.path}</Typography>
                    {tool.description && (
                      <Typography variant="caption" color="text.disabled" display="block"
                        sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {tool.description}
                      </Typography>
                    )}
                  </Box>

                  {/* Delete */}
                  <Tooltip title="Remove tool">
                    <IconButton size="small" color="error" onClick={() => handleDeleteTool(tool)} sx={{ flexShrink: 0 }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              ))}
            </Paper>
          )}

          {localTools.length > 0 && (
            <Alert severity="info" sx={{ fontSize: '0.82rem' }}>
              <strong>{localTools.filter(t => t.enabled).length}</strong> tool{localTools.filter(t => t.enabled).length !== 1 ? 's' : ''} will be active after creation.
              Disabled tools are created but hidden from MCP clients — you can enable them at any time.
            </Alert>
          )}
        </Box>
      )}

      {/* ── Step 3: API Authentication ──────────────────────────────────── */}
      {activeStep === 3 && (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
            <VpnKeyIcon fontSize="small" color={authType !== 'none' ? 'primary' : 'disabled'} />
            <Typography variant="subtitle1" fontWeight={700}>API Authentication</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Credentials Arthur attaches to every outgoing HTTP request when calling your API. The AI never sees these — they are injected automatically.
          </Typography>

          <FormControl size="small" fullWidth sx={{ mb: 3 }}>
            <InputLabel>Authentication type</InputLabel>
            <Select value={authType} label="Authentication type" onChange={(e) => setAuthType(e.target.value as AuthType)}>
              {(Object.keys(AUTH_TYPE_LABELS) as AuthType[]).map((t) => (
                <MenuItem key={t} value={t}>{AUTH_TYPE_LABELS[t]}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {authType === 'none' && (
            <Typography variant="body2" color="text.secondary">No credentials will be attached. Use for public APIs.</Typography>
          )}

          {authType === 'bearer' && (
            <Box display="flex" flexDirection="column" gap={1.5}>
              {secretInput(token, setToken, 'Bearer Token')}
              <Typography variant="caption" color="text.secondary">Sent as: <code>Authorization: Bearer &lt;token&gt;</code></Typography>
            </Box>
          )}

          {authType === 'api-key' && (
            <Box display="flex" flexDirection="column" gap={1.5}>
              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={5}>
                  <TextField size="small" fullWidth label="Parameter name" placeholder="X-Api-Key" value={keyName} onChange={(e) => setKeyName(e.target.value)} />
                </Grid>
                <Grid item xs={12} sm={7}>{secretInput(keyValue, setKeyValue, 'Value')}</Grid>
              </Grid>
              <FormControl size="small" fullWidth>
                <InputLabel>Send as</InputLabel>
                <Select value={keyIn} label="Send as" onChange={(e) => setKeyIn(e.target.value as 'header' | 'query')}>
                  <MenuItem value="header">Header HTTP</MenuItem>
                  <MenuItem value="query">Query param (?{keyName || 'key'}=…)</MenuItem>
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary">
                {keyIn === 'header' ? `Sent as: ${keyName || '<name>'}: <value>` : `Added to URL: ?${keyName || '<name>'}=<value>`}
              </Typography>
            </Box>
          )}

          {authType === 'basic' && (
            <Box display="flex" flexDirection="column" gap={1.5}>
              <TextField size="small" fullWidth label="Username" value={basicUser} onChange={(e) => setBasicUser(e.target.value)} />
              {secretInput(basicPass, setBasicPass, 'Password')}
              <Typography variant="caption" color="text.secondary">Sent as: <code>Authorization: Basic &lt;base64(username:password)&gt;</code></Typography>
            </Box>
          )}

          {authType === 'oauth2-client' && (
            <Box display="flex" flexDirection="column" gap={1.5}>
              <TextField size="small" fullWidth label="Token URL" placeholder="https://auth.example.com/oauth/token"
                value={oauthTokenUrl} onChange={(e) => setOauthTokenUrl(e.target.value)} />
              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={6}><TextField size="small" fullWidth label="Client ID" value={oauthClientId} onChange={(e) => setOauthClientId(e.target.value)} /></Grid>
                <Grid item xs={12} sm={6}>{secretInput(oauthClientSecret, setOauthClientSecret, 'Client Secret')}</Grid>
              </Grid>
              <TextField size="small" fullWidth label="Scope (optional)" placeholder="read write" value={oauthScope} onChange={(e) => setOauthScope(e.target.value)} />
              <Typography variant="caption" color="text.secondary">Uses <strong>client_credentials</strong> flow. Token fetched and renewed automatically.</Typography>
            </Box>
          )}

          {authType === 'custom' && (
            <Box display="flex" flexDirection="column" gap={1}>
              <Typography variant="caption" color="text.secondary" mb={0.5}>
                Add any HTTP headers to every request (e.g. <code>X-Tenant-Id</code>, <code>X-Auth-Token</code>).
              </Typography>
              {customHeaders.map((h, i) => (
                <Box key={i} display="flex" gap={1} alignItems="center">
                  <TextField size="small" label="Header" placeholder="X-Custom-Header" sx={{ flex: 1 }}
                    value={h.name} onChange={(e) => setCustomHeaders(customHeaders.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))} />
                  <TextField size="small" label="Value" sx={{ flex: 2 }}
                    type={showSecrets ? 'text' : 'password'}
                    value={h.value} onChange={(e) => setCustomHeaders(customHeaders.map((x, idx) => idx === i ? { ...x, value: e.target.value } : x))}
                    InputProps={{
                      endAdornment: i === 0 ? (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setShowSecrets(s => !s)} edge="end">
                            {showSecrets ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ) : undefined,
                    }}
                  />
                  <IconButton size="small" color="error" onClick={() => setCustomHeaders(customHeaders.filter((_, idx) => idx !== i))} disabled={customHeaders.length === 1}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
              <Button size="small" startIcon={<AddIcon />} onClick={() => setCustomHeaders(prev => [...prev, { name: '', value: '' }])} sx={{ alignSelf: 'flex-start', mt: 0.5 }}>
                Add header
              </Button>
            </Box>
          )}

          {authType !== 'none' && (
            <Alert severity="warning" sx={{ mt: 2.5, py: 0.5, fontSize: '0.78rem' }}>
              Use tokens with minimum required scope. Credentials are stored in the database.
            </Alert>
          )}
        </Paper>
      )}

      {/* ── Step 4: MCP Protection ──────────────────────────────────────── */}
      {activeStep === 4 && (
        <Box display="flex" flexDirection="column" gap={2.5}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
              <LockIcon fontSize="small" color={mcpAuthEnabled ? 'success' : 'disabled'} />
              <Typography variant="subtitle1" fontWeight={700}>MCP Authentication</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Generate a secret key that AI clients must include in every request (<code>auth: &lt;key&gt;</code>) to access
              this project's tools. Without a key the MCP endpoint is publicly accessible to anyone who knows the URL.
            </Typography>
            <FormControlLabel
              control={<Switch checked={mcpAuthEnabled} onChange={(e) => setMcpAuthEnabled(e.target.checked)} color="success" />}
              label={<Typography variant="body2">{mcpAuthEnabled ? 'A key will be generated — copy it from the project page after creation.' : 'No key — the endpoint will be publicly accessible.'}</Typography>}
            />
          </Paper>

          <Paper variant="outlined" sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
              <SpeedIcon fontSize="small" color={rateLimitEnabled ? 'warning' : 'disabled'} />
              <Typography variant="subtitle1" fontWeight={700}>Rate Limiting</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Cap the number of MCP requests per minute. Helps protect your upstream API from being overwhelmed by AI agents.
            </Typography>
            <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
              <FormControlLabel
                control={<Switch checked={rateLimitEnabled} onChange={(e) => setRateLimitEnabled(e.target.checked)} color="warning" />}
                label={<Typography variant="body2">{rateLimitEnabled ? 'Active' : 'Inactive'}</Typography>}
                sx={{ mr: 0 }}
              />
              {rateLimitEnabled && (
                <TextField size="small" type="number" label="Req / min" value={rateLimitRpm}
                  onChange={(e) => setRateLimitRpm(Math.max(1, Math.min(10000, Number(e.target.value))))}
                  inputProps={{ min: 1, max: 10000 }} sx={{ width: 130 }}
                />
              )}
            </Box>
            {rateLimitEnabled && (
              <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                Exceeding {rateLimitRpm} req/min returns HTTP 429.
              </Typography>
            )}
          </Paper>
        </Box>
      )}

      {/* ── Navigation ─────────────────────────────────────────────────── */}
      <Box display="flex" justifyContent="space-between" mt={4}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => activeStep === 0 ? navigate('/') : setActiveStep(s => s - 1)}
          disabled={creating || previewing}
        >
          {activeStep === 0 ? 'Cancel' : 'Back'}
        </Button>

        {!isLastStep && (
          <Button variant="contained"
            endIcon={previewing ? undefined : <ArrowForwardIcon />}
            startIcon={previewing ? <CircularProgress size={15} color="inherit" /> : undefined}
            onClick={handleNext} disabled={!canNext() || previewing}
          >
            {previewing ? 'Analyzing spec…' : 'Next'}
          </Button>
        )}

        {isLastStep && (
          <Button variant="contained"
            startIcon={creating ? <CircularProgress size={15} color="inherit" /> : <AddIcon />}
            onClick={handleCreate} disabled={creating}
          >
            {creating ? 'Creating project…' : 'Create project'}
          </Button>
        )}
      </Box>

      {/* ── Add tool dialog ─────────────────────────────────────────────── */}
      <Dialog open={addOpen} onClose={() => { setAddOpen(false); setAddError('') }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" fontWeight={700}>Add MCP tool</Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" mb={2.5}>
            Define the basic endpoint for this tool. You can add parameters and fine-tune the configuration from the project detail page after creation.
          </Typography>
          {addError && <Alert severity="error" sx={{ mb: 2 }}>{addError}</Alert>}
          <Box display="flex" flexDirection="column" gap={2}>
            <Grid container spacing={1.5}>
              <Grid item xs={12} sm={8}>
                <TextField size="small" fullWidth required label="Tool name"
                  placeholder="e.g. get_user, create_order"
                  value={newName}
                  onChange={(e) => { setNewName(e.target.value); setAddError('') }}
                  helperText="The identifier the AI uses to call this tool"
                  InputProps={{ sx: { fontFamily: 'monospace' } }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl size="small" fullWidth required>
                  <InputLabel>Method</InputLabel>
                  <Select value={newMethod} label="Method" onChange={(e) => setNewMethod(e.target.value)}>
                    {METHODS.map(m => (
                      <MenuItem key={m} value={m}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: METHOD_COLOR[m] ?? '#888', flexShrink: 0 }} />
                          <Typography fontFamily="monospace" fontWeight={600} fontSize="0.85rem">{m}</Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <TextField size="small" fullWidth required label="Path"
              placeholder="/users/{id}"
              value={newPath}
              onChange={(e) => { setNewPath(e.target.value); setAddError('') }}
              helperText="API endpoint path — will be appended to the project's base URL"
              InputProps={{ sx: { fontFamily: 'monospace' } }}
            />

            <TextField size="small" fullWidth multiline minRows={2} label="Description"
              placeholder="Describe what this tool does so the AI knows when to use it…"
              value={newDesc} onChange={(e) => setNewDesc(e.target.value)}
              helperText="Optional but recommended — a clear description improves AI tool selection accuracy"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={() => { setAddOpen(false); setAddError('') }}>Cancel</Button>
          <Button variant="contained" onClick={handleAddTool} startIcon={<AddIcon />}>Add tool</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
