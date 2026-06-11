import { useEffect, useState } from 'react'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import BuildIcon from '@mui/icons-material/Build'
import StorageIcon from '@mui/icons-material/Storage'
import LinkIcon from '@mui/icons-material/Link'
import api from '../api'

interface ParamDoc {
  name: string
  type: string
  required: boolean
  description: string
}

interface ToolDoc {
  name: string
  description: string
  params: ParamDoc[]
  hasParams: boolean
  curlExample: string
}

interface ResourceDoc {
  uri: string
  name: string
  description: string
  mimeType: string
}

interface TemplateDoc {
  uriTemplate: string
  name: string
  description: string
  mimeType: string
}

interface DocsData {
  serverName: string
  version: string
  endpoint: string
  toolCount: number
  resourceCount: number
  templateCount: number
  tools: ToolDoc[]
  resources: ResourceDoc[]
  resourceTemplates: TemplateDoc[]
}

export default function McpConfig() {
  const [data, setData] = useState<DocsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<DocsData>('/mcp-docs/json')
      .then((res) => setData(res.data))
      .catch(() => setError('Unable to load MCP server information.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error || !data) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{error ?? 'Unknown error.'}</Alert>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Info do servidor */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            {data.serverName}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            v{data.version}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
            <LinkIcon fontSize="small" color="action" />
            <Typography variant="body2" fontFamily="monospace">
              {data.endpoint}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <Chip icon={<BuildIcon />} label={`${data.toolCount} tools`} variant="outlined" size="small" />
            <Chip icon={<StorageIcon />} label={`${data.resourceCount} resources`} variant="outlined" size="small" />
            {data.templateCount > 0 && (
              <Chip label={`${data.templateCount} templates`} variant="outlined" size="small" />
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Tools */}
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <BuildIcon fontSize="small" /> Tools
      </Typography>
      <Box sx={{ mb: 4 }}>
        {data.tools.map((tool) => (
          <Accordion key={tool.name} sx={{ mb: 1 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', pr: 1 }}>
                <Typography fontWeight="bold" fontFamily="monospace">
                  {tool.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                  {tool.description}
                </Typography>
                <Chip
                  label={tool.hasParams ? `${tool.params.length} params` : 'no params'}
                  size="small"
                  color={tool.hasParams ? 'primary' : 'default'}
                  variant="outlined"
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {tool.hasParams && (
                <>
                  <Typography variant="subtitle2" gutterBottom>
                    Parameters
                  </Typography>
                  <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Required</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {tool.params.map((p) => (
                          <TableRow key={p.name}>
                            <TableCell>
                              <Typography fontFamily="monospace" variant="body2">
                                {p.name}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip label={p.type} size="small" variant="outlined" />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={p.required ? 'sim' : 'não'}
                                size="small"
                                color={p.required ? 'error' : 'default'}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {p.description || '—'}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
              <Typography variant="subtitle2" gutterBottom>
                cURL Example
              </Typography>
              <Box
                component="pre"
                sx={{
                  bgcolor: '#1e1e1e',
                  color: '#d4d4d4',
                  p: 2,
                  borderRadius: 1,
                  overflowX: 'auto',
                  fontSize: '0.78rem',
                  fontFamily: 'monospace',
                  m: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
                {tool.curlExample}
              </Box>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>

      {/* Resources */}
      {data.resourceCount > 0 && (
        <>
          <Divider sx={{ mb: 3 }} />
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <StorageIcon fontSize="small" /> Resources
          </Typography>
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {data.resources.map((r) => (
              <Grid item xs={12} sm={6} md={4} key={r.uri}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography fontWeight="bold" fontFamily="monospace" variant="body2" gutterBottom>
                      {r.uri}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {r.description || r.name}
                    </Typography>
                    <Chip label={r.mimeType} size="small" variant="outlined" />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {/* Resource Templates */}
      {data.templateCount > 0 && (
        <>
          <Divider sx={{ mb: 3 }} />
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
            Resource Templates
          </Typography>
          <Grid container spacing={2}>
            {data.resourceTemplates.map((t) => (
              <Grid item xs={12} sm={6} md={4} key={t.uriTemplate}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography fontWeight="bold" fontFamily="monospace" variant="body2" gutterBottom>
                      {t.uriTemplate}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {t.description || t.name}
                    </Typography>
                    <Chip label={t.mimeType} size="small" variant="outlined" />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}
    </Container>
  )
}
