export interface ToastData {
  msg: string
  actLabel?: string
  act?: () => void
}

export function Toast({ toast, onClose }: { toast: ToastData; onClose: () => void }) {
  return (
    <div className="toast" role="status">
      <span>{toast.msg}</span>
      {toast.actLabel && (
        <button onClick={() => { onClose(); toast.act?.() }}>{toast.actLabel}</button>
      )}
    </div>
  )
}
