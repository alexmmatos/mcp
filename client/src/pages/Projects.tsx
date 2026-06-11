import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  InputAdornment,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import SearchIcon from '@mui/icons-material/Search'
import LabelIcon from '@mui/icons-material/Label'
import Swal from 'sweetalert2'
import api from '../api'
import HelpButton from '../components/HelpButton'

interface Project {
  _id: string
  name: string
  baseUrl: string
  description?: string
  version?: string
  status: 'active' | 'error'
  tools: { name: string }[]
  tags: string[]
  createdAt: string
}

// ─── Project card ─────────────────────────────────────────────────────────────

function ProjectCard({ p, onDelete, onDuplicate }: {
  p: Project
  onDelete: (e: React.MouseEvent, id: string) => void
  onDuplicate: (e: React.MouseEvent, id: string) => void
}) {
  const navigate = useNavigate()
  return (
    <Card variant="outlined" sx={{ height: '100%', position: 'relative' }}>
      <CardActionArea sx={{ height: '100%' }} onClick={() => navigate(`/projects/${p._id}`)}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Typography variant="h6" fontWeight="bold" gutterBottom noWrap sx={{ maxWidth: '70%' }}>
              {p.name}
            </Typography>
            <Box display="flex" gap={0.5}>
              <Tooltip title="Duplicate project">
                <IconButton size="small" onClick={(e) => onDuplicate(e, p._id)}>
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete project">
                <IconButton size="small" color="error" onClick={(e) => onDelete(e, p._id)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {p.description && (
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {p.description.slice(0, 100)}{p.description.length > 100 ? '…' : ''}
            </Typography>
          )}

          <Typography variant="caption" color="text.secondary" display="block" gutterBottom fontFamily="monospace">
            {p.baseUrl}
          </Typography>

          <Box display="flex" gap={1} flexWrap="wrap" mt={1}>
            <Chip label={p.status === 'active' ? 'Active' : 'Error'} color={p.status === 'active' ? 'success' : 'error'} size="small" />
            <Chip label={`${p.tools?.length ?? 0} tool${(p.tools?.length ?? 0) !== 1 ? 's' : ''}`} size="small" variant="outlined" />
            {p.version && <Chip label={`v${p.version}`} size="small" variant="outlined" />}
          </Box>

          {p.tags?.length > 0 && (
            <Box display="flex" gap={0.5} flexWrap="wrap" mt={1}>
              {p.tags.map((tag) => (
                <Chip key={tag} icon={<LabelIcon sx={{ fontSize: '0.75rem !important' }} />}
                  label={tag} size="small" variant="outlined" color="primary"
                  sx={{ fontSize: '0.7rem', height: 20 }} />
              ))}
            </Box>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const navigate = useNavigate()

  const load = () => {
    setLoading(true)
    setError(null)
    api.get<Project[]>('/swagger/projects')
      .then((r) => setProjects(r.data))
      .catch((err) => setError(err?.response?.data?.message || 'Failed to load projects.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const result = await Swal.fire({
      title: 'Delete project?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#d33',
    })
    if (!result.isConfirmed) return
    await api.delete(`/swagger/projects/${id}`)
    setProjects((prev) => prev.filter((p) => p._id !== id))
  }

  const handleDuplicate = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    try {
      const res = await api.post<Project>(`/swagger/projects/${id}/duplicate`)
      setProjects((prev) => [res.data, ...prev])
      Swal.fire({ title: 'Project duplicated!', text: `"${res.data.name}" created successfully.`, icon: 'success', timer: 2000, showConfirmButton: false })
    } catch {
      Swal.fire('Error', 'Could not duplicate the project.', 'error')
    }
  }

  // All unique tags
  const allTags = Array.from(new Set(projects.flatMap((p) => p.tags ?? [])))

  // Client-side filter (tags filter uses backend, search is local)
  const filtered = projects.filter((p) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase())
    const matchTag = !tagFilter || (p.tags ?? []).includes(tagFilter)
    return matchSearch && matchTag
  })

  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" height="50vh"><CircularProgress /></Box>

  return (
    <Box p={3}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="h5" fontWeight="bold">Projects</Typography>
          <HelpButton title="Projects">
            <Typography variant="body2" gutterBottom>
              A <strong>project</strong> is the central concept in Arthur MCP Adapter. Each project represents one external API (e.g. your CRM, payment provider, internal microservice) adapted to the MCP protocol so that AI clients can interact with it naturally.
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>How it works end-to-end:</strong>
            </Typography>
            <Box component="ol" sx={{ mt: 0, mb: 1, pl: 2.5 }}>
              <Box component="li"><Typography variant="body2">Create a project and point it at an API's base URL.</Typography></Box>
              <Box component="li"><Typography variant="body2">Add tools — manually or by importing an OpenAPI spec. Each tool maps one API endpoint to a callable function.</Typography></Box>
              <Box component="li"><Typography variant="body2">Configure authentication so Arthur knows how to prove its identity to the API.</Typography></Box>
              <Box component="li"><Typography variant="body2">Copy the MCP endpoint URL and paste it into your AI client's server configuration.</Typography></Box>
              <Box component="li"><Typography variant="body2">The AI discovers the tools automatically and can call them in any conversation.</Typography></Box>
            </Box>
            <Typography variant="body2" gutterBottom>
              <strong>Card indicators:</strong>
            </Typography>
            <Box component="ul" sx={{ mt: 0, mb: 1, pl: 2.5 }}>
              <Box component="li"><Typography variant="body2"><strong>Active / Error chip:</strong> whether the project is healthy.</Typography></Box>
              <Box component="li"><Typography variant="body2"><strong>Tool count:</strong> how many MCP tools are registered. 0 tools means no AI can use this project yet.</Typography></Box>
              <Box component="li"><Typography variant="body2"><strong>Tags:</strong> custom labels for organisation and filtering.</Typography></Box>
            </Box>
            <Typography variant="body2">
              Click <strong>New project</strong> to open the creation wizard where you can fill in the project details and optionally import an OpenAPI/Swagger spec to auto-generate all tools.
            </Typography>
          </HelpButton>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/projects/new')}>
          New project
        </Button>
      </Box>

      {/* Filters */}
      <Box display="flex" gap={1.5} mb={3} flexWrap="wrap" alignItems="center">
        <TextField
          size="small" placeholder="Search projects…"
          value={search} onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 220 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />
        {allTags.length > 0 && (
          <Box display="flex" gap={0.5} alignItems="center" flexWrap="wrap">
            <Typography variant="caption" color="text.secondary">Tags:</Typography>
            <Chip label="All" size="small" onClick={() => setTagFilter('')} color={tagFilter === '' ? 'primary' : 'default'} sx={{ cursor: 'pointer' }} />
            {allTags.map((tag) => (
              <Chip key={tag} label={tag} size="small" onClick={() => setTagFilter(tagFilter === tag ? '' : tag)}
                color={tagFilter === tag ? 'primary' : 'default'} sx={{ cursor: 'pointer' }} />
            ))}
          </Box>
        )}
      </Box>

      {error ? (
        <Box display="flex" flexDirection="column" alignItems="center" gap={2} py={10}>
          <Alert severity="error" sx={{ width: '100%', maxWidth: 560 }}>{error}</Alert>
          <Button variant="contained" onClick={load}>Reload</Button>
        </Box>
      ) : filtered.length === 0 ? (
        <Box display="flex" flexDirection="column" alignItems="center" gap={2} py={10}>
          {projects.length === 0 ? (
            <>
              <Typography color="text.secondary" variant="h6">No projects yet</Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/projects/new')}>
                Create your first project
              </Button>
            </>
          ) : (
            <Typography color="text.secondary">No projects match the filters.</Typography>
          )}
        </Box>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((p) => (
            <Grid item xs={12} sm={6} md={4} key={p._id}>
              <ProjectCard p={p} onDelete={handleDelete} onDuplicate={handleDuplicate} />
            </Grid>
          ))}
        </Grid>
      )}

    </Box>
  )
}
