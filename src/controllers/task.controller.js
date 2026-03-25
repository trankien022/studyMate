const Task = require('../models/Task');
const Room = require('../models/Room');
const checkRoomMembership = require('../middleware/checkMembership');
const {
  createNotification,
  createBulkNotifications,
} = require('./notification.controller');
const { triggerBadgeCheck } = require('./badge.controller');

// ─── Helper: Kiểm tra quyền truy cập task ──────────────────
const findTaskWithAccess = async (taskId, userId) => {
  const task = await Task.findById(taskId)
    .populate('createdBy', 'name email avatar')
    .populate('assignees', 'name email avatar');

  if (!task) {
    const err = new Error('Không tìm thấy công việc');
    err.statusCode = 404;
    throw err;
  }

  // Kiểm tra user có phải member của room không
  await checkRoomMembership(task.roomId, userId);

  return task;
};

// ─── POST /api/tasks ────────────────────────────────────────
/**
 * POST /api/tasks
 * Tạo công việc mới trong phòng.
 */
const createTask = async (req, res) => {
  const { roomId, title, description, assignees, priority, deadline, labels } =
    req.body;

  // ─── Validation ─────────────────────────────────────────
  if (!roomId || !title || !title.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng nhập tiêu đề công việc',
    });
  }

  // Kiểm tra membership
  const room = await checkRoomMembership(roomId, req.user._id);

  // Kiểm tra assignees có phải members không
  if (assignees && assignees.length > 0) {
    const roomMemberIds = room.members.map((m) => m.toString());
    const invalidAssignees = assignees.filter(
      (a) => !roomMemberIds.includes(a.toString())
    );
    if (invalidAssignees.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Một số người được gán không phải thành viên phòng',
      });
    }
  }

  // Tính order cho task mới (đặt cuối cột todo)
  const lastTask = await Task.findOne({ roomId, status: 'todo' })
    .sort({ order: -1 })
    .select('order');
  const order = lastTask ? lastTask.order + 1 : 0;

  // ─── Business Logic ────────────────────────────────────
  const task = await Task.create({
    title: title.trim(),
    description: description?.trim() || '',
    roomId,
    createdBy: req.user._id,
    assignees: assignees || [],
    priority: priority || 'medium',
    deadline: deadline || null,
    labels: labels || [],
    order,
  });

  // Populate để trả về đầy đủ thông tin
  await task.populate('createdBy', 'name email avatar');
  await task.populate('assignees', 'name email avatar');

  // 🔔 Thông báo cho assignees (trừ người tạo)
  if (assignees && assignees.length > 0) {
    const recipientIds = assignees.filter(
      (a) => a.toString() !== req.user._id.toString()
    );

    if (recipientIds.length > 0) {
      createBulkNotifications(recipientIds, {
        type: 'task_assigned',
        title: 'Công việc mới',
        message: `${req.user.name} đã gán bạn vào công việc "${task.title}" trong "${room.name}"`,
        link: `/room/${roomId}`,
        metadata: { roomId, taskId: task._id, roomName: room.name },
      }).catch((err) => console.error('[Notification] Error:', err.message));
    }
  }

  // 🏆 Kiểm tra huy hiệu mới
  triggerBadgeCheck(req.user._id);

  // ─── Response ──────────────────────────────────────────
  res.status(201).json({
    success: true,
    message: 'Tạo công việc thành công',
    data: { task },
  });
};

// ─── GET /api/tasks/:roomId ─────────────────────────────────
/**
 * GET /api/tasks/:roomId
 * Lấy tất cả task trong phòng (nhóm theo status).
 */
const getTasksByRoom = async (req, res) => {
  const { roomId } = req.params;

  // Kiểm tra membership
  await checkRoomMembership(roomId, req.user._id);

  const tasks = await Task.find({ roomId })
    .populate('createdBy', 'name email avatar')
    .populate('assignees', 'name email avatar')
    .sort({ order: 1, createdAt: -1 });

  // Nhóm theo status cho Kanban board
  const columns = {
    todo: tasks.filter((t) => t.status === 'todo'),
    in_progress: tasks.filter((t) => t.status === 'in_progress'),
    review: tasks.filter((t) => t.status === 'review'),
    done: tasks.filter((t) => t.status === 'done'),
  };

  res.json({
    success: true,
    data: {
      columns,
      total: tasks.length,
    },
  });
};

// ─── PATCH /api/tasks/:id ───────────────────────────────────
/**
 * PATCH /api/tasks/:id
 * Cập nhật thông tin task (title, description, assignees, priority, deadline, labels).
 */
const updateTask = async (req, res) => {
  const { id } = req.params;
  const { title, description, assignees, priority, deadline, labels } =
    req.body;

  const task = await findTaskWithAccess(id, req.user._id);
  const room = await Room.findById(task.roomId);

  // Cập nhật các field được gửi lên
  if (title !== undefined) task.title = title.trim();
  if (description !== undefined) task.description = description.trim();
  if (priority !== undefined) task.priority = priority;
  if (deadline !== undefined) task.deadline = deadline;
  if (labels !== undefined) task.labels = labels;

  // Xử lý assignees — kiểm tra membership trước
  if (assignees !== undefined) {
    const roomMemberIds = room.members.map((m) => m.toString());
    const invalidAssignees = assignees.filter(
      (a) => !roomMemberIds.includes(a.toString())
    );
    if (invalidAssignees.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Một số người được gán không phải thành viên phòng',
      });
    }

    // Tìm assignees mới được thêm vào
    const oldAssigneeIds = task.assignees.map((a) =>
      typeof a === 'object' ? a._id.toString() : a.toString()
    );
    const newAssigneeIds = assignees.filter(
      (a) => !oldAssigneeIds.includes(a.toString())
    );

    task.assignees = assignees;

    // 🔔 Thông báo cho assignees mới
    if (newAssigneeIds.length > 0) {
      const recipientIds = newAssigneeIds.filter(
        (a) => a.toString() !== req.user._id.toString()
      );
      if (recipientIds.length > 0) {
        createBulkNotifications(recipientIds, {
          type: 'task_assigned',
          title: 'Được gán công việc',
          message: `${req.user.name} đã gán bạn vào công việc "${task.title}" trong "${room.name}"`,
          link: `/room/${task.roomId}`,
          metadata: {
            roomId: task.roomId,
            taskId: task._id,
            roomName: room.name,
          },
        }).catch((err) => console.error('[Notification] Error:', err.message));
      }
    }
  }

  await task.save();
  await task.populate('createdBy', 'name email avatar');
  await task.populate('assignees', 'name email avatar');

  res.json({
    success: true,
    message: 'Cập nhật công việc thành công',
    data: { task },
  });
};

// ─── PATCH /api/tasks/:id/status ────────────────────────────
/**
 * PATCH /api/tasks/:id/status
 * Cập nhật trạng thái task (di chuyển giữa các cột Kanban).
 */
const updateTaskStatus = async (req, res) => {
  const { id } = req.params;
  const { status, order } = req.body;

  // Validate status
  const validStatuses = ['todo', 'in_progress', 'review', 'done'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Trạng thái không hợp lệ',
    });
  }

  const task = await findTaskWithAccess(id, req.user._id);
  const room = await Room.findById(task.roomId);
  const oldStatus = task.status;

  task.status = status;
  if (order !== undefined) task.order = order;

  await task.save();
  await task.populate('createdBy', 'name email avatar');
  await task.populate('assignees', 'name email avatar');

  // Tên trạng thái hiển thị
  const statusNames = {
    todo: 'Cần làm',
    in_progress: 'Đang làm',
    review: 'Đang review',
    done: 'Hoàn thành',
  };

  // 🔔 Thông báo khi task chuyển sang "done"
  if (status === 'done' && oldStatus !== 'done') {
    const recipientIds = [
      task.createdBy._id || task.createdBy,
      ...task.assignees.map((a) => a._id || a),
    ]
      .map((id) => id.toString())
      .filter((id) => id !== req.user._id.toString());

    const uniqueRecipients = [...new Set(recipientIds)];

    if (uniqueRecipients.length > 0) {
      createBulkNotifications(uniqueRecipients, {
        type: 'task_completed',
        title: 'Công việc hoàn thành',
        message: `${req.user.name} đã hoàn thành công việc "${task.title}" trong "${room.name}"`,
        link: `/room/${task.roomId}`,
        metadata: {
          roomId: task.roomId,
          taskId: task._id,
          roomName: room.name,
        },
      }).catch((err) => console.error('[Notification] Error:', err.message));
    }
  }

  // 🏆 Kiểm tra huy hiệu mới khi hoàn thành task
  if (status === 'done') {
    triggerBadgeCheck(req.user._id);
  }

  res.json({
    success: true,
    message: `Đã chuyển sang "${statusNames[status]}"`,
    data: { task },
  });
};

// ─── PATCH /api/tasks/reorder ───────────────────────────────
/**
 * PATCH /api/tasks/reorder
 * Cập nhật thứ tự tasks trong 1 cột (sau khi drag & drop).
 */
const reorderTasks = async (req, res) => {
  const { roomId, tasks: taskOrders } = req.body;

  if (!roomId || !taskOrders || !Array.isArray(taskOrders)) {
    return res.status(400).json({
      success: false,
      message: 'Dữ liệu không hợp lệ',
    });
  }

  // Kiểm tra membership
  await checkRoomMembership(roomId, req.user._id);

  // Bulk update order + status
  const bulkOps = taskOrders.map(({ taskId, order, status }) => ({
    updateOne: {
      filter: { _id: taskId, roomId },
      update: { $set: { order, status } },
    },
  }));

  await Task.bulkWrite(bulkOps);

  res.json({
    success: true,
    message: 'Cập nhật thứ tự thành công',
  });
};

// ─── DELETE /api/tasks/:id ──────────────────────────────────
/**
 * DELETE /api/tasks/:id
 * Xóa task (chỉ người tạo hoặc owner phòng).
 */
const deleteTask = async (req, res) => {
  const { id } = req.params;

  const task = await Task.findById(id);
  if (!task) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy công việc',
    });
  }

  // Kiểm tra quyền: phải là người tạo hoặc chủ phòng
  const room = await Room.findById(task.roomId);
  const isCreator = task.createdBy.toString() === req.user._id.toString();
  const isOwner = room?.owner?.toString() === req.user._id.toString();

  if (!isCreator && !isOwner) {
    return res.status(403).json({
      success: false,
      message: 'Chỉ người tạo hoặc chủ phòng mới có thể xóa công việc',
    });
  }

  await Task.findByIdAndDelete(id);

  res.json({
    success: true,
    message: 'Đã xóa công việc',
  });
};

module.exports = {
  createTask,
  getTasksByRoom,
  updateTask,
  updateTaskStatus,
  reorderTasks,
  deleteTask,
};
