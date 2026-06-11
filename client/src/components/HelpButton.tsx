import { useState } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material'
import HelpIcon from '@mui/icons-material/Help'

interface HelpButtonProps {
  title: string
  children: React.ReactNode
}

export default function HelpButton({ title, children }: HelpButtonProps) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Tooltip title="Learn more">
        <IconButton size="small" onClick={() => setOpen(true)}
          sx={{
            p: 0.4,
            '&:hover': { bgcolor: 'primary' },
          }}>
          <HelpIcon color="primary" fontSize="small" />
        </IconButton>
      </Tooltip>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
          <HelpIcon color="primary" fontSize="small" />
          <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
        </DialogTitle>
        <DialogContent dividers>{children}</DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
