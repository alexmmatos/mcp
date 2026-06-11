import { useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Card,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  FormGroup,
  Grid,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import api from '../api'

export default function Login() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await api.post<{ access_token: string }>('/auth/login', {
        username,
        password,
      })
      localStorage.setItem('token', res.data.access_token)
      navigate('/')
    } catch {
      setError('Invalid username or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        '&:before': {
          content: '""',
          background: 'radial-gradient(#d2f1df, #d3d7fa, #bad8f4)',
          backgroundSize: '400% 400%',
          animation: 'gradient 15s ease infinite',
          position: 'absolute',
          inset: 0,
          opacity: 0.3,
        },
      }}
    >
      <Grid
        container
        spacing={0}
        justifyContent="center"
        sx={{ height: '100vh', position: 'relative', zIndex: 1 }}
      >
        <Grid
          item
          xs={12}
          sm={8}
          lg={4}
          xl={3}
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            px: 2,
          }}
        >
          <Card
            elevation={9}
            sx={{ p: 4, width: '100%', maxWidth: '500px', borderRadius: '12px' }}
          >
            {/* Logo */}
            <Box display="flex" alignItems="center" justifyContent="center" mb={2}>
              <Box
                component="img"
                src="/images/logos/arthur-mcp-adapter-logo.svg"
                alt="Arthur MCP Adapter"
                sx={{ height: 36, maxWidth: '100%' }}
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement
                  img.style.display = 'none'
                  img.nextElementSibling?.removeAttribute('style')
                }}
              />
              <Typography
                variant="h4"
                fontWeight={700}
                color="primary.main"
                sx={{ display: 'none', letterSpacing: '-0.3px' }}
              >
                Arthur MCP Adapter
              </Typography>
            </Box>

            <Typography
              variant="subtitle1"
              textAlign="center"
              color="text.secondary"
              mb={3}
            >
              Sign in to your account
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={3}>
                <Box>
                  <Typography
                    variant="subtitle1"
                    fontWeight={600}
                    component="label"
                    htmlFor="username"
                    display="block"
                    mb="5px"
                  >
                    Username
                  </Typography>
                  <TextField
                    id="username"
                    variant="outlined"
                    fullWidth
                    required
                    autoFocus
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </Box>

                <Box>
                  <Typography
                    variant="subtitle1"
                    fontWeight={600}
                    component="label"
                    htmlFor="password"
                    display="block"
                    mb="5px"
                  >
                    Password
                  </Typography>
                  <TextField
                    id="password"
                    type="password"
                    variant="outlined"
                    fullWidth
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </Box>

                <Stack justifyContent="space-between" direction="row" alignItems="center">
                  <FormGroup>
                    <FormControlLabel
                      control={<Checkbox size="small" />}
                      label={<Typography variant="body2">Remember me</Typography>}
                    />
                  </FormGroup>
                  <Link component={RouterLink} to="/forgot-password" variant="body2">
                    Forgot password
                  </Link>
                </Stack>

                <Button
                  type="submit"
                  color="primary"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={loading}
                  disableElevation
                  sx={{ py: 1.2 }}
                >
                  {loading ? (
                    <CircularProgress size={22} color="inherit" />
                  ) : (
                    'Sign in'
                  )}
                </Button>
              </Stack>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
