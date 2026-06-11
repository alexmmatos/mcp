import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  ButtonGroup,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import FolderIcon from '@mui/icons-material/Folder'
import BuildIcon from '@mui/icons-material/Build'
import CallMadeIcon from '@mui/icons-material/CallMade'
import LockIcon from '@mui/icons-material/Lock'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import RefreshIcon from '@mui/icons-material/Refresh'
import api from '../api'
import HelpButton from '../components/HelpButton'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashStats {
  period: { from: string; to: string }
  projects: { total: number; withApiKey: number; active: number }
  tools: { total: number }
  calls: { total: number; errors: number; successRate: number }
  topTools: { toolName: string; count: number; projectName: string }[]
  callsByBucket: { _id: string; calls: number; errors: number }[]
  recentProjects: { _id: string; name: string; toolCount: number; status: string; tags: string[] }[]
}

// ─── Period presets ───────────────────────────────────────────────────────────

type Preset = '24h' | '7d' | '30d' | 'custom'

const PRESETS: { label: string; value: Preset }[] = [
  { label: 'Last 24h', value: '24h' },
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
  { label: 'Custom', value: 'custom' },
]

function presetToDates(preset: Preset, customFrom?: string, customTo?: string): { from: Date; to: Date } {
  const to = new Date()
  if (preset === '24h') return { from: new Date(to.getTime() - 24 * 60 * 60 * 1000), to }
  if (preset === '7d') return { from: new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000), to }
  if (preset === '30d') return { from: new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000), to }
  // custom
  const from = customFrom ? new Date(customFrom) : new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000)
  const toCustom = customTo ? new Date(customTo + 'T23:59:59') : to
  return { from, to: toCustom }
}

function toInputDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

// ─── Metric card ─────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string
  value: number | string
  icon: React.ReactNode
  color: string
  sub?: string
  helpTitle?: string
  helpContent?: React.ReactNode
}

function MetricCard({ label, value, icon, color, sub, helpTitle, helpContent }: MetricCardProps) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: `${color}18`, color, display: 'flex', alignItems: 'center' }}>
          {icon}
        </Box>
        <Box flex={1}>
          <Typography variant="h4" fontWeight={700} lineHeight={1.2}>{value}</Typography>
          <Box display="flex" alignItems="center" gap={0.5} mt={0.3}>
            <Typography variant="body2" color="text.secondary">{label}</Typography>
            {helpTitle && helpContent && <HelpButton title={helpTitle}>{helpContent}</HelpButton>}
          </Box>
          {sub && <Typography variant="caption" color="text.disabled">{sub}</Typography>}
        </Box>
      </CardContent>
    </Card>
  )
}

// ─── Bar chart ────────────────────────────────────────────────────────────────

function CallsChart({ data, preset }: { data: DashStats['callsByBucket']; preset: Preset }) {
  if (!data.length) return <Typography color="text.secondary" fontSize="0.85rem">No calls during the period.</Typography>

  const maxCalls = Math.max(...data.map((d) => d.calls), 1)

  // Formata o label do bucket conforme o preset
  const formatLabel = (id: string) => {
    if (preset === '24h') return id.slice(11, 16) // HH:00
    if (id.includes('W')) return id // semana ISO
    return id.slice(5) // MM-DD
  }

  return (
    <Box display="flex" alignItems="flex-end" gap="4px" height={90}>
      {data.map((d) => (
        <Tooltip key={d._id} title={`${d._id}: ${d.calls} calls, ${d.errors} errors`}>
          <Box flex={1} display="flex" flexDirection="column" alignItems="center" gap="3px" minWidth={0}>
            <Box
              sx={{
                width: '100%',
                height: `${Math.round((d.calls / maxCalls) * 75)}px`,
                bgcolor: d.errors > 0 ? (d.errors === d.calls ? '#fa896b' : '#FFAE1F') : '#5D87FF',
                borderRadius: '3px 3px 0 0',
                minHeight: 4,
                transition: 'height 0.3s ease',
              }}
            />
            <Typography
              fontSize="0.58rem"
              color="text.disabled"
              noWrap
              sx={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {formatLabel(d._id)}
            </Typography>
          </Box>
        </Tooltip>
      ))}
    </Box>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [stats, setStats] = useState<DashStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [preset, setPreset] = useState<Preset>('24h')
  const [customFrom, setCustomFrom] = useState(() => toInputDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)))
  const [customTo, setCustomTo] = useState(() => toInputDate(new Date()))
  const navigate = useNavigate()

  const load = useCallback((p: Preset, cf?: string, ct?: string) => {
    const { from, to } = presetToDates(p, cf, ct)
    setLoading(true)
    setError('')
    api.get<DashStats>('/dashboard/stats', { params: { from: from.toISOString(), to: to.toISOString() } })
      .then((r) => setStats(r.data))
      .catch(() => setError('Failed to load statistics.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(preset, customFrom, customTo) }, [])

  const handlePreset = (p: Preset) => {
    setPreset(p)
    if (p !== 'custom') load(p)
  }

  const handleCustomApply = () => load('custom', customFrom, customTo)

  return (
    <Box p={3}>
      {/* Header */}
      <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
            <Typography variant="h5" fontWeight={700}>Dashboard</Typography>
            <HelpButton title="Dashboard">
              <Typography variant="body2" gutterBottom>
                The Dashboard is your operational control center for Arthur MCP Adapter. It shows you, at a glance, how many AI integrations are running on this server, how often they are being used, and whether they are healthy.
              </Typography>
              <Typography variant="body2" gutterBottom>
                Every metric, chart, and ranking on this page is filtered to the <strong>time window</strong> you choose with the period selector in the top-right corner. Change the period and everything refreshes instantly — no page reload needed.
              </Typography>
              <Typography variant="body2" gutterBottom>
                The dashboard aggregates data from <strong>all projects</strong> on this server. If you want to investigate a specific project's usage in detail — individual call records, error messages, response times — open that project and go to its <strong>Execution Logs</strong> tab.
              </Typography>
              <Typography variant="body2">
                Data is stored in memory and retained for 7 days. Restarting the server clears all historical data.
              </Typography>
            </HelpButton>
          </Box>
          {stats && (
            <Typography variant="caption" color="text.secondary">
              {new Date(stats.period.from).toLocaleString('en-US')} → {new Date(stats.period.to).toLocaleString('en-US')}
            </Typography>
          )}
        </Box>

        {/* Period selector */}
        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
          <HelpButton title="Period selector">
            <Typography variant="body2" gutterBottom>
              Filters all metrics, charts, and rankings on this page to calls that happened within the chosen time window.
            </Typography>
            <Box component="ul" sx={{ mt: 0.5, mb: 1, pl: 2.5 }}>
              {([
                ['Last 24h', 'Shows the past 24 hours split into hourly buckets. Best for monitoring real-time activity or debugging a problem that happened today.'],
                ['7 days', 'Shows the past 7 days split into daily buckets. Useful for understanding typical weekly usage patterns.'],
                ['30 days', 'Shows the past 30 days split into weekly ISO buckets. Good for month-over-month trend analysis.'],
                ['Custom', 'Enter exact start and end dates. The chart automatically adjusts bucket size depending on how wide the range is.'],
              ] as [string,string][]).map(([l,d]) => (
                <Box component="li" key={l} sx={{ mb: 0.5 }}>
                  <Typography variant="body2"><strong>{l}</strong> — {d}</Typography>
                </Box>
              ))}
            </Box>
            <Typography variant="body2">
              Changing the period does not delete or filter any stored data — it only affects what is displayed on this page.
            </Typography>
          </HelpButton>
          <ButtonGroup size="small" variant="outlined">
            {PRESETS.map((p) => (
              <Button
                key={p.value}
                onClick={() => handlePreset(p.value)}
                variant={preset === p.value ? 'contained' : 'outlined'}
              >
                {p.label}
              </Button>
            ))}
          </ButtonGroup>

          <Tooltip title="Refresh">
            <span>
              <Button size="small" variant="outlined" onClick={() => load(preset, customFrom, customTo)} disabled={loading}>
                <RefreshIcon fontSize="small" />
              </Button>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* Custom date inputs */}
      {preset === 'custom' && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            size="small" type="date" label="From" InputLabelProps={{ shrink: true }}
            value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
          />
          <TextField
            size="small" type="date" label="To" InputLabelProps={{ shrink: true }}
            value={customTo} onChange={(e) => setCustomTo(e.target.value)}
          />
          <Button variant="contained" size="small" onClick={handleCustomApply}>Apply</Button>
        </Paper>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" height="40vh">
          <CircularProgress />
        </Box>
      ) : !stats ? null : (
        <>
          {/* Metric cards */}
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} sm={6} lg={3}>
              <MetricCard
                label="Projects" value={stats.projects.total} icon={<FolderIcon />} color="#5D87FF"
                sub={`${stats.projects.active} active`}
                helpTitle="Projects"
                helpContent={
                  <Box>
                    <Typography variant="body2" gutterBottom>Total number of MCP projects on this server. Each project represents one external API adapted to the MCP protocol.</Typography>
                    <Typography variant="body2" gutterBottom>When an AI client (Claude Desktop, Cursor, etc.) connects to a project's MCP endpoint, it automatically discovers all of the project's tools and can call them by name. The AI never needs to know the underlying HTTP method, URL, or API credentials — Arthur handles that transparently.</Typography>
                    <Typography variant="body2">The <strong>active</strong> count below shows projects that are healthy and accepting calls. Projects with status "error" need attention — open them to see what is misconfigured.</Typography>
                  </Box>
                }
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <MetricCard
                label="Tools" value={stats.tools.total} icon={<BuildIcon />} color="#13DEB9"
                helpTitle="Tools"
                helpContent={
                  <Box>
                    <Typography variant="body2" gutterBottom>Total number of MCP tools registered across all projects on this server. Each tool maps one API endpoint to a named, callable function.</Typography>
                    <Typography variant="body2" gutterBottom>For example, a <code>GET /users/{'{id}'}</code> endpoint becomes a tool named <code>get_user</code>. The AI client calls it by name and Arthur forwards the request to the real API, returning the result.</Typography>
                    <Typography variant="body2">The AI receives a description of every tool when it connects, and uses those descriptions to decide which tool to call based on what the user asked. Well-written tool descriptions dramatically improve the AI's accuracy.</Typography>
                  </Box>
                }
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <MetricCard
                label="Calls in period"
                value={stats.calls.total}
                icon={<CallMadeIcon />}
                color="#FFAE1F"
                sub={`Success rate: ${stats.calls.successRate}%`}
                helpTitle="Calls in period"
                helpContent={
                  <Box>
                    <Typography variant="body2" gutterBottom>How many times MCP tools were invoked during the selected period. Each tool invocation from an AI client counts as one call.</Typography>
                    <Typography variant="body2" gutterBottom>The lifecycle of a single call: the AI client sends a JSON-RPC request → Arthur validates and authenticates it → Arthur calls the upstream API → the API responds → Arthur returns the result to the AI. The whole flow is logged as one entry.</Typography>
                    <Typography variant="body2">The <strong>Success rate</strong> below tells you what percentage of those calls completed without errors. A rate below 95% is worth investigating — open a project's Execution Logs to see which calls failed and why.</Typography>
                  </Box>
                }
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <MetricCard
                label="Protected projects" value={stats.projects.withApiKey} icon={<LockIcon />} color="#FA896B"
                sub="with active API key"
                helpTitle="Protected projects"
                helpContent={
                  <Box>
                    <Typography variant="body2" gutterBottom>Projects that have an <strong>MCP API key</strong> enabled. Clients must include the header <code>auth: &lt;key&gt;</code> in every request — clients without the key receive HTTP 401 and cannot use the tools.</Typography>
                    <Typography variant="body2" gutterBottom>Without an API key, a project's MCP endpoint is <strong>completely open</strong>: anyone who knows the URL can connect an AI client, discover all tools, and trigger calls to your upstream API. This is fine for testing on a private network, but risky on a publicly accessible server.</Typography>
                    <Typography variant="body2">Keys are generated, viewed, and revoked from each project's <strong>Configuration</strong> tab. If a key is compromised, you can regenerate it — the old key is immediately invalidated. The remaining (Total - Protected) projects have no authentication and should be reviewed.</Typography>
                  </Box>
                }
              />
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            {/* Chart */}
            <Grid item xs={12} md={7}>
              <Paper variant="outlined" sx={{ p: 2.5, height: '100%' }}>
                <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
                  <Typography variant="subtitle1" fontWeight={700}>Calls over time</Typography>
                  <HelpButton title="Calls over time">
                    <Typography variant="body2" gutterBottom>
                      A bar chart showing tool call volume over the selected period. Each bar represents one time bucket — hourly for Last 24h, daily for 7 days, weekly for 30 days, and adaptive for Custom.
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      Bar height represents call volume relative to the busiest bucket (tallest bar = period maximum). Hover over any bar to see the exact call count and error count for that time slot.
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Color coding:</strong>
                    </Typography>
                    <Box component="ul" sx={{ mt: 0, mb: 1, pl: 2.5 }}>
                      <Box component="li"><Typography variant="body2"><strong style={{color:'#5D87FF'}}>Blue</strong> — all calls in that bucket succeeded.</Typography></Box>
                      <Box component="li"><Typography variant="body2"><strong style={{color:'#FFAE1F'}}>Yellow</strong> — mixed: some calls succeeded and some failed.</Typography></Box>
                      <Box component="li"><Typography variant="body2"><strong style={{color:'#fa896b'}}>Red</strong> — every call in that bucket failed. Investigate immediately.</Typography></Box>
                    </Box>
                    <Typography variant="body2">
                      Common patterns: a sudden drop in height means the AI client disconnected or stopped using tools; a bar turning red usually means a configuration change broke authentication or the upstream API went down.
                    </Typography>
                  </HelpButton>
                </Box>
                <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                  Blue = OK · Yellow = partial · Red = all errors
                </Typography>
                <CallsChart data={stats.callsByBucket} preset={preset} />
              </Paper>
            </Grid>

            {/* Status */}
            <Grid item xs={12} md={5}>
              <Paper variant="outlined" sx={{ p: 2.5, height: '100%' }}>
                <Box display="flex" alignItems="center" gap={0.5} mb={2}>
                  <Typography variant="subtitle1" fontWeight={700}>Status during period</Typography>
                  <HelpButton title="Status during period">
                    <Typography variant="body2" gutterBottom>
                      A breakdown of every tool call in the selected period into <strong>successes</strong> and <strong>errors</strong>. The progress bars show the proportion of each.
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      A call is classified as an <strong>error</strong> when:
                    </Typography>
                    <Box component="ul" sx={{ mt: 0, mb: 1, pl: 2.5 }}>
                      <Box component="li"><Typography variant="body2">The upstream API responded with HTTP 4xx or 5xx.</Typography></Box>
                      <Box component="li"><Typography variant="body2">The request timed out (exceeded the configured default timeout).</Typography></Box>
                      <Box component="li"><Typography variant="body2">The network was unreachable or the upstream API refused the connection.</Typography></Box>
                      <Box component="li"><Typography variant="body2">Arthur encountered an internal error building or parsing the request.</Typography></Box>
                    </Box>
                    <Typography variant="body2">
                      A success rate below ~95% is worth investigating. Open the specific project and check its <strong>Execution Logs</strong> tab to see which tool calls failed and what error was returned.
                    </Typography>
                  </HelpButton>
                </Box>
                {stats.calls.total === 0 ? (
                  <Typography color="text.secondary" fontSize="0.85rem">No calls recorded.</Typography>
                ) : (
                  <Box>
                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                      <Typography fontSize="0.82rem">Success</Typography>
                      <Typography fontSize="0.82rem" fontWeight={600} color="success.main">
                        {stats.calls.total - stats.calls.errors}
                      </Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={stats.calls.successRate} color="success" sx={{ mb: 1.5, height: 6, borderRadius: 3 }} />
                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                      <Typography fontSize="0.82rem">Errors</Typography>
                      <Typography fontSize="0.82rem" fontWeight={600} color="error.main">{stats.calls.errors}</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={100 - stats.calls.successRate} color="error" sx={{ height: 6, borderRadius: 3 }} />
                  </Box>
                )}

                <Divider sx={{ my: 2 }} />

                <Box display="flex" alignItems="center" gap={1}>
                  <ErrorOutlineIcon fontSize="small" color={stats.calls.errors > 0 ? 'error' : 'disabled'} />
                  <Typography fontSize="0.82rem" color={stats.calls.errors > 0 ? 'error.main' : 'text.secondary'}>
                    {stats.calls.errors > 0
                      ? `${stats.calls.errors} errors during period`
                      : 'No errors during period'}
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            {/* Top tools */}
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2.5 }}>
                <Box display="flex" alignItems="center" gap={0.5} mb={2}>
                  <Typography variant="subtitle1" fontWeight={700}>Top tools in period</Typography>
                  <HelpButton title="Top tools in period">
                    <Typography variant="body2" gutterBottom>
                      The 10 most-called MCP tools across all projects during the selected period, ranked from most to least used. The blue chip shows the total call count (successes + errors combined).
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      Use this panel to answer questions like:
                    </Typography>
                    <Box component="ul" sx={{ mt: 0, mb: 1, pl: 2.5 }}>
                      <Box component="li"><Typography variant="body2">Which tools are your AI clients actually relying on? High-count tools deserve better descriptions and robust error handling.</Typography></Box>
                      <Box component="li"><Typography variant="body2">Are there tools that are never called? They may have unclear descriptions, or the AI simply hasn't needed them yet.</Typography></Box>
                      <Box component="li"><Typography variant="body2">Did a recent change cause usage to shift from one tool to another? Compare periods to spot the difference.</Typography></Box>
                    </Box>
                    <Typography variant="body2">
                      The sub-label under each tool name shows which project it belongs to. Navigate to that project's <strong>Execution Logs</strong> tab to see the individual call history.
                    </Typography>
                  </HelpButton>
                </Box>
                {stats.topTools.length === 0 ? (
                  <Typography color="text.secondary" fontSize="0.85rem">No calls recorded.</Typography>
                ) : (
                  <Box display="flex" flexDirection="column" gap={1}>
                    {stats.topTools.map((t, i) => (
                      <Box key={t.toolName} display="flex" alignItems="center" justifyContent="space-between">
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography fontSize="0.72rem" color="text.disabled" width={18} textAlign="right">{i + 1}</Typography>
                          <Box>
                            <Typography fontSize="0.875rem" fontWeight={500}>{t.toolName}</Typography>
                            <Typography fontSize="0.72rem" color="text.secondary">{t.projectName}</Typography>
                          </Box>
                        </Box>
                        <Chip label={t.count} size="small" sx={{ fontWeight: 700, bgcolor: '#5D87FF18', color: '#5D87FF', height: 22, fontSize: '0.75rem' }} />
                      </Box>
                    ))}
                  </Box>
                )}
              </Paper>
            </Grid>

            {/* Recent projects */}
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2.5 }}>
                <Box display="flex" alignItems="center" gap={0.5} mb={2}>
                  <Typography variant="subtitle1" fontWeight={700}>Recent projects</Typography>
                  <HelpButton title="Recent projects">
                    <Typography variant="body2" gutterBottom>
                      The 5 most recently created or updated projects. Click any row to open that project's detail page.
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Status dot:</strong>
                    </Typography>
                    <Box component="ul" sx={{ mt: 0, mb: 1, pl: 2.5 }}>
                      <Box component="li"><Typography variant="body2"><strong style={{color:'#13DEB9'}}>Green</strong> — the project is configured and healthy.</Typography></Box>
                      <Box component="li"><Typography variant="body2"><strong style={{color:'#FA896B'}}>Red</strong> — something is wrong (missing base URL, expired token, invalid tool endpoint). Open the project for details.</Typography></Box>
                    </Box>
                    <Typography variant="body2" gutterBottom>
                      The number on the right shows how many tools are registered in that project. A project with 0 tools will not expose anything useful to an AI client — add tools from the project's Tools tab.
                    </Typography>
                    <Typography variant="body2">
                      Tags (small chips) are custom labels you can assign to organise projects. Use them to filter the Projects list page.
                    </Typography>
                  </HelpButton>
                </Box>
                <Box display="flex" flexDirection="column" gap={1.5}>
                  {stats.recentProjects.map((p) => (
                    <Box
                      key={p._id}
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{ cursor: 'pointer', '&:hover': { opacity: 0.75 } }}
                      onClick={() => navigate(`/projects/${p._id}`)}
                    >
                      <Box display="flex" alignItems="center" gap={1.5}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: p.status === 'active' ? '#13DEB9' : '#FA896B', flexShrink: 0 }} />
                        <Box>
                          <Typography fontSize="0.875rem" fontWeight={500}>{p.name}</Typography>
                          {p.tags.length > 0 && (
                            <Box display="flex" gap={0.5} mt={0.3} flexWrap="wrap">
                              {p.tags.map((tag) => <Chip key={tag} label={tag} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />)}
                            </Box>
                          )}
                        </Box>
                      </Box>
                      <Typography fontSize="0.78rem" color="text.secondary">{p.toolCount} tool{p.toolCount !== 1 ? 's' : ''}</Typography>
                    </Box>
                  ))}
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  )
}
