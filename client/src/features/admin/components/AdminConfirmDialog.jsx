import React from 'react';

const AdminConfirmDialog = ({
    open,
    title,
    message,
    confirmText,
    cancelText,
    onConfirm,
    onCancel,
    confirmButtonClassName = 'btn btn-danger'
}) => {
    if (!open) return null;

    return (
        <div className="admin-confirm-backdrop" role="dialog" aria-modal="true">
            <div className="admin-confirm-dialog card border-0 shadow-sm">
                <div className="card-body">
                    <h5 className="mb-3">{title}</h5>
                    <div className="mb-4">{message}</div>
                    <div className="d-flex justify-content-end gap-2">
                        <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>
                            {cancelText}
                        </button>
                        <button type="button" className={confirmButtonClassName} onClick={onConfirm}>
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminConfirmDialog;
