import { useState, useEffect, useCallback, useRef } from 'react';
import { taskAPI } from '../../../services/api';
import { socketService } from '../../../services/socket';
import { useAuth } from '../../../contexts/AuthContext';
import { roomAPI } from '../../../services/api';
import toast from 'react-hot-toast';
import {
  Plus, X, Calendar, Flag, Users, Trash2,
  GripVertical, CheckCircle2, Clock, Eye,
  AlertTriangle, ChevronDown, UserPlus, Tag,
  ClipboardList, ArrowRight
} from 'lucide-react';

// ─── Cấu hình các cột Kanban ───────────────────────────────
const COLUMNS = [
  { id: 'todo', label: 'Cần làm', icon: ClipboardList, color: '#6366f1' },
  { id: 'in_progress', label: 'Đang làm', icon: Clock, color: '#f59e0b' },
  { id: 'review', label: 'Đang review', icon: Eye, color: '#8b5cf6' },
  { id: 'done', label: 'Hoàn thành', icon: CheckCircle2, color: '#10b981' },
];

const PRIORITY_CONFIG = {
  low: { label: 'Thấp', color: '#64748b', icon: '○' },
  medium: { label: 'Trung bình', color: '#f59e0b', icon: '◐' },
  high: { label: 'Cao', color: '#f97316', icon: '●' },
  urgent: { label: 'Khẩn cấp', color: '#ef4444', icon: '⚠' },
};

export default function TaskBoardTab({ roomId }) {
  const { user } = useAuth();

  // ─── State ─────────────────────────────────────────────
  const [columns, setColumns] = useState({
    todo: [], in_progress: [], review: [], done: [],
  });
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(null);
  const [createStatus, setCreateStatus] = useState('todo');
  const [creating, setCreating] = useState(false);

  // Drag state
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  // Form state
  const [form, setForm] = useState({
    title: '', description: '', assignees: [],
    priority: 'medium', deadline: '', labels: [],
  });
  const [labelInput, setLabelInput] = useState('');

  // ─── Fetch dữ liệu ───────────────────────────────────
  const fetchTasks = useCallback(async () => {
    try {
      const { data: res } = await taskAPI.getByRoom(roomId);
      setColumns(res.data.columns);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi tải công việc');
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  const fetchMembers = useCallback(async () => {
    try {
      const { data: res } = await roomAPI.getById(roomId);
      setMembers(res.data.room.members || []);
    } catch {
      // Ignore
    }
  }, [roomId]);

  useEffect(() => {
    fetchTasks();
    fetchMembers();

    // Lắng nghe cập nhật real-time từ socket
    const handleTaskBoardUpdated = ({ action, task, taskId }) => {
      if (action === 'created' || action === 'updated') {
        fetchTasks(); // Tải lại toàn bộ board
      } else if (action === 'deleted') {
        setColumns((prev) => {
          const updated = { ...prev };
          for (const col of Object.keys(updated)) {
            updated[col] = updated[col].filter((t) => t._id !== taskId);
          }
          return updated;
        });
      }
    };

    socketService.on('task_board_updated', handleTaskBoardUpdated);

    return () => {
      socketService.off('task_board_updated', handleTaskBoardUpdated);
    };
  }, [fetchTasks, fetchMembers]);

  // ─── Tạo task mới ────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Vui lòng nhập tiêu đề');
      return;
    }

    setCreating(true);
    try {
      const { data: res } = await taskAPI.create({
        roomId,
        title: form.title,
        description: form.description,
        assignees: form.assignees,
        priority: form.priority,
        deadline: form.deadline || null,
        labels: form.labels,
      });

      toast.success(res.message);

      // Emit socket event
      socketService.emit('task_created', { roomId, task: res.data.task });

      // Cập nhật UI
      setColumns((prev) => ({
        ...prev,
        todo: [...prev.todo, res.data.task],
      }));

      // Reset form
      setForm({
        title: '', description: '', assignees: [],
        priority: 'medium', deadline: '', labels: [],
      });
      setLabelInput('');
      setShowCreateModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi tạo công việc');
    } finally {
      setCreating(false);
    }
  };

  // ─── Cập nhật trạng thái (kéo thả) ───────────────────
  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    // Thêm class cho visual feedback
    e.target.classList.add('dragging');
  };

  const handleDragEnd = (e) => {
    e.target.classList.remove('dragging');
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e, columnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e, targetColumnId) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggedTask || draggedTask.status === targetColumnId) return;

    const taskId = draggedTask._id;
    const sourceColumnId = draggedTask.status;

    // Optimistic update
    setColumns((prev) => {
      const updated = { ...prev };
      updated[sourceColumnId] = updated[sourceColumnId].filter(
        (t) => t._id !== taskId
      );
      const movedTask = { ...draggedTask, status: targetColumnId };
      updated[targetColumnId] = [...updated[targetColumnId], movedTask];
      return updated;
    });

    try {
      const { data: res } = await taskAPI.updateStatus(taskId, targetColumnId);
      // Emit socket event
      socketService.emit('task_updated', { roomId, task: res.data.task });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi cập nhật trạng thái');
      fetchTasks(); // Revert nếu lỗi
    }

    setDraggedTask(null);
  };

  // ─── Xóa task ─────────────────────────────────────────
  const handleDelete = async (taskId) => {
    if (!window.confirm('Bạn có chắc muốn xóa công việc này?')) return;

    try {
      await taskAPI.delete(taskId);
      toast.success('Đã xóa công việc');

      // Emit socket event
      socketService.emit('task_deleted', { roomId, taskId });

      // Cập nhật UI
      setColumns((prev) => {
        const updated = { ...prev };
        for (const col of Object.keys(updated)) {
          updated[col] = updated[col].filter((t) => t._id !== taskId);
        }
        return updated;
      });
      setShowDetailModal(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi xóa');
    }
  };

  // ─── Quick status change (không cần kéo thả) ──────────
  const handleQuickStatusChange = async (task, newStatus) => {
    const oldStatus = task.status;
    if (oldStatus === newStatus) return;

    // Optimistic update
    setColumns((prev) => {
      const updated = { ...prev };
      updated[oldStatus] = updated[oldStatus].filter((t) => t._id !== task._id);
      updated[newStatus] = [...updated[newStatus], { ...task, status: newStatus }];
      return updated;
    });

    try {
      const { data: res } = await taskAPI.updateStatus(task._id, newStatus);
      socketService.emit('task_updated', { roomId, task: res.data.task });
    } catch (err) {
      toast.error('Lỗi cập nhật');
      fetchTasks();
    }
  };

  // ─── Helper: Format deadline ──────────────────────────
  const formatDeadline = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const diff = date - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    const formatted = date.toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit',
    });

    if (days < 0) return { text: `Quá hạn ${formatted}`, className: 'overdue' };
    if (days === 0) return { text: `Hôm nay`, className: 'today' };
    if (days === 1) return { text: `Ngày mai`, className: 'soon' };
    if (days <= 3) return { text: `${days} ngày nữa`, className: 'soon' };
    return { text: formatted, className: '' };
  };

  // ─── Toggle assignee trong form ───────────────────────
  const toggleAssignee = (memberId) => {
    setForm((prev) => ({
      ...prev,
      assignees: prev.assignees.includes(memberId)
        ? prev.assignees.filter((id) => id !== memberId)
        : [...prev.assignees, memberId],
    }));
  };

  // ─── Thêm label ──────────────────────────────────────
  const addLabel = (e) => {
    e.preventDefault();
    if (labelInput.trim() && !form.labels.includes(labelInput.trim())) {
      setForm((prev) => ({
        ...prev,
        labels: [...prev.labels, labelInput.trim()],
      }));
      setLabelInput('');
    }
  };

  const removeLabel = (label) => {
    setForm((prev) => ({
      ...prev,
      labels: prev.labels.filter((l) => l !== label),
    }));
  };

  // ─── Loading state ────────────────────────────────────
  if (loading) {
    return (
      <div className="task-board-loading">
        <div className="spinner spinner-lg" />
        <p>Đang tải bảng công việc...</p>
      </div>
    );
  }

  const totalTasks = Object.values(columns).reduce((acc, col) => acc + col.length, 0);

  // ─── Main render ──────────────────────────────────────
  return (
    <div className="task-board">
      {/* Header */}
      <div className="task-board-header">
        <div className="task-board-title-section">
          <h2 className="task-board-title">
            <ClipboardList size={22} />
            Bảng công việc
          </h2>
          <span className="task-board-count">{totalTasks} công việc</span>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => { setCreateStatus('todo'); setShowCreateModal(true); }}
        >
          <Plus size={16} />
          Tạo công việc
        </button>
      </div>

      {/* Kanban Board */}
      <div className="kanban-board">
        {COLUMNS.map((column) => {
          const colTasks = columns[column.id] || [];
          const ColIcon = column.icon;

          return (
            <div
              key={column.id}
              className={`kanban-column ${dragOverColumn === column.id ? 'drag-over' : ''}`}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {/* Column Header */}
              <div className="kanban-column-header">
                <div className="column-title-group">
                  <div
                    className="column-indicator"
                    style={{ background: column.color }}
                  />
                  <ColIcon size={16} style={{ color: column.color }} />
                  <span className="column-title">{column.label}</span>
                  <span className="column-count">{colTasks.length}</span>
                </div>
                <button
                  className="btn btn-ghost btn-icon column-add-btn"
                  onClick={() => { setCreateStatus(column.id); setShowCreateModal(true); }}
                  title={`Thêm vào "${column.label}"`}
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Task Cards */}
              <div className="kanban-cards">
                {colTasks.map((task) => {
                  const deadline = formatDeadline(task.deadline);
                  const priorityConfig = PRIORITY_CONFIG[task.priority];

                  return (
                    <div
                      key={task._id}
                      className={`task-card ${draggedTask?._id === task._id ? 'dragging' : ''}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task)}
                      onDragEnd={handleDragEnd}
                      onClick={() => setShowDetailModal(task)}
                    >
                      <div className="task-card-drag-handle">
                        <GripVertical size={14} />
                      </div>

                      {/* Labels */}
                      {task.labels && task.labels.length > 0 && (
                        <div className="task-card-labels">
                          {task.labels.slice(0, 3).map((label) => (
                            <span key={label} className="task-label">{label}</span>
                          ))}
                          {task.labels.length > 3 && (
                            <span className="task-label task-label-more">
                              +{task.labels.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      <h4 className="task-card-title">{task.title}</h4>

                      {task.description && (
                        <p className="task-card-desc">
                          {task.description.slice(0, 80)}
                          {task.description.length > 80 ? '...' : ''}
                        </p>
                      )}

                      <div className="task-card-meta">
                        {/* Priority */}
                        <span
                          className="task-priority"
                          style={{ color: priorityConfig.color }}
                          title={priorityConfig.label}
                        >
                          <Flag size={12} />
                          {priorityConfig.label}
                        </span>

                        {/* Deadline */}
                        {deadline && (
                          <span className={`task-deadline ${deadline.className}`}>
                            <Calendar size={12} />
                            {deadline.text}
                          </span>
                        )}
                      </div>

                      {/* Assignees */}
                      {task.assignees && task.assignees.length > 0 && (
                        <div className="task-card-assignees">
                          {task.assignees.slice(0, 3).map((assignee) => (
                            <div
                              key={assignee._id}
                              className="task-assignee-avatar"
                              title={assignee.name}
                            >
                              {assignee.name?.charAt(0).toUpperCase()}
                            </div>
                          ))}
                          {task.assignees.length > 3 && (
                            <div className="task-assignee-avatar task-assignee-more">
                              +{task.assignees.length - 3}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Empty state */}
                {colTasks.length === 0 && (
                  <div className="kanban-empty">
                    <p>Không có công việc nào</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Create Task Modal ───────────────────────────── */}
      {showCreateModal && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setShowCreateModal(false)}>
          <div className="task-modal animate-zoom-in" onClick={(e) => e.stopPropagation()}>
            <div className="task-modal-header">
              <h3>
                <Plus size={20} />
                Tạo công việc mới
              </h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowCreateModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="task-modal-body">
              {/* Title */}
              <div className="form-group">
                <label className="form-label">
                  Tiêu đề <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="Nhập tiêu đề công việc..."
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  autoFocus
                />
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="form-label">Mô tả</label>
                <textarea
                  className="input textarea"
                  placeholder="Mô tả chi tiết (tuỳ chọn)..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                />
              </div>

              {/* Priority + Deadline row */}
              <div className="form-row">
                <div className="form-group form-half">
                  <label className="form-label">
                    <Flag size={14} /> Độ ưu tiên
                  </label>
                  <select
                    className="input"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  >
                    {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.icon} {cfg.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group form-half">
                  <label className="form-label">
                    <Calendar size={14} /> Deadline
                  </label>
                  <input
                    type="date"
                    className="input"
                    value={form.deadline}
                    onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                  />
                </div>
              </div>

              {/* Assignees */}
              <div className="form-group">
                <label className="form-label">
                  <UserPlus size={14} /> Gán thành viên
                </label>
                <div className="assignee-picker">
                  {members.map((member) => (
                    <button
                      key={member._id}
                      type="button"
                      className={`assignee-chip ${form.assignees.includes(member._id) ? 'selected' : ''}`}
                      onClick={() => toggleAssignee(member._id)}
                    >
                      <div className="assignee-chip-avatar">
                        {member.name?.charAt(0).toUpperCase()}
                      </div>
                      <span>{member.name}</span>
                      {form.assignees.includes(member._id) && <CheckCircle2 size={14} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Labels */}
              <div className="form-group">
                <label className="form-label">
                  <Tag size={14} /> Nhãn
                </label>
                <div className="label-input-wrapper">
                  <input
                    type="text"
                    className="input"
                    placeholder="Nhập nhãn rồi nhấn Enter..."
                    value={labelInput}
                    onChange={(e) => setLabelInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') addLabel(e); }}
                  />
                </div>
                {form.labels.length > 0 && (
                  <div className="label-list">
                    {form.labels.map((label) => (
                      <span key={label} className="task-label task-label-removable">
                        {label}
                        <button
                          type="button"
                          onClick={() => removeLabel(label)}
                          className="label-remove-btn"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="task-modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creating || !form.title.trim()}
                >
                  {creating ? <span className="spinner" /> : <Plus size={16} />}
                  Tạo công việc
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Task Detail Modal ────────────────────────────── */}
      {showDetailModal && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setShowDetailModal(null)}>
          <div className="task-detail-modal animate-zoom-in" onClick={(e) => e.stopPropagation()}>
            <div className="task-detail-header">
              <div className="task-detail-title-group">
                <span
                  className="task-detail-priority-dot"
                  style={{ background: PRIORITY_CONFIG[showDetailModal.priority]?.color }}
                />
                <h3>{showDetailModal.title}</h3>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowDetailModal(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="task-detail-body">
              {/* Status selector */}
              <div className="task-detail-section">
                <label className="detail-label">Trạng thái</label>
                <div className="status-selector">
                  {COLUMNS.map((col) => {
                    const ColIcon = col.icon;
                    return (
                      <button
                        key={col.id}
                        className={`status-option ${showDetailModal.status === col.id ? 'active' : ''}`}
                        style={{
                          '--status-color': col.color,
                        }}
                        onClick={() => {
                          handleQuickStatusChange(showDetailModal, col.id);
                          setShowDetailModal({ ...showDetailModal, status: col.id });
                        }}
                      >
                        <ColIcon size={14} />
                        {col.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              {showDetailModal.description && (
                <div className="task-detail-section">
                  <label className="detail-label">Mô tả</label>
                  <p className="task-detail-desc">{showDetailModal.description}</p>
                </div>
              )}

              {/* Info grid */}
              <div className="task-detail-info-grid">
                <div className="detail-info-item">
                  <Flag size={14} style={{ color: PRIORITY_CONFIG[showDetailModal.priority]?.color }} />
                  <span>{PRIORITY_CONFIG[showDetailModal.priority]?.label}</span>
                </div>
                {showDetailModal.deadline && (
                  <div className="detail-info-item">
                    <Calendar size={14} />
                    <span>
                      {new Date(showDetailModal.deadline).toLocaleDateString('vi-VN', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                      })}
                    </span>
                  </div>
                )}
                <div className="detail-info-item">
                  <Users size={14} />
                  <span>{showDetailModal.createdBy?.name || 'Không rõ'}</span>
                </div>
              </div>

              {/* Assignees */}
              {showDetailModal.assignees?.length > 0 && (
                <div className="task-detail-section">
                  <label className="detail-label">Thành viên được gán</label>
                  <div className="detail-assignees-list">
                    {showDetailModal.assignees.map((a) => (
                      <div key={a._id} className="detail-assignee-item">
                        <div className="task-assignee-avatar">{a.name?.charAt(0).toUpperCase()}</div>
                        <span>{a.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Labels */}
              {showDetailModal.labels?.length > 0 && (
                <div className="task-detail-section">
                  <label className="detail-label">Nhãn</label>
                  <div className="detail-labels">
                    {showDetailModal.labels.map((l) => (
                      <span key={l} className="task-label">{l}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="task-detail-section task-detail-timestamps">
                <span>Tạo lúc: {new Date(showDetailModal.createdAt).toLocaleString('vi-VN')}</span>
                <span>Cập nhật: {new Date(showDetailModal.updatedAt).toLocaleString('vi-VN')}</span>
              </div>
            </div>

            <div className="task-detail-footer">
              <button
                className="btn btn-danger"
                onClick={() => handleDelete(showDetailModal._id)}
              >
                <Trash2 size={14} />
                Xóa công việc
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
