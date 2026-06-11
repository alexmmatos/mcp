import { useState } from 'react'
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  Grid,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import api from '../api'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') ?? ''

  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (newPassword !== confirm) { setError('Passwords do not match.'); return }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return }

    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, newPassword })
      setSuccess(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Invalid or expired token.')
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
      <Grid container justifyContent="center" sx={{ position: 'relative', zIndex: 1, px: 2 }}>
        <Grid item xs={12} sm={8} lg={4} xl={3}>
          <Card elevation={9} sx={{ p: 4, borderRadius: '12px' }}>
            <Box display="flex" alignItems="center" justifyContent="center" mb={2}>
              <Box
                component="img"
                src="/images/logos/dark-logo.svg"
                alt="Arthur MCP Adapter"
                sx={{ height: 36, maxWidth: '100%' }}
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement
                  img.style.display = 'none'
                  img.nextElementSibling?.removeAttribute('style')
                }}
              />
              <Typography variant="h4" fontWeight={700} color="primary.main" sx={{ display: 'none' }}>
                Arthur MCP Adapter
              </Typography>
            </Box>

            <Typography variant="subtitle1" textAlign="center" color="text.secondary" mb={3}>
              Reset password
            </Typography>

            {!token && (
              <Alert severity="error">Token not found in URL. Request a new recovery link.</Alert>
            )}

            {success ? (
              <Alert severity="success">
                Password reset successfully! Redirecting to login…
              </Alert>
            ) : token ? (
              <>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                <Box component="form" onSubmit={handleSubmit}>
                  <Stack spacing={3}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600} component="label" display="block" mb="5px">
                        New password
                      </Typography>
                      <TextField type="password" variant="outlined" fullWidth required autoFocus
                        value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600} component="label" display="block" mb="5px">
                        Confirm new password
                      </Typography>
                      <TextField type="password" variant="outlined" fullWidth required
                        value={confirm} onChange={(e) => setConfirm(e.target.value)}
                        error={!!confirm && newPassword !== confirm}
                        helperText={confirm && newPassword !== confirm ? 'Passwords do not match' : ''} />
                    </Box>
                    <Button type="submit" color="primary" variant="contained" size="large" fullWidth disabled={loading} disableElevation sx={{ py: 1.2 }}>
                      {loading ? <CircularProgress size={22} color="inherit" /> : 'Reset password'}
                    </Button>
                  </Stack>
                </Box>
              </>
            ) : null}

            <Box textAlign="center" mt={2}>
              <Link component={RouterLink} to="/login" variant="body2">
                Back to login
              </Link>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
