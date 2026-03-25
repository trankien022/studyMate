import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { roomAPI, aiAPI } from '../../../services/api';
import { socketService } from '../../../services/socket';
import { useAuth } from '../../../contexts/AuthContext';
import { Save, Sparkles, FileText } from 'lucide-react';

export default function NotesTab({ roomId, room, onUpdate }) {
  const { user } = useAuth();
  const [notes, setNotes] = useState(room?.notes || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [summary, setSummary] = useState('');
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current && room?.notes) {
      setNotes(room.notes);
      initializedRef.current = true;
    }
  }, [room]);

  useEffect(() => {
    const handleNotesUpdate = ({ notes: newNotes }) => {
      setNotes(newNotes);
    };

    socketService.on('notes_updated', handleNotesUpdate);
    return () => {
      socketService.off('notes_updated', handleNotesUpdate);
    };
  }, []);

  const handleChange = (e) => {
    const value = e.target.value;
    setNotes(value);
    socketService.emit('update_notes', { roomId, notes: value, user });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await roomAPI.updateNotes(roomId, notes);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      onUpdate?.();
    } catch {
      toast.error('Lưu ghi chú thất bại. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleSummarize = async () => {
    if (!notes || notes.length < 50) return;
    setSummarizing(true);
    setSummary('');
    try {
      const { data } = await aiAPI.summarize({ text: notes, roomId });
      setSummary(data.data.summary);
    } catch {
      setSummary('❌ Không thể tóm tắt. Vui lòng thử lại.');
    } finally {
      setSummarizing(false);
    }
  };

  return (
    <div className="notes-tab animate-fade-in">
      <div className="notes-header">
        <h2>
          <FileText size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Ghi chú phòng học
        </h2>
      </div>

      <div className="notes-editor">
        <textarea
          id="notes-textarea"
          className="notes-textarea"
          placeholder="Ghi chú chung cho cả nhóm... (hỗ trợ tóm tắt AI khi có trên 50 ký tự)"
          value={notes}
          onChange={handleChange}
        />

        <div className="notes-actions">
          <span className="notes-status">
            {saved && '✅ Đã lưu thành công'}
            {saving && '💾 Đang lưu...'}
            {!saved && !saving && `${notes.length} ký tự`}
          </span>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              id="summarize-notes-btn"
              className="btn btn-secondary"
              onClick={handleSummarize}
              disabled={summarizing || notes.length < 50}
              title={notes.length < 50 ? 'Cần tối thiểu 50 ký tự' : 'Tóm tắt bằng AI'}
            >
              {summarizing ? (
                <span className="spinner" />
              ) : (
                <>
                  <Sparkles size={16} />
                  Tóm tắt AI
                </>
              )}
            </button>

            <button
              id="save-notes-btn"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <span className="spinner" />
              ) : (
                <>
                  <Save size={16} />
                  Lưu ghi chú
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {summary && (
        <div className="summarize-section animate-fade-in-up">
          <h3>
            <Sparkles size={16} />
            Tóm tắt bởi AI
          </h3>
          <div className="summary-result">{summary}</div>
        </div>
      )}
    </div>
  );
}
