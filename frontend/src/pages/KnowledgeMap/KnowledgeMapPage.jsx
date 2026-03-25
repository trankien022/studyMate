import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { knowledgeMapAPI } from '../../services/api';
import {
  ArrowLeft, Plus, Network, Trash2, ArrowRight,
  Sparkles, Brain, Target, AlertTriangle, Clock,
  ZoomIn, ZoomOut, RotateCcw, GitBranch,
  CircleDot, BookOpen, Lightbulb, FlaskConical,
  FileText, Puzzle, Cpu, ChevronRight, X
} from 'lucide-react';
import './KnowledgeMap.css';

// ─── Category config ─────────────────────────────────────
const CATEGORY_CONFIG = {
  concept: { icon: '💡', label: 'Khái niệm', color: '#6366F1' },
  theory: { icon: '🧪', label: 'Lý thuyết', color: '#10B981' },
  formula: { icon: '📐', label: 'Công thức', color: '#F59E0B' },
  definition: { icon: '📖', label: 'Định nghĩa', color: '#0284C7' },
  example: { icon: '💎', label: 'Ví dụ', color: '#A855F7' },
  application: { icon: '⚙️', label: 'Ứng dụng', color: '#EF4444' },
};

// ─── Mini Graph Preview (for card) ───────────────────────
function MiniGraph({ nodes = [], edges = [] }) {
  if (nodes.length === 0) return null;
  const size = 80;
  const center = size / 2;
  const nodePositions = nodes.slice(0, 8).map((_, i) => {
    const angle = (2 * Math.PI * i) / Math.min(nodes.length, 8);
    const r = 25;
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ opacity: 0.6 }}>
      {edges.slice(0, 10).map((e, i) => {
        const si = nodes.findIndex(n => n.id === e.source);
        const ti = nodes.findIndex(n => n.id === e.target);
        if (si === -1 || ti === -1 || si >= 8 || ti >= 8) return null;
        return (
          <line key={i}
            x1={nodePositions[si].x} y1={nodePositions[si].y}
            x2={nodePositions[ti].x} y2={nodePositions[ti].y}
            stroke="rgba(148,163,184,0.4)" strokeWidth="1"
          />
        );
      })}
      {nodePositions.map((pos, i) => (
        <circle key={i} cx={pos.x} cy={pos.y} r="4"
          fill={CATEGORY_CONFIG[nodes[i]?.category]?.color || '#6366F1'}
          opacity="0.7"
        />
      ))}
    </svg>
  );
}

// ─── Interactive Knowledge Graph ─────────────────────────
function KnowledgeGraph({ nodes, edges, selectedNode, onSelectNode, onUpdateNodePos }) {
  const svgRef = useRef(null);
  const [viewBox, setViewBox] = useState({ x: -400, y: -300, w: 800, h: 600 });
  const [dragging, setDragging] = useState(null);
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState(null);

  const nodeRadius = 32;

  // Zoom
  const handleZoom = useCallback((factor) => {
    setViewBox(prev => {
      const cx = prev.x + prev.w / 2;
      const cy = prev.y + prev.h / 2;
      const nw = prev.w * factor;
      const nh = prev.h * factor;
      return { x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh };
    });
  }, []);

  const resetView = useCallback(() => {
    setViewBox({ x: -400, y: -300, w: 800, h: 600 });
  }, []);

  // Mouse handlers
  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('.km-node')) return;
    setPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY, vx: viewBox.x, vy: viewBox.y });
  }, [viewBox]);

  const handleMouseMove = useCallback((e) => {
    if (panning && panStart) {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const scale = viewBox.w / rect.width;
      setViewBox(prev => ({
        ...prev,
        x: panStart.vx - (e.clientX - panStart.x) * scale,
        y: panStart.vy - (e.clientY - panStart.y) * scale,
      }));
    }
    if (dragging) {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const x = viewBox.x + ((e.clientX - rect.left) / rect.width) * viewBox.w;
      const y = viewBox.y + ((e.clientY - rect.top) / rect.height) * viewBox.h;
      onUpdateNodePos(dragging, x, y);
    }
  }, [panning, panStart, dragging, viewBox, onUpdateNodePos]);

  const handleMouseUp = useCallback(() => {
    setPanning(false);
    setPanStart(null);
    setDragging(null);
  }, []);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    handleZoom(factor);
  }, [handleZoom]);

  if (nodes.length === 0) {
    return (
      <div className="km-canvas-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '0.75rem' }}>
        <Network size={48} style={{ color: '#CBD5E1' }} />
        <p style={{ color: '#94A3B8', fontSize: '0.9rem', fontWeight: 500 }}>
          Chưa có khái niệm nào. Hãy dùng AI để tạo!
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="km-graph-toolbar" style={{ borderTop: '1px solid rgba(241,245,249,0.8)' }}>
        <button className="km-toolbar-btn" onClick={() => handleZoom(0.8)} title="Phóng to">
          <ZoomIn size={14} /> Phóng to
        </button>
        <button className="km-toolbar-btn" onClick={() => handleZoom(1.2)} title="Thu nhỏ">
          <ZoomOut size={14} /> Thu nhỏ
        </button>
        <button className="km-toolbar-btn" onClick={resetView} title="Reset view">
          <RotateCcw size={14} /> Reset
        </button>
      </div>
      <div className="km-canvas-container"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <svg ref={svgRef} viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}>
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="rgba(148,163,184,0.5)" />
            </marker>
          </defs>

          {/* Edges */}
          {edges.map((edge, i) => {
            const sourceNode = nodes.find(n => n.id === edge.source);
            const targetNode = nodes.find(n => n.id === edge.target);
            if (!sourceNode || !targetNode) return null;

            const dx = targetNode.x - sourceNode.x;
            const dy = targetNode.y - sourceNode.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const sx = sourceNode.x + (dx / dist) * nodeRadius;
            const sy = sourceNode.y + (dy / dist) * nodeRadius;
            const tx = targetNode.x - (dx / dist) * nodeRadius;
            const ty = targetNode.y - (dy / dist) * nodeRadius;
            const mx = (sx + tx) / 2;
            const my = (sy + ty) / 2;

            return (
              <g key={`edge-${i}`}>
                <line
                  className="km-edge"
                  x1={sx} y1={sy} x2={tx} y2={ty}
                  strokeOpacity={edge.strength || 0.5}
                  markerEnd="url(#arrowhead)"
                />
                {edge.label && (
                  <text className="km-edge-label" x={mx} y={my - 6} textAnchor="middle">
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const isSelected = selectedNode?.id === node.id;
            const catColor = CATEGORY_CONFIG[node.category]?.color || '#6366F1';
            const circumference = 2 * Math.PI * (nodeRadius + 4);
            const masteryOffset = circumference - (circumference * (node.mastery || 0)) / 100;

            return (
              <g key={node.id}
                className={`km-node km-cat-${node.category}`}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={(e) => { e.stopPropagation(); onSelectNode(node); }}
                onMouseDown={(e) => { e.stopPropagation(); setDragging(node.id); }}
              >
                {/* Mastery ring */}
                <circle
                  className="km-node-mastery-ring"
                  r={nodeRadius + 4}
                  stroke={catColor}
                  strokeDasharray={circumference}
                  strokeDashoffset={masteryOffset}
                  transform="rotate(-90)"
                  opacity="0.4"
                />
                {/* Main circle */}
                <circle
                  className="km-node-circle"
                  r={nodeRadius}
                  strokeWidth={isSelected ? 3 : 2}
                  stroke={isSelected ? catColor : undefined}
                />
                {/* Label */}
                <text className="km-node-label" dy="-0.1em" style={{ fontSize: node.label.length > 12 ? '9px' : '11px' }}>
                  {node.label.length > 16 ? node.label.substring(0, 14) + '…' : node.label}
                </text>
                {/* Category emoji */}
                <text textAnchor="middle" dy="1.3em" fontSize="9" opacity="0.7">
                  {CATEGORY_CONFIG[node.category]?.icon}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </>
  );
}

// ─── Main Page Component ─────────────────────────────────
export default function KnowledgeMapPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Views: 'list' | 'detail'
  const [view, setView] = useState('list');
  const [maps, setMaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMap, setCurrentMap] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', subject: '' });
  const [creating, setCreating] = useState(false);

  // Generate
  const [showGenerate, setShowGenerate] = useState(false);
  const [generateText, setGenerateText] = useState('');
  const [generating, setGenerating] = useState(false);

  // Analyze gaps
  const [analyzingGaps, setAnalyzingGaps] = useState(false);

  // Error
  const [error, setError] = useState('');

  // ─── Fetch maps ────────────────────────────────────
  const fetchMaps = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await knowledgeMapAPI.getAll();
      setMaps(data.data.maps || []);
    } catch {
      setError('Không thể tải danh sách bản đồ kiến thức');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMaps();
  }, [fetchMaps]);

  // ─── Create map ────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.title.trim() || !createForm.subject.trim()) {
      setError('Vui lòng điền đầy đủ thông tin');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const { data } = await knowledgeMapAPI.create(createForm);
      setMaps(prev => [data.data.map, ...prev]);
      setShowCreate(false);
      setCreateForm({ title: '', subject: '' });
      // Mở luôn map mới tạo
      openMap(data.data.map);
    } catch (err) {
      setError(err.response?.data?.message || 'Tạo bản đồ thất bại');
    } finally {
      setCreating(false);
    }
  };

  // ─── Open map detail ──────────────────────────────
  const openMap = useCallback(async (map) => {
    try {
      const { data } = await knowledgeMapAPI.getDetail(map._id);
      setCurrentMap(data.data.map);
      setView('detail');
      setSelectedNode(null);
    } catch {
      setError('Không thể tải bản đồ');
    }
  }, []);

  // ─── Delete map ────────────────────────────────────
  const handleDeleteMap = useCallback(async (mapId, e) => {
    e.stopPropagation();
    if (!confirm('Xóa bản đồ kiến thức này?')) return;
    try {
      await knowledgeMapAPI.delete(mapId);
      setMaps(prev => prev.filter(m => m._id !== mapId));
      if (currentMap?._id === mapId) {
        setView('list');
        setCurrentMap(null);
      }
    } catch {
      setError('Xóa thất bại');
    }
  }, [currentMap]);

  // ─── Generate nodes ───────────────────────────────
  const handleGenerate = useCallback(async (sourceType) => {
    if (!currentMap) return;
    setGenerating(true);
    setError('');
    try {
      const body = sourceType === 'room'
        ? { sourceType: 'room' }
        : { sourceType: 'text', text: generateText };
      const { data } = await knowledgeMapAPI.generate(currentMap._id, body);
      setCurrentMap(data.data.map);
      setShowGenerate(false);
      setGenerateText('');
    } catch (err) {
      setError(err.response?.data?.message || 'AI tạo thất bại');
    } finally {
      setGenerating(false);
    }
  }, [currentMap, generateText]);

  // ─── Analyze gaps ─────────────────────────────────
  const handleAnalyzeGaps = useCallback(async () => {
    if (!currentMap) return;
    setAnalyzingGaps(true);
    setError('');
    try {
      const { data } = await knowledgeMapAPI.analyzeGaps(currentMap._id);
      setCurrentMap(prev => ({ ...prev, gaps: data.data.gaps, stats: data.data.stats }));
    } catch (err) {
      setError(err.response?.data?.message || 'Phân tích lỗ hổng thất bại');
    } finally {
      setAnalyzingGaps(false);
    }
  }, [currentMap]);

  // ─── Update node position ─────────────────────────
  const handleUpdateNodePos = useCallback((nodeId, x, y) => {
    setCurrentMap(prev => {
      if (!prev) return prev;
      const newNodes = prev.nodes.map(n => n.id === nodeId ? { ...n, x, y } : n);
      return { ...prev, nodes: newNodes };
    });
  }, []);

  // ─── Delete node ──────────────────────────────────
  const handleDeleteNode = useCallback(async (nodeId) => {
    if (!currentMap) return;
    try {
      const { data } = await knowledgeMapAPI.deleteNode(currentMap._id, nodeId);
      setCurrentMap(data.data.map);
      setSelectedNode(null);
    } catch {
      setError('Xóa node thất bại');
    }
  }, [currentMap]);

  // ─── RENDER: List View ─────────────────────────────
  const renderListView = () => (
    <>
      <div className="km-list-header">
        <div>
          <h1><Network size={26} /> Bản đồ kiến thức AI</h1>
          <p>Tạo và khám phá bản đồ kiến thức thông minh do AI phân tích</p>
        </div>
        <button className="km-create-btn" onClick={() => setShowCreate(!showCreate)}>
          <Plus size={17} />
          Tạo bản đồ mới
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <form className="km-create-form" onSubmit={handleCreate}>
          <h3><Sparkles size={18} /> Bản đồ kiến thức mới</h3>
          {error && <div style={{ color: '#EF4444', fontSize: '0.82rem', marginBottom: '0.75rem' }}>{error}</div>}
          <div className="km-form-row">
            <div className="km-form-group">
              <label htmlFor="km-title">Tiêu đề</label>
              <input
                id="km-title"
                type="text"
                placeholder="VD: Kiến thức Toán rời rạc"
                value={createForm.title}
                onChange={(e) => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
                required
                maxLength={150}
              />
            </div>
            <div className="km-form-group">
              <label htmlFor="km-subject">Môn học / Chủ đề</label>
              <input
                id="km-subject"
                type="text"
                placeholder="VD: Toán rời rạc"
                value={createForm.subject}
                onChange={(e) => setCreateForm(prev => ({ ...prev, subject: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="km-form-actions">
            <button type="button" className="km-btn-cancel" onClick={() => { setShowCreate(false); setError(''); }}>
              Hủy
            </button>
            <button type="submit" className="km-btn-submit" disabled={creating}>
              {creating ? <span className="km-spinner" /> : 'Tạo bản đồ'}
            </button>
          </div>
        </form>
      )}

      {/* Maps grid */}
      {loading ? (
        <div className="km-cards-grid">
          {[1, 2, 3].map(i => (
            <div key={i} className="km-card" style={{ pointerEvents: 'none' }}>
              <div className="km-skeleton" style={{ height: 18, width: '60%', marginBottom: 12 }} />
              <div className="km-skeleton" style={{ height: 14, width: '40%', marginBottom: 20 }} />
              <div className="km-skeleton" style={{ height: 6, width: '100%', marginBottom: 12 }} />
              <div className="km-skeleton" style={{ height: 12, width: '50%' }} />
            </div>
          ))}
        </div>
      ) : maps.length === 0 ? (
        <div className="km-empty">
          <div className="km-empty-icon">
            <Network size={36} />
          </div>
          <h3>Chưa có bản đồ kiến thức nào</h3>
          <p>Tạo bản đồ mới và để AI tự động phân tích kiến thức từ tài liệu, ghi chú và quiz của bạn.</p>
        </div>
      ) : (
        <div className="km-cards-grid">
          {maps.map(map => (
            <article
              key={map._id}
              className="km-card"
              onClick={() => openMap(map)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && openMap(map)}
            >
              <div className="km-card-header">
                <div className="km-card-icon">
                  <Network size={20} />
                </div>
                <button
                  className="km-card-delete"
                  onClick={(e) => handleDeleteMap(map._id, e)}
                  title="Xóa bản đồ"
                  aria-label="Xóa bản đồ"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <h3 className="km-card-title">{map.title}</h3>
              <span className="km-card-subject">
                <BookOpen size={11} />
                {map.subject}
              </span>
              <div className="km-card-stats">
                <span className="km-card-stat">
                  <CircleDot size={12} />
                  {map.stats?.totalNodes || 0} nodes
                </span>
                <span className="km-card-stat">
                  <GitBranch size={12} />
                  {map.stats?.totalEdges || 0} edges
                </span>
                <div className="km-mastery-bar">
                  <div
                    className="km-mastery-fill"
                    style={{ width: `${map.stats?.averageMastery || 0}%` }}
                  />
                </div>
                <span className="km-card-stat" style={{ fontWeight: 700, color: '#10B981' }}>
                  {map.stats?.averageMastery || 0}%
                </span>
              </div>
              <div className="km-card-footer">
                <span className="km-card-date">
                  <Clock size={11} style={{ marginRight: 3 }} />
                  {new Date(map.updatedAt).toLocaleDateString('vi-VN')}
                </span>
                <ArrowRight size={15} className="km-card-arrow" />
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );

  // ─── RENDER: Detail View ───────────────────────────
  const renderDetailView = () => {
    if (!currentMap) return null;

    return (
      <div className="km-detail">
        {/* Graph Panel */}
        <div className="km-graph-panel">
          <div className="km-graph-toolbar">
            <button className="km-toolbar-btn primary" onClick={() => setShowGenerate(!showGenerate)} disabled={generating}>
              {generating ? <span className="km-spinner" /> : <Sparkles size={14} />}
              AI Tạo khái niệm
            </button>
            {currentMap.roomId && (
              <button className="km-toolbar-btn" onClick={() => handleGenerate('room')} disabled={generating}>
                <BookOpen size={14} />
                Từ phòng học
              </button>
            )}
            <div className="km-toolbar-sep" />
            <button className="km-toolbar-btn" onClick={handleAnalyzeGaps} disabled={analyzingGaps}>
              {analyzingGaps ? <span className="km-spinner" /> : <Target size={14} />}
              Phân tích lỗ hổng
            </button>
          </div>

          {/* Generate input area */}
          {showGenerate && (
            <div className="km-generate-input" style={{ padding: '1rem', borderBottom: '1px solid rgba(241,245,249,0.8)' }}>
              <textarea
                className="km-generate-textarea"
                placeholder="Dán nội dung bài học, ghi chú, hoặc bất kỳ text nào tại đây... AI sẽ tự động trích xuất các khái niệm và mối quan hệ."
                value={generateText}
                onChange={(e) => setGenerateText(e.target.value)}
                autoFocus
              />
              <div className="km-generate-actions">
                <button className="km-btn-cancel" onClick={() => { setShowGenerate(false); setGenerateText(''); }}>
                  Hủy
                </button>
                <button
                  className="km-btn-submit"
                  onClick={() => handleGenerate('text')}
                  disabled={generating || generateText.trim().length < 50}
                >
                  {generating ? <span className="km-spinner" /> : 'Phân tích bằng AI'}
                </button>
              </div>
            </div>
          )}

          {/* Interactive Graph */}
          <KnowledgeGraph
            nodes={currentMap.nodes || []}
            edges={currentMap.edges || []}
            selectedNode={selectedNode}
            onSelectNode={setSelectedNode}
            onUpdateNodePos={handleUpdateNodePos}
          />
        </div>

        {/* Side Panel */}
        <div className="km-side-panel">
          {/* Map title & stats */}
          <div className="km-panel-card">
            <div className="km-panel-title">
              <Brain size={16} />
              {currentMap.title}
            </div>
            <div className="km-stats-grid">
              <div className="km-stat-item">
                <div className="km-stat-value green">{currentMap.stats?.totalNodes || 0}</div>
                <div className="km-stat-label">Khái niệm</div>
              </div>
              <div className="km-stat-item">
                <div className="km-stat-value blue">{currentMap.stats?.totalEdges || 0}</div>
                <div className="km-stat-label">Liên kết</div>
              </div>
              <div className="km-stat-item">
                <div className="km-stat-value purple">{currentMap.stats?.averageMastery || 0}%</div>
                <div className="km-stat-label">Mastery TB</div>
              </div>
              <div className="km-stat-item">
                <div className="km-stat-value gold">{currentMap.gaps?.length || 0}</div>
                <div className="km-stat-label">Lỗ hổng</div>
              </div>
            </div>
          </div>

          {/* Selected Node Info */}
          {selectedNode && (
            <div className="km-panel-card km-node-info">
              <div className="km-panel-title">
                <CircleDot size={16} />
                Chi tiết khái niệm
                <button
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#78716C', padding: '0.2rem' }}
                  onClick={() => setSelectedNode(null)}
                  title="Đóng"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="km-node-info-header">
                <div className={`km-node-info-cat ${selectedNode.category}`}>
                  {CATEGORY_CONFIG[selectedNode.category]?.icon}
                </div>
                <div>
                  <div className="km-node-info-name">{selectedNode.label}</div>
                  <div style={{ fontSize: '0.7rem', color: '#78716C' }}>
                    {CATEGORY_CONFIG[selectedNode.category]?.label}
                  </div>
                </div>
              </div>
              {selectedNode.description && (
                <p className="km-node-info-desc">{selectedNode.description}</p>
              )}
              <div className="km-node-info-mastery">
                <div className="km-node-info-mastery-label">
                  <span>Mức nắm bắt</span>
                  <span style={{ color: '#10B981' }}>{selectedNode.mastery || 0}%</span>
                </div>
                <div className="km-mastery-bar">
                  <div className="km-mastery-fill" style={{ width: `${selectedNode.mastery || 0}%` }} />
                </div>
              </div>
              <div className="km-node-info-actions">
                <button className="km-node-action-btn delete" onClick={() => handleDeleteNode(selectedNode.id)}>
                  <Trash2 size={12} /> Xóa
                </button>
              </div>
            </div>
          )}

          {/* Knowledge Gaps */}
          {currentMap.gaps && currentMap.gaps.length > 0 && (
            <div className="km-panel-card">
              <div className="km-panel-title">
                <AlertTriangle size={16} style={{ color: '#F59E0B' }} />
                Lỗ hổng kiến thức
              </div>
              <div className="km-gaps-list">
                {currentMap.gaps.map((gap, i) => (
                  <div key={i} className="km-gap-item">
                    <div className={`km-gap-dot ${gap.severity}`} />
                    <div>
                      <div className="km-gap-topic">{gap.topic}</div>
                      <div className="km-gap-suggestion">{gap.suggestion}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="km-panel-card">
            <div className="km-panel-title">
              <Puzzle size={16} />
              Chú thích
            </div>
            <div className="km-legend">
              {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                <div key={key} className="km-legend-item">
                  <div className={`km-legend-dot ${key}`} />
                  {config.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ─── MAIN RENDER ───────────────────────────────────
  return (
    <div className="km-page">
      {/* Background orbs (reuse from Dashboard) */}
      <div className="dashboard-bg" aria-hidden="true">
        <div className="dashboard-bg-orb dashboard-bg-orb-1" />
        <div className="dashboard-bg-orb dashboard-bg-orb-2" />
        <div className="dashboard-bg-orb dashboard-bg-orb-3" />
      </div>

      {/* Header */}
      <header className="km-header" role="banner">
        <div className="km-header-left">
          <button className="km-back-btn" onClick={() => view === 'detail' ? (setView('list'), setSelectedNode(null)) : navigate('/dashboard')}>
            <ArrowLeft size={15} />
            {view === 'detail' ? 'Danh sách' : 'Dashboard'}
          </button>
          <div className="km-page-title">
            <Network size={20} />
            {view === 'detail' && currentMap ? currentMap.title : 'Knowledge Map'}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="km-main">
        {error && (
          <div style={{
            padding: '0.75rem 1rem',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '10px',
            color: '#EF4444',
            fontSize: '0.85rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <AlertTriangle size={15} />
            {error}
            <button
              onClick={() => setError('')}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444' }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {view === 'list' ? renderListView() : renderDetailView()}
      </main>
    </div>
  );
}
