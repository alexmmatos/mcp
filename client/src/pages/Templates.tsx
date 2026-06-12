import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  TextField,
  Typography,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import api from '../api'
import { API_TEMPLATES, ApiTemplate, TEMPLATE_CATEGORIES, buildToolPayload } from '../data/api-templates'

// ─── Auth badge ───────────────────────────────────────────────────────────────

const AUTH_LABELS: Record<string, string> = {
  none: 'No auth needed',
  bearer: 'Bearer Token',
  'api-key': 'API Key',
  basic: 'Basic Auth',
}

const AUTH_COLORS: Record<string, string> = {
  none: '#9e9e9e',
  bearer: '#5D87FF',
  'api-key': '#FFAE1F',
  basic: '#FA896B',
}

// ─── Template card ────────────────────────────────────────────────────────────

function TemplateCard({ template, onUse }: { template: ApiTemplate; onUse: (t: ApiTemplate) => void }) {
  const authColor = AUTH_COLORS[template.auth.type]
  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'box-shadow 0.18s, border-color 0.18s',
        '&:hover': { boxShadow: 4, borderColor: template.color },
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        {/* Icon + heading */}
        <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
          <Box
            sx={{
              width: 46, height: 46, borderRadius: 2, flexShrink: 0,
              bgcolor: `${template.color}18`,
              border: `1.5px solid ${template.color}35`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem', lineHeight: 1,
            }}
          >
            {template.emoji}
          </Box>
          <Box minWidth={0}>
            <Typography fontWeight={700} fontSize="0.95rem" noWrap>{template.name}</Typography>
            <Typography fontSize="0.75rem" color="text.secondary" noWrap>{template.tagline}</Typography>
          </Box>
        </Box>

        <Typography variant="body2" color="text.secondary" fontSize="0.81rem" mb={2} sx={{ lineHeight: 1.5 }}>
          {template.description}
        </Typography>

        <Box display="flex" gap={0.75} flexWrap="wrap" alignItems="center">
          <Chip
            label={AUTH_LABELS[template.auth.type]}
            size="small"
            sx={{
              bgcolor: `${authColor}18`, color: authColor, borderColor: `${authColor}40`,
              fontSize: '0.7rem', height: 20, fontWeight: 600,
              border: `1px solid ${authColor}40`,
            }}
          />
          <Chip
            label={`${template.tools.length} tool${template.tools.length !== 1 ? 's' : ''}`}
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.7rem', height: 20 }}
          />
        </Box>
      </CardContent>

      <Box px={2} pb={2} display="flex" gap={1}>
        {template.docsUrl && (
          <Button
            size="small"
            variant="text"
            color="inherit"
            href={template.docsUrl}
            target="_blank"
            rel="noreferrer"
            sx={{ flexShrink: 0, color: 'text.secondary', minWidth: 0, px: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <OpenInNewIcon fontSize="small" />
          </Button>
        )}
        <Button variant="outlined" size="small" fullWidth onClick={() => onUse(template)}>
          Use template
        </Button>
      </Box>
    </Card>
  )
}

// ─── Use-template dialog ──────────────────────────────────────────────────────

function UseTemplateDialog({
  template,
  onClose,
}: {
  template: ApiTemplate
  onClose: () => void
}) {
  const navigate = useNavigate()
  const [projectName, setProjectName] = useState(template.name)
  const [authValue, setAuthValue] = useState('')
  const [showAuth, setShowAuth] = useState(false)
  const [creating, setCreating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [error, setError] = useState('')

  const needsAuth = template.auth.type !== 'none'
  const canCreate = !!projectName.trim() && !creating && (!needsAuth || !!authValue.trim())

  const handleCreate = async () => {
    if (!projectName.trim() || creating) return
    setCreating(true)
    setError('')

    const total = template.tools.length + 2
    let done = 0

    const tick = (label: string) => {
      done++
      setProgress(Math.round((done / total) * 100))
      setProgressLabel(label)
    }

    try {
      // 1. Create project
      tick('Creating project…')
      const { data: project } = await api.post('/swagger/projects', {
        name: projectName.trim(),
        baseUrl: template.baseUrl,
        description: template.description,
      })

      // 2. Set auth credentials
      if (template.auth.type !== 'none') {
        tick('Configuring authentication…')
        const authPayload =
          template.auth.type === 'bearer'
            ? { type: 'bearer', token: authValue }
            : template.auth.type === 'api-key'
            ? { type: 'api-key', name: template.auth.keyName ?? 'X-Api-Key', value: authValue, in: template.auth.keyIn ?? 'header' }
            : { type: 'none' }
        await api.patch(`/swagger/projects/${project._id}/auth`, authPayload)
      } else {
        tick('No auth required…')
      }

      // 3. Create tools sequentially
      for (const toolDef of template.tools) {
        tick(`Adding tool: ${toolDef.name}…`)
        const payload = buildToolPayload(toolDef, template.baseUrl)
        await api.post(`/swagger/projects/${project._id}/tools`, payload)
      }

      navigate(`/projects/${project._id}`)
    } catch (err: any) {
      setCreating(false)
      setError(err?.response?.data?.message ?? 'Something went wrong creating the project.')
    }
  }

  return (
    <Dialog open onClose={!creating ? onClose : undefined} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        <Box sx={{ fontSize: '1.6rem', lineHeight: 1 }}>{template.emoji}</Box>
        <Box>
          <Typography fontWeight={700} fontSize="1.05rem">{template.name}</Typography>
          <Typography variant="caption" color="text.secondary">
            {template.tools.length} tool{template.tools.length !== 1 ? 's' : ''} pre-configured
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {creating ? (
          <Box py={1}>
            <Typography variant="body2" color="text.secondary" gutterBottom>{progressLabel}</Typography>
            <LinearProgress variant="determinate" value={progress} sx={{ borderRadius: 1, height: 6 }} />
          </Box>
        ) : (
          <>
            <TextField
              size="small"
              fullWidth
              autoFocus
              label="Project name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && canCreate && handleCreate()}
              sx={{ mb: 2 }}
            />

            {needsAuth ? (
              <TextField
                size="small"
                fullWidth
                required
                label={template.auth.type === 'api-key' ? 'API Key' : 'Access Token'}
                placeholder={template.auth.type === 'api-key' ? 'Paste your API key here' : 'Paste your access token here'}
                type={showAuth ? 'text' : 'password'}
                value={authValue}
                onChange={(e) => setAuthValue(e.target.value)}
                helperText={
                  <span>
                    {template.auth.hint}{' '}
                    {template.signupUrl && (
                      <a href={template.signupUrl} target="_blank" rel="noreferrer">
                        Get one here ↗
                      </a>
                    )}
                  </span>
                }
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" edge="end" onClick={() => setShowAuth((v) => !v)} tabIndex={-1}>
                        {showAuth ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            ) : (
              <Alert severity="success" sx={{ fontSize: '0.82rem' }}>
                No API key or login needed — ready to use immediately after creation.
              </Alert>
            )}

            <Box mt={2}>
              <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.5}>
                Tools that will be created
              </Typography>
              <Box display="flex" gap={0.5} flexWrap="wrap">
                {template.tools.map((t) => (
                  <Chip key={t.name} label={t.name} size="small" variant="outlined" sx={{ fontSize: '0.68rem', height: 20, fontFamily: 'monospace' }} />
                ))}
              </Box>
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={creating}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleCreate}
          disabled={!canCreate}
          startIcon={creating ? <CircularProgress size={14} color="inherit" /> : <RocketLaunchIcon fontSize="small" />}
        >
          {creating ? 'Creating…' : 'Create project'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Templates page ───────────────────────────────────────────────────────────

export default function Templates() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [selected, setSelected] = useState<ApiTemplate | null>(null)

  const filtered = API_TEMPLATES.filter((t) => {
    const matchSearch =
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.tagline.toLowerCase().includes(search.toLowerCase())
    const matchCat = category === 'All' || t.category === category
    return matchSearch && matchCat
  })

  return (
    <Box p={3}>
      <Box mb={2.5}>
        <Button startIcon={<ArrowBackIcon />} size="small" onClick={() => navigate('/')}>
          Back to projects
        </Button>
      </Box>

      {/* Header */}
      <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            API Templates
          </Typography>
          <Typography color="text.secondary" maxWidth={560}>
            Start with a pre-built integration. Pick a template, name your project, and your AI will have working tools in under a minute.
          </Typography>
        </Box>
        <TextField
          size="small"
          placeholder="Search templates…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 220 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Category filter */}
      <Box display="flex" gap={0.75} flexWrap="wrap" mb={3}>
        {TEMPLATE_CATEGORIES.map((cat) => (
          <Chip
            key={cat}
            label={cat}
            size="small"
            clickable
            color={category === cat ? 'primary' : 'default'}
            onClick={() => setCategory(cat)}
          />
        ))}
      </Box>

      {/* Grid */}
      <Grid container spacing={2}>
        {filtered.map((t) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={t.id}>
            <TemplateCard template={t} onUse={setSelected} />
          </Grid>
        ))}

        {filtered.length === 0 && (
          <Grid item xs={12}>
            <Typography color="text.secondary" textAlign="center" py={10}>
              No templates match "{search || category}".
            </Typography>
          </Grid>
        )}
      </Grid>

      {/* Dialog */}
      {selected && <UseTemplateDialog template={selected} onClose={() => setSelected(null)} />}
    </Box>
  )
}
