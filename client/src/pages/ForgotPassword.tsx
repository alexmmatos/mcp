import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
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

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Error sending email.')
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
              Recover password
            </Typography>

            {sent ? (
              <Alert severity="success">
                Instructions sent! Check your email and follow the link to reset your password.
              </Alert>
            ) : (
              <>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                <Box component="form" onSubmit={handleSubmit}>
                  <Stack spacing={3}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600} component="label" htmlFor="email" display="block" mb="5px">
                        Email
                      </Typography>
                      <TextField id="email" type="email" variant="outlined" fullWidth required autoFocus
                        value={email} onChange={(e) => setEmail(e.target.value)} />
                    </Box>
                    <Button type="submit" color="primary" variant="contained" size="large" fullWidth disabled={loading} disableElevation sx={{ py: 1.2 }}>
                      {loading ? <CircularProgress size={22} color="inherit" /> : 'Send instructions'}
                    </Button>
                  </Stack>
                </Box>
              </>
            )}

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
