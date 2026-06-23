interface ToastMessageProps {
  toast: {
    message: string;
    type: 'success' | 'error' | 'info';
  } | null;
}

function ToastMessage({ toast }: ToastMessageProps) {
  if (!toast) return null;

  return (
    <div className="toast-notification">
      {toast.type === 'success' && <span className="toast-success-icon">✓</span>}
      <span>{toast.message}</span>
    </div>
  );
}

export default ToastMessage;
