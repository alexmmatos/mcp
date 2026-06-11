import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import api from '../api'
import HelpButton from '../components/HelpButton'

type Phase = 'idle' | 'uploading' | 'success' | 'error'

interface UploadResult {
  _id: string
  name: string
  tools: { name: string }[]
}

export default function Upload() {
  const [file, setFile] = useState<File | null>(null)
  const [baseUrl, setBaseUrl] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<UploadResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const accept = (f: File) => {
    const name = f.name.toLowerCase()
    if (!name.endsWith('.yaml') && !name.endsWith('.yml') && !name.endsWith('.json')) {
      setErrorMsg('Formato inválido. Use .yaml, .yml ou .json')
      setPhase('error')
      return
    }
    setFile(f)
    setPhase('idle')
    setErrorMsg('')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) accept(f)
  }

  const handleSubmit = async () => {
    if (!file) return
    setPhase('uploading')
    setErrorMsg('')
    setResult(null)

    const form = new FormData()
    form.append('file', file)

    try {
      const params = baseUrl ? { baseUrl } : {}
      const { data } = await api.post<UploadResult>('/swagger/upload', form, {
        params,
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult(data)
      setPhase('success')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Erro ao processar o arquivo.'
      setErrorMsg(Array.isArray(msg) ? msg.join(', ') : msg)
      setPhase('error')
    }
  }

  return (
    <Box p={3} maxWidth={640} mx="auto">
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <Typography variant="h5" fontWeight="bold">API Upload</Typography>
        <HelpButton title="API Upload">
          <Typography variant="body2" gutterBottom>
            The API Upload page lets you create a fully configured MCP project by importing an existing API definition file, instead of creating tools one by one by hand.
          </Typography>
          <Typography variant="body2" gutterBottom>
            <strong>How to use it:</strong>
          </Typography>
          <Box component="ol" sx={{ mt: 0, mb: 1, pl: 2.5 }}>
            <Box component="li"><Typography variant="body2">Drop your file (or click to browse). Supported: <strong>OpenAPI 3.x</strong> and <strong>Swagger 2.0</strong> in .yaml, .yml, or .json format.</Typography></Box>
            <Box component="li"><Typography variant="body2">Optionally enter a <strong>Base URL override</strong>. Use this when the spec declares a staging URL but you want to point Arthur at production.</Typography></Box>
            <Box component="li"><Typography variant="body2">Click <strong>Upload</strong>. Arthur reads every path and operation in the spec, creates a project, and generates one tool per endpoint.</Typography></Box>
            <Box component="li"><Typography variant="body2">When the import succeeds, click <strong>View project</strong> to review the generated tools.</Typography></Box>
          </Box>
          <Typography variant="body2" gutterBottom>
            <strong>What Arthur generates from the spec:</strong>
          </Typography>
          <Box component="ul" sx={{ mt: 0, mb: 1, pl: 2.5 }}>
            <Box component="li"><Typography variant="body2">A project named after the spec's <code>info.title</code>.</Typography></Box>
            <Box component="li"><Typography variant="body2">One tool per operation, named from the <code>operationId</code> (or derived from method + path).</Typography></Box>
            <Box component="li"><Typography variant="body2">Tool descriptions from the operation's <code>summary</code> and <code>description</code> fields.</Typography></Box>
            <Box component="li"><Typography variant="body2">Input parameters (path, query, body) mapped to the MCP tool's parameter schema.</Typography></Box>
          </Box>
          <Typography variant="body2">
            <strong>Tip:</strong> The richer your spec's descriptions, the better the AI will understand when and how to use each tool. After import you can edit any tool individually from the project's Tools tab.
          </Typography>
        </HelpButton>
      </Box>

      {/* Drop zone */}
      <Paper
        variant="outlined"
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        sx={{
          p: 6,
          textAlign: 'center',
          cursor: 'pointer',
          border: '2px dashed',
          borderColor: dragging ? 'primary.main' : 'divider',
          bgcolor: dragging ? 'action.hover' : 'background.paper',
          transition: 'all 0.2s',
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".yaml,.yml,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) accept(f)
            e.target.value = ''
          }}
        />
        <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
        {file ? (
          <Typography fontWeight="bold">{file.name}</Typography>
        ) : (
          <>
            <Typography>Drag your Swagger / OpenAPI file here</Typography>
            <Typography variant="body2" color="text.secondary">
              or click to select (.yaml, .yml, .json)
            </Typography>
          </>
        )}
      </Paper>

      {/* Optional base URL */}
      <TextField
        label="Base URL (optional)"
        placeholder="https://api.example.com"
        fullWidth
        value={baseUrl}
        onChange={(e) => setBaseUrl(e.target.value)}
        sx={{ mt: 2 }}
        helperText="Overrides the spec base URL"
      />

      <Button
        variant="contained"
        size="large"
        fullWidth
        sx={{ mt: 2 }}
        disabled={!file || phase === 'uploading'}
        onClick={handleSubmit}
        startIcon={phase === 'uploading' ? <CircularProgress size={18} color="inherit" /> : undefined}
      >
        {phase === 'uploading' ? 'Processing…' : 'Upload'}
      </Button>

      {phase === 'error' && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {errorMsg}
        </Alert>
      )}

      {phase === 'success' && result && (
        <Alert
          severity="success"
          sx={{ mt: 2 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => navigate(`/projects/${result._id}`)}
            >
              View project
            </Button>
          }
        >
          <strong>{result.name}</strong> imported successfully —{' '}
          {result.tools.length} tool{result.tools.length !== 1 ? 's' : ''} generated.
        </Alert>
      )}
    </Box>
  )
}
