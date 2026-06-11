import { useEffect, useState } from 'react'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
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
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import PersonIcon from '@mui/icons-material/Person'
import GroupIcon from '@mui/icons-material/Group'
import Swal from 'sweetalert2'
import api from '../api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserProfile {
  _id: string
  username: string
  email: string
  role: string
  createdAt: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function avatarLetter(username: string) {
  return username.charAt(0).toUpperCase()
}

function avatarColor(username: string) {
  const colors = ['#5D87FF', '#49BEFF', '#13DEB9', '#FFAE1F', '#FA896B']
  return colors[username.charCodeAt(0) % colors.length]
}

// ─── User form dialog (create / edit — admin) ─────────────────────────────────

interface UserDialogProps {
  open: boolean
  onClose: () => void
  onSaved: (user: UserProfile) => void
  editUser?: UserProfile
}

function UserDialog({ open, onClose, onSaved, editUser }: UserDialogProps) {
  const isEdit = !!editUser
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('user')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setUsername(editUser?.username ?? '')
      setEmail(editUser?.email ?? '')
      setPassword('')
      setRole(editUser?.role ?? 'user')
      setError('')
    }
  }, [open, editUser])

  const handleSave = async () => {
    if (!username.trim()) { setError('Username is required.'); return }
    if (!email.trim()) { setError('Email is required.'); return }
    if (!isEdit && !password.trim()) { setError('Password is required for new users.'); return }

    setSaving(true); setError('')
    try {
      let res: any
      if (isEdit) {
        const dto: any = { username, email, role }
        if (password.trim()) dto.password = password
        res = await api.patch(`/users/${editUser!._id}`, dto)
      } else {
        res = await api.post('/users', { username, email, password, role })
      }
      onSaved(res.data)
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Error saving.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6" fontWeight={700}>
          {isEdit ? 'Edit user' : 'New user'}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box display="flex" flexDirection="column" gap={2} pt={0.5}>
          <TextField size="small" fullWidth required autoFocus label="Username"
            value={username} onChange={(e) => { setUsername(e.target.value); setError('') }} />
          <TextField size="small" fullWidth required label="Email" type="email"
            value={email} onChange={(e) => { setEmail(e.target.value); setError('') }} />
          <TextField size="small" fullWidth label={isEdit ? 'New password (leave blank to keep)' : 'Password *'}
            type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError('') }} />
          <FormControl size="small" fullWidth>
            <InputLabel>Role</InputLabel>
            <Select value={role} label="Role" onChange={(e) => setRole(e.target.value)}>
              <MenuItem value="user">User</MenuItem>
              <MenuItem value="admin">Administrator</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}>
          {saving ? 'Saving…' : isEdit ? 'Save' : 'Create user'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── My profile tab ───────────────────────────────────────────────────────────

function MyProfileTab({ me, onUpdated }: { me: UserProfile; onUpdated: (u: UserProfile) => void }) {
  const [username, setUsername] = useState(me.username)
  const [email, setEmail] = useState(me.email)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const handleSave = async () => {
    setError(''); setSuccess('')
    if (newPassword && newPassword !== confirmPassword) { setError('Passwords do not match.'); return }
    if (newPassword && !currentPassword) { setError('Enter your current password to set a new one.'); return }

    setSaving(true)
    try {
      const dto: any = {}
      if (username !== me.username) dto.username = username
      if (email !== me.email) dto.email = email
      if (newPassword) { dto.currentPassword = currentPassword; dto.newPassword = newPassword }

      if (Object.keys(dto).length === 0) { setError('No changes detected.'); return }

      const res = await api.patch('/users/me', dto)
      onUpdated(res.data)
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
      setSuccess('Profile updated successfully.')
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Error updating.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box>
      {/* Avatar / header */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3, display: 'flex', alignItems: 'center', gap: 2.5 }}>
        <Avatar sx={{ width: 64, height: 64, fontSize: '1.5rem', bgcolor: avatarColor(me.username), fontWeight: 700 }}>
          {avatarLetter(me.username)}
        </Avatar>
        <Box>
          <Typography variant="h6" fontWeight={700}>{me.username}</Typography>
          <Typography variant="body2" color="text.secondary">{me.email}</Typography>
          <Chip label={me.role === 'admin' ? 'Administrator' : 'User'} size="small" color={me.role === 'admin' ? 'primary' : 'default'} sx={{ mt: 0.5 }} />
        </Box>
      </Paper>

      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Grid container spacing={3}>
        {/* Dados básicos */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" fontWeight={700} mb={2}>Dados da conta</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField size="small" fullWidth label="Username" value={username}
                onChange={(e) => setUsername(e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField size="small" fullWidth label="Email" type="email" value={email}
                onChange={(e) => setEmail(e.target.value)} />
            </Grid>
          </Grid>
        </Grid>

        {/* Change password */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" fontWeight={700} mb={2}>Change password</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField size="small" fullWidth label="Current password" type="password"
                value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField size="small" fullWidth label="New password" type="password"
                value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField size="small" fullWidth label="Confirm new password" type="password"
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                error={!!newPassword && !!confirmPassword && newPassword !== confirmPassword}
                helperText={newPassword && confirmPassword && newPassword !== confirmPassword ? 'Passwords do not match' : ''} />
            </Grid>
          </Grid>
        </Grid>

        <Grid item xs={12}>
          <Button variant="contained" onClick={handleSave} disabled={saving}
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </Grid>
      </Grid>
    </Box>
  )
}

// ─── Users management tab (admin) ─────────────────────────────────────────────

function UsersTab({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserProfile | undefined>()

  const load = () => {
    setLoading(true)
    api.get<UserProfile[]>('/users')
      .then((r) => setUsers(r.data))
      .catch(() => setError('Failed to load users.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSaved = (user: UserProfile) => {
    setUsers((prev) => {
      const idx = prev.findIndex((u) => u._id === user._id)
      if (idx >= 0) { const next = [...prev]; next[idx] = user; return next }
      return [...prev, user]
    })
  }

  const handleDelete = async (user: UserProfile) => {
    const result = await Swal.fire({
      title: `Remover "${user.username}"?`,
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Remove',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#d33',
    })
    if (!result.isConfirmed) return
    try {
      await api.delete(`/users/${user._id}`)
      setUsers((prev) => prev.filter((u) => u._id !== user._id))
    } catch (err: any) {
      Swal.fire('Error', err?.response?.data?.message ?? 'Could not remove user.', 'error')
    }
  }

  const handleOpenCreate = () => { setEditingUser(undefined); setDialogOpen(true) }
  const handleOpenEdit = (user: UserProfile) => { setEditingUser(user); setDialogOpen(true) }

  if (loading) return <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
  if (error) return <Alert severity="error">{error}</Alert>

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="subtitle1" fontWeight={700}>{users.length} user{users.length !== 1 ? 's' : ''}</Typography>
        <Button variant="contained" startIcon={<AddIcon />} size="small" onClick={handleOpenCreate}>
          New user
        </Button>
      </Box>

      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#f8f9fa' }}>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' }}>User</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Role</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Created</TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u._id} hover sx={{ '&:last-child td': { border: 0 } }}>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <Avatar sx={{ width: 32, height: 32, fontSize: '0.85rem', bgcolor: avatarColor(u.username), fontWeight: 700 }}>
                      {avatarLetter(u.username)}
                    </Avatar>
                    <Typography fontSize="0.875rem" fontWeight={500}>{u.username}</Typography>
                    {u._id === currentUserId && <Chip label="you" size="small" sx={{ height: 18, fontSize: '0.65rem' }} />}
                  </Box>
                </TableCell>
                <TableCell><Typography fontSize="0.82rem" color="text.secondary">{u.email}</Typography></TableCell>
                <TableCell>
                  <Chip label={u.role === 'admin' ? 'Admin' : 'User'} size="small"
                    color={u.role === 'admin' ? 'primary' : 'default'} sx={{ fontSize: '0.72rem', height: 22 }} />
                </TableCell>
                <TableCell>
                  <Typography fontSize="0.78rem" color="text.secondary">
                    {new Date(u.createdAt).toLocaleDateString('en-US')}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => handleOpenEdit(u)}><EditIcon fontSize="small" /></IconButton>
                  </Tooltip>
                  <Tooltip title={u._id === currentUserId ? 'Cannot remove your own account' : 'Remove'}>
                    <span>
                      <IconButton size="small" color="error" onClick={() => handleDelete(u)} disabled={u._id === currentUserId}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <UserDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onSaved={handleSaved} editUser={editingUser} />
    </Box>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Profile() {
  const [me, setMe] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState(0)

  useEffect(() => {
    api.get<UserProfile>('/users/me')
      .then((r) => setMe(r.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" height="50vh"><CircularProgress /></Box>
  if (!me) return <Alert severity="error">Unable to load profile.</Alert>

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight={700} mb={3}>Profile</Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tab icon={<PersonIcon fontSize="small" />} iconPosition="start" label="My Profile" />
        {me.role === 'admin' && (
          <Tab icon={<GroupIcon fontSize="small" />} iconPosition="start" label="Users" />
        )}
      </Tabs>

      {tab === 0 && <MyProfileTab me={me} onUpdated={setMe} />}
      {tab === 1 && me.role === 'admin' && <UsersTab currentUserId={me._id} />}
    </Box>
  )
}
